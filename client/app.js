// Constants and Utility functions
const Utils = {
  drawConnection(ctx, startX, startY, endX, endY, color = '#4a90e2', showArrow = false) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    // Calculate control points for bezier curve
    const cp1x = startX + 50;
    const cp1y = startY;
    const cp2x = endX - 50;
    const cp2y = endY;

    // Draw the curve
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();

    if (showArrow) {
      const arrowSize = 10;
      const angle = Math.atan2(endY - cp2y, endX - cp2x);

      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI/6),
        endY - arrowSize * Math.sin(angle - Math.PI/6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI/6),
        endY - arrowSize * Math.sin(angle + Math.PI/6)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  },

  drawTooltip(ctx, text, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = '12px Arial';
    const metrics = ctx.measureText(text);
    const padding = 5;
    const width = metrics.width + padding * 2;
    const height = 20;

    ctx.fillRect(x - width/2, y - height - 5, width, height);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - height/2 - 5);
    ctx.restore();
  },

  // Token counting utility
  async countTokens(text) {
    // Simple estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  },

  // Check if a string is image data (base64 or URL)
  isImageData(str) {
    if (typeof str !== 'string') return false;

    // Check for base64 image data
    if (str.startsWith('data:image')) {
      return true;
    }

    // Check for image URLs with more strict validation
    if (str.startsWith('http')) {
      // Extract the path from the URL
      try {
        const url = new URL(str);
        const path = url.pathname.toLowerCase();

        // Check for common image extensions in the path
        return path.endsWith('.jpg') ||
               path.endsWith('.jpeg') ||
               path.endsWith('.png') ||
               path.endsWith('.gif') ||
               path.endsWith('.webp') ||
               path.endsWith('.svg');
      } catch (e) {
        // If URL parsing fails, it's not a valid URL
        return false;
      }
    }

    return false;
  }
};

// Debug Manager
const DebugManager = {
  state: {
    fps: 60,
    lastFrameTime: 0,
    activeNodes: 0,
    processingNodes: 0,
    totalRequests: 0,
    totalTokens: 0,
    totalProcessingTime: 0,
    requestQueue: 0,
    lastRequestTime: null,
    recentLogs: [],
    maxLogs: 50
  },

  init() {
    this.initDebugPanel();
    this.startDebugLoop();
    this.loadStats();
  },

  initDebugPanel() {
    document.getElementById('toggleDebug').addEventListener('click', () => {
      const content = document.querySelector('.debug-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
  },

  startDebugLoop() {
    const updateDebug = () => {
      const now = performance.now();
      const delta = now - this.state.lastFrameTime;
      this.state.fps = Math.round(1000 / delta);
      this.state.lastFrameTime = now;

      this.updateDebugPanel();
      requestAnimationFrame(updateDebug);
    };
    updateDebug();
  },

  updateDebugPanel() {
    document.getElementById('fps').textContent = this.state.fps;
    document.getElementById('activeNodes').textContent = App.nodes.length;
    document.getElementById('processingNodes').textContent = this.state.processingNodes;
    document.getElementById('requestQueue').textContent = this.state.requestQueue;
    document.getElementById('lastRequestTime').textContent =
      this.state.lastRequestTime ? new Date(this.state.lastRequestTime).toLocaleTimeString() : '-';
  },

  addLog(message, type = 'info') {
    const log = {
      time: new Date().toLocaleTimeString(),
      message,
      type
    };

    this.state.recentLogs.unshift(log);
    if (this.state.recentLogs.length > this.state.maxLogs) {
      this.state.recentLogs.pop();
    }

    // Update debug panel logs
    const logsDiv = document.getElementById('recentLogs');
    const logElement = document.createElement('div');
    logElement.className = `log-entry ${type}`;
    logElement.textContent = `${log.time} - ${log.message}`;
    logsDiv.insertBefore(logElement, logsDiv.firstChild);

    // Update node processing log if active
    if (App.editingNode) {
      const processingLog = document.getElementById('processingLog');
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${type}`;
      logEntry.textContent = `${log.time} - ${log.message}`;
      processingLog.appendChild(logEntry);
      processingLog.scrollTop = processingLog.scrollHeight;
    }
  },

  updateUsageStats() {
    document.getElementById('totalRequests').textContent = this.state.totalRequests;
    document.getElementById('totalTokens').textContent = this.state.totalTokens;

    const avgTime = this.state.totalRequests ?
      Math.round(this.state.totalProcessingTime / this.state.totalRequests) : 0;
    document.getElementById('avgResponseTime').textContent = `${avgTime}ms`;

    this.saveStats();
  },

  updateCanvasStats() {
    document.getElementById('nodeCount').textContent = App.nodes.length;
    document.getElementById('connectionCount').textContent = App.connections.length;

    // Count unique processing chains
    const chains = new Set();
    App.nodes.forEach(node => {
      let current = node;
      let chain = [current.id];
      while (current) {
        const next = App.connections.find(c => c.fromNode === current)?.toNode;
        if (!next || chain.includes(next.id)) break;
        chain.push(next.id);
        current = next;
      }
      chains.add(chain.join('-'));
    });
    document.getElementById('chainCount').textContent = chains.size;
  },

  saveStats() {
    localStorage.setItem('usage_stats', JSON.stringify({
      totalRequests: this.state.totalRequests,
      totalTokens: this.state.totalTokens,
      totalProcessingTime: this.state.totalProcessingTime
    }));
  },

  loadStats() {
    const stats = JSON.parse(localStorage.getItem('usage_stats') || '{}');
    this.state.totalRequests = stats.totalRequests || 0;
    this.state.totalTokens = stats.totalTokens || 0;
    this.state.totalProcessingTime = stats.totalProcessingTime || 0;
    this.updateUsageStats();
  }
};

// Node class
class Node {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.title = "Node " + id;
    this.content = "";        // This will now store the output content
    this.inputContent = "";   // New property to store input prompt/content
    this.contentType = 'text';
    this.systemPrompt = "";
    this.aiProcessor = "text-to-text";
    this.inputType = "text";
    this.outputType = "text";
    this.selected = false;
    this.width = 240;  // Default width
    this.height = 200; // Default height
    this.minWidth = 240;  // Minimum width
    this.minHeight = 200; // Minimum height
    this.maxWidth = 500;  // Maximum width
    this.maxHeight = 600; // Maximum height
    this.processing = false;
    this.error = null;
    this.contentImage = null; // For caching output image content
    this.inputImage = null;   // For caching input image content
    this.contentVideo = null; // For caching video content
    this.contentAudio = null; // For caching audio content
    this.expanded = false;    // Track if node is expanded to show more content
    this.hasBeenProcessed = false; // Track if node has been processed
    this.autoSize = true;     // Whether to automatically resize based on content
    this.stats = {
      inputTokens: 0,
      outputTokens: 0,
      lastProcessingTime: 0
    };
  }

  getContentTypeIcon() {
    switch(this.contentType) {
      case 'image': return '🖼️';
      case 'audio': return '🔊';
      case 'video': return '🎥';
      default: return '📝';
    }
  }

  async process(input) {
    this.processing = true;
    this.error = null;
    DebugManager.state.processingNodes++;
    DebugManager.addLog(`Processing node ${this.id}...`);

    // Store the input content
    this.inputContent = input;

    // Detect if input is an image URL
    const isImageInput = Utils.isImageData(input);

    const startTime = performance.now();
    try {
      let output;

      // Handle different processor types with image awareness
      switch (this.aiProcessor) {
        case 'text-to-text':
          if (isImageInput) {
            // If input is an image and this is a text-to-text node,
            // use image-to-text processing instead
            DebugManager.addLog(`Node ${this.id} received image input, using image-to-text processing`, 'info');
            output = await this.processImageToText(input);
          } else {
            output = await this.processTextToText(input);
          }
          break;

        case 'text-to-image':
          output = await this.processTextToImage(input);
          break;

        case 'image-to-text':
          output = await this.processImageToText(input);
          break;

        case 'audio-to-text':
          output = await this.processAudioToText(input);
          break;

        default:
          output = input;
      }

      // Store the output content
      this.content = output;

      // Mark as processed
      this.hasBeenProcessed = true;

      // For text-to-image nodes, ensure content type is set to image
      if (this.aiProcessor === 'text-to-image') {
        this.contentType = 'image';

        // Store the input content for text-to-image nodes
        if (!this.inputContent && input) {
          this.inputContent = input;
        }

        // Make sure the image is preloaded
        if (this.content) {
          // Force recreate the image object to ensure it loads properly
          this.contentImage = null;
          this.preloadContent();

          // Log success for debugging
          DebugManager.addLog(`Image content set for node ${this.id}: ${this.content.substring(0, 30)}...`, 'info');
        } else {
          DebugManager.addLog(`Warning: No image content for node ${this.id} after processing`, 'warning');
        }
      }

      // Auto-resize the node to fit the content
      if (this.autoSize) {
        this.calculateOptimalSize();
      }

      const endTime = performance.now();
      this.stats.lastProcessingTime = endTime - startTime;
      DebugManager.state.totalProcessingTime += this.stats.lastProcessingTime;

      // Update token counts
      this.stats.inputTokens = await Utils.countTokens(input);
      this.stats.outputTokens = await Utils.countTokens(output);
      DebugManager.state.totalTokens += this.stats.outputTokens;

      DebugManager.addLog(`Node ${this.id} processed successfully`, 'success');
      return output;
    } catch (err) {
      this.error = err.message;
      DebugManager.addLog(`Node ${this.id} error: ${err.message}`, 'error');
      throw err;
    } finally {
      this.processing = false;
      DebugManager.state.processingNodes--;
      DebugManager.updateUsageStats();
    }
  }

  async processTextToText(input) {
    DebugManager.state.requestQueue++;
    DebugManager.state.lastRequestTime = Date.now();

    try {
      const config = JSON.parse(localStorage.getItem(Config.storageKeys.openAIConfig) || '{}');

      // Prepare the request data
      const requestData = {
        model: config.model || Config.defaultOpenAIConfig.model,
        messages: [
          { role: 'system', content: this.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ],
        temperature: config.temperature || Config.defaultOpenAIConfig.temperature,
        max_tokens: config.maxTokens || Config.defaultOpenAIConfig.maxTokens
      };

      try {
        // Call the API through our service
        const data = await ApiService.openai.chat(requestData);

        DebugManager.state.totalRequests++;
        return data.choices[0].message.content;
      } catch (apiError) {
        // Check if it's an API key error
        if (apiError.message && (
            apiError.message.includes('API key') ||
            apiError.message.includes('not configured') ||
            apiError.message.includes('Invalid OpenAI'))) {

          // Show a more helpful error message
          const errorMessage = 'OpenAI API key is not configured or is invalid.';
          DebugManager.addLog(errorMessage, 'error');

          // Return a helpful message as the output
          return `⚠️ OpenAI API Error: ${errorMessage}\n\nTo fix this issue:\n1. Click the "Config" button in the toolbar\n2. Enter your OpenAI API key in the configuration modal\n3. Click "Save Configuration"\n4. Try again`;
        }

        // For other errors, throw normally
        throw apiError;
      }
    } catch (error) {
      DebugManager.addLog(`Text-to-text API error: ${error.message}`, 'error');
      throw error;
    } finally {
      DebugManager.state.requestQueue--;
    }
  }

  async processTextToImage(input) {
    DebugManager.state.requestQueue++;
    DebugManager.state.lastRequestTime = Date.now();

    try {
      // Store the input content
      this.inputContent = input;

      // Prepare the request data
      const requestData = {
        model: Config.imageModel,
        prompt: input,
        n: 1,
        size: "1024x1024"
      };

      try {
        // Call the API through our service
        const data = await ApiService.openai.generateImage(requestData);

        DebugManager.state.totalRequests++;

        // Set content type to image
        this.contentType = 'image';

        // Mark as processed
        this.hasBeenProcessed = true;

        let imageUrl;
        // Handle both response formats
        // gpt-image-1 returns data.data[0].url or data.data[0].revised_prompt
        if (data.data && data.data.length > 0) {
          if (data.data[0].url) {
            imageUrl = data.data[0].url;
          } else if (data.data[0].b64_json) {
            imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
          } else {
            throw new Error('No image URL or base64 data in the response');
          }
        } else {
          throw new Error('Invalid response format from image generation API');
        }

        // Preload the image to ensure it's available for display
        if (imageUrl) {
          // Force recreate the image object to ensure it loads properly
          this.contentImage = new Image();
          this.contentImage.src = imageUrl;

          // Add load event listener to redraw when image loads
          this.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (this.autoSize) {
              this.calculateOptimalSize();
            }
            // Force a redraw to show the image
            App.draw();
          };

          // Log success for debugging
          DebugManager.addLog(`Image generated successfully for node ${this.id}: ${imageUrl.substring(0, 30)}...`, 'success');
        }

        return imageUrl;
      } catch (apiError) {
        // Check if it's an API key error
        if (apiError.message && (
            apiError.message.includes('API key') ||
            apiError.message.includes('not configured') ||
            apiError.message.includes('Invalid OpenAI'))) {

          // Show a more helpful error message
          const errorMessage = 'OpenAI API key is not configured or is invalid.';
          DebugManager.addLog(errorMessage, 'error');

          // Create a placeholder image with the error message
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');

          // Fill background
          ctx.fillStyle = '#333';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw error message
          ctx.fillStyle = '#ff4444';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ OpenAI API Error', canvas.width/2, 50);

          ctx.fillStyle = '#fff';
          ctx.font = '14px Arial';
          ctx.fillText('API key is not configured or is invalid.', canvas.width/2, 100);
          ctx.fillText('To fix this issue:', canvas.width/2, 140);
          ctx.fillText('1. Click the "Config" button in the toolbar', canvas.width/2, 170);
          ctx.fillText('2. Enter your OpenAI API key in the modal', canvas.width/2, 200);
          ctx.fillText('3. Click "Save Configuration"', canvas.width/2, 230);
          ctx.fillText('4. Try again', canvas.width/2, 260);

          // Convert canvas to data URL
          const errorImageUrl = canvas.toDataURL('image/png');

          // Set as content image
          this.contentImage = new Image();
          this.contentImage.src = errorImageUrl;

          // Set content type to image
          this.contentType = 'image';

          // Mark as processed with error
          this.hasBeenProcessed = true;
          this.error = errorMessage;

          return errorImageUrl;
        }

        // For other errors, throw normally
        throw apiError;
      }
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error generating image: ${error.message}`, 'error');
      // Set the error on the node
      this.error = error.message;
      throw error;
    } finally {
      DebugManager.state.requestQueue--;
    }
  }

  async processImageToText(input) {
    DebugManager.state.requestQueue++;
    DebugManager.state.lastRequestTime = Date.now();

    try {
      // Ensure input is a valid image URL or base64 data
      if (!input) {
        throw new Error('No image provided');
      }

      // For image-to-text nodes, the input might be the content of the node itself
      // This happens when the node is directly edited
      const imageUrl = this.aiProcessor === 'image-to-text' && this.content ? this.content : input;

      // Log the image URL for debugging
      DebugManager.addLog(`Processing image: ${imageUrl.substring(0, 50)}...`, 'info');

      // Prepare the request data
      const requestData = {
        model: Config.imageAnalysisModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: this.systemPrompt || "Describe this image in detail." },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: Config.defaultOpenAIConfig.maxTokens
      };

      try {
        // Call the API through our service
        const data = await ApiService.openai.chat(requestData);

        DebugManager.state.totalRequests++;

        // Set content type to text for image-to-text nodes
        this.contentType = 'text';

        return data.choices[0].message.content;
      } catch (apiError) {
        // Check if it's an API key error
        if (apiError.message && (
            apiError.message.includes('API key') ||
            apiError.message.includes('not configured') ||
            apiError.message.includes('Invalid OpenAI'))) {

          // Show a more helpful error message
          const errorMessage = 'OpenAI API key is not configured or is invalid.';
          DebugManager.addLog(errorMessage, 'error');

          // Return a helpful message as the output
          this.contentType = 'text';
          return `⚠️ OpenAI API Error: ${errorMessage}\n\nTo fix this issue:\n1. Click the "Config" button in the toolbar\n2. Enter your OpenAI API key in the configuration modal\n3. Click "Save Configuration"\n4. Try again`;
        }

        // For other errors, throw normally
        throw apiError;
      }
    } catch (error) {
      DebugManager.addLog(`Image-to-text API error: ${error.message}`, 'error');
      this.error = error.message;
      throw error;
    } finally {
      DebugManager.state.requestQueue--;
    }
  }

  async processAudioToText(input) {
    throw new Error('Audio to Text processing not implemented');
  }

  canAcceptInput(fromNode) {
    // Standard type matching
    if (this.inputType === fromNode.outputType) {
      return true;
    }

    // Special case: Allow image inputs for image-to-text nodes
    if (this.aiProcessor === 'image-to-text' && fromNode.contentType === 'image') {
      return true;
    }

    // Special case: Allow image inputs for text-to-text nodes with system prompts that handle images
    if (this.aiProcessor === 'text-to-text' && fromNode.contentType === 'image' &&
        (this.systemPrompt.toLowerCase().includes('image') ||
         this.systemPrompt.toLowerCase().includes('visual') ||
         this.systemPrompt.toLowerCase().includes('picture'))) {
      return true;
    }

    return false;
  }

  // Preload content for rendering
  preloadContent() {
    // Special handling for text-to-image nodes
    if (this.aiProcessor === 'text-to-image') {
      // Force content type to image
      this.contentType = 'image';

      // If this is a text-to-image node that has been processed but has no content,
      // try to recover the image from contentImage
      if (this.hasBeenProcessed && !this.content && this.contentImage && this.contentImage.src) {
        this.content = this.contentImage.src;
        DebugManager.addLog(`Recovered image content for node ${this.id} during preload`, 'info');
      }
    }

    // Detect if input is an image URL
    const isImageInput = Utils.isImageData(this.inputContent);

    // Preload input image if needed
    if (isImageInput && !this.inputImage) {
      this.inputImage = new Image();
      this.inputImage.src = this.inputContent;

      // When input image loads, update node size if auto-sizing is enabled
      this.inputImage.onload = () => {
        if (this.autoSize) {
          this.calculateOptimalSize();
          App.draw();
        }
      };
    }

    // If output content exists and is not already preloaded
    if (this.content && !this.contentImage && (this.contentType === 'image' || this.aiProcessor === 'text-to-image')) {
      this.contentImage = new Image();
      this.contentImage.src = this.content;

      // When output image loads, update node size if auto-sizing is enabled
      this.contentImage.onload = () => {
        if (this.autoSize) {
          this.calculateOptimalSize();
          App.draw();
        }
      };

      // For text-to-image nodes, ensure we set the content type to image
      if (this.aiProcessor === 'text-to-image') {
        this.contentType = 'image';
      }
    }

    if (this.content && !this.contentVideo && this.contentType === 'video') {
      // For video, we'd need to create a video element and capture a frame
      // This is more complex and would require a canvas to render a thumbnail
      // For now, we'll just use a placeholder
    }

    if (this.content && !this.contentAudio && this.contentType === 'audio') {
      // For audio, we'd need to visualize the waveform
      // For now, we'll just use a placeholder
    }
  }

  // Calculate the optimal size for the node based on its content
  calculateOptimalSize() {
    // Start with minimum dimensions
    let newWidth = this.minWidth;
    let newHeight = this.minHeight;

    // Get a temporary canvas context for text measurements
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    // Set font for measurements
    ctx.font = '11px Arial'; // For input content

    // Calculate width needed for input content
    if (this.inputContent) {
      // Detect if input is an image URL
      const isImageInput = Utils.isImageData(this.inputContent);

      if (isImageInput && this.inputImage && this.inputImage.complete) {
        // For image inputs, adjust size based on image dimensions
        const imgRatio = this.inputImage.width / this.inputImage.height;
        const maxImgWidth = Math.min(this.maxWidth - 40, 300); // Limit image width
        const maxImgHeight = 80; // Limit input image height

        let imgWidth, imgHeight;

        if (imgRatio > 1) {
          // Landscape image
          imgWidth = Math.min(maxImgWidth, this.inputImage.width);
          imgHeight = imgWidth / imgRatio;
        } else {
          // Portrait or square image
          imgHeight = Math.min(maxImgHeight, this.inputImage.height);
          imgWidth = imgHeight * imgRatio;
        }

        newWidth = Math.max(newWidth, imgWidth + 40);
      } else {
        // For text inputs, calculate width based on text
        const inputLines = this.getTextLines(ctx, this.inputContent, this.maxWidth - 40);
        const inputWidth = Math.min(this.maxWidth, Math.max(newWidth, this.getMaxLineWidth(ctx, inputLines) + 40));
        newWidth = Math.max(newWidth, inputWidth);
      }
    }

    // Calculate width needed for output content
    if (this.content) {
      if (this.contentType === 'text') {
        ctx.font = '12px Arial'; // For output content
        const outputLines = this.getTextLines(ctx, this.content, this.maxWidth - 40);
        const outputWidth = Math.min(this.maxWidth, Math.max(newWidth, this.getMaxLineWidth(ctx, outputLines) + 40));
        newWidth = Math.max(newWidth, outputWidth);

        // Calculate height based on number of lines
        const inputLines = this.inputContent ? this.getTextLines(ctx, this.inputContent, newWidth - 40) : [];
        // Recalculate output lines with the new width
        const outputLinesForHeight = this.getTextLines(ctx, this.content, newWidth - 40);

        // Calculate height needed for input and output content
        // Base height (title + padding) + input area + output area
        const baseHeight = 40; // Title area
        const inputHeight = Math.min(100, inputLines.length * 14 + 20); // Input area (limited to 100px)
        const outputHeight = Math.min(300, outputLinesForHeight.length * 16 + 20); // Output area (limited to 300px)

        newHeight = Math.min(this.maxHeight, Math.max(this.minHeight, baseHeight + inputHeight + outputHeight));
      }
      else if (this.contentType === 'image' && this.contentImage && this.contentImage.complete) {
        // For images, adjust size based on image dimensions
        const imgRatio = this.contentImage.width / this.contentImage.height;
        const maxImgWidth = Math.min(this.maxWidth - 40, 300); // Limit image width
        const maxImgHeight = 200; // Limit image height

        let imgWidth, imgHeight;

        if (imgRatio > 1) {
          // Landscape image
          imgWidth = Math.min(maxImgWidth, this.contentImage.width);
          imgHeight = imgWidth / imgRatio;
        } else {
          // Portrait or square image
          imgHeight = Math.min(maxImgHeight, this.contentImage.height);
          imgWidth = imgHeight * imgRatio;
        }

        newWidth = Math.max(newWidth, imgWidth + 40);

        // Calculate height needed for input and output content
        const baseHeight = 40; // Title area
        const inputHeight = this.inputContent ? Math.min(80, this.getTextLines(ctx, this.inputContent, newWidth - 40).length * 14 + 20) : 30;
        const outputHeight = imgHeight + 30; // Image height + padding

        newHeight = Math.min(this.maxHeight, Math.max(this.minHeight, baseHeight + inputHeight + outputHeight));
      }
    }

    // Update node dimensions
    this.width = newWidth;
    this.height = newHeight;
  }

  // Get text lines for a given string and max width
  getTextLines(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Get the maximum width of a set of lines
  getMaxLineWidth(ctx, lines) {
    let maxWidth = 0;

    for (const line of lines) {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    }

    return maxWidth;
  }

  // Draw content based on type
  drawContent(ctx) {
    // Calculate dimensions for input and output areas
    const contentAreaX = this.x + 10;
    const inputAreaY = this.y + 40;
    const outputAreaY = this.y + this.height / 2 + 5;
    const contentAreaWidth = this.width - 20;
    const inputAreaHeight = (this.height / 2) - 50;
    const outputAreaHeight = (this.height / 2) - 25;

    // Draw input area
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

    // Draw input label
    ctx.fillStyle = '#888';
    ctx.font = '10px Arial';
    ctx.fillText('INPUT:', contentAreaX + 5, inputAreaY - 2);

    // Draw input content
    this.drawInputContent(ctx, contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

    // Draw input border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

    // Draw output area
    ctx.fillStyle = '#222';
    ctx.fillRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);

    // Draw output label
    ctx.fillStyle = this.hasBeenProcessed ? '#4a90e2' : '#888';
    ctx.font = '10px Arial';
    ctx.fillText('OUTPUT:', contentAreaX + 5, outputAreaY - 2);

    // Make sure content is preloaded
    this.preloadContent();

    // Draw output content based on type
    switch (this.contentType) {
      case 'text':
        this.drawTextContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
        break;
      case 'image':
        this.drawImageContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
        break;
      case 'video':
        this.drawVideoContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
        break;
      case 'audio':
        this.drawAudioContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
        break;
    }

    // Draw output border
    ctx.strokeStyle = this.hasBeenProcessed ? '#4a90e2' : '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
  }

  // Draw input content (can be text or image)
  drawInputContent(ctx, x, y, width, height) {
    if (!this.inputContent) {
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.fillText('No input. Double-click to edit...', x + 5, y + 15);
      return;
    }

    // Detect if input is an image URL
    const isImageInput = Utils.isImageData(this.inputContent);

    // If input is an image, display it
    if (isImageInput) {
      // Create a temporary image for the input
      if (!this.inputImage) {
        this.inputImage = new Image();
        this.inputImage.src = this.inputContent;

        // Redraw when image loads
        this.inputImage.onload = () => App.draw();
      }

      // If image is loaded, draw it
      if (this.inputImage.complete) {
        try {
          // Calculate aspect ratio to fit within content area
          const imgRatio = this.inputImage.width / this.inputImage.height;
          const areaRatio = width / height;

          let drawWidth, drawHeight;

          if (imgRatio > areaRatio) {
            // Image is wider than area
            drawWidth = width - 10;
            drawHeight = drawWidth / imgRatio;
          } else {
            // Image is taller than area
            drawHeight = height - 10;
            drawWidth = drawHeight * imgRatio;
          }

          // Center the image in the content area
          const drawX = x + (width - drawWidth) / 2;
          const drawY = y + (height - drawHeight) / 2;

          // Draw the image
          ctx.drawImage(this.inputImage, drawX, drawY, drawWidth, drawHeight);

          // Draw a subtle border around the image
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);

          // Add a small label to indicate it's an image
          ctx.fillStyle = '#888';
          ctx.font = '10px Arial';
          ctx.fillText('Image Input', x + 5, y + height - 5);

          return;
        } catch (err) {
          // If there's an error drawing the image, fall back to text
          console.error('Error drawing input image:', err);
        }
      } else {
        // If image is still loading, show loading message
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.fillText('Loading image input...', x + 5, y + 15);
        return;
      }
    }

    // Default text rendering
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Arial';

    // Split text into lines
    const maxLineWidth = width - 10;
    const lineHeight = 14;
    const maxLines = Math.floor(height / lineHeight) - 1;

    const words = this.inputContent.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxLineWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Limit to max lines and add ellipsis if needed
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] += '...';
    }

    // Draw each line
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 5, y + 15 + (index * lineHeight));
    });
  }

  // Draw text content
  drawTextContent(ctx, x, y, width, height) {
    if (!this.content) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('No content. Double-click to edit...', x + 10, y + 20);
      return;
    }

    ctx.fillStyle = '#ccc';
    ctx.font = '12px Arial';

    // Split text into lines
    const maxLineWidth = width - 20;
    const lineHeight = 16;
    const maxLines = Math.floor(height / lineHeight) - 1;

    const words = this.content.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxLineWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Limit to max lines and add ellipsis if needed
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] += '...';
    }

    // Draw each line
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 10, y + 20 + (index * lineHeight));
    });
  }

  // Draw image content
  drawImageContent(ctx, x, y, width, height) {
    // Special handling for text-to-image nodes
    if (this.aiProcessor === 'text-to-image') {
      // Force content type to image
      this.contentType = 'image';

      // If this is a text-to-image node that has been processed but has no content,
      // try to recover the image from contentImage
      if (this.hasBeenProcessed && !this.content && this.contentImage && this.contentImage.src) {
        this.content = this.contentImage.src;
        DebugManager.addLog(`Recovered image content for node ${this.id}`, 'info');
      }
    }

    // For text-to-image nodes, we need to ensure we have content
    if (this.aiProcessor === 'text-to-image' && this.hasBeenProcessed && !this.content) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('Image generation in progress...', x + 10, y + 20);

      // Force a redraw after a short delay to check if content is available
      setTimeout(() => App.draw(), 500);
      return;
    }

    if (!this.content) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('No image. Double-click to edit...', x + 10, y + 20);
      return;
    }

    // Preload image if needed
    if (!this.contentImage) {
      // Create a new image object
      this.contentImage = new Image();
      this.contentImage.src = this.content;

      // Add load event listener to redraw when image loads
      this.contentImage.onload = () => {
        // When image loads, update node size if auto-sizing is enabled
        if (this.autoSize) {
          this.calculateOptimalSize();
        }
        App.draw();
      };

      // Draw placeholder while loading
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('Loading image...', x + 10, y + 20);
      return;
    }

    // If image is loaded, draw it
    if (this.contentImage.complete) {
      try {
        // Calculate aspect ratio to fit within content area
        const imgRatio = this.contentImage.width / this.contentImage.height;
        const areaRatio = width / height;

        let drawWidth, drawHeight;

        if (imgRatio > areaRatio) {
          // Image is wider than area
          drawWidth = width - 10;
          drawHeight = drawWidth / imgRatio;
        } else {
          // Image is taller than area
          drawHeight = height - 10;
          drawWidth = drawHeight * imgRatio;
        }

        // Center the image in the content area
        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;

        // Draw the image
        ctx.drawImage(this.contentImage, drawX, drawY, drawWidth, drawHeight);

        // Draw a subtle border around the image
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
      } catch (err) {
        // If there's an error drawing the image, show error message
        ctx.fillStyle = '#e74c3c';
        ctx.font = '12px Arial';
        ctx.fillText('Error loading image', x + 10, y + 20);
        console.error('Error drawing image:', err);
      }
    } else {
      // If image is still loading, show loading message
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('Loading image...', x + 10, y + 20);

      // Add load event listener to redraw when image loads
      this.contentImage.onload = () => App.draw();
    }
  }

  // Draw video content
  drawVideoContent(ctx, x, y, width, height) {
    // For now, just show a placeholder
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText('Video content', x + 10, y + 20);

    // Draw video icon
    ctx.fillStyle = '#555';
    ctx.fillRect(x + width/2 - 15, y + height/2 - 15, 30, 30);

    ctx.beginPath();
    ctx.moveTo(x + width/2 - 5, y + height/2 - 10);
    ctx.lineTo(x + width/2 + 10, y + height/2);
    ctx.lineTo(x + width/2 - 5, y + height/2 + 10);
    ctx.closePath();
    ctx.fillStyle = '#ccc';
    ctx.fill();
  }

  // Draw audio content
  drawAudioContent(ctx, x, y, width, height) {
    // For now, just show a placeholder
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText('Audio content', x + 10, y + 20);

    // Draw simple waveform
    ctx.beginPath();
    ctx.moveTo(x + 10, y + height/2);

    const waveWidth = width - 20;
    const segments = 20;
    const segmentWidth = waveWidth / segments;

    for (let i = 0; i <= segments; i++) {
      const amplitude = Math.sin(i * 0.5) * 15;
      ctx.lineTo(x + 10 + i * segmentWidth, y + height/2 + amplitude);
    }

    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  draw(ctx) {
    // Preload content if needed
    this.preloadContent();

    // Node box with status-based colors
    const bgColor = this.selected ? '#4a90e2' :
                 this.processing ? '#d4af37' :
                 this.error ? '#e74c3c' :
                 App.hoveredNode === this ? '#404040' : '#333';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = this.error ? '#c0392b' :
                     App.hoveredNode === this ? '#aaa' : '#888';
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    if (this.selected || App.hoveredNode === this || this.processing) {
      ctx.shadowColor = this.selected ? '#4a90e2' :
                       this.processing ? '#d4af37' : '#666';
      ctx.shadowBlur = 10;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.shadowBlur = 0;
    }

    // Title and type indicators
    ctx.fillStyle = '#eee';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(this.title, this.x + 10, this.y + 20);

    // Content type icon
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ccc';
    ctx.fillText(this.getContentTypeIcon(), this.x + this.width - 25, this.y + 20);

    // Draw content preview
    this.drawContent(ctx);

    // Input/output type indicators
    ctx.font = '10px Arial';
    ctx.fillStyle = '#888';
    ctx.fillText(`in: ${this.inputType}`, this.x + 5, this.y + this.height - 10);
    ctx.fillText(`out: ${this.outputType}`, this.x + this.width - 50, this.y + this.height - 10);

    // Processing indicator
    if (this.processing) {
      ctx.beginPath();
      ctx.arc(this.x + this.width - 10, this.y + 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#d4af37';
      ctx.fill();
    }

    // Error indicator
    if (this.error) {
      ctx.beginPath();
      ctx.arc(this.x + 10, this.y + 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
    }

    // Connectors
    const radius = App.hoveredNode === this && App.hoveredConnector ?
                  App.CONNECTOR_HOVER_RADIUS :
                  App.CONNECTOR_RADIUS;

    // Output connector
    const outputColor = App.hoveredNode === this && App.hoveredConnector === 'output' ?
                     '#6ab0ff' :
                     App.connectingNode && App.connectingNode !== this ?
                     (this.canAcceptInput(App.connectingNode) ? '#2ecc71' : '#e74c3c') :
                     '#4a90e2';

    ctx.fillStyle = outputColor;
    ctx.beginPath();
    ctx.arc(this.x + this.width, this.y + this.height/2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Input connector
    const inputColor = App.hoveredNode === this && App.hoveredConnector === 'input' ?
                    '#6ab0ff' :
                    App.connectingNode === this ?
                    '#e74c3c' :
                    App.connectingNode ?
                    (this.canAcceptInput(App.connectingNode) ? '#2ecc71' : '#e74c3c') :
                    '#4a90e2';

    ctx.fillStyle = inputColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.height/2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Tooltip
    if (App.hoveredNode === this && !App.isDragging && !App.connectingNode) {
      const tooltipText = this.error ? this.error :
                       this.processing ? 'Processing...' :
                       'Double-click to edit';
      Utils.drawTooltip(ctx, tooltipText, this.x + this.width/2, this.y);
    }
  }

  containsPoint(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  outputConnectorContainsPoint(x, y) {
    const dx = x - (this.x + this.width);
    const dy = y - (this.y + this.height/2);
    const radius = App.hoveredNode === this ?
                  App.CONNECTOR_HOVER_RADIUS :
                  App.CONNECTOR_RADIUS;
    return dx * dx + dy * dy <= radius * radius;
  }

  inputConnectorContainsPoint(x, y) {
    const dx = x - this.x;
    const dy = y - (this.y + this.height/2);
    const radius = App.hoveredNode === this ?
                  App.CONNECTOR_HOVER_RADIUS :
                  App.CONNECTOR_RADIUS;
    return dx * dx + dy * dy <= radius * radius;
  }
}

// Connection class
class Connection {
  constructor(fromNode, toNode) {
    this.fromNode = fromNode;
    this.toNode = toNode;
  }

  draw(ctx) {
    const startX = this.fromNode.x + this.fromNode.width;
    const startY = this.fromNode.y + this.fromNode.height/2;
    const endX = this.toNode.x;
    const endY = this.toNode.y + this.toNode.height/2;

    const isHovered = App.hoveredConnection === this;

    Utils.drawConnection(
      ctx,
      startX,
      startY,
      endX,
      endY,
      isHovered ? '#6ab0ff' : '#4a90e2',
      isHovered
    );

    if (isHovered) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      Utils.drawTooltip(ctx, 'Press Delete to remove', midX, midY);
    }
  }

  containsPoint(x, y) {
    const startX = this.fromNode.x + this.fromNode.width;
    const startY = this.fromNode.y + this.fromNode.height/2;
    const endX = this.toNode.x;
    const endY = this.toNode.y + this.toNode.height/2;

    const A = x - startX;
    const B = y - startY;
    const C = endX - startX;
    const D = endY - startY;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) {
      param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
      xx = startX;
      yy = startY;
    } else if (param > 1) {
      xx = endX;
      yy = endY;
    } else {
      xx = startX + param * C;
      yy = startY + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < App.CONNECTION_HOVER_DISTANCE;
  }
}

// Modal Manager
const ModalManager = {
  // Track current open modal
  currentModal: null,

  // Open a modal
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      // Set as current modal
      this.currentModal = modalId;

      // Make sure the modal is editable
      this.makeModalEditable(modal);

      // Display the modal
      modal.style.display = 'block';
    }
  },

  // Close a modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';

      // Clear current modal if it's the one being closed
      if (this.currentModal === modalId) {
        this.currentModal = null;
      }
    }
  },

  // Close all modals
  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
    this.currentModal = null;
  },

  // Make modal content editable
  makeModalEditable(modal) {
    if (modal) {
      // Add editable class
      modal.classList.add('editable-modal');

      // Find all input elements
      const inputElements = modal.querySelectorAll('input, textarea, select');

      // Make sure they're editable
      inputElements.forEach(input => {
        if (input.id !== 'inputType' && input.id !== 'outputType') {
          input.removeAttribute('readonly');
          input.removeAttribute('disabled');
        }
      });
    }
  }
};

// Main Application
const App = {
  canvas: null,
  ctx: null,
  nodes: [],
  connections: [],
  isDragging: false,
  dragNode: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  connectingNode: null,
  hoveredNode: null,
  hoveredConnector: null,
  hoveredConnection: null,
  editingNode: null,

  CONNECTOR_RADIUS: 8,
  CONNECTOR_HOVER_RADIUS: 10,
  CONNECTION_HOVER_DISTANCE: 5,

  init() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.initEventListeners();
    this.initModalHandlers();

    DebugManager.init();
    this.draw();

    // Load OpenAI config
    const config = JSON.parse(localStorage.getItem(Config.storageKeys.openAIConfig) || '{}');
    if (config) {
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('model').value = config.model || Config.defaultOpenAIConfig.model;
      document.getElementById('temperature').value = config.temperature || Config.defaultOpenAIConfig.temperature;
      document.getElementById('maxTokens').value = config.maxTokens || Config.defaultOpenAIConfig.maxTokens;
    }
  },



  initEventListeners() {
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.draw();
    });

    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    document.getElementById('addNodeBtn').addEventListener('click', () => this.addNode());
    document.getElementById('configBtn').addEventListener('click', () => ModalManager.openModal('configModal'));
    document.getElementById('saveWorkflowBtn').addEventListener('click', () => this.handleSaveWorkflow());
    document.getElementById('saveBtn').addEventListener('click', () => this.handleSave());
    document.getElementById('loadBtn').addEventListener('click', () => this.handleLoad());
    document.getElementById('helpBtn').addEventListener('click', () => ModalManager.openModal('helpModal'));
  },

  initModalHandlers() {
    // Node Editor Modal
    const nodeEditor = {
      modal: document.getElementById('nodeEditor'),
      execute: document.getElementById('executeNode'),
      save: document.getElementById('saveNode'),
      cancel: document.getElementById('cancelNode'),
      title: document.getElementById('nodeTitle'),
      modality: document.getElementById('nodeModality'),
      content: document.getElementById('nodeContent'),
      processor: document.getElementById('aiProcessor'),
      systemPrompt: document.getElementById('systemPrompt')
    };

    // Save Workflow Modal
    const saveWorkflowModal = {
      modal: document.getElementById('saveWorkflowModal'),
      name: document.getElementById('workflowName'),
      description: document.getElementById('workflowDescription'),
      save: document.getElementById('confirmSaveWorkflow'),
      cancel: document.getElementById('cancelSaveWorkflow')
    };

    if (nodeEditor.modal) {
      // Add submit handler to the form to prevent default submission
      const form = nodeEditor.modal.querySelector('form');
      if (form) {
        // Remove any existing event listeners by cloning and replacing
        form.replaceWith(form.cloneNode(true));

        // Get the fresh reference
        const newForm = nodeEditor.modal.querySelector('form');

        // Add the submit event listener
        newForm.addEventListener('submit', (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        });

        // Add keydown event listeners to all input fields to prevent form submission on Enter
        const inputs = newForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              return false;
            }
          });
        });
      }

      // Set up modality change handler
      if (nodeEditor.modality) {
        nodeEditor.modality.addEventListener('change', (e) => {
          this.updateContentSection(e.target.value);
          const contentType = e.target.value;
          if (nodeEditor.processor) {
            nodeEditor.processor.innerHTML = this.getProcessorOptions(contentType);
            this.updateIOTypes(nodeEditor.processor.value);
          }
          this.updatePreviewAreas(contentType);
        });
      }

      // Set up processor change handler
      if (nodeEditor.processor) {
        nodeEditor.processor.addEventListener('change', (e) => {
          this.updateIOTypes(e.target.value);
        });
      }
    }

    // Config Modal
    const configModal = {
      save: document.getElementById('saveConfig'),
      cancel: document.getElementById('cancelConfig'),
      test: document.getElementById('testAPI')
    };

    if (configModal.save) {
      configModal.save.addEventListener('click', () => {
        // Only close the modal if the config was saved successfully
        if (this.saveConfig()) {
          ModalManager.closeModal('configModal');
        }
      });
    }

    if (configModal.cancel) {
      configModal.cancel.addEventListener('click', () => {
        ModalManager.closeModal('configModal');
      });
    }

    if (configModal.test) {
      configModal.test.addEventListener('click', async () => {
        const testPrompt = document.getElementById('testPrompt');
        const testResult = document.getElementById('testResult');

        if (testPrompt && testResult) {
          configModal.test.disabled = true;
          configModal.test.textContent = 'Testing...';
          testResult.textContent = 'Testing API...';

          try {
            const testNode = new Node(0, 0, 0);
            const response = await testNode.processTextToText(testPrompt.value);
            testResult.textContent = `Success: ${response}`;
            testResult.className = 'test-result success';
          } catch (err) {
            testResult.textContent = `Error: ${err.message}`;
            testResult.className = 'test-result error';
          } finally {
            configModal.test.disabled = false;
            configModal.test.textContent = 'Test API';
          }
        }
      });
    }

    // Save Workflow Modal
    const confirmSaveWorkflow = document.getElementById('confirmSaveWorkflow');
    const cancelSaveWorkflow = document.getElementById('cancelSaveWorkflow');

    if (confirmSaveWorkflow) {
      confirmSaveWorkflow.addEventListener('click', () => {
        this.saveWorkflowToServer();
      });
    }

    if (cancelSaveWorkflow) {
      cancelSaveWorkflow.addEventListener('click', () => {
        ModalManager.closeModal('saveWorkflowModal');
      });
    }

    // Help Modal
    const closeHelp = document.getElementById('closeHelp');
    if (closeHelp) {
      closeHelp.addEventListener('click', () => {
        ModalManager.closeModal('helpModal');
      });
    }
  },

  // Save OpenAI config
  saveConfig() {
    const apiKeyInput = document.getElementById('apiKey');
    const apiKey = apiKeyInput.value.trim();

    // Basic validation for OpenAI API key
    if (apiKey && !apiKey.startsWith('sk-')) {
      alert('OpenAI API keys should start with "sk-". Please check your API key.');
      apiKeyInput.focus();
      return false;
    }

    const config = {
      apiKey: apiKey,
      model: document.getElementById('model').value,
      temperature: parseFloat(document.getElementById('temperature').value) || Config.defaultOpenAIConfig.temperature,
      maxTokens: parseInt(document.getElementById('maxTokens').value) || Config.defaultOpenAIConfig.maxTokens
    };

    localStorage.setItem(Config.storageKeys.openAIConfig, JSON.stringify(config));
    DebugManager.addLog('OpenAI configuration saved', 'success');

    // Show a confirmation message
    const testResult = document.getElementById('testResult');
    if (testResult) {
      if (apiKey) {
        testResult.textContent = 'Configuration saved. You can now test the API.';
        testResult.className = 'test-result success';
      } else {
        testResult.textContent = 'Configuration saved without API key. API calls will fail.';
        testResult.className = 'test-result warning';
      }
    }

    return true;
  },

  // Update content section based on modality
  updateContentSection(contentType) {
    document.querySelectorAll('.content-section').forEach(section => {
      section.style.display = 'none';
    });

    const section = document.getElementById(`${contentType}ContentSection`);
    if (section) {
      section.style.display = 'block';

      // Special handling for image-to-text nodes
      if (this.editingNode && this.editingNode.aiProcessor === 'image-to-text') {
        // For image-to-text nodes, we need to handle both the input image and output text

        // If the node has been processed, we should show the text content section
        if (this.editingNode.hasBeenProcessed) {
          // Override contentType to show text section
          const textSection = document.getElementById('textContentSection');
          if (textSection) {
            // Hide all sections first
            document.querySelectorAll('.content-section').forEach(s => {
              s.style.display = 'none';
            });

            // Show text section
            textSection.style.display = 'block';

            // Update text content
            const nodeContent = document.getElementById('nodeContent');
            if (nodeContent) {
              nodeContent.value = this.editingNode.content || '';
            }
          }
          return; // Exit early since we've handled this case
        }
        // If not processed, continue with normal handling for the selected content type
      }

      // If this is an image section and we have an editing node
      if (contentType === 'image' && this.editingNode) {
        // For text-to-image nodes that have been processed, always use the output content
        if (this.editingNode.aiProcessor === 'text-to-image' && this.editingNode.hasBeenProcessed && this.editingNode.content) {
          // Show the image in the preview
          const imagePreview = document.getElementById('imagePreview');
          if (imagePreview) {
            imagePreview.src = this.editingNode.content;
            imagePreview.style.display = 'block';

            // Update image info
            this.updateImageInfo(this.editingNode.content);
          }
        }
        // For other image content, check if it's valid image data
        else if (this.editingNode.content) {
          // Check if content is image data (base64 or URL)
          const isImageData = Utils.isImageData(this.editingNode.content);

          if (isImageData) {
            // Show the image in the preview
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
              imagePreview.src = this.editingNode.content;
              imagePreview.style.display = 'block';

              // Update image info
              this.updateImageInfo(this.editingNode.content);
            }
          }
        }
      }
    }
  },

  // Update input/output types based on processor
  updateIOTypes(processor) {
    const inputType = document.getElementById('inputType');
    const outputType = document.getElementById('outputType');

    if (!inputType || !outputType) return;

    switch(processor) {
      case 'text-to-text':
        inputType.value = 'text';
        outputType.value = 'text';
        break;
      case 'text-to-image':
        inputType.value = 'text';
        outputType.value = 'image';
        break;
      case 'image-to-text':
        inputType.value = 'image';
        outputType.value = 'text';
        break;
      case 'audio-to-text':
        inputType.value = 'audio';
        outputType.value = 'text';
        break;
      case 'video-to-text':
        inputType.value = 'video';
        outputType.value = 'text';
        break;
    }

    inputType.disabled = true;
    outputType.disabled = true;
  },

  // Get processor options based on content type
  getProcessorOptions(contentType) {
    switch(contentType) {
      case 'text':
        return `
          <option value="text-to-text">Text to Text</option>
          <option value="text-to-image">Text to Image</option>
        `;
      case 'image':
        return `
          <option value="image-to-text">Image to Text</option>
        `;
      case 'audio':
        return `
          <option value="audio-to-text">Audio to Text</option>
        `;
      case 'video':
        return `
          <option value="video-to-text">Video to Text</option>
        `;
      default:
        return `
          <option value="text-to-text">Text to Text</option>
        `;
    }
  },

  // Update preview areas based on content type
  updatePreviewAreas(contentType) {
    // Hide all preview areas
    document.querySelectorAll('[id$="Preview"]').forEach(preview => {
      preview.style.display = 'none';
    });

    // Special handling for image-to-text nodes
    if (this.editingNode && this.editingNode.aiProcessor === 'image-to-text') {
      // For image-to-text nodes, we need special handling

      // If the node has been processed, we should show text preview
      if (this.editingNode.hasBeenProcessed) {
        // No preview to show for text content
        return;
      }

      // If not processed, show the image preview if available
      const imagePreview = document.getElementById('imagePreview');
      if (imagePreview) {
        // Use inputContent if it's an image URL, otherwise use content
        const imageUrl = this.editingNode.inputContent && Utils.isImageData(this.editingNode.inputContent)
          ? this.editingNode.inputContent
          : (Utils.isImageData(this.editingNode.content) ? this.editingNode.content : null);

        if (imageUrl) {
          imagePreview.src = imageUrl;
          imagePreview.style.display = 'block';
        }
      }
      return;
    }

    // Show the current preview area
    const preview = document.getElementById(`${contentType}Preview`);
    if (preview && this.editingNode) {
      // Special handling for text-to-image nodes
      if (this.editingNode.aiProcessor === 'text-to-image') {
        // Get the image content from either content or contentImage
        let imageSource = this.editingNode.content;

        // If no content but we have a contentImage, use that
        if (!imageSource && this.editingNode.contentImage && this.editingNode.contentImage.src) {
          imageSource = this.editingNode.contentImage.src;
          // Update the node content with the image source
          this.editingNode.content = imageSource;
        }

        // Display the image if we have a source
        if (imageSource) {
          preview.src = imageSource;
          preview.style.display = 'block';
        }
      }
      // For other nodes, use content if available
      else if (this.editingNode.content) {
        preview.src = this.editingNode.content;
        preview.style.display = 'block';
      }
    }
  },

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of this.nodes) {
      if (node.outputConnectorContainsPoint(x, y)) {
        this.connectingNode = node;
        DebugManager.addLog(`Starting connection from node ${node.id}`, 'info');
        return;
      }
    }

    const clickedNode = this.nodes.find(node => node.containsPoint(x, y));
    if (clickedNode) {
      this.isDragging = true;
      this.dragNode = clickedNode;
      this.dragNode.selected = true;
      this.dragOffsetX = x - clickedNode.x;
      this.dragOffsetY = y - clickedNode.y;
      this.nodes.forEach(n => {
        if (n !== clickedNode) n.selected = false;
      });
    } else {
      this.nodes.forEach(n => n.selected = false);
    }
    this.draw();
  },

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.hoveredNode = null;
    this.hoveredConnector = null;
    this.hoveredConnection = null;
    this.canvas.style.cursor = 'default';

    if (this.isDragging && this.dragNode) {
      this.dragNode.x = x - this.dragOffsetX;
      this.dragNode.y = y - this.dragOffsetY;
      this.draw();
    } else if (this.connectingNode) {
      this.draw();

      const isHoveringValidInput = this.hoveredNode &&
                                 this.hoveredNode !== this.connectingNode &&
                                 this.hoveredConnector === 'input';

      const startX = this.connectingNode.x + this.connectingNode.width;
      const startY = this.connectingNode.y + this.connectingNode.height/2;
      const endX = isHoveringValidInput ? this.hoveredNode.x : x;
      const endY = isHoveringValidInput ?
                  this.hoveredNode.y + this.hoveredNode.height/2 : y;

      Utils.drawConnection(
        this.ctx,
        startX,
        startY,
        endX,
        endY,
        isHoveringValidInput ? '#50c878' : '#4a90e2',
        isHoveringValidInput
      );

      for (const node of this.nodes) {
        if (node !== this.connectingNode && node.inputConnectorContainsPoint(x, y)) {
          this.hoveredNode = node;
          this.hoveredConnector = 'input';
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
      }
    } else {
      for (const conn of this.connections) {
        if (conn.containsPoint(x, y)) {
          this.hoveredConnection = conn;
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
      }

      for (const node of this.nodes) {
        if (node.outputConnectorContainsPoint(x, y)) {
          this.hoveredNode = node;
          this.hoveredConnector = 'output';
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
        if (node.inputConnectorContainsPoint(x, y)) {
          this.hoveredNode = node;
          this.hoveredConnector = 'input';
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
        if (node.containsPoint(x, y)) {
          this.hoveredNode = node;
          this.canvas.style.cursor = 'move';
          this.draw();
          return;
        }
      }

      this.draw();
    }
  },

  handleMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.connectingNode) {
      for (const node of this.nodes) {
        if (node !== this.connectingNode && node.inputConnectorContainsPoint(x, y)) {
          if (node.canAcceptInput(this.connectingNode)) {
            const connection = new Connection(this.connectingNode, node);
            this.connections.push(connection);
            DebugManager.addLog(`Connected node ${this.connectingNode.id} to node ${node.id}`, 'success');
            // Process the node chain with the new connection
            this.processNodeAndConnections(this.connectingNode, this.connectingNode.content).catch(err => {
              DebugManager.addLog(`Failed to process chain: ${err.message}`, 'error');
            });
          } else {
            DebugManager.addLog(
              `Incompatible types: ${this.connectingNode.outputType} → ${node.inputType}`,
              'error'
            );
            const startX = this.connectingNode.x + this.connectingNode.width;
            const startY = this.connectingNode.y + this.connectingNode.height/2;
            const endX = node.x;
            const endY = node.y + node.height/2;

            this.ctx.save();
            Utils.drawConnection(this.ctx, startX, startY, endX, endY, '#e74c3c', true);
            this.ctx.restore();

            setTimeout(() => this.draw(), 1000);
          }
          break;
        }
      }
      this.connectingNode = null;
      this.draw();
    }

    this.isDragging = false;
    this.dragNode = null;
  },

  handleDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedNode = this.nodes.find(node => node.containsPoint(x, y));
    if (clickedNode) {
      this.openNodeEditor(clickedNode);
    }
  },

  // Handle keyboard events
  handleKeyDown(e) {
    // Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Find selected node
      const selectedNode = this.nodes.find(node => node.selected);
      if (selectedNode) {
        // Remove connections to/from this node
        this.connections = this.connections.filter(conn =>
          conn.fromNode !== selectedNode && conn.toNode !== selectedNode
        );

        // Remove the node
        this.nodes = this.nodes.filter(node => node !== selectedNode);

        DebugManager.addLog(`Deleted node ${selectedNode.id}`, 'info');
        DebugManager.updateCanvasStats();
        this.draw();
      }

      // Check if a connection is hovered
      if (this.hoveredConnection) {
        this.connections = this.connections.filter(conn => conn !== this.hoveredConnection);
        this.hoveredConnection = null;
        DebugManager.addLog('Deleted connection', 'info');
        DebugManager.updateCanvasStats();
        this.draw();
      }
    }
  },

  // Open the node editor modal
  openNodeEditor(node) {
    // Set the editing node
    this.editingNode = node;

    // Get the node editor modal
    const nodeEditor = document.getElementById('nodeEditor');
    if (!nodeEditor) {
      console.error('Node editor modal not found');
      return;
    }

    // Fill in the form with node data
    document.getElementById('nodeTitle').value = node.title;
    document.getElementById('nodeModality').value = node.contentType;
    document.getElementById('aiProcessor').value = node.aiProcessor;
    document.getElementById('systemPrompt').value = node.systemPrompt;

    // Set the content based on node type and processing state
    const nodeContent = document.getElementById('nodeContent');
    const imagePreview = document.getElementById('imagePreview');

    // Special handling for text-to-image nodes
    if (node.aiProcessor === 'text-to-image') {
      // For text-to-image nodes, always show the image content section
      this.updateContentSection('image');
      document.getElementById('nodeModality').value = 'image';

      // Set the image prompt field with the input content
      const imagePrompt = document.getElementById('imagePrompt');
      if (imagePrompt) {
        imagePrompt.value = node.inputContent || '';
      }

      // If the node has been processed, show the output image
      if (node.hasBeenProcessed) {
        // Get the image content from either content or contentImage
        let imageSource = node.content;

        // If no content but we have a contentImage, use that
        if (!imageSource && node.contentImage && node.contentImage.src) {
          imageSource = node.contentImage.src;
          // Update the node content with the image source
          node.content = imageSource;
        }

        // Display the image if we have a source
        if (imageSource && imagePreview) {
          imagePreview.src = imageSource;
          imagePreview.style.display = 'block';

          // Update image info
          this.updateImageInfo(imageSource);
        }
      }
    }
    // Special handling for image-to-text nodes
    else if (node.aiProcessor === 'image-to-text') {
      // For image-to-text nodes, we need to handle both the input image and output text

      // If the node has been processed, show the text output in the text area
      if (node.hasBeenProcessed && nodeContent) {
        nodeContent.value = node.content || '';

        // Make sure we're showing the text content section
        this.updateContentSection('text');
        document.getElementById('nodeModality').value = 'text';
      }

      // If there's an input image (either in inputContent or content for unprocessed nodes)
      const inputImageUrl = node.inputContent && Utils.isImageData(node.inputContent)
        ? node.inputContent
        : (!node.hasBeenProcessed && Utils.isImageData(node.content) ? node.content : null);

      if (inputImageUrl && imagePreview) {
        // Show the input image in the processing log
        const processingLog = document.getElementById('processingLog');
        if (processingLog) {
          processingLog.innerHTML += `
            <div class="log-entry">
              <div>Input Image:</div>
              <img src="${inputImageUrl}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
            </div>
          `;
        }
      }
    }
    // Check if content is image data (base64 or URL)
    else if (Utils.isImageData(node.content)) {
      // If content is image data, show it in the image preview
      if (imagePreview) {
        imagePreview.src = node.content;
        imagePreview.style.display = 'block';

        // Switch to image content section
        this.updateContentSection('image');
        document.getElementById('nodeModality').value = 'image';

        // Update image info
        this.updateImageInfo(node.content);
      }
    } else if (node.contentType === 'text') {
      // For text nodes, show the input content in the text area
      if (nodeContent) {
        nodeContent.value = node.inputContent || node.content || '';
      }
    }

    // Set input and output types if those fields exist
    const inputTypeField = document.getElementById('inputType');
    const outputTypeField = document.getElementById('outputType');
    const autoSizeCheckbox = document.getElementById('autoSizeNode');

    if (inputTypeField) inputTypeField.value = node.inputType;
    if (outputTypeField) outputTypeField.value = node.outputType;
    if (autoSizeCheckbox) autoSizeCheckbox.checked = node.autoSize;

    // Clear the processing log
    const processingLog = document.getElementById('processingLog');
    if (processingLog) {
      processingLog.innerHTML = '';

      // If the node has been processed, show the input and output in the log
      if (node.hasBeenProcessed) {
        // Show input
        if (node.inputContent) {
          if (node.aiProcessor === 'image-to-text') {
            // For image-to-text, show the image
            // Use inputContent if it's an image URL, otherwise use content
            const imageUrl = node.inputContent &&
              (node.inputContent.startsWith('http') || node.inputContent.startsWith('data:image')) ?
              node.inputContent : node.content;

            processingLog.innerHTML += `
              <div class="log-entry">
                <div>Input Image:</div>
                <img src="${imageUrl}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
              </div>
            `;
          } else {
            // For text input, show the text
            processingLog.innerHTML += `
              <div class="log-entry">
                <div>Input:</div>
                <div class="result-content">${node.inputContent}</div>
              </div>
            `;
          }
        }

        // Show output
        if (node.content) {
          if (node.contentType === 'text' || node.aiProcessor === 'image-to-text') {
            // For text output, show the text
            processingLog.innerHTML += `
              <div class="log-entry success">
                <div>Output:</div>
                <div class="result-content">${node.content}</div>
              </div>
            `;
          } else if (node.aiProcessor === 'text-to-image') {
            // For image output, show the image
            processingLog.innerHTML += `
              <div class="log-entry success">
                <div>Generated Image:</div>
                <img src="${node.content}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
              </div>
            `;
          }
        }
      }
    }

    // Update content section based on modality
    this.updateContentSection(node.contentType);

    // Update preview areas based on content type
    this.updatePreviewAreas(node.contentType);

    // For image nodes, set up the image prompt field
    if (node.contentType === 'image' && node.aiProcessor === 'text-to-image') {
      const imagePrompt = document.getElementById('imagePrompt');
      if (imagePrompt) {
        imagePrompt.value = node.inputContent || '';
      }
    }

    // Set up image upload button handler
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    if (uploadImageBtn) {
      // Remove any existing event listeners
      uploadImageBtn.replaceWith(uploadImageBtn.cloneNode(true));

      // Get the fresh reference
      const newUploadImageBtn = document.getElementById('uploadImageBtn');

      // Add the event listener
      newUploadImageBtn.addEventListener('click', (e) => {
        // Prevent any default form submission
        e.preventDefault();
        e.stopPropagation();

        const imageFile = document.getElementById('imageFile');
        if (imageFile) {
          imageFile.click();
        }
        return false;
      });
    }

    // Set up image file input handler
    const imageFile = document.getElementById('imageFile');
    if (imageFile) {
      imageFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleImageUpload(file);
        }
      };
    }

    // Set up generate image button handler
    const generateImageBtn = document.getElementById('generateImageBtn');
    if (generateImageBtn) {
      // Remove any existing event listeners
      generateImageBtn.replaceWith(generateImageBtn.cloneNode(true));

      // Get the fresh reference
      const newGenerateImageBtn = document.getElementById('generateImageBtn');

      // Add the event listener
      newGenerateImageBtn.addEventListener('click', async (e) => {
        // Prevent any default form submission
        e.preventDefault();
        e.stopPropagation();

        const imagePrompt = document.getElementById('imagePrompt');
        if (imagePrompt && imagePrompt.value) {
          newGenerateImageBtn.disabled = true;
          newGenerateImageBtn.textContent = 'Generating...';

          try {
            // Store the prompt as input content
            this.editingNode.inputContent = imagePrompt.value;

            // Generate image using GPT Image
            const imageUrl = await this.editingNode.processTextToImage(imagePrompt.value);

            // Update the node content with the image URL
            this.editingNode.content = imageUrl;

            // Mark as processed
            this.editingNode.hasBeenProcessed = true;

            // Force content type to image
            this.editingNode.contentType = 'image';

            // Force recreate the image object to ensure it loads properly
            this.editingNode.contentImage = new Image();
            this.editingNode.contentImage.src = imageUrl;

            // Add load event listener to redraw when image loads
            this.editingNode.contentImage.onload = () => {
              // When image loads, update node size if auto-sizing is enabled
              if (this.editingNode.autoSize) {
                this.editingNode.calculateOptimalSize();
              }
              // Force a redraw to show the image
              this.draw();
            };

            // Update the image preview
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
              imagePreview.src = imageUrl;
              imagePreview.style.display = 'block';

              // Update image info
              this.updateImageInfo(imageUrl);
            }

            // Show the generated image in the processing log
            if (processingLog) {
              processingLog.innerHTML += `
                <div class="log-entry success">
                  <div>Generated Image:</div>
                  <img src="${imageUrl}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
                </div>
              `;
            }

            // Log success for debugging
            DebugManager.addLog(`Image generated successfully for node ${this.editingNode.id}: ${imageUrl.substring(0, 30)}...`, 'success');

            // Force a redraw to show the updated node
            this.draw();
          } catch (err) {
            DebugManager.addLog(`Failed to generate image: ${err.message}`, 'error');
          } finally {
            newGenerateImageBtn.disabled = false;
            newGenerateImageBtn.textContent = 'Generate Image';
          }
        } else {
          DebugManager.addLog('Please enter an image prompt', 'error');
        }
        return false;
      });
    }

    // Set up save button handler
    const saveButton = document.getElementById('saveNode');
    if (saveButton) {
      // Remove any existing event listeners
      saveButton.replaceWith(saveButton.cloneNode(true));

      // Get the fresh reference
      const newSaveButton = document.getElementById('saveNode');

      // Add the event listener
      newSaveButton.addEventListener('click', (e) => {
        // Prevent any default form submission
        e.preventDefault();
        e.stopPropagation();

        // Call the save method
        this.saveNodeEditor(e);

        // Return false to prevent form submission
        return false;
      });
    }

    // Set up execute button handler
    const executeButton = document.getElementById('executeNode');
    if (executeButton) {
      // Remove any existing event listeners
      executeButton.replaceWith(executeButton.cloneNode(true));

      // Get the fresh reference
      const newExecuteButton = document.getElementById('executeNode');

      // Add the event listener
      newExecuteButton.addEventListener('click', (e) => {
        // Prevent any default form submission
        e.preventDefault();
        e.stopPropagation();

        // Call the execute method
        this.executeNode(e);

        // Return false to prevent form submission
        return false;
      });
    }

    // Set up cancel button handler
    const cancelButton = document.getElementById('cancelNode');
    if (cancelButton) {
      // Remove any existing event listeners
      cancelButton.replaceWith(cancelButton.cloneNode(true));

      // Get the fresh reference
      const newCancelButton = document.getElementById('cancelNode');

      // Add the event listener
      newCancelButton.addEventListener('click', (e) => {
        // Prevent any default form submission
        e.preventDefault();
        e.stopPropagation();

        // Close the modal without saving
        this.editingNode = null;
        ModalManager.closeModal('nodeEditor');

        // Return false to prevent form submission
        return false;
      });
    }

    // Open the modal
    ModalManager.openModal('nodeEditor');
    DebugManager.addLog(`Editing node ${node.id}`, 'info');
  },

  // Handle image upload
  handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      DebugManager.addLog('Invalid file type. Please upload an image.', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const imageDataUrl = e.target.result;

      // Update the node content with the image data URL
      if (this.editingNode) {
        this.editingNode.content = imageDataUrl;
      }

      // Update the image preview
      const imagePreview = document.getElementById('imagePreview');
      if (imagePreview) {
        imagePreview.src = imageDataUrl;
        imagePreview.style.display = 'block';

        // Update image info
        this.updateImageInfo(file);
      }

      DebugManager.addLog('Image uploaded successfully', 'success');
    };

    reader.onerror = () => {
      DebugManager.addLog('Failed to read image file', 'error');
    };

    reader.readAsDataURL(file);
  },

  // Update image information
  updateImageInfo(fileOrUrl) {
    const imageSizeElement = document.getElementById('imageSize');
    const imageFormatElement = document.getElementById('imageFormat');

    if (!imageSizeElement || !imageFormatElement) return;

    if (fileOrUrl instanceof File) {
      // If it's a file, get info directly
      const format = fileOrUrl.type.split('/')[1].toUpperCase();
      imageFormatElement.textContent = format;

      // Create an image to get dimensions
      const img = new Image();
      img.onload = () => {
        imageSizeElement.textContent = `${img.width}x${img.height}`;
      };
      img.src = URL.createObjectURL(fileOrUrl);
    } else {
      // If it's a URL or data URL
      const img = new Image();
      img.onload = () => {
        imageSizeElement.textContent = `${img.width}x${img.height}`;

        // Try to determine format from URL
        if (typeof fileOrUrl === 'string') {
          if (fileOrUrl.startsWith('data:image/')) {
            const format = fileOrUrl.split(';')[0].split('/')[1].toUpperCase();
            imageFormatElement.textContent = format;
          } else if (fileOrUrl.includes('.')) {
            const extension = fileOrUrl.split('.').pop().split('?')[0].toUpperCase();
            imageFormatElement.textContent = extension;
          } else {
            imageFormatElement.textContent = 'Unknown';
          }
        }
      };
      img.src = fileOrUrl;
    }
  },

  // Save changes from the node editor
  saveNodeEditor(e) {
    // If called from an event, prevent default form submission
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Store the current nodes and connections
    const currentNodes = [...this.nodes];
    const currentConnections = [...this.connections];

    try {
      if (!this.editingNode) return;

    // Get values from the form
    this.editingNode.title = document.getElementById('nodeTitle').value;
    this.editingNode.contentType = document.getElementById('nodeModality').value;
    this.editingNode.aiProcessor = document.getElementById('aiProcessor').value;
    this.editingNode.systemPrompt = document.getElementById('systemPrompt').value;

    // Get content based on content type
    switch (this.editingNode.contentType) {
      case 'text':
        // For text, get content from the text area as input content
        // If the node hasn't been processed yet, we'll use this as input
        const textContent = document.getElementById('nodeContent').value;

        if (!this.editingNode.hasBeenProcessed) {
          // If not processed, set as input content
          this.editingNode.inputContent = textContent;
          // Clear output content until processed
          this.editingNode.content = '';
        } else if (this.editingNode.inputContent !== textContent) {
          // If input has changed, update it and mark as not processed
          this.editingNode.inputContent = textContent;
          this.editingNode.hasBeenProcessed = false;
          // Clear output content since input changed
          this.editingNode.content = '';
        }
        break;

      case 'image':
        // Check if we're dealing with image data in the content
        const isImageData = Utils.isImageData(this.editingNode.content);

        // For image-to-text, content is the image
        if (this.editingNode.aiProcessor === 'image-to-text') {
          // Content is already set when uploading
          // But we should clear output if not processed
          if (!this.editingNode.hasBeenProcessed) {
            this.editingNode.content = this.editingNode.content || '';
          }
        } else if (isImageData) {
          // If we have image data, make sure it's preserved
          // The image is already in this.editingNode.content from the upload or generation
          // Just ensure the content type is set to image
          this.editingNode.contentType = 'image';
        } else if (this.editingNode.aiProcessor === 'text-to-image') {
          // For text-to-image, input is the prompt
          const imagePrompt = document.getElementById('imagePrompt');
          if (imagePrompt) {
            // Update input content with the prompt
            this.editingNode.inputContent = imagePrompt.value;

            // Always ensure content type is set to image for text-to-image nodes
            if (this.editingNode.hasBeenProcessed) {
              this.editingNode.contentType = 'image';

              // IMPORTANT: Preserve the existing image content if it exists
              // This ensures we don't lose the generated image when editing
              if (!this.editingNode.content && this.editingNode.contentImage) {
                this.editingNode.content = this.editingNode.contentImage.src;
              }
            }

            // If not processed or input changed, auto-generate the image
            if (!this.editingNode.hasBeenProcessed ||
                (this.editingNode.hasBeenProcessed && this.editingNode.inputContent !== imagePrompt.value)) {

              // Show a notification that we're auto-generating the image
              DebugManager.addLog('Auto-generating image from prompt...', 'info');

              // We'll generate the image after closing the modal
              // Set a flag to indicate we need to generate an image
              this.editingNode.needsImageGeneration = true;
            }
          }
        }
        break;

      case 'audio':
      case 'video':
        // For audio/video, content is already set when uploading
        // But we should clear output if not processed
        if (!this.editingNode.hasBeenProcessed) {
          this.editingNode.content = this.editingNode.content || '';
        }
        break;
    }

    // Get input and output types if those fields exist
    const inputTypeField = document.getElementById('inputType');
    const outputTypeField = document.getElementById('outputType');
    const autoSizeCheckbox = document.getElementById('autoSizeNode');

    if (inputTypeField) this.editingNode.inputType = inputTypeField.value;
    if (outputTypeField) this.editingNode.outputType = outputTypeField.value;
    if (autoSizeCheckbox) this.editingNode.autoSize = autoSizeCheckbox.checked;

    // Reset cached content images when content type changes
    if (this.editingNode.contentType !== 'image') {
      this.editingNode.contentImage = null;
    }
    if (this.editingNode.contentType !== 'video') {
      this.editingNode.contentVideo = null;
    }
    if (this.editingNode.contentType !== 'audio') {
      this.editingNode.contentAudio = null;
    }

    // Auto-resize the node to fit the content
    if (this.editingNode.autoSize) {
      this.editingNode.calculateOptimalSize();
    }

    // Store a reference to the node for auto-generation
    const nodeToProcess = this.editingNode;
    const needsImageGeneration = this.editingNode.needsImageGeneration;

    // Close the modal
    ModalManager.closeModal('nodeEditor');
    this.editingNode = null;

    // Redraw the canvas
    this.draw();

    DebugManager.addLog('Node updated', 'success');

    // Auto-generate image if needed (after modal is closed)
    if (needsImageGeneration) {
      // Clear the flag
      nodeToProcess.needsImageGeneration = false;

      // Generate the image asynchronously
      (async () => {
        try {
          DebugManager.addLog(`Generating image for node ${nodeToProcess.id}...`, 'info');

          // Set processing state
          nodeToProcess.processing = true;
          nodeToProcess.error = null;
          this.draw();

          // Process the node
          const result = await nodeToProcess.processTextToImage(nodeToProcess.inputContent);

          // Update the node with the result
          nodeToProcess.content = result;
          nodeToProcess.contentType = 'image';
          nodeToProcess.hasBeenProcessed = true;
          nodeToProcess.processing = false;

          // Force recreate the image object to ensure it loads properly
          nodeToProcess.contentImage = new Image();
          nodeToProcess.contentImage.src = result;

          // Add load event listener to redraw when image loads
          nodeToProcess.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (nodeToProcess.autoSize) {
              nodeToProcess.calculateOptimalSize();
            }
            // Force a redraw to show the image
            this.draw();
          };

          // Auto-resize the node to fit the content
          if (nodeToProcess.autoSize) {
            nodeToProcess.calculateOptimalSize();
          }

          // Log success for debugging
          DebugManager.addLog(`Image generated for node ${nodeToProcess.id}: ${result.substring(0, 30)}...`, 'success');

          // Force a redraw to show the updated node
          this.draw();
        } catch (error) {
          nodeToProcess.processing = false;
          nodeToProcess.error = error.message;
          DebugManager.addLog(`Error generating image: ${error.message}`, 'error');
          this.draw();
        }
      })();
    }
    } catch (error) {
      // If anything goes wrong, restore the previous state
      this.nodes = currentNodes;
      this.connections = currentConnections;
      DebugManager.addLog(`Error saving node: ${error.message}`, 'error');
    }
  },

  // Execute the current node
  async executeNode(e) {
    // If called from an event, prevent default form submission
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!this.editingNode) return;

    try {
      // Get the processing log element
      const processingLog = document.getElementById('processingLog');
      if (processingLog) {
        processingLog.innerHTML = '<div class="log-entry info">Processing node...</div>';
      }

      let inputContent;
      let result;

      // Get input content based on the node's content type
      switch (this.editingNode.contentType) {
        case 'text':
          // For text, get input from the text area
          inputContent = document.getElementById('nodeContent').value;
          break;

        case 'image':
          // For image-to-text, use the node's content as input
          if (this.editingNode.aiProcessor === 'image-to-text') {
            // Use inputContent if it's an image URL, otherwise use content
            inputContent = this.editingNode.inputContent &&
              (this.editingNode.inputContent.startsWith('http') || this.editingNode.inputContent.startsWith('data:image')) ?
              this.editingNode.inputContent : this.editingNode.content;

            // Show the image in the processing log
            if (processingLog && inputContent) {
              processingLog.innerHTML += `
                <div class="log-entry">
                  <div>Processing image:</div>
                  <img src="${inputContent}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
                </div>
              `;
            }
          } else {
            // For text-to-image, get the prompt from the image prompt field
            const imagePrompt = document.getElementById('imagePrompt');
            if (imagePrompt) {
              inputContent = imagePrompt.value;
            }
          }
          break;

        case 'audio':
          // For audio, use the node's content as input
          inputContent = this.editingNode.content;
          break;

        case 'video':
          // For video, use the node's content as input
          inputContent = this.editingNode.content;
          break;
      }

      if (!inputContent) {
        throw new Error('No input content to process');
      }

      // Store the input content in the node
      this.editingNode.inputContent = inputContent;

      // Process the node based on the processor type
      switch (this.editingNode.aiProcessor) {
        case 'text-to-text':
          result = await this.editingNode.processTextToText(inputContent);
          break;

        case 'text-to-image':
          result = await this.editingNode.processTextToImage(inputContent);

          // Set content type to image for text-to-image nodes
          this.editingNode.contentType = 'image';

          // Store the result as the node's content
          this.editingNode.content = result;

          // Force recreate the image object to ensure it loads properly
          this.editingNode.contentImage = new Image();
          this.editingNode.contentImage.src = result;

          // Add load event listener to redraw when image loads
          this.editingNode.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (this.editingNode.autoSize) {
              this.editingNode.calculateOptimalSize();
            }
            // Force a redraw to show the image
            this.draw();
          };

          // Auto-resize the node to fit the content
          if (this.editingNode.autoSize) {
            this.editingNode.calculateOptimalSize();
          }

          // Force a redraw to show the updated node
          this.draw();

          // Show the generated image in the processing log
          if (processingLog && result) {
            processingLog.innerHTML += `
              <div class="log-entry success">
                <div>Generated image:</div>
                <img src="${result}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
              </div>
            `;
          }

          // Log success for debugging
          DebugManager.addLog(`Image generated successfully for node ${this.editingNode.id}: ${result.substring(0, 30)}...`, 'success');
          break;

        case 'image-to-text':
          result = await this.editingNode.processImageToText(inputContent);
          break;

        case 'audio-to-text':
          result = await this.editingNode.processAudioToText(inputContent);
          break;

        default:
          throw new Error(`Unsupported processor type: ${this.editingNode.aiProcessor}`);
      }

      // Store the output result in the node (already done for text-to-image in the switch case)
      if (this.editingNode.aiProcessor !== 'text-to-image') {
        this.editingNode.content = result;
      }

      // Mark the node as processed
      this.editingNode.hasBeenProcessed = true;

      // Show the result in the processing log
      if (processingLog && this.editingNode.aiProcessor !== 'text-to-image') {
        processingLog.innerHTML += `
          <div class="log-entry success">
            <div>Result:</div>
            <div class="result-content">${result}</div>
          </div>
        `;
      }

      // Special handling for text-to-image nodes after execution
      if (this.editingNode.aiProcessor === 'text-to-image') {
        // Ensure the content type is set to image
        this.editingNode.contentType = 'image';

        // Make sure we have the image loaded
        if (this.editingNode.content && (!this.editingNode.contentImage || this.editingNode.contentImage.src !== this.editingNode.content)) {
          // Force recreate the image object to ensure it loads properly
          this.editingNode.contentImage = new Image();
          this.editingNode.contentImage.src = this.editingNode.content;

          // Add load event listener to redraw when image loads
          this.editingNode.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (this.editingNode.autoSize) {
              this.editingNode.calculateOptimalSize();
            }
            // Force a redraw to show the image
            this.draw();
          };
        }
      }

      // Show a success message
      DebugManager.addLog('Node executed successfully', 'success');

      // Process any connected nodes
      const connections = this.connections.filter(conn => conn.fromNode === this.editingNode);
      if (connections.length > 0) {
        DebugManager.addLog(`Processing ${connections.length} connected node(s)...`, 'info');

        // Process each connected node
        for (const connection of connections) {
          try {
            await this.processNodeAndConnections(connection.toNode, result);
          } catch (err) {
            DebugManager.addLog(`Error processing connected node ${connection.toNode.id}: ${err.message}`, 'error');
          }
        }
      }

      // Redraw the canvas to show the updated content
      this.draw();

      return result;
    } catch (err) {
      // Show the error in the processing log
      const processingLog = document.getElementById('processingLog');
      if (processingLog) {
        processingLog.innerHTML += `
          <div class="log-entry error">
            <div>Error:</div>
            <div>${err.message}</div>
          </div>
        `;
      }

      // Store the error in the node
      this.editingNode.error = err.message;

      DebugManager.addLog(`Node execution failed: ${err.message}`, 'error');

      // Redraw the canvas to show the error
      this.draw();

      throw err;
    }
  },

  // Process a chain of nodes starting from the given node
  async processNodeChain(startNode) {
    if (!startNode) return;

    // Process the start node first
    await this.processNodeAndConnections(startNode, startNode.content);

    DebugManager.addLog('Node chain processing completed', 'success');
  },

  // Process a node and all its connected nodes
  async processNodeAndConnections(node, input) {
    if (!node) return;

    // Store the input content for the node
    if (input) {
      node.inputContent = input;
    }

    // Process the current node
    const output = await node.process(input);

    // Store the output in the node's content
    if (output && node.content !== output) {
      node.content = output;
      node.hasBeenProcessed = true;

      // Log for debugging
      DebugManager.addLog(`Node ${node.id} processed with output: ${output.substring ? output.substring(0, 30) + '...' : 'non-text content'}`, 'info');
    }

    // Special handling for text-to-image nodes
    if (node.aiProcessor === 'text-to-image') {
      // Set content type to image for text-to-image nodes
      node.contentType = 'image';

      // Store the input content for text-to-image nodes
      if (!node.inputContent && input) {
        node.inputContent = input;
      }

      if (node.hasBeenProcessed) {
        // Make sure the image is preloaded for display
        if (node.content) {
          // Force recreate the image object to ensure it loads properly
          node.contentImage = null;
          node.preloadContent();

          // Log success for debugging
          DebugManager.addLog(`Image content set for node ${node.id} in workflow: ${node.content.substring(0, 30)}...`, 'info');
        } else {
          DebugManager.addLog(`Warning: No image content for node ${node.id} in workflow`, 'warning');
        }
      }
    }

    // Find all connections from this node
    const connections = this.connections.filter(conn => conn.fromNode === node);

    // Process each connected node
    for (const connection of connections) {
      const toNode = connection.toNode;

      // If the output is an image and the next node can handle images
      if (node.contentType === 'image' &&
          (toNode.aiProcessor === 'image-to-text' ||
           (toNode.aiProcessor === 'text-to-text' &&
            (toNode.systemPrompt.toLowerCase().includes('image') ||
             toNode.systemPrompt.toLowerCase().includes('visual') ||
             toNode.systemPrompt.toLowerCase().includes('picture'))))) {

        // Clear any existing input image cache
        toNode.inputImage = null;

        // For image-to-text nodes, store the image URL as input content
        toNode.inputContent = output;
      }

      // Process the connected node with the output from the current node
      await this.processNodeAndConnections(toNode, output);
    }

    // Special handling for workflow output nodes
    if (node.workflowRole === 'output') {
      // Ensure the content is set
      if (output && node.content !== output) {
        node.content = output;
        node.hasBeenProcessed = true;
      }

      // Log for debugging
      DebugManager.addLog(`Output node ${node.id} final content: ${node.content ? (node.content.substring ? node.content.substring(0, 30) + '...' : 'non-text content') : 'empty'}`, 'info');
    }

    return output;
  },

  // Handle save workflow button click
  handleSaveWorkflow() {
    // Open the save workflow modal
    ModalManager.openModal('saveWorkflowModal');

    // Set default values
    const workflowName = document.getElementById('workflowName');
    const workflowDescription = document.getElementById('workflowDescription');

    if (workflowName) {
      workflowName.value = `Workflow ${new Date().toLocaleString()}`;
    }

    if (workflowDescription) {
      workflowDescription.value = `Workflow created on ${new Date().toLocaleString()}`;
    }
  },

  // Save workflow to server with name and description
  async saveWorkflowToServer() {
    // Check if the user is logged in
    if (!this.isUserLoggedIn()) {
      DebugManager.addLog('You must be logged in to save workflows to the server', 'error');

      // Ask if the user wants to log in
      if (confirm('You need to be logged in to save workflows. Would you like to go to the login page?')) {
        // Save current state to localStorage before redirecting
        this.handleSave();

        // Redirect to login page
        window.location.href = 'login.html';
      }

      return;
    }

    const workflowName = document.getElementById('workflowName');
    const workflowDescription = document.getElementById('workflowDescription');

    if (!workflowName || !workflowDescription) {
      DebugManager.addLog('Error: Could not find workflow name or description fields', 'error');
      return;
    }

    const name = workflowName.value.trim();
    const description = workflowDescription.value.trim();

    if (!name) {
      DebugManager.addLog('Error: Workflow name is required', 'error');
      return;
    }

    // Create a JSON representation of the current state
    const state = {
      name,
      description,
      nodes: this.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        title: node.title,
        content: node.content,
        inputContent: node.inputContent,
        contentType: node.contentType,
        systemPrompt: node.systemPrompt,
        aiProcessor: node.aiProcessor,
        inputType: node.inputType,
        outputType: node.outputType,
        hasBeenProcessed: node.hasBeenProcessed,
        autoSize: node.autoSize,
        selected: node.selected,
        expanded: node.expanded,
        error: node.error,
        workflowRole: node.workflowRole || 'none'
      })),
      connections: this.connections.map(conn => ({
        fromNodeId: conn.fromNode.id,
        toNodeId: conn.toNode.id
      }))
    };

    // Close the modal
    ModalManager.closeModal('saveWorkflowModal');

    // Show saving indicator
    DebugManager.addLog(`Saving workflow "${name}" to server...`, 'info');

    try {
      // First, verify that the user is still authenticated
      try {
        // Make a lightweight call to check authentication
        await ApiService.users.getProfile();
      } catch (authError) {
        // If authentication fails, save locally and prompt to log in
        this.handleSave();
        DebugManager.addLog('Authentication failed. Saving workflow locally.', 'warning');

        if (confirm('Your session has expired. Would you like to log in again to save to the server?')) {
          window.location.href = 'login.html';
        }
        return;
      }

      // Save to server
      const response = await ApiService.workflows.create(state);

      // Store the workflow ID for future reference
      if (response && response._id) {
        localStorage.setItem('current_workflow_id', response._id);
        DebugManager.addLog(`Workflow "${name}" saved to server with ID: ${response._id}`, 'success');

        // Refresh workflow list if available
        if (typeof this.refreshWorkflowList === 'function') {
          setTimeout(() => {
            this.refreshWorkflowList();
          }, 500); // Give the server some time to process the save
        }
      }
    } catch (error) {
      console.error('Error saving to server:', error);

      // Save locally as a fallback
      this.handleSave();

      // Show error message
      DebugManager.addLog(`Failed to save workflow to server: ${error.message}. Saved locally instead.`, 'error');

      // If the error is due to authentication, offer to log in
      if (error.message && (
          error.message.includes('authentication') ||
          error.message.includes('token') ||
          error.message.includes('unauthorized') ||
          error.message.includes('access denied') ||
          error.message.includes('not valid'))) {

        if (confirm('Your session may have expired. Would you like to log in again?')) {
          // Redirect to login page
          window.location.href = 'login.html';
        }
      }
    }
  },

  // Check if the user is logged in
  isUserLoggedIn() {
    // Check both localStorage and sessionStorage for the auth token
    const localToken = localStorage.getItem(Config.storageKeys.authToken);
    const sessionToken = sessionStorage.getItem(Config.storageKeys.authToken);

    return localToken !== null || sessionToken !== null;
  },

  // Handle save button click (local storage)
  async handleSave() {
    // Create a JSON representation of the current state
    const state = {
      name: `Workflow ${new Date().toLocaleString()}`,
      description: `Workflow created on ${new Date().toLocaleString()}`,
      nodes: this.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        title: node.title,
        content: node.content,
        inputContent: node.inputContent,
        contentType: node.contentType,
        systemPrompt: node.systemPrompt,
        aiProcessor: node.aiProcessor,
        inputType: node.inputType,
        outputType: node.outputType,
        hasBeenProcessed: node.hasBeenProcessed,
        autoSize: node.autoSize,
        selected: node.selected,
        expanded: node.expanded,
        error: node.error,
        workflowRole: node.workflowRole || 'none'
      })),
      connections: this.connections.map(conn => ({
        fromNodeId: conn.fromNode.id,
        toNodeId: conn.toNode.id
      }))
    };

    // Save to localStorage for backward compatibility
    localStorage.setItem('canvas_state', JSON.stringify(state));

    // Force all nodes to preload content after saving
    this.nodes.forEach(node => {
      if (node.contentType === 'image' || node.aiProcessor === 'text-to-image') {
        // Ensure images are properly loaded
        node.preloadContent();
      }
    });

    DebugManager.addLog('Canvas state saved to local storage', 'success');
  },

  // Handle load button click
  async handleLoad() {
    try {
      // First try to load from server
      const workflowId = localStorage.getItem('current_workflow_id');

      if (workflowId) {
        try {
          DebugManager.addLog(`Loading workflow ${workflowId} from server...`, 'info');

          // Load from server
          const workflow = await ApiService.workflows.getById(workflowId);

          if (workflow) {
            // Load the workflow
            this.loadWorkflowState(workflow);
            DebugManager.addLog('Workflow loaded from server', 'success');
            return;
          }
        } catch (error) {
          console.error('Error loading from server:', error);
          DebugManager.addLog(`Failed to load from server: ${error.message}. Trying local storage.`, 'warning');
        }
      }

      // If server load failed or no workflow ID, try localStorage
      const savedState = localStorage.getItem('canvas_state');
      if (!savedState) {
        DebugManager.addLog('No saved state found', 'error');
        return;
      }

      // Parse the saved state
      const state = JSON.parse(savedState);

      // Load the state
      this.loadWorkflowState(state);
      DebugManager.addLog('Canvas state loaded from local storage', 'success');
    } catch (err) {
      DebugManager.addLog(`Failed to load state: ${err.message}`, 'error');
    }
  },

  // Load workflow state
  loadWorkflowState(state) {
    // Clear the current state
    this.nodes = [];
    this.connections = [];

    // Recreate the nodes
    state.nodes.forEach(nodeData => {
      const node = new Node(nodeData.x, nodeData.y, nodeData.id);

      // Restore basic properties
      node.title = nodeData.title;
      node.content = nodeData.content;
      node.inputContent = nodeData.inputContent || '';
      node.contentType = nodeData.contentType;
      node.systemPrompt = nodeData.systemPrompt || '';
      node.aiProcessor = nodeData.aiProcessor;
      node.inputType = nodeData.inputType || 'text';
      node.outputType = nodeData.outputType || 'text';

      // Restore state properties
      node.hasBeenProcessed = nodeData.hasBeenProcessed || false;
      node.error = nodeData.error || null;
      node.selected = nodeData.selected || false;
      node.expanded = nodeData.expanded || false;
      node.autoSize = nodeData.autoSize !== undefined ? nodeData.autoSize : true;

      // Restore workflow role if it exists
      if (nodeData.workflowRole) {
        node.workflowRole = nodeData.workflowRole;

        // Update WorkflowIO references if available
        if (typeof WorkflowIO !== 'undefined') {
          if (nodeData.workflowRole === 'input') {
            WorkflowIO.inputNode = node;
            DebugManager.addLog(`Restored node ${node.id} as input node`, 'info');
          } else if (nodeData.workflowRole === 'output') {
            WorkflowIO.outputNode = node;
            DebugManager.addLog(`Restored node ${node.id} as output node`, 'info');
          }
        }
      }

      // Restore dimensions if saved
      if (nodeData.width && nodeData.height) {
        node.width = nodeData.width;
        node.height = nodeData.height;
      } else if (node.autoSize) {
        // If dimensions weren't saved but autoSize is enabled, calculate optimal size
        node.calculateOptimalSize();
      }

      // Special handling for image nodes
      if (node.contentType === 'image' || node.aiProcessor === 'text-to-image') {
        // Force content type to image for text-to-image nodes
        if (node.aiProcessor === 'text-to-image') {
          node.contentType = 'image';
        }

        // Preload the image content
        if (node.content) {
          // Force recreate the image object to ensure it loads properly
          node.contentImage = new Image();
          node.contentImage.src = node.content;

          // Add load event listener to redraw when image loads
          node.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (node.autoSize) {
              node.calculateOptimalSize();
            }
            // Force a redraw to show the image
            this.draw();
          };

          // Log success for debugging
          DebugManager.addLog(`Image content loaded for node ${node.id}`, 'info');
        }
      }

      this.nodes.push(node);
    });

    // Recreate the connections
    state.connections.forEach(connData => {
      const fromNode = this.nodes.find(node => node.id === connData.fromNodeId);
      const toNode = this.nodes.find(node => node.id === connData.toNodeId);

      if (fromNode && toNode) {
        this.connections.push(new Connection(fromNode, toNode));
      }
    });

    // Redraw the canvas
    this.draw();

    // Force another redraw after a short delay to ensure images are properly loaded
    setTimeout(() => {
      // Preload content for all nodes again
      this.nodes.forEach(node => node.preloadContent());
      this.draw();

      // Update WorkflowIO status if available
      if (typeof WorkflowIO !== 'undefined') {
        WorkflowIO.updateStatus();
        DebugManager.addLog('Updated workflow I/O status', 'info');
      }
    }, 500);

    DebugManager.updateCanvasStats();
  },

  // Add a node to the canvas
  addNode() {
    const id = this.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);
    this.nodes.push(node);
    DebugManager.addLog(`Added new node ${id}`, 'info');
    DebugManager.updateCanvasStats();
    this.draw();
  },

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.connections.forEach(conn => conn.draw(this.ctx));
    this.nodes.forEach(node => node.draw(this.ctx));
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
