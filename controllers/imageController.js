const Image = require('../models/Image');

/**
 * Get image data by ID (for internal use)
 * @param {string} imageId - The image ID
 * @returns {object|null} - The image data or null if not found
 */
exports.getImageDataById = async (imageId) => {
  try {
    const image = await Image.findOne({ imageId });

    if (!image) {
      console.error(`Image with ID ${imageId} not found`);
      return null;
    }

    return {
      imageId: image.imageId,
      data: image.data,
      contentType: image.contentType,
      size: image.size,
      width: image.width,
      height: image.height
    };
  } catch (error) {
    console.error(`Error fetching image data for ID ${imageId}:`, error);
    return null;
  }
};

// Get an image by its ID
exports.getImageById = async (req, res) => {
  try {
    const image = await Image.findOne({ imageId: req.params.id });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json({
      imageId: image.imageId,
      data: image.data,
      contentType: image.contentType,
      size: image.size,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Save a new image
exports.saveImage = async (req, res) => {
  try {
    const { imageId, data, contentType, size, width, height, workflow, node } = req.body;

    // Check if image with this ID already exists
    const existingImage = await Image.findOne({ imageId });

    if (existingImage) {
      // Update existing image
      existingImage.data = data;
      existingImage.contentType = contentType;
      existingImage.size = size;
      existingImage.width = width;
      existingImage.height = height;
      existingImage.updatedAt = Date.now();

      if (workflow) existingImage.workflow = workflow;
      if (node) existingImage.node = node;

      await existingImage.save();

      return res.json({
        imageId: existingImage.imageId,
        contentType: existingImage.contentType,
        size: existingImage.size,
        width: existingImage.width,
        height: existingImage.height
      });
    }

    // Create new image
    const image = new Image({
      imageId,
      data,
      contentType,
      size,
      width,
      height,
      workflow,
      node,
      user: req.user?.id || null
    });

    await image.save();

    res.status(201).json({
      imageId: image.imageId,
      contentType: image.contentType,
      size: image.size,
      width: image.width,
      height: image.height
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all images for a workflow
exports.getWorkflowImages = async (req, res) => {
  try {
    const images = await Image.find({ workflow: req.params.workflowId });

    // Return only metadata, not the actual image data
    const imageMetadata = images.map(image => ({
      imageId: image.imageId,
      contentType: image.contentType,
      size: image.size,
      width: image.width,
      height: image.height,
      node: image.node,
      createdAt: image.createdAt
    }));

    res.json(imageMetadata);
  } catch (error) {
    console.error('Error fetching workflow images:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an image
exports.deleteImage = async (req, res) => {
  try {
    const image = await Image.findOne({ imageId: req.params.id });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    await image.remove();
    res.json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
