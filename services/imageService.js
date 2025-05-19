const Image = require('../models/Image');
const { logger } = require('./loggingService');

/**
 * Service for handling image operations
 */
class ImageService {
  /**
   * Process an optimized payload to restore any image references
   * @param {object} payload - The optimized payload
   * @returns {object} - The processed payload with restored images
   */
  async processOptimizedPayload(payload) {
    if (!payload) return payload;

    try {
      // Create a deep copy of the payload
      const processedPayload = JSON.parse(JSON.stringify(payload));

      // Process the payload recursively
      await this.processObjectForImageReferences(processedPayload);

      return processedPayload;
    } catch (error) {
      logger.error('Error processing optimized payload:', { error });
      return payload; // Return original payload if processing fails
    }
  }

  /**
   * Recursively process an object to restore image references
   * @param {object} obj - The object to process
   */
  async processObjectForImageReferences(obj) {
    if (!obj || typeof obj !== 'object') return;

    // Process arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'object') {
          await this.processObjectForImageReferences(obj[i]);
        } else if (typeof obj[i] === 'string' && this.isImageReference(obj[i])) {
          // Restore image reference
          obj[i] = await this.restoreImageReference(obj[i]);
        }
      }
      return;
    }

    // Process objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object') {
          await this.processObjectForImageReferences(obj[key]);
        } else if (typeof obj[key] === 'string' && this.isImageReference(obj[key])) {
          // Restore image reference
          obj[key] = await this.restoreImageReference(obj[key]);
        }
      }
    }
  }

  /**
   * Check if a string is an image reference
   * @param {string} str - The string to check
   * @returns {boolean} - Whether the string is an image reference
   */
  isImageReference(str) {
    return typeof str === 'string' && str.startsWith('[image:') && str.endsWith(']');
  }

  /**
   * Restore an image reference to its original content
   * @param {string} reference - The image reference
   * @returns {string} - The restored image content
   */
  async restoreImageReference(reference) {
    try {
      // Extract the image ID from the reference
      const imageId = reference.substring(7, reference.length - 1);

      // Get the image from the database
      const image = await Image.findById(imageId);

      if (!image) {
        logger.error(`Image with ID ${imageId} not found`);
        return reference; // Return the reference if the image is not found
      }

      return image.data; // Return the actual image data
    } catch (error) {
      logger.error('Error restoring image reference:', { error });
      return reference; // Return the reference if restoration fails
    }
  }

  /**
   * Get all images associated with a workflow
   * @param {string} workflowId - The workflow ID
   * @returns {Promise<Array>} - Array of images
   */
  async getWorkflowImages(workflowId) {
    try {
      return await Image.find({ workflowId });
    } catch (error) {
      logger.error('Error getting workflow images:', { error, workflowId });
      throw error;
    }
  }

  /**
   * Get image by ID
   * @param {string} id - The image ID
   * @returns {Promise<Object|null>} - The image or null if not found
   */
  async getImageById(id) {
    try {
      return await Image.findById(id);
    } catch (error) {
      logger.error('Error getting image by ID:', { error, id });
      throw error;
    }
  }

  /**
   * Get image data by ID
   * @param {string} id - The image ID
   * @returns {Promise<string|null>} - The image data or null if not found
   */
  async getImageDataById(id) {
    try {
      const image = await Image.findById(id);
      return image ? image.data : null;
    } catch (error) {
      logger.error('Error getting image data by ID:', { error, id });
      return null;
    }
  }

  /**
   * Save image
   * @param {Object} imageData - The image data
   * @returns {Promise<Object>} - The saved image
   */
  async saveImage(imageData) {
    try {
      const image = new Image(imageData);
      await image.save();
      return image;
    } catch (error) {
      logger.error('Error saving image:', { error });
      throw error;
    }
  }

  /**
   * Delete image by ID
   * @param {string} id - The image ID
   * @returns {Promise<boolean>} - Whether the image was deleted
   */
  async deleteImage(id) {
    try {
      const result = await Image.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      logger.error('Error deleting image:', { error, id });
      throw error;
    }
  }

  /**
   * Delete all images associated with a workflow
   * @param {string} workflowId - The workflow ID
   * @returns {Promise<number>} - Number of images deleted
   */
  async deleteWorkflowImages(workflowId) {
    try {
      const result = await Image.deleteMany({ workflowId });
      return result.deletedCount;
    } catch (error) {
      logger.error('Error deleting workflow images:', { error, workflowId });
      throw error;
    }
  }
}

module.exports = new ImageService();