// Image Storage Utility
// This utility handles storing and retrieving images for OpenAI API integration

const ImageStorage = {
  // In-memory cache for images
  imageCache: new Map(),

  // Counter for generating unique image IDs
  counter: 0,

  // Store an image and return a reference ID
  async storeImage(imageData, workflowId = null, nodeId = null) {
    try {
      // Generate a unique ID for this image
      const imageId = `img_${Date.now()}_${this.counter++}`;

      // Get image dimensions if possible
      let width = 0;
      let height = 0;

      if (typeof window !== 'undefined' && imageData.startsWith('data:image')) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            resolve();
          };
          img.onerror = reject;
          img.src = imageData;
        });
      }

      // Store in local cache first
      this.imageCache.set(imageId, imageData);

      // Try to store in the database
      try {
        const response = await fetch('/api/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageId,
            data: imageData,
            contentType: this.getContentTypeFromDataURL(imageData),
            size: imageData.length,
            width,
            height,
            workflow: workflowId,
            node: nodeId
          })
        });

        if (!response.ok) {
          console.warn(`Failed to store image in database: ${response.statusText}`);
        }
      } catch (apiError) {
        console.warn('Failed to store image in database, using in-memory storage only:', apiError);
      }

      // Log the storage
      console.log(`Stored image with ID: ${imageId}`);

      // Return the image ID
      return imageId;
    } catch (error) {
      console.error('Error storing image:', error);
      return null;
    }
  },

  // Retrieve an image by its ID
  async getImage(imageId) {
    // Check if the image exists in cache
    if (this.imageCache.has(imageId)) {
      return this.imageCache.get(imageId);
    }

    // Try to fetch from the database
    try {
      const response = await fetch(`/api/images/${imageId}`);

      if (response.ok) {
        const imageData = await response.json();

        // Store in cache for future use
        this.imageCache.set(imageId, imageData.data);

        // Return the image data
        return imageData.data;
      } else {
        console.error(`Image with ID ${imageId} not found in database`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching image ${imageId} from database:`, error);
      return null;
    }
  },

  // Check if an image exists
  async hasImage(imageId) {
    // Check cache first
    if (this.imageCache.has(imageId)) {
      return true;
    }

    // Try to fetch from the database
    try {
      const response = await fetch(`/api/images/${imageId}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  // Delete an image
  async deleteImage(imageId) {
    // Remove from cache
    if (this.imageCache.has(imageId)) {
      this.imageCache.delete(imageId);
    }

    // Try to delete from the database
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log(`Deleted image with ID: ${imageId}`);
        return true;
      } else {
        console.warn(`Failed to delete image ${imageId} from database: ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error(`Error deleting image ${imageId} from database:`, error);
      return false;
    }
  },

  // Extract base64 data from a data URL
  extractBase64FromDataURL(dataURL) {
    if (dataURL.startsWith('data:')) {
      const parts = dataURL.split(',');
      return parts[1];
    }
    return dataURL;
  },

  // Get content type from a data URL
  getContentTypeFromDataURL(dataURL) {
    if (dataURL.startsWith('data:')) {
      const parts = dataURL.split(',');
      const contentTypePart = parts[0].match(/:(.*?);/);
      return contentTypePart ? contentTypePart[1] : 'image/png';
    }
    return 'image/png';
  },

  // Convert a base64 image to a Blob
  async base64ToBlob(base64Data) {
    // Extract the base64 data if it's a data URL
    let contentType = 'image/png';
    let base64 = base64Data;

    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(',');
      const contentTypePart = parts[0].match(/:(.*?);/);
      contentType = contentTypePart ? contentTypePart[1] : 'image/png';
      base64 = parts[1];
    }

    // Convert base64 to binary
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  },

  // Convert a Blob to a base64 string
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // Prepare images for the OpenAI API edit endpoint
  async prepareImagesForEdit(imageIds) {
    const preparedImages = [];

    for (const imageId of imageIds) {
      try {
        // Get the image data
        const imageData = this.getImage(imageId);
        if (!imageData) {
          console.error(`Failed to prepare image ${imageId}: Image not found`);
          continue;
        }

        // For the OpenAI edit API, we need to extract the base64 data
        // if it's a data URL, or use the raw data if it's already base64
        let base64Data;
        if (imageData.startsWith('data:')) {
          base64Data = this.extractBase64FromDataURL(imageData);
        } else {
          base64Data = imageData;
        }

        // Add to the prepared images array
        preparedImages.push(base64Data);
      } catch (error) {
        console.error(`Error preparing image ${imageId}: ${error.message}`);
      }
    }

    return preparedImages;
  },

  // Fetch an image from a URL and convert to base64
  async fetchImageAsBase64(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await this.blobToBase64(blob);
    } catch (error) {
      console.error(`Error fetching image from URL: ${error.message}`);
      return null;
    }
  },

  // Load all images for a workflow
  async loadWorkflowImages(workflowId) {
    if (!workflowId) return [];

    try {
      // Fetch all images for this workflow
      const response = await fetch(`/api/images/workflow/${workflowId}`);

      if (!response.ok) {
        console.warn(`Failed to load workflow images: ${response.statusText}`);
        return [];
      }

      const images = await response.json();

      // Load each image into the cache
      for (const imageMetadata of images) {
        // Only fetch if not already in cache
        if (!this.imageCache.has(imageMetadata.imageId)) {
          const imageResponse = await fetch(`/api/images/${imageMetadata.imageId}`);

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            this.imageCache.set(imageMetadata.imageId, imageData.data);
          }
        }
      }

      return images.map(img => img.imageId);
    } catch (error) {
      console.error('Error loading workflow images:', error);
      return [];
    }
  }
};

// Export the ImageStorage utility
window.ImageStorage = ImageStorage;
