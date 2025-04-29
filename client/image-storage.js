/**
 * ImageStorage - Utility class for handling image storage and caching
 */
class ImageStorage {
  // Static image cache to prevent reloading the same images
  static imageCache = {};

  // Local storage for image IDs
  static imageStore = {};

  // Counter for generating unique image IDs
  static imageIdCounter = 0;

  // Extract base64 data from a data URL
  static extractBase64FromDataURL(dataURL) {
    if (!dataURL) return null;

    // Check if it's a data URL
    if (dataURL.startsWith('data:')) {
      // Extract the base64 part and return it
      return dataURL.split(',')[1];
    }

    // If it's not a data URL, return as is
    return dataURL;
  }

  // Clear the image cache
  static clearCache() {
    this.imageCache = {};
    if (typeof DebugManager !== 'undefined') {
      DebugManager.addLog('Image cache cleared', 'info');
    }
  }

  // Check if an image is in the cache
  static isImageCached(url) {
    return !!this.imageCache[url];
  }

  // Get an image from the cache
  static getImage(url) {
    return this.imageCache[url];
  }

  // Add an image to the cache
  static addImage(url, image) {
    this.imageCache[url] = image;
  }

  // Store an image and return an ID
  static storeImage(imageData) {
    try {
      // Generate a unique ID
      const imageId = `img_${Date.now()}_${++this.imageIdCounter}`;

      // Store the image data in memory only, not in localStorage
      this.imageStore[imageId] = imageData;

      // Try to save to server in the background if API is available
      this.trySaveToServer(imageId, imageData);

      // Return the ID
      return imageId;
    } catch (error) {
      console.error('Error storing image:', error);
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Error storing image: ${error.message}`, 'error');
      }
      // Return a fallback ID even if storage fails
      return `img_fallback_${Date.now()}`;
    }
  }

  // Store an image synchronously and return an ID
  static storeImageSync(imageData) {
    return this.storeImage(imageData);
  }

  // Save an image and return an ID (for API payload optimization)
  static saveImage(imageData) {
    try {
      // Generate a unique ID
      const imageId = `img_${Date.now()}_${++this.imageIdCounter}`;

      // Store the image data in memory only
      this.imageStore[imageId] = imageData;

      // Try to save to server in the background if API is available
      this.trySaveToServer(imageId, imageData);

      // Log the storage
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Stored large image with ID ${imageId} for API payload optimization`, 'info');
      }

      // Return the ID
      return imageId;
    } catch (error) {
      console.error('Error saving image:', error);
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Error saving image: ${error.message}`, 'error');
      }
      // Return a fallback ID even if storage fails
      return `img_fallback_${Date.now()}`;
    }
  }

  // Try to save an image to the server in the background
  static trySaveToServer(imageId, imageData) {
    // Only try if we're in a context with fetch API
    if (typeof fetch === 'undefined') return;

    // Don't block the main thread
    setTimeout(async () => {
      try {
        // Check if we have a server API available
        const response = await fetch('/api/status', { method: 'HEAD' });
        if (response.ok) {
          // Server is available, try to save the image
          await this.saveImageToServer(imageData, null, null);
          if (typeof DebugManager !== 'undefined') {
            DebugManager.addLog(`Image ${imageId} saved to server`, 'info');
          }
        }
      } catch (error) {
        // Silently fail - this is just a background optimization
        console.warn('Could not save image to server:', error);
      }
    }, 100);
  }

  // Get an image by ID
  static getImageById(imageId) {
    return new Promise((resolve, reject) => {
      const imageData = this.imageStore[imageId];
      if (imageData) {
        resolve(imageData);
      } else {
        reject(new Error(`Image with ID ${imageId} not found`));
      }
    });
  }

  // Get an image by ID synchronously
  static getImageSync(imageId) {
    try {
      // Check if the image exists in our in-memory store
      if (this.imageStore[imageId]) {
        return this.imageStore[imageId];
      }

      // If not found, log a warning but don't throw an error
      console.warn(`Image with ID ${imageId} not found in memory cache`);

      // Return null instead of undefined for better error handling
      return null;
    } catch (error) {
      console.error(`Error retrieving image ${imageId}:`, error);
      return null;
    }
  }

  // Load workflow images from the server with progressive loading
  static async loadWorkflowImages(workflowId) {
    try {
      // Show loading indicator in debug log
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Loading images for workflow ${workflowId}...`, 'info');
      }

      // Fetch the list of images for this workflow
      const response = await fetch(`/api/images/workflow/${workflowId}`);
      if (!response.ok) {
        throw new Error(`Failed to load workflow images: ${response.statusText}`);
      }

      const images = await response.json();

      // Check if we have too many images
      if (images.length > 50) {
        if (typeof DebugManager !== 'undefined') {
          DebugManager.addLog(`Warning: Large number of images (${images.length}) detected. Loading will be optimized.`, 'warning');
        }
      }

      // Store the image metadata for lazy loading
      this.pendingImages = images.map(img => ({
        imageId: img.imageId,
        nodeId: img.node,
        loaded: false,
        loading: false,
        retries: 0,
        priority: this.calculateImagePriority(img)
      }));

      // Sort by priority (higher priority first)
      this.pendingImages.sort((a, b) => b.priority - a.priority);

      // Log the number of images to load
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Preparing to load ${images.length} images for workflow ${workflowId}`, 'info');
      }

      // Start loading the first batch of images (high priority ones)
      const initialBatchSize = Math.min(3, this.pendingImages.length);
      await this.loadNextImageBatch(workflowId, initialBatchSize);

      // Schedule loading of remaining images in the background with increasing delays
      setTimeout(() => {
        this.loadRemainingImagesProgressively(workflowId);
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error loading workflow images:', error);
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Failed to load workflow images: ${error.message}`, 'error');
      }
      // Return true anyway to allow the workflow to load without images
      return true;
    }
  }

  // Calculate priority for image loading (higher = load sooner)
  static calculateImagePriority(imageInfo) {
    // Default priority
    let priority = 1;

    // Prioritize images in visible nodes
    if (typeof App !== 'undefined' && App.nodes) {
      const node = App.nodes.find(n => n.id === imageInfo.nodeId);
      if (node) {
        // Check if node is in the visible area
        const canvas = document.getElementById('canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const viewportWidth = rect.width;
          const viewportHeight = rect.height;

          // Check if node is in the viewport
          if (node.x >= 0 && node.x <= viewportWidth &&
              node.y >= 0 && node.y <= viewportHeight) {
            priority += 5; // Much higher priority for visible nodes
          } else {
            // Calculate distance from viewport center
            const centerX = viewportWidth / 2;
            const centerY = viewportHeight / 2;
            const distance = Math.sqrt(
              Math.pow(node.x - centerX, 2) +
              Math.pow(node.y - centerY, 2)
            );

            // Closer nodes get higher priority
            priority += Math.max(0, 3 - (distance / 500));
          }
        }
      }
    }

    return priority;
  }

  // Load the next batch of images
  static async loadNextImageBatch(workflowId, batchSize = 3) {
    if (!this.pendingImages || this.pendingImages.length === 0) return;

    // Find images that haven't been loaded or attempted yet
    const nextBatch = this.pendingImages
      .filter(img => !img.loaded && !img.loading && img.retries < 3)
      .slice(0, batchSize);

    if (nextBatch.length === 0) return;

    // Mark these images as loading
    nextBatch.forEach(img => {
      img.loading = true;
      img.retries++;
    });

    // Log batch loading
    if (typeof DebugManager !== 'undefined') {
      DebugManager.addLog(`Loading batch of ${nextBatch.length} images...`, 'info');
    }

    // Load each image in the batch concurrently with a timeout
    const loadPromises = nextBatch.map(img => {
      // Add a timeout to each image load to prevent hanging
      return Promise.race([
        this.loadSingleImage(img.imageId, img.nodeId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Image load timeout')), 15000)
        )
      ]).catch(err => {
        console.warn(`Error loading image ${img.imageId}:`, err);
        return false;
      });
    });

    // Wait for all images in this batch to load (or fail)
    await Promise.allSettled(loadPromises);

    // Update the status of loaded images
    nextBatch.forEach(img => {
      img.loading = false;
      if (this.imageStore[`img_${img.imageId}`]) {
        img.loaded = true;
      }
    });

    // Force a redraw to show the loaded images
    if (typeof App !== 'undefined') {
      App.draw();
    }

    // Return the number of successfully loaded images
    return nextBatch.filter(img => img.loaded).length;
  }

  // Load remaining images progressively to avoid freezing the browser
  static async loadRemainingImagesProgressively(workflowId) {
    if (!this.pendingImages) return;

    // Count how many images are still pending
    const pendingCount = this.pendingImages.filter(img => !img.loaded).length;

    if (pendingCount === 0) {
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`All images loaded for workflow ${workflowId}`, 'success');
      }
      return;
    }

    // Update loading status
    if (typeof DebugManager !== 'undefined') {
      DebugManager.addLog(`Loading remaining images: ${pendingCount} left`, 'info');
    }

    // Calculate batch size based on remaining count
    // Use smaller batches for large numbers of images
    let batchSize = 3;
    if (pendingCount > 50) {
      batchSize = 2;
    } else if (pendingCount > 20) {
      batchSize = 3;
    } else if (pendingCount > 10) {
      batchSize = 4;
    } else {
      batchSize = 5;
    }

    // Load the next batch
    const loadedCount = await this.loadNextImageBatch(workflowId, batchSize);

    // Calculate delay based on success rate
    let delay = 500; // Default delay

    if (loadedCount === 0) {
      // If no images loaded successfully, increase delay
      delay = 2000;
    } else if (loadedCount < batchSize / 2) {
      // If less than half loaded successfully, use medium delay
      delay = 1000;
    }

    // Schedule the next batch with a delay to allow the browser to breathe
    setTimeout(() => {
      this.loadRemainingImagesProgressively(workflowId);
    }, delay);
  }

  // Load a single image with error handling
  static async loadSingleImage(imageId, nodeId) {
    try {
      // Skip if already loaded
      if (this.imageStore[`img_${imageId}`]) {
        return true;
      }

      // Fetch the image data with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const imageResponse = await fetch(`/api/images/${imageId}`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!imageResponse.ok) {
          throw new Error(`Failed to load image ${imageId}: ${imageResponse.statusText}`);
        }

        const imageData = await imageResponse.json();

        // Store the image data
        this.imageStore[`img_${imageId}`] = imageData.data;

        // Check if the data is valid
        if (!imageData.data || typeof imageData.data !== 'string' ||
            (!imageData.data.startsWith('data:image') && !imageData.data.startsWith('http'))) {
          throw new Error(`Invalid image data for ${imageId}`);
        }

        // Create a new image object for the cache, but with a size limit
        const img = new Image();

        // Set up load and error handlers with timeout
        await new Promise((resolve, reject) => {
          // Set a timeout for image loading
          const loadTimeoutId = setTimeout(() => {
            reject(new Error(`Timeout loading image ${imageId}`));
          }, 8000); // 8 second timeout for image loading

          img.onload = () => {
            clearTimeout(loadTimeoutId);

            try {
              // Check if the image is too large and resize if needed
              if (img.width > 1000 || img.height > 1000) {
                // Create a canvas to resize the image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions (maintaining aspect ratio)
                const maxDimension = 1000;
                const ratio = Math.min(maxDimension / img.width, maxDimension / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                // Draw the resized image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Replace the image data with the resized version
                const resizedData = canvas.toDataURL('image/jpeg', 0.85);
                this.imageStore[`img_${imageId}`] = resizedData;

                // Create a new image with the resized data
                const resizedImg = new Image();
                resizedImg.src = resizedData;
                this.imageCache[resizedData] = resizedImg;

                if (typeof DebugManager !== 'undefined') {
                  DebugManager.addLog(`Resized large image ${imageId} for node ${nodeId}`, 'info');
                }
              } else {
                // Use the original image
                this.imageCache[imageData.data] = img;
              }
              resolve();
            } catch (err) {
              // If resizing fails, still use the original image
              this.imageCache[imageData.data] = img;
              console.warn(`Error resizing image ${imageId}:`, err);
              resolve();
            }
          };

          img.onerror = () => {
            clearTimeout(loadTimeoutId);
            if (typeof DebugManager !== 'undefined') {
              DebugManager.addLog(`Failed to load image ${imageId} for node ${nodeId}`, 'error');
            }
            reject(new Error(`Failed to load image ${imageId}`));
          };

          // Set the source to trigger loading
          img.src = imageData.data;

          // For already cached images in the browser
          if (img.complete) {
            clearTimeout(loadTimeoutId);
            img.onload();
          }
        }).catch(err => {
          console.warn(`Error processing image ${imageId}:`, err);
          // Still return true since we have the data stored
          return true;
        });

        return true;
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error(`Fetch timeout for image ${imageId}`);
        }
        throw fetchErr;
      }
    } catch (err) {
      console.warn(`Error loading image ${imageId}:`, err);
      return false;
    }
  }

  // Save an image to the server
  static async saveImageToServer(imageData, nodeId, workflowId) {
    try {
      // Extract base64 data if it's a data URL
      const base64Data = this.extractBase64FromDataURL(imageData);

      // Create the request body
      const requestBody = {
        data: base64Data,
        node: nodeId,
        workflow: workflowId
      };

      // Send the request
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to save image: ${response.statusText}`);
      }

      const result = await response.json();
      return result.imageId;
    } catch (error) {
      console.error('Error saving image to server:', error);
      throw error;
    }
  }
}

// Initialize the ImageStorage when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Add a cache cleanup interval to prevent memory leaks
  setInterval(() => {
    // Only clear the cache if it gets too large
    const cacheSize = Object.keys(ImageStorage.imageCache).length;
    if (cacheSize > 100) {
      DebugManager.addLog(`Image cache size (${cacheSize}) exceeded limit, clearing...`, 'info');
      ImageStorage.clearCache();
    }
  }, 300000); // Check every 5 minutes
});
