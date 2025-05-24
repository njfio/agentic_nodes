/**
 * Image Node
 * Handles image generation and processing
 */

import { BaseNode } from './base-node.js';
import { ApiService } from '../../services/api-service.js';
import { ImageStorage } from '../../services/image-storage.js';
import { Logger } from '../../core/logger.js';

export class ImageNode extends BaseNode {
  constructor(x, y, id = null) {
    super(x, y, id);
    
    this.type = 'image';
    this.title = 'Image Node';
    this.contentType = 'image';
    this.aiProcessor = 'text-to-image';
    
    // Image properties
    this.contentImage = null;
    this.inputImage = null;
    this.imageInputs = [];
    this.outputImageId = null;
    
    // Image generation settings
    this.imageModel = 'dall-e-3';
    this.imageSize = '1024x1024';
    this.imageQuality = 'standard';
    this.imageStyle = 'vivid';
  }

  /**
   * Perform image processing
   */
  async performProcessing(input) {
    // Detect input type
    const isImageInput = this.isImageData(input);
    
    if (isImageInput) {
      // Image-to-image processing
      return await this.processImageToImage(input);
    } else {
      // Text-to-image processing
      return await this.processTextToImage(input);
    }
  }

  /**
   * Process text to image
   */
  async processTextToImage(prompt) {
    if (!prompt || !prompt.trim()) {
      throw new Error('No prompt provided for image generation');
    }

    Logger.debug('node', `Generating image from text for node ${this.id}`);

    try {
      const response = await ApiService.openai.createImage({
        model: this.imageModel,
        prompt: prompt,
        n: 1,
        size: this.imageSize,
        quality: this.imageQuality,
        style: this.imageStyle
      });

      const imageUrl = response.data[0].url;
      
      // Store the image
      this.outputImageId = ImageStorage.storeImage(imageUrl);
      
      // Preload the image
      await this.preloadImage(imageUrl);
      
      Logger.debug('node', `Image generated successfully for node ${this.id}`);
      
      return imageUrl;
      
    } catch (error) {
      Logger.error('node', `Image generation failed for node ${this.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process image to image
   */
  async processImageToImage(imageInput) {
    Logger.debug('node', `Processing image-to-image for node ${this.id}`);

    try {
      // Handle multiple image inputs
      const imageArray = this.collectImageInputs(imageInput);
      
      if (imageArray.length === 0) {
        throw new Error('No valid image inputs found');
      }

      if (imageArray.length > 1) {
        // Multiple images: use vision API to create enhanced prompt
        return await this.processMultipleImages(imageArray);
      } else {
        // Single image: use variations API
        return await this.processImageVariation(imageArray[0]);
      }
      
    } catch (error) {
      Logger.error('node', `Image-to-image processing failed for node ${this.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process multiple images using vision API
   */
  async processMultipleImages(imageArray) {
    // Use vision API to analyze images and create prompt
    const visionMessages = [
      {
        role: 'system',
        content: 'Analyze these images and create a detailed prompt for generating a new image that combines their key elements and style.'
      },
      {
        role: 'user',
        content: imageArray.map(img => ({
          type: 'image_url',
          image_url: { url: img }
        }))
      }
    ];

    const visionResponse = await ApiService.openai.createChatCompletion({
      model: 'gpt-4-vision-preview',
      messages: visionMessages,
      max_tokens: 1000
    });

    const enhancedPrompt = visionResponse.choices[0].message.content;
    
    // Generate new image with enhanced prompt
    return await this.processTextToImage(enhancedPrompt);
  }

  /**
   * Process single image variation
   */
  async processImageVariation(imageData) {
    // Convert to blob if needed
    const blob = await ImageStorage.dataURLToBlob(imageData);
    
    const formData = new FormData();
    formData.append('image', blob);
    formData.append('n', '1');
    formData.append('size', this.imageSize);
    
    const response = await ApiService.openai.createImageVariation(formData);
    
    const imageUrl = response.data[0].url;
    
    // Store and preload
    this.outputImageId = ImageStorage.storeImage(imageUrl);
    await this.preloadImage(imageUrl);
    
    return imageUrl;
  }

  /**
   * Collect all image inputs
   */
  collectImageInputs(primaryInput) {
    const images = [];
    
    // Add primary input if it's an image
    if (this.isImageData(primaryInput)) {
      images.push(primaryInput);
    }
    
    // Add any additional image inputs
    if (this.imageInputs && this.imageInputs.length > 0) {
      images.push(...this.imageInputs);
    }
    
    // Add images from input sources
    for (const input of this.inputSources.values()) {
      if (this.isImageData(input)) {
        images.push(input);
      }
    }
    
    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Check if data is an image
   */
  isImageData(data) {
    if (typeof data !== 'string') return false;
    
    // Check for data URL
    if (data.startsWith('data:image')) return true;
    
    // Check for image URL
    if (data.startsWith('http')) {
      const url = new URL(data);
      const path = url.pathname.toLowerCase();
      return /\.(jpg|jpeg|png|gif|webp|svg)$/.test(path);
    }
    
    return false;
  }

  /**
   * Preload an image
   */
  async preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.contentImage = img;
        if (this.autoSize) {
          this.calculateOptimalSize();
        }
        resolve(img);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  /**
   * Calculate optimal size based on image
   */
  calculateOptimalSize() {
    if (!this.contentImage) return;
    
    const img = this.contentImage;
    const aspectRatio = img.width / img.height;
    
    // Calculate size maintaining aspect ratio
    if (aspectRatio > 1) {
      // Landscape
      this.width = Math.min(this.maxWidth, Math.max(this.minWidth, 300));
      this.height = Math.min(this.maxHeight, Math.max(this.minHeight, this.width / aspectRatio));
    } else {
      // Portrait or square
      this.height = Math.min(this.maxHeight, Math.max(this.minHeight, 300));
      this.width = Math.min(this.maxWidth, Math.max(this.minWidth, this.height * aspectRatio));
    }
  }

  /**
   * Serialize node
   */
  serialize() {
    return {
      ...super.serialize(),
      aiProcessor: this.aiProcessor,
      outputImageId: this.outputImageId,
      imageModel: this.imageModel,
      imageSize: this.imageSize,
      imageQuality: this.imageQuality,
      imageStyle: this.imageStyle
    };
  }
}