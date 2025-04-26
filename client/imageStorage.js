// Image Storage Utility
// This utility handles storing and retrieving images for OpenAI API integration

const ImageStorage = {
  // In-memory storage for images
  images: new Map(),

  // Counter for generating unique image IDs
  counter: 0,

  // Store an image and return a reference ID
  storeImage(imageData) {
    // Generate a unique ID for this image
    const imageId = `img_${Date.now()}_${this.counter++}`;

    // Store the image data
    this.images.set(imageId, imageData);

    // Log the storage
    console.log(`Stored image with ID: ${imageId}`);

    // Return the image ID
    return imageId;
  },

  // Retrieve an image by its ID
  getImage(imageId) {
    // Check if the image exists
    if (!this.images.has(imageId)) {
      console.error(`Image with ID ${imageId} not found`);
      return null;
    }

    // Return the image data
    return this.images.get(imageId);
  },

  // Check if an image exists
  hasImage(imageId) {
    return this.images.has(imageId);
  },

  // Delete an image
  deleteImage(imageId) {
    if (this.images.has(imageId)) {
      this.images.delete(imageId);
      console.log(`Deleted image with ID: ${imageId}`);
      return true;
    }
    return false;
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
  }
};

// Export the ImageStorage utility
window.ImageStorage = ImageStorage;
