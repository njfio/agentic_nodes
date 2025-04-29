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
    this.chatHistory = [];    // For storing chat messages
    this.inputImage = null;   // For caching input image content
    this.contentVideo = null; // For caching video content
    this.contentAudio = null; // For caching audio content
    this.expanded = false;    // Track if node is expanded to show more content
    this.hasBeenProcessed = false; // Track if node has been processed
    this.autoSize = true;     // Whether to automatically resize based on content
    this.inputCollapsed = false;  // Whether the input section is collapsed
    this.outputCollapsed = false; // Whether the output section is collapsed

    // Input tracking for multiple inputs
    this.inputSources = new Map(); // Map of source node IDs to their inputs
    this.waitForAllInputs = true;  // Whether to wait for all inputs before processing
    this.waitingForInputs = true;  // Default to waiting for inputs until all are ready

    this.stats = {
      inputTokens: 0,
      outputTokens: 0,
      lastProcessingTime: 0
    };

    // For API payload tracking
    this.lastRequestPayload = null; // Last API request payload
    this.lastResponsePayload = null; // Last API response payload
    this.lastRequestTime = null; // Timestamp of last request
    this.lastResponseTime = null; // Timestamp of last response

    // For chat nodes
    this.chatHistory = []; // Array of chat messages with {role: 'user'|'assistant', content: string}
  }

  getContentTypeIcon() {
    switch(this.contentType) {
      case 'image': return '🖼️';
      case 'audio': return '🔊';
      case 'video': return '🎥';
      case 'chat': return '💬';
      default: return '📝';
    }
  }

  // Reset the node's input state
  reset() {
    // Clear input sources
    this.inputSources = new Map();

    // Clear image inputs array
    this.imageInputs = [];

    // Clear additional images
    this.additionalImages = [];

    // Clear any cached image objects
    this.inputImage = null;

    // Reset waiting status
    this.waitingForInputs = false;

    // Log the reset
    DebugManager.addLog(`Reset input state for node "${this.title}" (ID: ${this.id})`, 'info');
  }

  // Add a message to the chat history
  addChatMessage(message, role = 'user') {
    // Create a new message object
    const chatMessage = {
      role,
      content: message,
      timestamp: new Date().toISOString()
    };

    // Initialize chat history if it doesn't exist
    if (!this.chatHistory) {
      this.chatHistory = [];
    }

    // Add to chat history
    this.chatHistory.push(chatMessage);

    // Update the content with the full chat history for passing to other nodes
    this.updateChatContent();

    // If this is a user message, process it to get AI response
    if (role === 'user' && this.contentType === 'chat' && this.aiProcessor === 'chat') {
      // Process the message to get AI response
      this.processChatMessage(message);
    }

    return chatMessage;
  }

  // Update the node content with formatted chat history
  updateChatContent() {
    // Format the chat history as a string
    let formattedChat = '';

    this.chatHistory.forEach(msg => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      formattedChat += `${roleLabel}: ${msg.content}\n\n`;
    });

    // Update the node content
    this.content = formattedChat.trim();

    // Mark as processed if we have any messages
    if (this.chatHistory.length > 0) {
      this.hasBeenProcessed = true;
    }

    // Auto-resize the node if needed
    if (this.autoSize) {
      this.calculateOptimalSize();
    }
  }

  // Update the node's content with proper cache-busting for images
  updateNodeContent(content) {
    // If this is an image node and the content has changed, force a complete refresh
    if ((this.contentType === 'image' || this.aiProcessor === 'text-to-image' || this.aiProcessor === 'image-to-image') &&
        this.content !== content) {
      // Clean up previous image object to prevent memory leaks
      if (this.contentImage) {
        // Remove event listeners
        this.contentImage.onload = null;
        this.contentImage.onerror = null;
        // Set src to empty to cancel any pending loads
        this.contentImage.src = '';
        // Clear the reference
        this.contentImage = null;
      }

      // Add a timestamp to force a refresh of the image
      const timestamp = Date.now();
      let refreshedContent = content;

      if (refreshedContent && typeof refreshedContent === 'string') {
        if (refreshedContent.includes('?')) {
          refreshedContent = refreshedContent.split('?')[0] + '?t=' + timestamp;
        } else if (!refreshedContent.startsWith('data:')) {
          refreshedContent = refreshedContent + '?t=' + timestamp;
        }
      }

      // Update the content with cache-busting
      this.content = refreshedContent;

      // Create a new image object with weak event handlers
      this.contentImage = new Image();

      // Use a weak reference for event handlers to prevent memory leaks
      const nodeId = this.id; // Store reference to this.id

      // Set up event handlers
      this.contentImage.onload = () => {
        DebugManager.addLog(`Image loaded for node ${nodeId} after content update`, 'success');

        // Update size if needed, but don't trigger a redraw
        if (this.autoSize) {
          this.calculateOptimalSize();
        }

        // If this is an output node, update the workflow chat panel
        if (this.workflowRole === 'output' && typeof WorkflowPanel !== 'undefined') {
          // Only update if we're not showing all node outputs
          const showAllNodeOutputs = document.getElementById('showAllNodeOutputs')?.checked || false;
          if (!showAllNodeOutputs) {
            WorkflowPanel.addMessage(refreshedContent, 'assistant', true);
            DebugManager.addLog(`Updated workflow chat with new image from node ${nodeId}`, 'success');
          }
        }

        // Clean up the event handler after it's fired
        if (this.contentImage) {
          this.contentImage.onload = null;
        }
      };

      this.contentImage.onerror = (err) => {
        DebugManager.addLog(`Error loading image for node ${nodeId}: ${err.message || 'Unknown error'}`, 'error');

        // Clean up on error
        if (this.contentImage) {
          this.contentImage.onload = null;
          this.contentImage.onerror = null;
          this.contentImage = null;
        }
      };

      // Set the source to trigger loading
      this.contentImage.src = refreshedContent;

      DebugManager.addLog(`Updating image content for node ${nodeId} with cache-busting`, 'info');
    } else {
      // For non-image nodes, just update the content
      this.content = content;
    }

    this.hasBeenProcessed = true;
  }

  // Process a chat message to get AI response
  async processChatMessage(message) {
    // Set processing state
    this.processing = true;
    DebugManager.state.processingNodes++;

    try {
      // Create messages array for the API
      const messages = [];

      // Add system prompt if available
      if (this.systemPrompt) {
        messages.push({
          role: 'system',
          content: this.systemPrompt
        });
      }

      // Add all chat history
      this.chatHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Get OpenAI config
      const config = ApiService.openai.getConfig();

      // Prepare the request data
      const requestData = {
        model: config.model || Config.defaultOpenAIConfig.model,
        messages: messages,
        temperature: config.temperature || Config.defaultOpenAIConfig.temperature,
        max_tokens: config.max_tokens || Config.defaultOpenAIConfig.maxTokens
      };

      // Store the request payload and timestamp
      this.lastRequestPayload = JSON.parse(JSON.stringify(requestData));
      this.lastRequestTime = new Date().toISOString();

      // Log the timeout value for debugging
      const timeoutSeconds = config.timeout || 300; // Default to 5 minutes if not set
      DebugManager.addLog(`Using timeout of ${timeoutSeconds} seconds for chat node ${this.id}`, 'info');

      // Call the API
      const data = await ApiService.openai.chat(requestData);

      // Check if we have a valid response
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response from OpenAI API. Please try again.');
      }

      // Store the response payload and timestamp
      this.lastResponsePayload = JSON.parse(JSON.stringify(data));
      this.lastResponseTime = new Date().toISOString();

      // Get the response content
      const responseContent = data.choices[0].message.content;

      // Add the AI response to chat history
      this.addChatMessage(responseContent, 'assistant');

      // Update stats
      DebugManager.state.totalRequests++;

      // Redraw the canvas
      App.draw();

      return responseContent;
    } catch (err) {
      this.error = err.message;
      DebugManager.addLog(`Chat node "${this.title}" (ID: ${this.id}) error: ${err.message}`, 'error');
      throw err;
    } finally {
      this.processing = false;
      DebugManager.state.processingNodes--;
      DebugManager.updateUsageStats();
    }
  }

  async process(input) {
    this.processing = true;
    this.error = null;
    DebugManager.state.processingNodes++;

    // Add more detailed logging
    DebugManager.addLog(`Processing node "${this.title}" (ID: ${this.id}) with input: ${input ? (typeof input === 'string' ? input.substring(0, 30) + '...' : 'non-text content') : 'empty input'}`, 'info');

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
          if (isImageInput) {
            // If input is an image and this is a text-to-image node,
            // use image-to-image processing instead
            DebugManager.addLog(`Node ${this.id} received image input, using image-to-image processing`, 'info');
            output = await this.processImageToImage(input);
          } else {
            output = await this.processTextToImage(input);
          }
          break;

        case 'image-to-text':
          output = await this.processImageToText(input);
          break;

        case 'image-to-image':
          output = await this.processImageToImage(input);
          break;

        case 'audio-to-text':
          output = await this.processAudioToText(input);
          break;

        case 'chat':
          // For chat nodes, add the input as a user message and process it
          if (input && input.trim()) {
            // Initialize chat history if it doesn't exist
            if (!this.chatHistory) {
              this.chatHistory = [];
            }

            // Add the input as a user message
            this.addChatMessage(input, 'user');

            // Process the message to get AI response
            output = await this.processChatMessage(input);
          } else {
            // If no input, just return the last message or empty string
            output = this.chatHistory && this.chatHistory.length > 0 ?
              this.chatHistory[this.chatHistory.length - 1].content : '';
          }
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

      DebugManager.addLog(`Node "${this.title}" (ID: ${this.id}) processed successfully`, 'success');

      // Clear waiting status for any nodes that depend on this one
      this.updateDependentNodes();

      return output;
    } catch (err) {
      this.error = err.message;
      DebugManager.addLog(`Node "${this.title}" (ID: ${this.id}) error: ${err.message}`, 'error');
      throw err;
    } finally {
      this.processing = false;
      DebugManager.state.processingNodes--;
      DebugManager.updateUsageStats();
    }
  }

  // Update nodes that depend on this node
  updateDependentNodes() {
    // Find all connections from this node
    const connections = App.connections.filter(conn => conn.fromNode === this);

    // Log for debugging
    if (connections.length > 0) {
      DebugManager.addLog(`Node ${this.id} updating ${connections.length} dependent node(s)`, 'info');
      DebugManager.addLog(`Calling updateDependentNodes for node "${this.title}" (ID: ${this.id})`, 'info');
    }

    // For each connected node, update its input sources
    for (const connection of connections) {
      const toNode = connection.toNode;

      // Skip if the node is already processing
      if (toNode.processing) {
        DebugManager.addLog(`Node ${toNode.id} is already processing, skipping`, 'info');
        continue;
      }

      // Skip if the node has already been processed and we don't support retriggering yet
      if (toNode.hasBeenProcessed) {
        DebugManager.addLog(`Node ${toNode.id} has already been processed, skipping (retriggering not supported yet)`, 'info');
        continue;
      }

      // Determine what to pass to the target node
      let outputToPass;

      // If this is an image node and we have an outputImageId, pass that
      if (this.contentType === 'image' && this.outputImageId) {
        outputToPass = this.outputImageId;
        DebugManager.addLog(`Passing image ID ${this.outputImageId} from node ${this.id} to node ${toNode.id}`, 'info');
      } else {
        // Otherwise pass the content directly
        outputToPass = this.content;
      }

      // Special handling for image data passing to image-capable nodes
      if (this.contentType === 'image' &&
          (toNode.aiProcessor === 'image-to-text' ||
           toNode.aiProcessor === 'image-to-image' ||
           (toNode.aiProcessor === 'text-to-text' &&
            (toNode.systemPrompt.toLowerCase().includes('image') ||
             toNode.systemPrompt.toLowerCase().includes('visual') ||
             toNode.systemPrompt.toLowerCase().includes('picture'))))) {

        // Clear any existing input image cache
        toNode.inputImage = null;

        // For image-capable nodes, we don't set inputContent directly anymore
        // Instead, we'll let the addInput method handle it through the inputSources map
        DebugManager.addLog(`Passing image data from node ${this.id} to node ${toNode.id}`, 'info');
      }

      // Add this node's output to the target node's input sources
      const isReady = toNode.addInput(this, outputToPass);

      // Log the input being passed
      DebugManager.addLog(`Passing output from node ${this.id} to node ${toNode.id}: ${outputToPass ? (typeof outputToPass === 'string' && outputToPass.length > 30 ? outputToPass.substring(0, 30) + '...' : 'non-text content') : 'empty'}`, 'info');

      // If the node is ready to process (all required inputs available), trigger processing
      if (isReady) {
        DebugManager.addLog(`Node ${toNode.id} has all required inputs and is ready to process`, 'info');

        // Process the node asynchronously to allow parallel processing
        this.processNodeAsync(toNode);
      } else {
        DebugManager.addLog(`Node ${toNode.id} is waiting for more inputs before processing`, 'info');
      }
    }
  }

  // Process a node asynchronously
  processNodeAsync(node) {
    // Skip if the node is already processing
    if (node.processing) {
      DebugManager.addLog(`Node ${node.id} is already processing, skipping async processing`, 'info');
      return;
    }

    // Skip if the node has already been processed and we don't support retriggering yet
    if (node.hasBeenProcessed) {
      DebugManager.addLog(`Node ${node.id} has already been processed, skipping async processing (retriggering not supported yet)`, 'info');
      return;
    }

    // Use setTimeout with 0 delay to process in the next event loop iteration
    // This allows multiple nodes to start processing in parallel
    setTimeout(() => {
      // Skip if the node started processing in the meantime
      if (node.processing) {
        DebugManager.addLog(`Node ${node.id} started processing since scheduling, skipping async processing`, 'info');
        return;
      }

      // Skip if the node has been processed in the meantime
      if (node.hasBeenProcessed) {
        DebugManager.addLog(`Node ${node.id} has been processed since scheduling, skipping async processing`, 'info');
        return;
      }

      // Check if the node is ready to process
      if (!node.isReadyToProcess()) {
        DebugManager.addLog(`Node ${node.id} is not ready to process yet, waiting for more inputs`, 'info');
        return;
      }

      // Get the combined input
      const processInput = node.inputSources.size > 0 ? node.combineInputs() : node.inputContent;

      // Log the processing attempt
      DebugManager.addLog(`Starting to process node "${node.title}" (ID: ${node.id}) with input: ${processInput ? (typeof processInput === 'string' ? processInput.substring(0, 30) + '...' : 'non-text content') : 'empty input'}`, 'info');

      // Process the node with this node as the source
      App.processNodeAndConnections(node, processInput, this)
        .then(output => {
          DebugManager.addLog(`Successfully processed node "${node.title}" (ID: ${node.id})`, 'success');
        })
        .catch(err => {
          DebugManager.addLog(`Failed to process node "${node.title}" (ID: ${node.id}): ${err.message}`, 'error');
        });
    }, 0);
  }

  async processTextToText(input) {
    DebugManager.state.requestQueue++;
    DebugManager.state.lastRequestTime = Date.now();

    try {
      const config = JSON.parse(localStorage.getItem(Config.storageKeys.openAIConfig) || '{}');

      // Check if we have image inputs
      const hasImageInput = Utils.isImageData(input) ||
                           (this.imageInputIds && this.imageInputIds.length > 0);

      // Prepare the request data
      let requestData;

      if (hasImageInput) {
        // Handle text-to-text with image inputs (similar to image-to-text)
        DebugManager.addLog(`Node ${this.id} has image inputs, using multimodal format`, 'info');

        // Prepare the content array for the request
        const contentArray = [];

        // Add the system prompt as text
        contentArray.push({
          type: "text",
          text: this.systemPrompt || "You are a helpful assistant that can analyze both text and images."
        });

        // If the input is text, add it
        if (typeof input === 'string' && !Utils.isImageData(input)) {
          contentArray.push({
            type: "text",
            text: input
          });
        }

        // If the input is an image, add it
        if (Utils.isImageData(input)) {
          contentArray.push({
            type: "image_url",
            image_url: {
              url: input
            }
          });
        }

        // Add images from imageInputIds, but prevent duplicates and limit the total number
        if (this.imageInputIds && this.imageInputIds.length > 0) {
          // Create a Set to track unique image data to prevent duplicates
          const addedImageData = new Set();
          // Limit to a maximum of 5 images to prevent payload size issues
          const MAX_IMAGES = 5;
          let imageCount = 0;

          // Log the total number of images before filtering
          DebugManager.addLog(`Node ${this.id} has ${this.imageInputIds.length} images in imageInputIds before filtering`, 'info');

          for (const imgId of this.imageInputIds) {
            // Stop if we've reached the maximum number of images
            if (imageCount >= MAX_IMAGES) {
              DebugManager.addLog(`Reached maximum limit of ${MAX_IMAGES} images for node ${this.id}, skipping remaining images`, 'warning');
              break;
            }

            // Use the synchronous version to avoid Promise objects
            const imgData = ImageStorage.getImageSync(imgId);

            if (imgData) {
              // Check if this exact image data has already been added
              // Use a hash or truncated version of the data to check for duplicates
              const imageHash = imgData.substring(0, 100); // Use first 100 chars as a simple hash

              if (!addedImageData.has(imageHash)) {
                // Add the image to the content array
                contentArray.push({
                  type: "image_url",
                  image_url: {
                    url: imgData
                  }
                });

                // Add to our set of added images
                addedImageData.add(imageHash);
                imageCount++;

                DebugManager.addLog(`Added image ${imgId} to text-to-text request (${imageCount}/${MAX_IMAGES})`, 'info');
              } else {
                DebugManager.addLog(`Skipping duplicate image ${imgId} for node ${this.id}`, 'info');
              }
            } else {
              DebugManager.addLog(`Warning: Image ${imgId} not found in cache, skipping`, 'warning');
            }
          }

          // Log the final number of images added
          DebugManager.addLog(`Node ${this.id} added ${imageCount} unique images to the request`, 'info');
        }

        // Create the request with the content array
        requestData = {
          model: Config.imageAnalysisModel || "gpt-4o",
          messages: [
            {
              role: "user",
              content: contentArray
            }
          ],
          temperature: config.temperature || Config.defaultOpenAIConfig.temperature,
          max_tokens: config.maxTokens || Config.defaultOpenAIConfig.maxTokens
        };
      } else {
        // Standard text-to-text request
        requestData = {
          model: config.model || Config.defaultOpenAIConfig.model,
          messages: [
            { role: 'system', content: this.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: input }
          ],
          temperature: config.temperature || Config.defaultOpenAIConfig.temperature,
          max_tokens: config.maxTokens || Config.defaultOpenAIConfig.maxTokens
        };
      }

      // Store the request payload and timestamp
      this.lastRequestPayload = JSON.parse(JSON.stringify(requestData));
      this.lastRequestTime = new Date().toISOString();

      try {
        // Log the timeout value for debugging
        const config = ApiService.openai.getConfig();
        const timeoutSeconds = config.timeout || 300; // Default to 5 minutes if not set
        DebugManager.addLog(`Using timeout of ${timeoutSeconds} seconds for node ${this.id}`, 'info');

        // Call the API through our service with retry logic built into ApiService
        const data = await ApiService.openai.chat(requestData);

        // Check if we have a valid response
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response from OpenAI API. Please try again.');
        }

        // Store the response payload and timestamp
        this.lastResponsePayload = JSON.parse(JSON.stringify(data));
        this.lastResponseTime = new Date().toISOString();

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

        // Create more user-friendly error messages for common errors
        let errorMessage = apiError.message;

        if (errorMessage === 'API request failed') {
          errorMessage = 'OpenAI API request failed. The service may be temporarily unavailable. Please try again later.';
        } else if (errorMessage.includes('rate limit')) {
          errorMessage = 'OpenAI API rate limit exceeded. Please wait a moment before trying again.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'OpenAI API request timed out. The service may be busy. Please try again later.';
        } else if (errorMessage.includes('NetworkError')) {
          errorMessage = 'Network error while connecting to OpenAI. Please check your internet connection and try again.';
        }

        // Log the user-friendly error
        DebugManager.addLog(`Text-to-text API error: ${errorMessage}`, 'error');

        // For other errors, throw with improved message
        throw new Error(errorMessage);
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

      // Check if input is an image URL or data
      if (Utils.isImageData(input)) {
        DebugManager.addLog(`Node ${this.id} received image input for text-to-image node, redirecting to image-to-image processing`, 'info');
        return this.processImageToImage(input);
      }

      // Prepare the request data for text-to-image
      const requestData = {
        model: Config.imageModel,
        prompt: input,
        n: 1,
        size: "1024x1024",
        quality: "high"  // Valid values are 'low', 'medium', 'high', and 'auto'
      };

      // Store the request payload and timestamp
      this.lastRequestPayload = JSON.parse(JSON.stringify(requestData));
      this.lastRequestTime = new Date().toISOString();

      try {
        // Log the timeout value for debugging
        const config = ApiService.openai.getConfig();
        const timeoutSeconds = config.timeout || 300; // Default to 5 minutes if not set
        DebugManager.addLog(`Using timeout of ${timeoutSeconds} seconds for image generation (node ${this.id})`, 'info');

        // Call the API through our service with retry logic built into ApiService
        const data = await ApiService.openai.generateImage(requestData);

        // Check if we have a valid response
        if (!data || !data.data || !data.data.length) {
          throw new Error('Invalid response from OpenAI API. Please try again.');
        }

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

        // Create more user-friendly error messages for common errors
        let errorMessage = apiError.message;

        if (errorMessage === 'API request failed') {
          errorMessage = 'OpenAI API request failed. The service may be temporarily unavailable. Please try again later.';
        } else if (errorMessage.includes('rate limit')) {
          errorMessage = 'OpenAI API rate limit exceeded. Please wait a moment before trying again.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'OpenAI API request timed out. The service may be busy. Please try again later.';
        } else if (errorMessage.includes('NetworkError')) {
          errorMessage = 'Network error while connecting to OpenAI. Please check your internet connection and try again.';
        } else if (errorMessage.includes('content policy')) {
          errorMessage = 'Your image prompt may violate OpenAI\'s content policy. Please modify your prompt and try again.';
        }

        // Log the user-friendly error
        DebugManager.addLog(`Text-to-image API error: ${errorMessage}`, 'error');

        // Create an error image with the message
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
        ctx.fillText('⚠️ Image Generation Error', canvas.width/2, 50);

        // Split error message into multiple lines
        const words = errorMessage.split(' ');
        let line = '';
        let y = 100;
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';

        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 350 && line !== '') {
            ctx.fillText(line, canvas.width/2, y);
            line = word + ' ';
            y += 25;
          } else {
            line = testLine;
          }
        }
        if (line) {
          ctx.fillText(line, canvas.width/2, y);
        }

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

        // For other errors, throw with improved message
        throw new Error(errorMessage);
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
      // Ensure input is a valid image URL, base64 data, or image ID
      if (!input) {
        throw new Error('No image provided');
      }

      // Check if input is an image ID from our storage
      let imageUrl;
      if (typeof input === 'string' && input.startsWith('img_')) {
        // This is an image ID, get the actual image data
        // Use the synchronous version to avoid Promise objects
        const imageData = ImageStorage.getImageSync(input);
        if (!imageData) {
          throw new Error(`Image with ID ${input} not found in storage`);
        }
        imageUrl = imageData;
        DebugManager.addLog(`Retrieved image data for ID ${input}`, 'info');
      } else {
        // Use the input directly
        imageUrl = input;
      }

      // Log the image URL for debugging
      DebugManager.addLog(`Processing image: ${typeof imageUrl === 'string' ? imageUrl.substring(0, 50) + '...' : 'non-string image data'}`, 'info');

      // Prepare the content array for the request
      const contentArray = [];

      // Add the system prompt as text
      contentArray.push({
        type: "text",
        text: this.systemPrompt || "Describe this image in detail."
      });

      // Add the primary image
      contentArray.push({
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      });

      // Add any additional images if available, but limit the number
      if (this.additionalImageIds && this.additionalImageIds.length > 0) {
        // Create a Set to track unique image data to prevent duplicates
        const addedImageData = new Set();
        // Limit to a maximum of 5 images to prevent payload size issues
        const MAX_IMAGES = 5;
        let imageCount = 0;

        // Log the total number of images before filtering
        DebugManager.addLog(`Node ${this.id} has ${this.additionalImageIds.length} additional images before filtering`, 'info');

        for (const imgId of this.additionalImageIds) {
          // Stop if we've reached the maximum number of images
          if (imageCount >= MAX_IMAGES) {
            DebugManager.addLog(`Reached maximum limit of ${MAX_IMAGES} additional images for node ${this.id}, skipping remaining images`, 'warning');
            break;
          }

          // Use the synchronous version to avoid Promise objects
          const imgData = ImageStorage.getImageSync(imgId);

          if (imgData) {
            // Check if this exact image data has already been added
            // Use a hash or truncated version of the data to check for duplicates
            const imageHash = imgData.substring(0, 100); // Use first 100 chars as a simple hash

            if (!addedImageData.has(imageHash)) {
              // Add the image to the content array
              contentArray.push({
                type: "image_url",
                image_url: {
                  url: imgData
                }
              });

              // Add to our set of added images
              addedImageData.add(imageHash);
              imageCount++;

              DebugManager.addLog(`Added additional image ${imgId} to request (${imageCount}/${MAX_IMAGES})`, 'info');
            } else {
              DebugManager.addLog(`Skipping duplicate additional image ${imgId} for node ${this.id}`, 'info');
            }
          } else {
            DebugManager.addLog(`Warning: Image ${imgId} not found in cache, skipping`, 'warning');
          }
        }

        // Log the final number of images added
        DebugManager.addLog(`Node ${this.id} added ${imageCount} unique additional images to the request`, 'info');
      }

      // Prepare the request data
      const requestData = {
        model: Config.imageAnalysisModel,
        messages: [
          {
            role: "user",
            content: contentArray
          }
        ],
        max_tokens: Config.defaultOpenAIConfig.maxTokens
      };

      // Store the request payload and timestamp
      this.lastRequestPayload = JSON.parse(JSON.stringify(requestData));
      this.lastRequestTime = new Date().toISOString();

      try {
        // Log the timeout value for debugging
        const config = ApiService.openai.getConfig();
        const timeoutSeconds = config.timeout || 300; // Default to 5 minutes if not set
        DebugManager.addLog(`Using timeout of ${timeoutSeconds} seconds for image analysis (node ${this.id})`, 'info');

        // Call the API through our service with retry logic built into ApiService
        const data = await ApiService.openai.chat(requestData);

        // Store the response payload and timestamp
        this.lastResponsePayload = JSON.parse(JSON.stringify(data));
        this.lastResponseTime = new Date().toISOString();

        // Check if we have a valid response
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response from OpenAI API. Please try again.');
        }

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

        // Create more user-friendly error messages for common errors
        let errorMessage = apiError.message;

        if (errorMessage === 'API request failed') {
          errorMessage = 'OpenAI API request failed. The service may be temporarily unavailable. Please try again later.';
        } else if (errorMessage.includes('rate limit')) {
          errorMessage = 'OpenAI API rate limit exceeded. Please wait a moment before trying again.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'OpenAI API request timed out. The service may be busy. Please try again later.';
        } else if (errorMessage.includes('NetworkError')) {
          errorMessage = 'Network error while connecting to OpenAI. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Invalid image')) {
          errorMessage = 'The image format is not supported or the image is corrupted. Please try a different image.';
        } else if (errorMessage.includes('image_url')) {
          errorMessage = 'There was a problem with the image URL. Please ensure the image is accessible.';
        }

        // Log the user-friendly error
        DebugManager.addLog(`Image-to-text API error: ${errorMessage}`, 'error');

        // For other errors, throw with improved message
        throw new Error(errorMessage);
      }
    } catch (error) {
      DebugManager.addLog(`Image-to-text API error: ${error.message}`, 'error');
      this.error = error.message;
      throw error;
    } finally {
      DebugManager.state.requestQueue--;
    }
  }

  async processImageToImage(input) {
    DebugManager.state.requestQueue++;
    DebugManager.state.lastRequestTime = Date.now();

    try {
      // Check if input is an image ID from our storage
      let inputImageId = null;
      let inputImageData = null;

      if (typeof input === 'string' && input.startsWith('img_')) {
        // This is an image ID
        inputImageId = input;
        // Use the synchronous version to avoid Promise objects
        inputImageData = ImageStorage.getImageSync(inputImageId);

        if (!inputImageData) {
          throw new Error(`Image with ID ${inputImageId} not found in cache`);
        }
      } else if (Utils.isImageData(input)) {
        // This is raw image data, store it and get an ID
        inputImageId = ImageStorage.storeImage(input);
        inputImageData = input;
      } else {
        throw new Error('Invalid image input for image-to-image processing');
      }

      // Store the input content
      this.inputContent = inputImageData;
      this.inputImageId = inputImageId;

      // Initialize arrays if they don't exist
      if (!this.imageInputIds) {
        this.imageInputIds = [];
      }

      if (!this.additionalImageIds) {
        this.additionalImageIds = [];
      }

      // If we have imageInputIds array, make sure the primary input is included
      if (!this.imageInputIds.includes(inputImageId)) {
        this.imageInputIds.unshift(inputImageId);
        DebugManager.addLog(`Added primary input to imageInputIds array (total: ${this.imageInputIds.length})`, 'info');
      }

      // Log the image processing
      DebugManager.addLog(`Processing image-to-image for node ${this.id}`, 'info');

      // Get the OpenAI API key from the configuration
      const apiKey = document.getElementById('apiKey').value;
      if (!apiKey) {
        throw new Error('OpenAI API key is required for image-to-image processing');
      }

      // Get the prompt from the node's system prompt or use a default
      const prompt = this.systemPrompt || 'Enhance this image';

      // Collect all image IDs for the request
      let allImageIds = [];

      // Add the primary image ID
      allImageIds.push(inputImageId);

      // Add additional image IDs from both arrays, ensuring no duplicates
      const allAdditionalImageIds = new Set();

      // Add from additionalImageIds array
      if (Array.isArray(this.additionalImageIds)) {
        for (const imgId of this.additionalImageIds) {
          if (imgId && imgId !== inputImageId) {
            allAdditionalImageIds.add(imgId);
          }
        }
      }

      // Add from imageInputIds array
      if (Array.isArray(this.imageInputIds) && this.imageInputIds.length > 1) {
        for (const imgId of this.imageInputIds.slice(1)) {
          if (imgId && imgId !== inputImageId) {
            allAdditionalImageIds.add(imgId);
          }
        }
      }

      // Add all additional image IDs to the allImageIds array
      allImageIds = [...allImageIds, ...Array.from(allAdditionalImageIds)];

      DebugManager.addLog(`Using ${allImageIds.length} total images for image-to-image processing`, 'info');

      // Retrieve the actual image data from storage
      const allImageData = [];
      for (const imgId of allImageIds) {
        // Use the synchronous version to avoid Promise objects
        const imgData = ImageStorage.getImageSync(imgId);
        if (imgData) {
          allImageData.push(imgData);
        } else {
          DebugManager.addLog(`Warning: Image with ID ${imgId} not found in cache, skipping`, 'warning');
        }
      }

      if (allImageData.length === 0) {
        throw new Error('No valid images available for processing');
      }

      // Following the OpenAI example, we'll use the images/generation endpoint with the image parameter
      // that accepts an array of images

      // Prepare the images for the OpenAI API
      DebugManager.addLog(`Preparing ${allImageIds.length} images for OpenAI API`, 'info');

      // Get the actual image data for each image ID
      const imageDataArray = [];
      for (const imageId of allImageIds) {
        // Use the synchronous version to avoid Promise objects
        const imageData = ImageStorage.getImageSync(imageId);
        if (imageData) {
          imageDataArray.push(imageData);
          DebugManager.addLog(`Retrieved image data for ID ${imageId}`, 'info');
        } else {
          DebugManager.addLog(`Warning: Could not find image data for ID ${imageId} in cache, skipping`, 'warning');
        }
      }

      if (imageDataArray.length === 0) {
        throw new Error('No valid images available for processing');
      }

      // Prepare the request body for the image generation endpoint
      // For multiple images, we'll use the Vision API to analyze them and then generate a new image
      if (imageDataArray.length > 1) {
        DebugManager.addLog(`Using Vision API to analyze ${imageDataArray.length} images before generation`, 'info');

        // Prepare the content array for the Vision API
        const content = [
          {
            type: "text",
            text: `I need to create a new image based on the following reference images and prompt: "${prompt}".
                   Please analyze these images and provide a detailed description that I can use with an image generation model.
                   Focus on the key visual elements, style, composition, and how they relate to the prompt.
                   Your description will be used directly as a prompt for image generation, so make it detailed and specific.`
          }
        ];

        // Add all images to the content array
        for (const imgData of imageDataArray) {
          content.push({
            type: "image_url",
            image_url: {
              url: imgData
            }
          });
        }

        // Step 1: Use GPT-4o to analyze the images and create a detailed description
        DebugManager.addLog(`Using GPT-4o to analyze ${imageDataArray.length} images`, 'info');

        // Prepare the vision request data
        const visionRequestData = {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content
            }
          ],
          max_tokens: 1000
        };

        // Store the vision request payload and timestamp
        this.lastRequestPayload = JSON.parse(JSON.stringify(visionRequestData));
        this.lastRequestTime = new Date().toISOString();

        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(visionRequestData)
        });

        // Check if the vision request was successful
        if (!visionResponse.ok) {
          const errorText = await visionResponse.text();
          let errorMessage = `OpenAI Vision API error: ${errorText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = `OpenAI Vision API error: ${errorData.error?.message || 'Unknown error'}`;
            DebugManager.addLog(`Vision API Error Details: ${JSON.stringify(errorData)}`, 'error');
          } catch (e) {
            // If parsing fails, use the raw text
          }
          throw new Error(errorMessage);
        }

        // Parse the vision response
        const visionData = await visionResponse.json();

        // Store the vision response payload and timestamp
        this.lastResponsePayload = JSON.parse(JSON.stringify(visionData));
        this.lastResponseTime = new Date().toISOString();

        // Get the enhanced prompt from the Vision API
        const enhancedPrompt = visionData.choices[0].message.content;

        DebugManager.addLog(`Enhanced prompt created from ${imageDataArray.length} images: ${enhancedPrompt.substring(0, 100)}...`, 'info');

        // Step 2: Use the enhanced prompt to generate a new image
        DebugManager.addLog(`Using image generation API with enhanced prompt`, 'info');

        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: enhancedPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'high'
          })
        });
      }
      // For a single image, use the variations endpoint
      else {
        DebugManager.addLog(`Using image variations endpoint for single image`, 'info');

        // Extract base64 data from the image
        let imageBase64;
        if (imageDataArray[0].startsWith('data:')) {
          imageBase64 = ImageStorage.extractBase64FromDataURL(imageDataArray[0]);
        } else {
          imageBase64 = imageDataArray[0];
        }

        // Create a FormData object for the variations API
        const formData = new FormData();

        // Convert base64 to blob
        const blob = await ImageStorage.base64ToBlob(imageDataArray[0]);

        // Add the image to the form data
        formData.append('image', blob);
        formData.append('model', 'gpt-image-1');
        formData.append('prompt', prompt);
        formData.append('n', '1');
        formData.append('size', '1024x1024');
        formData.append('quality', 'high');

        // Make the API request to the variations endpoint
        DebugManager.addLog(`Making API request to OpenAI images/variations endpoint`, 'info');

        const response = await fetch('https://api.openai.com/v1/images/variations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        });
      }

      // Define a function to handle the API response
      const handleApiResponse = async (response) => {
        // Check if the request was successful
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `OpenAI API error: ${errorText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`;
            DebugManager.addLog(`API Error Details: ${JSON.stringify(errorData)}`, 'error');
          } catch (e) {
            // If parsing fails, use the raw text
          }
          throw new Error(errorMessage);
        }

        // Parse the response
        const responseData = await response.json();

        // Check if we have a valid response with image data
        if (!responseData || !responseData.data || !responseData.data[0]) {
          throw new Error(`Invalid response from OpenAI API: No image data returned`);
        }

        // Get the generated image URL or base64 data
        let imageUrl;
        if (responseData.data[0].url) {
          imageUrl = responseData.data[0].url;
          DebugManager.addLog(`Received image URL from API: ${imageUrl.substring(0, 50)}...`, 'info');
        } else if (responseData.data[0].b64_json) {
          // Convert base64 to data URL
          imageUrl = `data:image/png;base64,${responseData.data[0].b64_json}`;
          DebugManager.addLog(`Received base64 image data from API`, 'info');
        } else {
          throw new Error(`No image URL or base64 data in the response`);
        }

        return imageUrl;
      };

      // Process the response based on which API endpoint we used
      let imageUrl;

      if (imageDataArray.length > 1) {
        // For multiple images, we used the generations endpoint
        const generationResponse = await handleApiResponse(response);
        imageUrl = generationResponse;
      } else {
        // For a single image, we used the variations endpoint
        const variationResponse = await handleApiResponse(response);
        imageUrl = variationResponse;
      }

      // Store the generated image in our storage
      const outputImageId = ImageStorage.storeImage(imageUrl);

      // Set the content to the image URL
      this.content = imageUrl;
      this.outputImageId = outputImageId;

      // Set content type to image
      this.contentType = 'image';

      // Mark as processed
      this.hasBeenProcessed = true;

      // Create a new image object for preloading
      const newImage = new Image();

      // Set up a promise to wait for the image to load
      const imageLoadPromise = new Promise((resolve, reject) => {
        newImage.onload = () => resolve(newImage);
        newImage.onerror = () => reject(new Error('Failed to load generated image'));

        // Set the source to trigger loading
        newImage.src = imageUrl;
      });

      try {
        // Wait for the image to load
        await imageLoadPromise;

        // Now that we know the image loaded successfully, update the node's image
        this.contentImage = newImage;

        // Update node size if auto-sizing is enabled
        if (this.autoSize) {
          this.calculateOptimalSize();
        }

        // Force a redraw to show the image
        App.draw();

        DebugManager.addLog(`Image loaded successfully for node ${this.id}`, 'success');
      } catch (loadError) {
        DebugManager.addLog(`Error loading generated image: ${loadError.message}`, 'error');
        // We'll still return the image ID even if preloading failed
      }

      DebugManager.addLog(`Image-to-image processing completed for node ${this.id}`, 'success');

      // Return the image ID instead of the raw image data
      return outputImageId;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in image-to-image processing: ${error.message}`, 'error');

      // Set the error on the node
      this.error = error.message;

      // If we have no content, add a warning
      if (!this.content) {
        DebugManager.addLog(`Warning: No image content for node ${this.id} after processing`, 'warning');
      }

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

    // Special case: Allow image inputs for text-to-image nodes (will be handled as image-to-image)
    if (this.aiProcessor === 'text-to-image' && fromNode.contentType === 'image') {
      return true;
    }

    // Special case: Allow image inputs for image-to-image nodes
    if (this.aiProcessor === 'image-to-image' && fromNode.contentType === 'image') {
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

  // Check if all inputs are ready for processing
  areAllInputsReady() {
    // Get all incoming connections
    const incomingConnections = App.connections.filter(conn => conn.toNode === this);

    // If there are no incoming connections, the node is ready
    if (incomingConnections.length === 0) {
      return true;
    }

    // If we're not waiting for all inputs, any input is enough
    if (!this.waitForAllInputs) {
      return this.inputSources.size > 0;
    }

    // For nodes that wait for all inputs, check if we have all required inputs
    // We need to have an input from every connected node
    if (this.inputSources.size < incomingConnections.length) {
      return false;
    }

    // Check if all connected nodes have been processed
    for (const conn of incomingConnections) {
      // Check if the source node has been processed
      if (!conn.fromNode.hasBeenProcessed) {
        return false;
      }

      // Check if we have an input from this source node
      if (!this.inputSources.has(conn.fromNode.id)) {
        return false;
      }
    }

    // All checks passed, the node is ready to process
    return true;
  }

  // Add an input from a source node
  addInput(sourceNode, input) {
    // Check if we already have input from this source node
    if (this.inputSources.has(sourceNode.id)) {
      DebugManager.addLog(`Node ${this.id} already has input from node ${sourceNode.id}, updating it`, 'info');
    }

    // Store the input in the map
    this.inputSources.set(sourceNode.id, input);

    // Special handling for image inputs
    if (Utils.isImageData(input)) {
      // Store the image in ImageStorage and get a reference ID
      // Use the synchronous version to avoid Promise objects
      const imageId = ImageStorage.storeImageSync(input);

      // Initialize the imageInputIds array if it doesn't exist
      if (!this.imageInputIds) {
        this.imageInputIds = [];
      }

      // Check if we already have this image ID
      if (!this.imageInputIds.includes(imageId)) {
        // Add the image ID to the array
        this.imageInputIds.push(imageId);
        DebugManager.addLog(`Added image input from node ${sourceNode.id} to node ${this.id}'s image inputs (total: ${this.imageInputIds.length})`, 'info');
      }

      // For image-to-image nodes, also store in additionalImageIds
      if (this.aiProcessor === 'image-to-image') {
        // Initialize additionalImageIds if it doesn't exist
        if (!this.additionalImageIds) {
          this.additionalImageIds = [];
        }

        // Check if we already have this image ID in additionalImageIds
        if (!this.additionalImageIds.includes(imageId)) {
          // Add to additionalImageIds
          this.additionalImageIds.push(imageId);
          DebugManager.addLog(`Added image to additionalImageIds for node ${this.id} (total: ${this.additionalImageIds.length})`, 'info');
        }
      }

      // Store the mapping from source node to image ID
      if (!this.sourceNodeToImageId) {
        this.sourceNodeToImageId = new Map();
      }
      this.sourceNodeToImageId.set(sourceNode.id, imageId);
    }

    // Update the input content display with all inputs combined
    this.updateInputContentDisplay();

    // Check if the node is ready to process
    const isReady = this.isReadyToProcess();

    // Return whether the node is ready to process
    return isReady;
  }

  // Update the input content display with all inputs combined
  updateInputContentDisplay() {
    // Get all inputs from the input sources
    const inputs = Array.from(this.inputSources.values());

    // If there are no inputs, don't update
    if (inputs.length === 0) {
      return;
    }

    // Prepare arrays for different types of inputs
    const imageInputs = [];
    const textInputs = [];
    const combinedInputContent = [];

    // Process each input and categorize it
    for (const input of inputs) {
      if (typeof input === 'string' && input.startsWith('img_')) {
        // This is an image ID from our storage
        // Use the synchronous version to avoid Promise objects
        const imageData = ImageStorage.getImageSync(input);
        if (imageData) {
          imageInputs.push(input);

          // Add a placeholder for the image in the combined input content
          combinedInputContent.push(`[Image ${imageInputs.length}]`);
        } else {
          DebugManager.addLog(`Warning: Image ${input} not found in cache for input display, skipping`, 'warning');
        }
      } else if (Utils.isImageData(input)) {
        // This is raw image data, store it and get an ID
        // Use the synchronous version to avoid Promise objects
        const imageId = ImageStorage.storeImageSync(input);
        imageInputs.push(imageId);

        // Add a placeholder for the image in the combined input content
        combinedInputContent.push(`[Image ${imageInputs.length}]`);
      } else if (input) {
        // This is a text input
        textInputs.push(input);
        combinedInputContent.push(input);
      }
    }

    // Store the combined input content for display in the node
    const combinedText = combinedInputContent.join('\n\n---\n\n');
    this.inputContent = combinedText;

    // Log the combined input
    DebugManager.addLog(`Updated input content display with ${textInputs.length} text inputs and ${imageInputs.length} image inputs for node ${this.id}`, 'info');
  }

  // Check if the node is ready to process
  isReadyToProcess() {
    // Get all incoming connections
    const incomingConnections = App.connections.filter(conn => conn.toNode === this);

    // Default to waiting for inputs
    this.waitingForInputs = true;

    // Check if we have all required inputs
    if (this.waitForAllInputs) {
      // We need all inputs to be ready
      this.waitingForInputs = incomingConnections.length > this.inputSources.size;

      DebugManager.addLog(`Node ${this.id} has ${this.inputSources.size}/${incomingConnections.length} inputs ready`, 'info');
    } else {
      // If we're not waiting for all inputs, we're ready as soon as we have one
      this.waitingForInputs = this.inputSources.size === 0;
    }

    // Return true only if all required inputs are ready and the node hasn't been processed yet
    const isReady = this.areAllInputsReady() && !this.processing;

    if (isReady) {
      DebugManager.addLog(`Node ${this.id} has all required inputs and is ready to process`, 'info');
    }

    return isReady;
  }

  // Combine all inputs into a single input
  combineInputs() {
    // Get all inputs from the input sources
    const inputs = Array.from(this.inputSources.values());

    // If there are no inputs, return empty string
    if (inputs.length === 0) {
      return '';
    }

    // If there's only one input, return it directly
    if (inputs.length === 1) {
      return inputs[0];
    }

    // Prepare arrays for different types of inputs
    const imageInputs = [];
    const textInputs = [];
    const combinedInputContent = [];

    // Process each input and categorize it
    for (const input of inputs) {
      if (typeof input === 'string' && input.startsWith('img_')) {
        // This is an image ID from our storage
        // Use the synchronous version to avoid Promise objects
        const imageData = ImageStorage.getImageSync(input);
        if (imageData) {
          imageInputs.push(input);

          // Add a placeholder for the image in the combined input content
          combinedInputContent.push(`[Image ${imageInputs.length}]`);
        } else {
          DebugManager.addLog(`Warning: Image ${input} not found in cache for combining inputs, skipping`, 'warning');
        }
      } else if (Utils.isImageData(input)) {
        // This is raw image data, store it and get an ID
        // Use the synchronous version to avoid Promise objects
        const imageId = ImageStorage.storeImageSync(input);
        imageInputs.push(imageId);

        // Add a placeholder for the image in the combined input content
        combinedInputContent.push(`[Image ${imageInputs.length}]`);
      } else if (input) {
        // This is a text input
        textInputs.push(input);
        combinedInputContent.push(input);
      }
    }

    // Store the combined input content for display in the node
    const combinedText = combinedInputContent.join('\n\n---\n\n');
    this.inputContent = combinedText;

    // Log the combined input
    DebugManager.addLog(`Combined ${textInputs.length} text inputs and ${imageInputs.length} image inputs for node ${this.id}`, 'info');

    // Store image IDs for processing
    if (imageInputs.length > 0) {
      // Initialize the imageInputIds array if it doesn't exist
      if (!this.imageInputIds) {
        this.imageInputIds = [];
      }

      // Use a Set to ensure uniqueness and limit the number of images
      const uniqueImageIds = new Set(this.imageInputIds);

      // Add new image IDs to the set
      for (const imgId of imageInputs) {
        uniqueImageIds.add(imgId);
      }

      // Limit to a maximum of 5 images to prevent payload size issues
      const MAX_IMAGES = 5;

      // Convert back to array, keeping only the first MAX_IMAGES elements
      this.imageInputIds = [...uniqueImageIds].slice(0, MAX_IMAGES);

      if (uniqueImageIds.size > MAX_IMAGES) {
        DebugManager.addLog(`Limited node ${this.id} to ${MAX_IMAGES} images (had ${uniqueImageIds.size})`, 'warning');
      }

      DebugManager.addLog(`Node ${this.id} has ${this.imageInputIds.length} total image inputs after deduplication`, 'info');
    }

    // For image-to-image nodes, handle multiple images
    if (this.aiProcessor === 'image-to-image' && imageInputs.length > 0) {
      // Make sure additionalImageIds is initialized
      if (!this.additionalImageIds) {
        this.additionalImageIds = [];
      }

      // Update additionalImageIds with all images except the primary one
      if (imageInputs.length > 1) {
        this.additionalImageIds = [...new Set([...this.additionalImageIds, ...imageInputs.slice(1)])];
        DebugManager.addLog(`Node ${this.id} has ${this.additionalImageIds.length} additional reference images`, 'info');
      }

      // For image-to-image nodes, return the primary image ID
      return imageInputs[0];
    }

    // For image-to-text nodes, handle images and text
    if (this.aiProcessor === 'image-to-text' && imageInputs.length > 0) {
      // Store additional images for reference
      if (!this.additionalImageIds) {
        this.additionalImageIds = [];
      }

      // Update additionalImageIds with all images except the primary one, with limits
      if (imageInputs.length > 1) {
        // Use a Set to ensure uniqueness
        const uniqueAdditionalImageIds = new Set(this.additionalImageIds || []);

        // Add new image IDs to the set (skip the first one which is the primary image)
        for (const imgId of imageInputs.slice(1)) {
          uniqueAdditionalImageIds.add(imgId);
        }

        // Limit to a maximum of 4 additional images to prevent payload size issues
        // (5 total including the primary image)
        const MAX_ADDITIONAL_IMAGES = 4;

        // Convert back to array, keeping only the first MAX_ADDITIONAL_IMAGES elements
        this.additionalImageIds = [...uniqueAdditionalImageIds].slice(0, MAX_ADDITIONAL_IMAGES);

        if (uniqueAdditionalImageIds.size > MAX_ADDITIONAL_IMAGES) {
          DebugManager.addLog(`Limited node ${this.id} to ${MAX_ADDITIONAL_IMAGES} additional images (had ${uniqueAdditionalImageIds.size})`, 'warning');
        }

        DebugManager.addLog(`Node ${this.id} has ${this.additionalImageIds.length} additional reference images for image-to-text after deduplication`, 'info');
      }

      // For image-to-text nodes, return the primary image ID
      return imageInputs[0];
    }

    // For text-to-text nodes with image capability
    if (this.aiProcessor === 'text-to-text' &&
        (this.systemPrompt.toLowerCase().includes('image') ||
         this.systemPrompt.toLowerCase().includes('visual') ||
         this.systemPrompt.toLowerCase().includes('picture')) &&
        imageInputs.length > 0) {

      // Store additional images for reference
      if (!this.additionalImageIds) {
        this.additionalImageIds = [];
      }

      // Update additionalImageIds with all images except the primary one, with limits
      if (imageInputs.length > 1) {
        // Use a Set to ensure uniqueness
        const uniqueAdditionalImageIds = new Set(this.additionalImageIds || []);

        // Add new image IDs to the set (skip the first one which is the primary image)
        for (const imgId of imageInputs.slice(1)) {
          uniqueAdditionalImageIds.add(imgId);
        }

        // Limit to a maximum of 4 additional images to prevent payload size issues
        // (5 total including the primary image)
        const MAX_ADDITIONAL_IMAGES = 4;

        // Convert back to array, keeping only the first MAX_ADDITIONAL_IMAGES elements
        this.additionalImageIds = [...uniqueAdditionalImageIds].slice(0, MAX_ADDITIONAL_IMAGES);

        if (uniqueAdditionalImageIds.size > MAX_ADDITIONAL_IMAGES) {
          DebugManager.addLog(`Limited node ${this.id} to ${MAX_ADDITIONAL_IMAGES} additional images (had ${uniqueAdditionalImageIds.size})`, 'warning');
        }

        DebugManager.addLog(`Node ${this.id} has ${this.additionalImageIds.length} additional reference images for text-to-text after deduplication`, 'info');
      }

      // For text-to-text nodes with image capability, return the primary image ID
      return imageInputs[0];
    }

    // For text-to-text nodes without images or with no image capability
    if (this.aiProcessor === 'text-to-text' && textInputs.length > 0) {
      // Return the combined text inputs
      return combinedText;
    }

    // For chat nodes
    if (this.aiProcessor === 'chat' || this.contentType === 'chat') {
      // For chat nodes, we'll add the combined text as a user message
      if (textInputs.length > 0) {
        // If we have chat history, add the combined text as a user message
        if (!this.chatHistory) {
          this.chatHistory = [];
        }

        // Add the combined text as a user message
        this.addChatMessage(combinedText, 'user');

        // Return the combined text
        return combinedText;
      }
    }

    // For text-to-image nodes
    if (this.aiProcessor === 'text-to-image') {
      // If we have text inputs, use those
      if (textInputs.length > 0) {
        return combinedText;
      }

      // If we have image inputs (for image-to-image processing), return the first one
      if (imageInputs.length > 0) {
        return imageInputs[0];
      }
    }

    // Default case: return the combined text
    return combinedText;
  }

  // Flag to prevent recursive reloading
  _isPreloadingContent = false;

  // Preload content for rendering
  preloadContent() {
    // Prevent recursive reloading
    if (this._isPreloadingContent) {
      return;
    }

    // Set the flag to prevent recursion
    this._isPreloadingContent = true;

    try {
      // Special handling for image-related nodes
      if (this.aiProcessor === 'text-to-image' || this.aiProcessor === 'image-to-image') {
        // Force content type to image
        this.contentType = 'image';

        // If this is an image-related node that has been processed but has no content,
        // try to recover the image from contentImage
        if (this.hasBeenProcessed && !this.content && this.contentImage && this.contentImage.src) {
          this.content = this.contentImage.src;
          DebugManager.addLog(`Recovered image content for node ${this.id} during preload`, 'info');
        }

        // Only reload the image if it's not already loading and has content
        if (this.hasBeenProcessed && this.content &&
            (!this.contentImage || !this.contentImage.src || this.contentImage.complete)) {

          // Clean up previous image object to prevent memory leaks
          if (this.contentImage) {
            this.contentImage.onload = null;
            this.contentImage.onerror = null;
          }

          // Create a new Image object
          this.contentImage = new Image();

          // Add a timestamp to prevent browser caching
          const timestamp = Date.now();
          let imageUrl = this.content;

          if (imageUrl.includes('?')) {
            imageUrl = imageUrl.split('?')[0] + `?t=${timestamp}`;
          } else if (!imageUrl.startsWith('data:')) {
            imageUrl = imageUrl + `?t=${timestamp}`;
          }

          // Store node ID to avoid 'this' reference in callbacks
          const nodeId = this.id;

          // Set up event handlers
          this.contentImage.onload = () => {
            DebugManager.addLog(`Image loaded for node ${nodeId}`, 'success');

            // Only update size, don't trigger a full redraw
            if (this.autoSize) {
              this.calculateOptimalSize();
            }

            // Clean up the event handler after it's fired
            if (this.contentImage) {
              this.contentImage.onload = null;
            }
          };

          this.contentImage.onerror = (err) => {
            DebugManager.addLog(`Error loading image for node ${nodeId}: ${err.message || 'Unknown error'}`, 'error');

            // Clean up on error
            if (this.contentImage) {
              this.contentImage.onload = null;
              this.contentImage.onerror = null;
              this.contentImage = null;
            }
          };

          // Set the source to trigger loading
          this.contentImage.src = imageUrl;

          DebugManager.addLog(`Reloading image for node ${nodeId} with cache-busting`, 'info');
        }
      }
    } finally {
      // Reset the flag when done
      this._isPreloadingContent = false;
    }
  }

  // Preload input/output images and other content types
  preloadAllContent() {
    // Only preload if we're not already in a preloading cycle
    if (this._isPreloadingContent) {
      return;
    }

    // Set the flag to prevent recursion
    this._isPreloadingContent = true;

    try {
      // Preload input and output images
      this.preloadInputImage();
      this.preloadOutputImage();

      // Handle video content
      if (this.content && !this.contentVideo && this.contentType === 'video') {
        // For video, we'd need to create a video element and capture a frame
        // This is more complex and would require a canvas to render a thumbnail
        // For now, we'll just use a placeholder
      }

      // Handle audio content
      if (this.content && !this.contentAudio && this.contentType === 'audio') {
        // For audio, we'd need to visualize the waveform
        // For now, we'll just use a placeholder
      }
    } finally {
      // Reset the flag when done
      this._isPreloadingContent = false;
    }
  }

  // Preload input image with error handling and performance optimizations
  preloadInputImage() {
    // Detect if input is an image URL
    const isImageInput = Utils.isImageData(this.inputContent);

    // Skip if no image input or already loaded
    if (!isImageInput || this.inputImage) {
      return;
    }

    // Check if the image is already in the cache
    if (typeof ImageStorage !== 'undefined' && ImageStorage.imageCache && ImageStorage.imageCache[this.inputContent]) {
      this.inputImage = ImageStorage.imageCache[this.inputContent];
      return;
    }

    try {
      // Create a new image object
      this.inputImage = new Image();

      // Set a timeout to abort loading if it takes too long
      const loadTimeout = setTimeout(() => {
        if (!this.inputImage.complete) {
          DebugManager.addLog(`Timeout loading input image for node ${this.id}`, 'warning');
          this.inputImage.src = ''; // Cancel the loading
          this.inputImage = null;
        }
      }, 10000); // 10 second timeout

      // Add error handler
      this.inputImage.onerror = () => {
        clearTimeout(loadTimeout);
        DebugManager.addLog(`Error loading input image for node ${this.id}`, 'error');
        this.inputImage = null; // Clear the broken image
        // Don't call App.draw() here to prevent reloading loops
      };

      // When input image loads, update node size if auto-sizing is enabled
      this.inputImage.onload = () => {
        clearTimeout(loadTimeout);
        // Cache the loaded image
        ImageStorage.imageCache[this.inputContent] = this.inputImage;

        if (this.autoSize) {
          this.calculateOptimalSize();
          // Don't call App.draw() here to prevent reloading loops
        }
      };

      // Set the source after adding event handlers
      this.inputImage.src = this.inputContent;

      // If the image is already in the browser cache, the onload event might not fire
      if (this.inputImage.complete) {
        this.inputImage.onload();
      }
    } catch (err) {
      DebugManager.addLog(`Error creating input image for node ${this.id}: ${err.message}`, 'error');
    }
  }

  // Preload output image with error handling and performance optimizations
  preloadOutputImage() {
    // Skip if no content, already loaded, or not an image type
    if (!this.content ||
        this.contentImage ||
        (this.contentType !== 'image' && this.aiProcessor !== 'text-to-image')) {
      return;
    }

    // For text-to-image nodes, ensure we set the content type to image
    if (this.aiProcessor === 'text-to-image') {
      this.contentType = 'image';
    }

    // Check if the image is already in the cache
    if (typeof ImageStorage !== 'undefined' && ImageStorage.imageCache && ImageStorage.imageCache[this.content]) {
      this.contentImage = ImageStorage.imageCache[this.content];
      return;
    }

    // Check if this is a reference to a stored image
    if (this.content && typeof this.content === 'string' && this.content.startsWith('img_')) {
      // This is a reference to a stored image, try to get it from ImageStorage
      const imageData = ImageStorage.getImageSync(this.content);
      if (imageData) {
        this.loadImageFromData(imageData);
        return;
      }
    }

    try {
      // Create a new image object with a placeholder
      this.contentImage = new Image();

      // Use a lightweight placeholder while the real image loads
      this.contentImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+';

      // Set up a timeout to handle hanging loads
      const loadTimeout = setTimeout(() => {
        DebugManager.addLog(`Image load timeout for node ${this.id}`, 'warning');
        // Keep the placeholder instead of setting to null
      }, 10_000); // 10 second timeout

      // Load the actual image in the background
      this.loadImageInBackground(loadTimeout);
    } catch (err) {
      DebugManager.addLog(`Error creating output image for node ${this.id}: ${err.message}`, 'error');
    }
  }

  // Load the actual image in the background to prevent UI freezing
  async loadImageInBackground(loadTimeout) {
    try {
      // Create a new image object for background loading
      const backgroundImage = new Image();

      // Set up promise to handle load/error events
      await new Promise((resolve, reject) => {
        backgroundImage.onload = () => {
          clearTimeout(loadTimeout);

          // Check if the image is too large and resize if needed
          if (backgroundImage.width > 1000 || backgroundImage.height > 1000) {
            try {
              // Create a canvas to resize the image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              // Calculate new dimensions (maintaining aspect ratio)
              const maxDimension = 1000;
              const ratio = Math.min(maxDimension / backgroundImage.width, maxDimension / backgroundImage.height);
              canvas.width = backgroundImage.width * ratio;
              canvas.height = backgroundImage.height * ratio;

              // Draw the resized image
              ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

              // Get the resized image data
              const resizedData = canvas.toDataURL('image/jpeg', 0.85);

              // Create a new image with the resized data
              const resizedImg = new Image();
              resizedImg.src = resizedData;

              // Replace the content with the resized version
              this.content = resizedData;
              this.contentImage = resizedImg;

              // Cache the resized image
              if (typeof ImageStorage !== 'undefined') {
                ImageStorage.imageCache[resizedData] = resizedImg;
              }

              DebugManager.addLog(`Resized large image for node ${this.id}`, 'info');
            } catch (resizeErr) {
              // If resizing fails, use the original image
              this.contentImage = backgroundImage;

              // Cache the loaded image
              if (typeof ImageStorage !== 'undefined') {
                ImageStorage.imageCache[this.content] = backgroundImage;
              }

              DebugManager.addLog(`Failed to resize image for node ${this.id}: ${resizeErr.message}`, 'warning');
            }
          } else {
            // Use the original image
            this.contentImage = backgroundImage;

            // Cache the loaded image
            if (typeof ImageStorage !== 'undefined') {
              ImageStorage.imageCache[this.content] = backgroundImage;
            }
          }

          // Update node size if auto-sizing is enabled
          if (this.autoSize) {
            this.calculateOptimalSize();
          }

          // Don't redraw the canvas here to prevent reloading loops
          // The main App.draw() cycle will handle this

          resolve();
        };

        backgroundImage.onerror = () => {
          clearTimeout(loadTimeout);
          DebugManager.addLog(`Error loading output image for node ${this.id}`, 'error');

          // Keep the placeholder instead of setting to null
          reject(new Error(`Failed to load image for node ${this.id}`));
        };

        // Set the source to trigger loading
        backgroundImage.src = this.content;
      }).catch(err => {
        console.warn(`Error in background image loading for node ${this.id}:`, err);
      });
    } catch (err) {
      console.warn(`Error in background image loading for node ${this.id}:`, err);
    }
  }

  // Load an image from data
  loadImageFromData(imageData) {
    try {
      // Create a new image object
      this.contentImage = new Image();

      // Set up load and error handlers
      this.contentImage.onload = () => {
        // Cache the loaded image
        if (typeof ImageStorage !== 'undefined') {
          ImageStorage.imageCache[imageData] = this.contentImage;
        }

        // Update node size if auto-sizing is enabled
        if (this.autoSize) {
          this.calculateOptimalSize();
          // Don't call App.draw() here to prevent reloading loops
        }
      };

      this.contentImage.onerror = () => {
        DebugManager.addLog(`Error loading image from data for node ${this.id}`, 'error');
        // Use a placeholder instead of null
        this.contentImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
      };

      // Set the source after adding event handlers
      this.contentImage.src = imageData;

      // If the image is already in the browser cache, the onload event might not fire
      if (this.contentImage.complete) {
        this.contentImage.onload();
      }
    } catch (err) {
      DebugManager.addLog(`Error creating image from data for node ${this.id}: ${err.message}`, 'error');
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
      else if (this.contentType === 'chat') {
        // For chat nodes, adjust size based on chat history
        newWidth = Math.max(newWidth, 300); // Minimum width for chat nodes

        // Calculate height based on chat history
        const baseHeight = 40; // Title area
        const inputHeight = this.inputContent ? Math.min(80, this.getTextLines(ctx, this.inputContent, newWidth - 40).length * 14 + 20) : 30;
        const chatInputAreaHeight = 40; // Height for the chat input area at the bottom

        // Calculate output height based on chat history with better text measurement
        let outputHeight = 100; // Default height for chat area

        if (this.chatHistory && this.chatHistory.length > 0) {
          // Calculate height based on actual message content
          outputHeight = 20; // Start with padding

          // Process each message to calculate its height
          this.chatHistory.forEach(msg => {
            // Add height for the role label
            outputHeight += 20; // Role label height

            // Calculate height needed for the message content
            const contentLines = this.getTextLines(ctx, msg.content, newWidth - 40);
            const contentHeight = Math.min(200, contentLines.length * 16); // Limit height per message

            outputHeight += contentHeight + 10; // Add content height plus padding
          });

          // Ensure we don't exceed a reasonable maximum while still accommodating content
          outputHeight = Math.min(400, outputHeight);
        }

        // Calculate total height with all components
        newHeight = Math.min(this.maxHeight, Math.max(this.minHeight, baseHeight + inputHeight + outputHeight + chatInputAreaHeight));

        // Ensure the node stays within the visible canvas area
        // Get the current canvas dimensions
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        // Check if the node would be positioned outside the visible area
        if (this.x < -newWidth + 50) {
          this.x = 50; // Keep at least 50px visible on the left
        }
        if (this.y < -newHeight + 50) {
          this.y = 50; // Keep at least 50px visible on the top
        }
        if (this.x > canvasWidth - 50) {
          this.x = canvasWidth - 50; // Keep at least 50px visible on the right
        }
        if (this.y > canvasHeight - 50) {
          this.y = canvasHeight - 50; // Keep at least 50px visible on the bottom
        }
      }
    }

    // Update node dimensions
    this.width = newWidth;
    this.height = newHeight;
  }

  // Get text lines for a given string and max width
  getTextLines(ctx, text, maxWidth) {
    // Check if text is a string before trying to split it
    if (typeof text !== 'string') {
      // Return a single line with a placeholder for non-string content
      return ['[Non-text content]'];
    }

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
    const inputAreaHeight = this.inputCollapsed ? 20 : (this.height / 2) - 50;
    const outputAreaHeight = this.outputCollapsed ? 20 : (this.height / 2) - 25;

    // Draw node toolbar
    this.drawNodeToolbar(ctx);

    // Draw input area
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

    // Draw input label
    ctx.fillStyle = '#888';
    ctx.font = '10px Arial';
    ctx.fillText('INPUT:', contentAreaX + 5, inputAreaY - 2);

    // Draw input content if not collapsed
    if (!this.inputCollapsed) {
      this.drawInputContent(ctx, contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);
    } else {
      // Draw collapsed indicator
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText('(collapsed)', contentAreaX + 50, inputAreaY + 15);
    }

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
    this.preloadAllContent();

    // Draw output content based on type if not collapsed
    if (!this.outputCollapsed) {
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
        case 'chat':
          this.drawChatContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
          break;
      }
    } else {
      // Draw collapsed indicator
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText('(collapsed)', contentAreaX + 50, outputAreaY + 15);
    }

    // Draw output border
    ctx.strokeStyle = this.hasBeenProcessed ? '#4a90e2' : '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
  }

  // Draw node toolbar
  drawNodeToolbar(ctx) {
    const toolbarX = this.x + 10;
    const toolbarY = this.y + 22;
    const toolbarWidth = this.width - 20;
    const toolbarHeight = 16;
    const buttonSize = 14;
    const buttonSpacing = 4;

    // Draw toolbar background
    ctx.fillStyle = '#333';
    ctx.fillRect(toolbarX, toolbarY, toolbarWidth, toolbarHeight);

    // Draw toolbar buttons
    let currentX = toolbarX + 4;

    // Collapse/Expand Input button
    this.inputCollapseButton = {
      x: currentX,
      y: toolbarY + 1,
      width: buttonSize,
      height: buttonSize,
      icon: this.inputCollapsed ? '↓' : '↑',
      tooltip: this.inputCollapsed ? 'Expand Input' : 'Collapse Input'
    };

    ctx.fillStyle = '#555';
    ctx.fillRect(this.inputCollapseButton.x, this.inputCollapseButton.y, buttonSize, buttonSize);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.inputCollapseButton.icon,
                 this.inputCollapseButton.x + buttonSize/2,
                 this.inputCollapseButton.y + buttonSize/2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    currentX += buttonSize + buttonSpacing;

    // Collapse/Expand Output button
    this.outputCollapseButton = {
      x: currentX,
      y: toolbarY + 1,
      width: buttonSize,
      height: buttonSize,
      icon: this.outputCollapsed ? '↓' : '↑',
      tooltip: this.outputCollapsed ? 'Expand Output' : 'Collapse Output'
    };

    ctx.fillStyle = '#555';
    ctx.fillRect(this.outputCollapseButton.x, this.outputCollapseButton.y, buttonSize, buttonSize);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.outputCollapseButton.icon,
                 this.outputCollapseButton.x + buttonSize/2,
                 this.outputCollapseButton.y + buttonSize/2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    currentX += buttonSize + buttonSpacing;

    // Edit button
    this.editButton = {
      x: currentX,
      y: toolbarY + 1,
      width: buttonSize,
      height: buttonSize,
      icon: '✎',
      tooltip: 'Edit Node'
    };

    ctx.fillStyle = '#555';
    ctx.fillRect(this.editButton.x, this.editButton.y, buttonSize, buttonSize);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.editButton.icon,
                 this.editButton.x + buttonSize/2,
                 this.editButton.y + buttonSize/2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    currentX += buttonSize + buttonSpacing;

    // Delete button
    this.deleteButton = {
      x: currentX,
      y: toolbarY + 1,
      width: buttonSize,
      height: buttonSize,
      icon: '✕',
      tooltip: 'Delete Node'
    };

    ctx.fillStyle = '#555';
    ctx.fillRect(this.deleteButton.x, this.deleteButton.y, buttonSize, buttonSize);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.deleteButton.icon,
                 this.deleteButton.x + buttonSize/2,
                 this.deleteButton.y + buttonSize/2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Draw tooltip for hovered button
    if (App.hoveredButton) {
      const tooltipX = App.hoveredButton.x + buttonSize/2;
      const tooltipY = App.hoveredButton.y - 5;
      Utils.drawTooltip(ctx, App.hoveredButton.tooltip, tooltipX, tooltipY);
    }
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

        // Update size when image loads, but don't trigger a redraw
        this.inputImage.onload = () => {
          if (this.autoSize) {
            this.calculateOptimalSize();
          }
        };
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

    // Check if inputContent is a string before trying to split it
    if (typeof this.inputContent !== 'string') {
      // Handle non-string input content
      ctx.fillText('Non-text input content', x + 5, y + 15);
      return;
    }

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

    // Check if content is a string before trying to split it
    if (typeof this.content !== 'string') {
      // Handle non-string content
      ctx.fillText('Non-text content', x + 10, y + 20);
      return;
    }

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

      // Don't force a redraw to prevent reloading loops
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
      try {
        // Create a new image object
        this.contentImage = new Image();

        // Add error handler
        this.contentImage.onerror = () => {
          DebugManager.addLog(`Error loading image for node ${this.id}`, 'error');
          this.contentImage = null; // Clear the broken image
          // Don't call App.draw() here to prevent reloading loops
        };

        // Add load event listener to update size when image loads
        this.contentImage.onload = () => {
          // When image loads, update node size if auto-sizing is enabled
          if (this.autoSize) {
            this.calculateOptimalSize();
          }
          // Don't call App.draw() here to prevent reloading loops
        };

        // Set the source after adding event handlers
        this.contentImage.src = this.content;
      } catch (err) {
        DebugManager.addLog(`Error creating image for node ${this.id}: ${err.message}`, 'error');
      }

      // Draw placeholder while loading
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('Loading image...', x + 10, y + 20);
      return;
    }

    // If image is loaded, draw it
    if (this.contentImage.complete) {
      try {
        // Check if the image is in a valid state (has dimensions)
        if (this.contentImage.width === 0 || this.contentImage.height === 0) {
          throw new Error('Image has invalid dimensions');
        }

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

        // Reset the image to force a reload next time
        this.contentImage = null;
      }
    } else {
      // If image is still loading, show loading message
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('Loading image...', x + 10, y + 20);

      // Don't add load event listener to redraw to prevent reloading loops
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

  // Draw chat content
  drawChatContent(ctx, x, y, width, height) {
    // Reserve space for chat input at the bottom
    const inputHeight = 30;
    const chatHistoryHeight = height - inputHeight;

    // Draw chat history area
    if (!this.chatHistory || this.chatHistory.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('No chat messages. Type below to start...', x + 10, y + 20);
    } else {
      // Calculate available space
      const maxLineWidth = width - 20;
      const lineHeight = 16;
      const messageSpacing = 10;

      // Calculate how many messages we can show
      // We'll prioritize showing the most recent messages
      const messages = [...this.chatHistory]; // Make a copy to avoid modifying original

      // Start drawing from the top
      let currentY = y + 15;

      // Track if we need to show a "more messages" indicator
      let showMoreIndicator = false;

      // Process messages from newest to oldest to determine which ones fit
      const visibleMessages = [];
      let availableHeight = chatHistoryHeight - 20; // Reserve space for "more messages" indicator

      // Process messages from newest to oldest
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];

        // Calculate height needed for this message
        // Use getTextLines to properly wrap text
        const lines = this.getTextLines(ctx, message.content, maxLineWidth);
        const messageHeight = lineHeight + (lines.length * lineHeight) + messageSpacing;

        // Check if this message fits
        if (availableHeight >= messageHeight) {
          visibleMessages.unshift(message); // Add to beginning of visible messages
          availableHeight -= messageHeight;
        } else {
          showMoreIndicator = true;
          break;
        }
      }

      // Show "more messages" indicator if needed
      if (showMoreIndicator && messages.length > visibleMessages.length) {
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        ctx.fillText(`+ ${messages.length - visibleMessages.length} more messages...`, x + 10, currentY);
        currentY += lineHeight + 5;
      }

      // Draw each visible message
      visibleMessages.forEach(message => {
        // Set color based on role
        if (message.role === 'user') {
          ctx.fillStyle = '#4a90e2';
        } else {
          ctx.fillStyle = '#ccc';
        }

        // Draw role label
        const roleLabel = message.role === 'user' ? 'User:' : 'Assistant:';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(roleLabel, x + 10, currentY);
        currentY += lineHeight;

        // Draw message content
        ctx.font = '12px Arial';

        // Get wrapped lines using the existing getTextLines method
        const lines = this.getTextLines(ctx, message.content, maxLineWidth);

        // Draw each line
        lines.forEach((line, index) => {
          ctx.fillText(line, x + 15, currentY + (index * lineHeight));
        });

        // Update Y position for next message
        currentY += (lines.length * lineHeight) + messageSpacing;
      });
    }

    // Draw chat input area
    const inputY = y + chatHistoryHeight;

    // Store the chat input area coordinates for interaction
    this.chatInputArea = {
      x: x + 5,
      y: inputY + 5,
      width: width - 70,
      height: inputHeight - 10
    };

    // Store the send button coordinates for interaction
    this.chatSendButton = {
      x: x + width - 60,
      y: inputY + 5,
      width: 50,
      height: inputHeight - 10,
      tooltip: 'Send message'
    };

    // Draw input box
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(this.chatInputArea.x, this.chatInputArea.y, this.chatInputArea.width, this.chatInputArea.height);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.chatInputArea.x, this.chatInputArea.y, this.chatInputArea.width, this.chatInputArea.height);

    // Draw placeholder text if no input
    if (!this.chatInputText) {
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText('Type your message...', this.chatInputArea.x + 5, this.chatInputArea.y + 15);
    } else {
      // Draw the actual input text
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';

      // Truncate if too long
      let displayText = this.chatInputText;
      if (ctx.measureText(displayText).width > this.chatInputArea.width - 10) {
        // Find the maximum number of characters that fit
        let i = 0;
        while (i < displayText.length &&
               ctx.measureText(displayText.substring(0, i) + '...').width < this.chatInputArea.width - 10) {
          i++;
        }
        displayText = displayText.substring(0, i - 1) + '...';
      }

      ctx.fillText(displayText, this.chatInputArea.x + 5, this.chatInputArea.y + 15);
    }

    // Draw send button
    ctx.fillStyle = this.processing ? '#666' : '#4a90e2';
    ctx.fillRect(this.chatSendButton.x, this.chatSendButton.y, this.chatSendButton.width, this.chatSendButton.height);

    // Draw send button text
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.processing ? '...' : 'Send',
                 this.chatSendButton.x + this.chatSendButton.width / 2,
                 this.chatSendButton.y + this.chatSendButton.height / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Draw message count badge with different colors based on count
    const messageCount = this.chatHistory ? this.chatHistory.length : 0;

    // Use different colors based on message count
    if (messageCount > 0) {
      // More messages = more prominent badge
      if (messageCount > 5) {
        ctx.fillStyle = '#4a90e2'; // Blue for many messages
      } else if (messageCount > 2) {
        ctx.fillStyle = '#27ae60'; // Green for some messages
      } else {
        ctx.fillStyle = '#555'; // Gray for few messages
      }
    } else {
      ctx.fillStyle = '#555'; // Default gray
    }

    ctx.fillRect(x + width - 40, y + 5, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${messageCount}`, x + width - 25, y + 20);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  draw(ctx) {
    // Preload content if needed
    this.preloadContent();

    // Node box with status-based colors
    const bgColor = this.selected ? '#4a90e2' :
                 this.processing ? '#d4af37' :
                 this.waitingForInputs ? '#8e44ad' : // Purple for waiting
                 this.error ? '#e74c3c' :
                 App.hoveredNode === this ? '#404040' : '#333';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = this.error ? '#c0392b' :
                     this.waitingForInputs ? '#9b59b6' : // Purple for waiting
                     App.hoveredNode === this ? '#aaa' : '#888';
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    if (this.selected || App.hoveredNode === this || this.processing || this.waitingForInputs) {
      ctx.shadowColor = this.selected ? '#4a90e2' :
                       this.processing ? '#d4af37' :
                       this.waitingForInputs ? '#9b59b6' : // Purple for waiting
                       '#666';
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

    // Draw the node toolbar
    this.drawNodeToolbar(ctx);

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

  // Pan and zoom properties
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  isPanning: false,
  lastPanPoint: { x: 0, y: 0 },
  MIN_SCALE: 0.1,
  MAX_SCALE: 3,

  // UI state
  hoveredButton: null,

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

    // Log the config for debugging
    console.log('Loading OpenAI config:', config, 'from key:', Config.storageKeys.openAIConfig);

    if (config) {
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('model').value = config.model || Config.defaultOpenAIConfig.model;
      document.getElementById('temperature').value = config.temperature || Config.defaultOpenAIConfig.temperature;
      document.getElementById('maxTokens').value = config.maxTokens || Config.defaultOpenAIConfig.maxTokens;

      // Load timeout value if it exists
      const timeoutInput = document.getElementById('timeout');
      if (timeoutInput && config.timeout) {
        timeoutInput.value = config.timeout;
      }
    }
  },



  initEventListeners() {
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.draw();
    });

    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

    // Add wheel event for zooming
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Remove any existing event listeners by cloning and replacing the buttons
    const addNodeBtn = document.getElementById('addNodeBtn');
    if (addNodeBtn) {
      const newAddNodeBtn = addNodeBtn.cloneNode(true);
      addNodeBtn.parentNode.replaceChild(newAddNodeBtn, addNodeBtn);
      newAddNodeBtn.addEventListener('click', () => this.addNode());
    }

    const addChatNodeBtn = document.getElementById('addChatNodeBtn');
    if (addChatNodeBtn) {
      const newAddChatNodeBtn = addChatNodeBtn.cloneNode(true);
      addChatNodeBtn.parentNode.replaceChild(newAddChatNodeBtn, addChatNodeBtn);
      newAddChatNodeBtn.addEventListener('click', () => this.addChatNode());
    }

    const configBtn = document.getElementById('configBtn');
    if (configBtn) {
      const newConfigBtn = configBtn.cloneNode(true);
      configBtn.parentNode.replaceChild(newConfigBtn, configBtn);
      newConfigBtn.addEventListener('click', () => ModalManager.openModal('configModal'));
    }

    const saveWorkflowBtn = document.getElementById('saveWorkflowBtn');
    if (saveWorkflowBtn) {
      const newSaveWorkflowBtn = saveWorkflowBtn.cloneNode(true);
      saveWorkflowBtn.parentNode.replaceChild(newSaveWorkflowBtn, saveWorkflowBtn);
      newSaveWorkflowBtn.addEventListener('click', () => this.handleSaveWorkflow());
    }

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', () => this.handleSave());
    }

    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
      const newLoadBtn = loadBtn.cloneNode(true);
      loadBtn.parentNode.replaceChild(newLoadBtn, loadBtn);
      newLoadBtn.addEventListener('click', () => this.handleLoad());
    }

    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      const newHelpBtn = helpBtn.cloneNode(true);
      helpBtn.parentNode.replaceChild(newHelpBtn, helpBtn);
      newHelpBtn.addEventListener('click', () => ModalManager.openModal('helpModal'));
    }
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

    // Get timeout value with validation
    const timeoutInput = document.getElementById('timeout');
    let timeout = Config.defaultOpenAIConfig.timeout; // Default value

    if (timeoutInput) {
      // Parse the timeout value, ensuring it's at least 30 seconds and at most 1800 seconds (30 minutes)
      const parsedTimeout = parseInt(timeoutInput.value);
      if (!isNaN(parsedTimeout)) {
        timeout = Math.max(30, Math.min(1800, parsedTimeout));
      }
    }

    const config = {
      apiKey: apiKey,
      model: document.getElementById('model').value,
      temperature: parseFloat(document.getElementById('temperature').value) || Config.defaultOpenAIConfig.temperature,
      maxTokens: parseInt(document.getElementById('maxTokens').value) || Config.defaultOpenAIConfig.maxTokens,
      timeout: timeout // Add timeout to the config
    };

    // Save to localStorage using the correct key
    localStorage.setItem(Config.storageKeys.openAIConfig, JSON.stringify(config));

    // Log the saved config for debugging
    console.log('Saved OpenAI config:', config, 'to key:', Config.storageKeys.openAIConfig);

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

      // If this is a chat section, make sure we have the chat UI elements
      if (contentType === 'chat') {
        // Check if we need to create the chat UI
        if (!document.getElementById('chatHistory')) {
          // Create chat UI elements
          const chatSection = document.getElementById('chatContentSection');
          if (chatSection) {
            // Create chat history container
            const chatHistoryContainer = document.createElement('div');
            chatHistoryContainer.id = 'chatHistory';
            chatHistoryContainer.className = 'chat-history';

            // Create chat input container
            const chatInputContainer = document.createElement('div');
            chatInputContainer.className = 'chat-input-container';

            // Create chat input
            const chatInput = document.createElement('textarea');
            chatInput.id = 'chatInput';
            chatInput.className = 'chat-input';
            chatInput.placeholder = 'Type your message here...';
            chatInput.rows = 3;

            // Create send button
            const sendButton = document.createElement('button');
            sendButton.id = 'sendChatMessage';
            sendButton.className = 'chat-send-button';
            sendButton.textContent = 'Send';

            // Create message counter
            const messageCounter = document.createElement('div');
            messageCounter.className = 'chat-message-counter';
            messageCounter.innerHTML = 'Messages: <span id="messageCount">0</span>';

            // Add elements to containers
            chatInputContainer.appendChild(chatInput);
            chatInputContainer.appendChild(sendButton);

            // Add containers to chat section
            chatSection.appendChild(messageCounter);
            chatSection.appendChild(chatHistoryContainer);
            chatSection.appendChild(chatInputContainer);

            // Add event listener to send button
            sendButton.addEventListener('click', () => {
              App.sendChatMessageFromEditor();
            });

            // Add event listener to chat input for Enter key
            chatInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                App.sendChatMessageFromEditor();
              }
            });
          }
        }
      }

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
      case 'image-to-image':
        inputType.value = 'image';
        outputType.value = 'image';
        break;
      case 'audio-to-text':
        inputType.value = 'audio';
        outputType.value = 'text';
        break;
      case 'video-to-text':
        inputType.value = 'video';
        outputType.value = 'text';
        break;
      case 'chat':
        inputType.value = 'text';
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
          <option value="image-to-image">Image to Image</option>
        `;
      case 'audio':
        return `
          <option value="audio-to-text">Audio to Text</option>
        `;
      case 'video':
        return `
          <option value="video-to-text">Video to Text</option>
        `;
      case 'chat':
        return `
          <option value="chat">Chat</option>
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

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - this.offsetX) / this.scale;
    const canvasY = (y - this.offsetY) / this.scale;

    // Reset hovered button
    this.hoveredButton = null;

    // Check if a toolbar button was clicked
    for (const node of this.nodes) {
      // Check for chat input area click
      if (node.contentType === 'chat' && node.chatInputArea &&
          this.isPointInRect(canvasX, canvasY, node.chatInputArea)) {

        // Set the active chat node
        this.activeChatNode = node;

        // Create a custom modal for chat input instead of using prompt()
        this.openCustomChatInputModal(node);
        return;
      }

      // Check for chat send button click
      if (node.contentType === 'chat' && node.chatSendButton &&
          this.isPointInRect(canvasX, canvasY, node.chatSendButton)) {

        // Only process if there's input text and the node isn't already processing
        if (node.chatInputText && !node.processing) {
          // Send the chat message
          this.sendChatMessageFromNode(node);
        }
        return;
      }

      // Check input collapse button
      if (node.inputCollapseButton &&
          this.isPointInButton(canvasX, canvasY, node.inputCollapseButton)) {

        // Toggle input collapsed state
        node.inputCollapsed = !node.inputCollapsed;

        // If auto-sizing is enabled, recalculate the node size
        if (node.autoSize) {
          node.calculateOptimalSize();
        }

        this.draw();
        return;
      }

      // Check output collapse button
      if (node.outputCollapseButton &&
          this.isPointInButton(canvasX, canvasY, node.outputCollapseButton)) {

        // Toggle output collapsed state
        node.outputCollapsed = !node.outputCollapsed;

        // If auto-sizing is enabled, recalculate the node size
        if (node.autoSize) {
          node.calculateOptimalSize();
        }

        this.draw();
        return;
      }

      // Check edit button
      if (node.editButton &&
          this.isPointInButton(canvasX, canvasY, node.editButton)) {

        // Open node editor
        this.openNodeEditor(node);
        return;
      }

      // Check delete button
      if (node.deleteButton &&
          this.isPointInButton(canvasX, canvasY, node.deleteButton)) {

        // Delete the node
        this.deleteNode(node);
        return;
      }
    }
  },

  // Helper method to check if a point is inside a button
  isPointInButton(x, y, button) {
    return button &&
           x >= button.x &&
           x <= button.x + button.width &&
           y >= button.y &&
           y <= button.y + button.height;
  },

  // Helper method to check if a point is inside a rectangle
  isPointInRect(x, y, rect) {
    return rect &&
           x >= rect.x &&
           x <= rect.x + rect.width &&
           y >= rect.y &&
           y <= rect.y + rect.height;
  },

  // Delete a node
  deleteNode(node) {
    // Remove connections to/from this node
    this.connections = this.connections.filter(conn =>
      conn.fromNode !== node && conn.toNode !== node
    );

    // Remove the node
    this.nodes = this.nodes.filter(n => n !== node);

    DebugManager.addLog(`Deleted node "${node.title}" (ID: ${node.id})`, 'info');
    DebugManager.updateCanvasStats();
    this.draw();
  },

  handleMouseDown(e) {
    // Check if we're interacting with the minimap
    if (window.miniMapInteraction) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - this.offsetX) / this.scale;
    const canvasY = (y - this.offsetY) / this.scale;

    // Check if middle mouse button is pressed (for panning)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // We don't need to check for toolbar buttons here since they're handled in handleClick

    for (const node of this.nodes) {
      if (node.outputConnectorContainsPoint(canvasX, canvasY)) {
        this.connectingNode = node;
        DebugManager.addLog(`Starting connection from node ${node.id}`, 'info');
        return;
      }
    }

    const clickedNode = this.nodes.find(node => node.containsPoint(canvasX, canvasY));
    if (clickedNode) {
      this.isDragging = true;
      this.dragNode = clickedNode;
      this.dragNode.selected = true;
      this.dragOffsetX = canvasX - clickedNode.x;
      this.dragOffsetY = canvasY - clickedNode.y;
      this.nodes.forEach(n => {
        if (n !== clickedNode) n.selected = false;
      });
    } else {
      // If no node was clicked, start panning
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';

      this.nodes.forEach(n => n.selected = false);
    }
    this.draw();
  },

  handleMouseMove(e) {
    // Check if we're interacting with the minimap
    if (window.miniMapInteraction) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - this.offsetX) / this.scale;
    const canvasY = (y - this.offsetY) / this.scale;

    this.hoveredNode = null;
    this.hoveredConnector = null;
    this.hoveredConnection = null;
    this.hoveredButton = null;
    this.canvas.style.cursor = 'default';

    // Handle panning
    if (this.isPanning) {
      this.offsetX += e.clientX - this.lastPanPoint.x;
      this.offsetY += e.clientY - this.lastPanPoint.y;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      this.draw();
      return;
    }

    if (this.isDragging && this.dragNode) {
      this.dragNode.x = canvasX - this.dragOffsetX;
      this.dragNode.y = canvasY - this.dragOffsetY;
      this.draw();
    } else if (this.connectingNode) {
      this.draw();

      const isHoveringValidInput = this.hoveredNode &&
                                 this.hoveredNode !== this.connectingNode &&
                                 this.hoveredConnector === 'input';

      const startX = this.connectingNode.x + this.connectingNode.width;
      const startY = this.connectingNode.y + this.connectingNode.height/2;
      const endX = isHoveringValidInput ? this.hoveredNode.x : canvasX;
      const endY = isHoveringValidInput ?
                  this.hoveredNode.y + this.hoveredNode.height/2 : canvasY;

      // Save context to apply transformations
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);

      Utils.drawConnection(
        this.ctx,
        startX,
        startY,
        endX,
        endY,
        isHoveringValidInput ? '#50c878' : '#4a90e2',
        isHoveringValidInput
      );

      // Restore context
      this.ctx.restore();

      for (const node of this.nodes) {
        if (node !== this.connectingNode && node.inputConnectorContainsPoint(canvasX, canvasY)) {
          this.hoveredNode = node;
          this.hoveredConnector = 'input';
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
      }
    } else {
      // Check for hovering over toolbar buttons first
      for (const node of this.nodes) {
        // Check input collapse button
        if (node.inputCollapseButton && this.isPointInButton(canvasX, canvasY, node.inputCollapseButton)) {
          this.hoveredButton = node.inputCollapseButton;
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }

        // Check output collapse button
        if (node.outputCollapseButton && this.isPointInButton(canvasX, canvasY, node.outputCollapseButton)) {
          this.hoveredButton = node.outputCollapseButton;
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }

        // Check edit button
        if (node.editButton && this.isPointInButton(canvasX, canvasY, node.editButton)) {
          this.hoveredButton = node.editButton;
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }

        // Check delete button
        if (node.deleteButton && this.isPointInButton(canvasX, canvasY, node.deleteButton)) {
          this.hoveredButton = node.deleteButton;
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
      }

      // Then check connections
      for (const conn of this.connections) {
        if (conn.containsPoint(canvasX, canvasY)) {
          this.hoveredConnection = conn;
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
      }

      // Then check node connectors and body
      for (const node of this.nodes) {
        if (node.outputConnectorContainsPoint(canvasX, canvasY)) {
          this.hoveredNode = node;
          this.hoveredConnector = 'output';
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
        if (node.inputConnectorContainsPoint(canvasX, canvasY)) {
          this.hoveredNode = node;
          this.hoveredConnector = 'input';
          this.canvas.style.cursor = 'pointer';
          this.draw();
          return;
        }
        if (node.containsPoint(canvasX, canvasY)) {
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

    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - this.offsetX) / this.scale;
    const canvasY = (y - this.offsetY) / this.scale;

    // Stop panning
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (this.connectingNode) {
      for (const node of this.nodes) {
        if (node !== this.connectingNode && node.inputConnectorContainsPoint(canvasX, canvasY)) {
          if (node.canAcceptInput(this.connectingNode)) {
            const connection = new Connection(this.connectingNode, node);
            this.connections.push(connection);
            DebugManager.addLog(`Connected node "${this.connectingNode.title}" (ID: ${this.connectingNode.id}) to node "${node.title}" (ID: ${node.id})`, 'success');

            // Check if the connecting node has been processed
            if (this.connectingNode.hasBeenProcessed) {
              // Process the node with the new connection
              // Pass the connecting node as the source node
              this.processNodeAndConnections(node, this.connectingNode.content, this.connectingNode).catch(err => {
                DebugManager.addLog(`Failed to process node: ${err.message}`, 'error');
              });
            } else {
              // If the connecting node hasn't been processed yet, just mark the target node as waiting
              node.waitingForInputs = true;
              DebugManager.addLog(`Node "${node.title}" (ID: ${node.id}) is waiting for input from "${this.connectingNode.title}"`, 'info');
              this.draw();
            }
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
            this.ctx.translate(this.offsetX, this.offsetY);
            this.ctx.scale(this.scale, this.scale);
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

    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - this.offsetX) / this.scale;
    const canvasY = (y - this.offsetY) / this.scale;

    const clickedNode = this.nodes.find(node => node.containsPoint(canvasX, canvasY));
    if (clickedNode) {
      this.openNodeEditor(clickedNode);
    }
  },

  // Handle wheel event for zooming
  handleWheel(e) {
    e.preventDefault();

    // Get mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom factor based on wheel delta
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

    // Calculate new scale
    const newScale = Math.max(
      this.MIN_SCALE,
      Math.min(this.MAX_SCALE, this.scale * zoomFactor)
    );

    // Calculate new offsets to zoom toward mouse position
    if (newScale !== this.scale) {
      // Calculate mouse position in world space before zoom
      const worldX = (mouseX - this.offsetX) / this.scale;
      const worldY = (mouseY - this.offsetY) / this.scale;

      // Update scale
      this.scale = newScale;

      // Calculate new offsets to keep mouse position fixed
      this.offsetX = mouseX - worldX * this.scale;
      this.offsetY = mouseY - worldY * this.scale;

      this.draw();

      // Log the zoom action
      DebugManager.addLog(`Zoomed to ${Math.round(this.scale * 100)}%`, 'info');
    }
  },

  // Zoom in method for external access
  zoomIn() {
    // Calculate center of viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Calculate world position before zoom
    const worldX = (centerX - this.offsetX) / this.scale;
    const worldY = (centerY - this.offsetY) / this.scale;

    // Apply zoom
    const newScale = Math.min(this.scale * 1.2, this.MAX_SCALE);

    // Only update if scale changed
    if (newScale !== this.scale) {
      this.scale = newScale;

      // Recalculate offset to keep the center point fixed
      this.offsetX = centerX - worldX * this.scale;
      this.offsetY = centerY - worldY * this.scale;

      // Update the canvas
      this.draw();

      // Log the zoom action
      DebugManager.addLog(`Zoomed in to ${Math.round(this.scale * 100)}%`, 'info');
    }
  },

  // Zoom out method for external access
  zoomOut() {
    // Calculate center of viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Calculate world position before zoom
    const worldX = (centerX - this.offsetX) / this.scale;
    const worldY = (centerY - this.offsetY) / this.scale;

    // Apply zoom
    const newScale = Math.max(this.scale / 1.2, this.MIN_SCALE);

    // Only update if scale changed
    if (newScale !== this.scale) {
      this.scale = newScale;

      // Recalculate offset to keep the center point fixed
      this.offsetX = centerX - worldX * this.scale;
      this.offsetY = centerY - worldY * this.scale;

      // Update the canvas
      this.draw();

      // Log the zoom action
      DebugManager.addLog(`Zoomed out to ${Math.round(this.scale * 100)}%`, 'info');
    }
  },

  // Reset zoom method for external access
  resetZoom() {
    this.scale = 1;

    // Center the view on the canvas content
    if (this.nodes.length > 0) {
      // Find the bounds of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      this.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });

      // Calculate the center of all nodes
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Center the view
      this.offsetX = window.innerWidth / 2 - centerX * this.scale;
      this.offsetY = window.innerHeight / 2 - centerY * this.scale;
    } else {
      // If no nodes, just center at origin
      this.offsetX = window.innerWidth / 2;
      this.offsetY = window.innerHeight / 2;
    }

    this.draw();
    DebugManager.addLog('Zoom reset to 100%', 'info');
  },

  // Handle keyboard events
  handleKeyDown(e) {
    // Don't handle shortcuts if an input element is focused
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable ||
      // Also check if we're in a modal
      this.editingNode !== null ||
      ModalManager.currentModal !== null
    ) {
      return;
    }

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

    // Add node with 'N' key
    if (e.key === 'n' || e.key === 'N') {
      this.addNode();
      DebugManager.addLog('Added new node with keyboard shortcut', 'info');
    }

    // Add chat node with 'C' key
    if (e.key === 'c' || e.key === 'C') {
      this.addChatNode();
      DebugManager.addLog('Added new chat node with keyboard shortcut', 'info');
    }

    // Reset view with 'R' key
    if (e.key === 'r' || e.key === 'R') {
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.draw();
      DebugManager.addLog('View reset', 'info');
    }
  },

  // Open the payload viewer modal
  openPayloadViewer(node) {
    if (!node) {
      DebugManager.addLog('No node selected for payload viewing', 'error');
      return;
    }

    // Check if we have payloads to display
    if (!node.lastRequestPayload && !node.lastResponsePayload) {
      DebugManager.addLog('No API payloads available for this node', 'info');
      return;
    }

    // Format the request payload for display
    const requestPayload = document.getElementById('requestPayload');
    const requestTimestamp = document.getElementById('requestTimestamp');

    if (node.lastRequestPayload) {
      try {
        // Process the request payload to handle large image data
        const processedRequestPayload = this.processPayloadForDisplay(node.lastRequestPayload);
        requestPayload.textContent = JSON.stringify(processedRequestPayload, null, 2);
        requestTimestamp.textContent = node.lastRequestTime || '-';
      } catch (error) {
        requestPayload.textContent = 'Error formatting request payload: ' + error.message;
        DebugManager.addLog(`Error formatting request payload: ${error.message}`, 'error');
      }
    } else {
      requestPayload.textContent = 'No request payload available';
      requestTimestamp.textContent = '-';
    }

    // Format the response payload for display
    const responsePayload = document.getElementById('responsePayload');
    const responseTimestamp = document.getElementById('responseTimestamp');

    if (node.lastResponsePayload) {
      try {
        // Process the response payload to handle large image data
        const processedResponsePayload = this.processPayloadForDisplay(node.lastResponsePayload);
        responsePayload.textContent = JSON.stringify(processedResponsePayload, null, 2);
        responseTimestamp.textContent = node.lastResponseTime || '-';
      } catch (error) {
        responsePayload.textContent = 'Error formatting response payload: ' + error.message;
        DebugManager.addLog(`Error formatting response payload: ${error.message}`, 'error');
      }
    } else {
      responsePayload.textContent = 'No response payload available';
      responseTimestamp.textContent = '-';
    }

    // Set up tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Set up copy button
    const copyButton = document.getElementById('copyPayload');
    copyButton.addEventListener('click', () => {
      // Determine which tab is active
      const activeTab = document.querySelector('.tab-pane.active');
      const textToCopy = activeTab.querySelector('pre').textContent;

      // Copy to clipboard
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          DebugManager.addLog('Payload copied to clipboard', 'success');
        })
        .catch(err => {
          DebugManager.addLog(`Failed to copy: ${err}`, 'error');
        });
    });

    // Set up close button
    const closeButton = document.getElementById('closePayloadViewer');
    closeButton.addEventListener('click', () => {
      ModalManager.closeModal('payloadViewerModal');
    });

    // Open the modal
    ModalManager.openModal('payloadViewerModal');
    DebugManager.addLog(`Viewing API payloads for node ${node.id}`, 'info');
  },

  // Process payload for display, truncating large data like images
  processPayloadForDisplay(payload) {
    if (!payload) return null;

    // Create a deep copy to avoid modifying the original
    const processedPayload = JSON.parse(JSON.stringify(payload));

    // Helper function to process nested objects
    const processObject = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      // Process each property
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];

          // Handle arrays
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              if (typeof value[i] === 'object') {
                processObject(value[i]);
              } else if (typeof value[i] === 'string') {
                // Truncate long strings that might be base64 images
                if (value[i].length > 1000 &&
                    (value[i].startsWith('data:image') ||
                     value[i].startsWith('http') ||
                     key === 'url' ||
                     key === 'image_url')) {
                  value[i] = `[${value[i].substring(0, 30)}... (${value[i].length} chars)]`;
                }
              }
            }
          }
          // Handle nested objects
          else if (typeof value === 'object' && value !== null) {
            processObject(value);
          }
          // Handle strings
          else if (typeof value === 'string') {
            // Truncate long strings that might be base64 images
            if (value.length > 1000 &&
                (value.startsWith('data:image') ||
                 value.startsWith('http') ||
                 key === 'url' ||
                 key === 'image_url')) {
              obj[key] = `[${value.substring(0, 30)}... (${value.length} chars)]`;
            }
          }
        }
      }
    };

    // Process the payload
    processObject(processedPayload);
    return processedPayload;
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

    // Special handling for image-related nodes
    if (node.aiProcessor === 'text-to-image' || node.aiProcessor === 'image-to-image') {
      // For image-related nodes, always show the image content section
      this.updateContentSection('image');
      document.getElementById('nodeModality').value = 'image';

      // Set the image prompt field with the input content for text-to-image nodes
      if (node.aiProcessor === 'text-to-image') {
        const imagePrompt = document.getElementById('imagePrompt');
        if (imagePrompt) {
          imagePrompt.value = node.inputContent || '';
        }
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
    } else if (node.contentType === 'chat') {
      // For chat nodes, we need to handle the chat history

      // Update content section to show chat interface
      this.updateContentSection('chat');

      // Update the chat history display
      const chatHistoryContainer = document.getElementById('chatHistory');
      if (chatHistoryContainer) {
        // Clear existing chat history
        chatHistoryContainer.innerHTML = '';

        // Add each message to the chat history display
        if (node.chatHistory && node.chatHistory.length > 0) {
          node.chatHistory.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.role}`;

            const roleLabel = document.createElement('div');
            roleLabel.className = 'chat-role';
            roleLabel.textContent = msg.role === 'user' ? 'User' : 'Assistant';

            const messageContent = document.createElement('div');
            messageContent.className = 'chat-content';
            messageContent.textContent = msg.content;

            messageDiv.appendChild(roleLabel);
            messageDiv.appendChild(messageContent);
            chatHistoryContainer.appendChild(messageDiv);
          });

          // Update message count
          const messageCount = document.getElementById('messageCount');
          if (messageCount) {
            messageCount.textContent = node.chatHistory.length;
          }
        } else {
          // No messages yet
          const emptyMessage = document.createElement('div');
          emptyMessage.className = 'chat-empty';
          emptyMessage.textContent = 'No chat messages yet. Type a message below to start chatting.';
          chatHistoryContainer.appendChild(emptyMessage);

          // Set message count to 0
          const messageCount = document.getElementById('messageCount');
          if (messageCount) {
            messageCount.textContent = '0';
          }
        }
      }

      // Don't clear the chat input - this was causing the issue
      // Instead, we'll leave it as is so the user can continue typing
    }

    // Set input and output types if those fields exist
    const inputTypeField = document.getElementById('inputType');
    const outputTypeField = document.getElementById('outputType');
    const autoSizeCheckbox = document.getElementById('autoSizeNode');
    const waitForAllInputsCheckbox = document.getElementById('waitForAllInputs');

    if (inputTypeField) inputTypeField.value = node.inputType;
    if (outputTypeField) outputTypeField.value = node.outputType;
    if (autoSizeCheckbox) autoSizeCheckbox.checked = node.autoSize;
    if (waitForAllInputsCheckbox) waitForAllInputsCheckbox.checked = node.waitForAllInputs;

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
          } else if (node.aiProcessor === 'text-to-image' || node.aiProcessor === 'image-to-image') {
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
    if (node.contentType === 'image' && (node.aiProcessor === 'text-to-image' || node.aiProcessor === 'image-to-image')) {
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

    // Set up view payloads button handler
    const viewPayloadsButton = document.getElementById('viewPayloads');
    if (viewPayloadsButton) {
      // Remove any existing event listeners
      viewPayloadsButton.replaceWith(viewPayloadsButton.cloneNode(true));

      // Get the fresh reference
      const newViewPayloadsButton = document.getElementById('viewPayloads');

      // Add the event listener
      newViewPayloadsButton.addEventListener('click', (e) => {
        // Prevent any default form submission
        e.preventDefault();
        e.stopPropagation();

        // Call the openPayloadViewer method with the current editing node
        if (this.editingNode) {
          this.openPayloadViewer(this.editingNode);
        } else {
          DebugManager.addLog('No node selected for payload viewing', 'error');
        }

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

  // Send a chat message from the chat input
  sendChatMessage() {
    if (!this.editingNode) return;

    // Get the chat input
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) return;

    // Add the message to the chat history
    const message = chatInput.value.trim();
    this.editingNode.addChatMessage(message, 'user');

    // Clear the input
    chatInput.value = '';

    // Update the message count
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
      messageCount.textContent = this.editingNode.chatHistory.length;
    }

    // Redraw the canvas
    this.draw();
  },

  // Send a chat message from the node editor and process it
  async sendChatMessageFromEditor() {
    if (!this.editingNode) {
      DebugManager.addLog('No node being edited', 'error');
      return null;
    }

    // Get the chat input
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) {
      DebugManager.addLog('No chat message to send', 'error');
      return null;
    }

    // Get the message
    const message = chatInput.value.trim();

    // Add the message to the chat history
    this.editingNode.addChatMessage(message, 'user');

    // Clear the input
    chatInput.value = '';

    // Update the message count
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
      messageCount.textContent = this.editingNode.chatHistory.length;
    }

    // Get the processing log element
    const processingLog = document.getElementById('processingLog');
    if (processingLog) {
      processingLog.innerHTML += `
        <div class="log-entry">
          <div>User: ${message}</div>
        </div>
      `;
    }

    // Process the message
    try {
      // Set processing state
      this.editingNode.processing = true;
      this.editingNode.error = null;

      // Process the message
      const result = await this.editingNode.processChatMessage(message);

      // Update the node with the result
      this.editingNode.processing = false;

      // Add the assistant message to the chat history
      this.editingNode.addChatMessage(result, 'assistant');

      // Show the chat message in the processing log
      if (processingLog) {
        processingLog.innerHTML += `
          <div class="log-entry success">
            <div>Assistant: ${result}</div>
          </div>
        `;
      }

      // Log success for debugging
      DebugManager.addLog(`Chat message processed for node ${this.editingNode.id}`, 'success');

      // Redraw the canvas to update the node display
      this.draw();

      return result;
    } catch (error) {
      // Update the node state
      this.editingNode.processing = false;
      this.editingNode.error = error.message;

      // Show the error in the processing log
      if (processingLog) {
        processingLog.innerHTML += `
          <div class="log-entry error">
            <div>Error: ${error.message}</div>
          </div>
        `;
      }

      // Log error for debugging
      DebugManager.addLog(`Error processing chat message: ${error.message}`, 'error');

      // Redraw the canvas to update the node display
      this.draw();

      throw error;
    }
  },

  // Save changes from the node editor
  saveNodeEditor(e) {
    // If called from an event, prevent default form submission
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    // Check if we have a valid editing node
    if (!this.editingNode) {
      DebugManager.addLog('No node being edited', 'error');
      return;
    }

    // Make sure the editing node still exists in the nodes array
    const nodeIndex = this.nodes.findIndex(node => node.id === this.editingNode.id);
    if (nodeIndex === -1) {
      DebugManager.addLog(`Node ${this.editingNode.id} no longer exists in the canvas`, 'error');
      this.editingNode = null;
      ModalManager.closeModal('nodeEditor');
      return;
    }

    // Get values from the form
    this.editingNode.title = document.getElementById('nodeTitle').value;
    this.editingNode.contentType = document.getElementById('nodeModality').value;
    this.editingNode.aiProcessor = document.getElementById('aiProcessor').value;
    this.editingNode.systemPrompt = document.getElementById('systemPrompt').value;

    // Get checkbox values
    const autoSizeCheckbox = document.getElementById('autoSizeNode');
    const waitForAllInputsCheckbox = document.getElementById('waitForAllInputs');

    if (autoSizeCheckbox) this.editingNode.autoSize = autoSizeCheckbox.checked;
    if (waitForAllInputsCheckbox) this.editingNode.waitForAllInputs = waitForAllInputsCheckbox.checked;

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

      case 'chat':
        // For chat nodes, we need to handle the chat history
        // The chat history is already stored in the node
        // We just need to make sure the content type is set to chat
        this.editingNode.contentType = 'chat';

        // If there's a system prompt, update it
        const systemPrompt = document.getElementById('systemPrompt').value;
        if (systemPrompt) {
          this.editingNode.systemPrompt = systemPrompt;
        }

        // If there's a chat input, get it
        const chatInput = document.getElementById('chatInput');
        if (chatInput && chatInput.value.trim()) {
          // Add the message to the chat history
          const message = chatInput.value.trim();
          this.editingNode.addChatMessage(message, 'user');

          // Clear the input
          chatInput.value = '';
        }

        // Update the message count
        const messageCount = document.getElementById('messageCount');
        if (messageCount) {
          messageCount.textContent = this.editingNode.chatHistory.length;
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

    if (inputTypeField) this.editingNode.inputType = inputTypeField.value;
    if (outputTypeField) this.editingNode.outputType = outputTypeField.value;

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

    // Error handling for the entire saveNode method is done in the async function
    // We don't need a separate try-catch block here
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

        case 'chat':
          // For chat, get input from the chat input
          const chatInput = document.getElementById('chatInput');
          if (chatInput && chatInput.value.trim()) {
            inputContent = chatInput.value.trim();

            // Show the chat input in the processing log
            if (processingLog) {
              processingLog.innerHTML += `
                <div class="log-entry">
                  <div>User message:</div>
                  <div class="chat-message user">${inputContent}</div>
                </div>
              `;
            }
          } else {
            // If no input, use the last message from chat history
            if (this.editingNode.chatHistory && this.editingNode.chatHistory.length > 0) {
              const lastMessage = this.editingNode.chatHistory[this.editingNode.chatHistory.length - 1];
              if (lastMessage.role === 'user') {
                inputContent = lastMessage.content;
              }
            }
          }
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
          } else if (this.editingNode.aiProcessor === 'image-to-image') {
            // For image-to-image, use the node's content as input
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

        case 'chat':
          // For chat nodes, use our sendChatMessageFromEditor method
          try {
            result = await this.sendChatMessageFromEditor();
            if (!result) {
              throw new Error('No chat message to process');
            }
          } catch (error) {
            throw error;
          }
          break;

        case 'image-to-text':
          result = await this.editingNode.processImageToText(inputContent);
          break;

        case 'image-to-image':
          result = await this.editingNode.processImageToImage(inputContent);

          // Set content type to image for image-to-image nodes
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

          // Show the processed image in the processing log
          if (processingLog && result) {
            processingLog.innerHTML += `
              <div class="log-entry success">
                <div>Processed image:</div>
                <img src="${result}" style="max-width: 100%; max-height: 200px; margin-top: 10px;">
              </div>
            `;
          }

          // Log success for debugging
          DebugManager.addLog(`Image processed successfully for node ${this.editingNode.id}: ${result.substring(0, 30)}...`, 'success');
          break;

        case 'audio-to-text':
          result = await this.editingNode.processAudioToText(inputContent);
          break;

        default:
          throw new Error(`Unsupported processor type: ${this.editingNode.aiProcessor}`);
      }

      // Store the output result in the node (already done for image-related nodes in the switch case)
      if (this.editingNode.aiProcessor !== 'text-to-image' && this.editingNode.aiProcessor !== 'image-to-image') {
        this.editingNode.content = result;
      }

      // Mark the node as processed
      this.editingNode.hasBeenProcessed = true;

      // Show the result in the processing log
      if (processingLog &&
          this.editingNode.aiProcessor !== 'text-to-image' &&
          this.editingNode.aiProcessor !== 'image-to-image') {
        processingLog.innerHTML += `
          <div class="log-entry success">
            <div>Result:</div>
            <div class="result-content">${result}</div>
          </div>
        `;
      }

      // Special handling for image-related nodes after execution
      if (this.editingNode.aiProcessor === 'text-to-image' || this.editingNode.aiProcessor === 'image-to-image') {
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

      // Store the error in the node if it still exists
      if (this.editingNode) {
        this.editingNode.error = err.message;
      }

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
  async processNodeAndConnections(node, input, sourceNode = null) {
    if (!node) return;

    // If this is a direct node execution (no source node), reset the node's input state
    if (!sourceNode) {
      // Reset the node's input state to clear any previous inputs
      node.reset();
      DebugManager.addLog(`Reset input state for node "${node.title}" (ID: ${node.id}) before processing`, 'info');

      // If we have input, store it directly
      if (input) {
        node.inputContent = input;
      }
    }
    // If we have a source node, add this input to the node's input sources
    else {
      // Add the input to the node's input sources
      const isReady = node.addInput(sourceNode, input);

      // If the node is not ready for processing, mark it as waiting and return
      if (!isReady) {
        node.waitingForInputs = true;
        DebugManager.addLog(`Node "${node.title}" (ID: ${node.id}) is waiting for more inputs`, 'info');
        this.draw(); // Redraw to show waiting status
        return;
      }
    }

    // Reset waiting status
    node.waitingForInputs = false;

    // Get the combined input if we have multiple inputs
    const processInput = node.inputSources.size > 0 ? node.combineInputs() : (input || node.inputContent);

    try {
      // Process the current node
      const output = await node.process(processInput);

      // Store the output in the node's content using our updateNodeContent method
      if (output) {
        // Use the new updateNodeContent method to properly handle image cache-busting
        node.updateNodeContent(output);

        // Log for debugging
        DebugManager.addLog(`Node "${node.title}" (ID: ${node.id}) processed with output: ${output.substring ? output.substring(0, 30) + '...' : 'non-text content'}`, 'info');
      }

      // Special handling for image-related nodes
      if (node.aiProcessor === 'text-to-image' || node.aiProcessor === 'image-to-image') {
        // Set content type to image for image-related nodes
        node.contentType = 'image';

        // Store the input content for image-related nodes
        if (!node.inputContent && processInput) {
          node.inputContent = processInput;
        }

        if (node.hasBeenProcessed) {
          // Make sure the image is preloaded for display
          if (node.content) {
            // Force recreate the image object to ensure it loads properly
            node.contentImage = null;

            // Create a new image with a timestamp to prevent caching
            const timestamp = Date.now();
            if (node.content.includes('?')) {
              node.content = node.content.split('?')[0] + '?t=' + timestamp;
            } else if (node.content.startsWith('data:')) {
              // For data URLs, we don't need to add a timestamp
            } else {
              node.content = node.content + '?t=' + timestamp;
            }

            // Now preload the content with the new URL
            node.preloadContent();

            // Log success for debugging
            DebugManager.addLog(`Image content set for node ${node.id} with cache-busting: ${node.content.substring(0, 30)}...`, 'info');
          } else {
            DebugManager.addLog(`Warning: No image content for node ${node.id} in workflow`, 'warning');
          }
        }
      }

      // Special handling for workflow output nodes
      if (node.workflowRole === 'output') {
        // Ensure the content is set
        if (output && node.content !== output) {
          node.content = output;
          node.hasBeenProcessed = true;

          // If this is an output node and WorkflowPanel exists, update the chat panel immediately
          if (typeof WorkflowPanel !== 'undefined') {
            // Check if we should show all node outputs
            const showAllNodeOutputs = document.getElementById('showAllNodeOutputs')?.checked || false;

            // Only update if we're not showing all node outputs (otherwise it will be handled by WorkflowIO)
            if (!showAllNodeOutputs) {
              // Check if this is an image node
              const isImageContent = node.contentType === 'image' ||
                  (node.content && typeof node.content === 'string' &&
                   (node.content.startsWith('data:image') ||
                    node.content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)));

              if (isImageContent) {
                // Get the actual image content
                let imageContent = node.content;
                if (node.contentImage && node.contentImage.src) {
                  imageContent = node.contentImage.src;
                }

                // Verify that the image content is valid before adding it to the chat
                if (imageContent && typeof imageContent === 'string' &&
                    (imageContent.startsWith('data:image') ||
                     imageContent.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i))) {

                  // Force the content to be treated as an image
                  WorkflowPanel.addMessage(imageContent, 'assistant', true);
                  DebugManager.addLog(`Updated workflow chat with new image from output node ${node.id}`, 'success');
                }
              } else {
                // For text nodes, add the content
                WorkflowPanel.addMessage(node.content, 'assistant');
                DebugManager.addLog(`Updated workflow chat with new text from output node ${node.id}`, 'success');
              }
            }
          }
        }

        // Log for debugging
        DebugManager.addLog(`Output node "${node.title}" (ID: ${node.id}) final content: ${node.content ? (node.content.substring ? node.content.substring(0, 30) + '...' : 'non-text content') : 'empty'}`, 'info');
      }

      // Explicitly call updateDependentNodes to ensure connected nodes are processed
      DebugManager.addLog(`Calling updateDependentNodes for node "${node.title}" (ID: ${node.id})`, 'info');
      node.updateDependentNodes();

      // Redraw to show updated state
      this.draw();

      return output;
    } catch (error) {
      // Handle errors gracefully
      node.error = error.message;

      // Create a more user-friendly error message
      let errorMessage = error.message;

      // Check for common API errors and provide more helpful messages
      if (errorMessage === 'API request failed') {
        errorMessage = 'API request failed. The server may be temporarily unavailable. Please try again later.';
      } else if (errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be busy. Please try again later.';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'API rate limit exceeded. Please wait a moment before trying again.';
      }

      // Log the error
      DebugManager.addLog(`Node "${node.title}" (ID: ${node.id}) error: ${errorMessage}`, 'error');

      // Redraw to show error state
      this.draw();

      throw new Error(errorMessage);
    }
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
        inputCollapsed: node.inputCollapsed,
        outputCollapsed: node.outputCollapsed,
        error: node.error,
        workflowRole: node.workflowRole || 'none',
        chatHistory: node.chatHistory || []
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

  // Get all nodes connected to a starting node (directly or indirectly)
  getConnectedNodes(startNode) {
    if (!startNode) return [];

    const visited = new Set();
    const result = [];
    const queue = [startNode];

    while (queue.length > 0) {
      const currentNode = queue.shift();

      if (!currentNode || visited.has(currentNode.id)) continue;

      visited.add(currentNode.id);
      if (currentNode !== startNode) {
        result.push(currentNode);
      }

      // Find all nodes connected to the current node
      const connections = this.connections.filter(conn => conn.fromNode === currentNode);
      for (const connection of connections) {
        if (connection.toNode && !visited.has(connection.toNode.id)) {
          queue.push(connection.toNode);
        }
      }
    }

    return result;
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
        inputCollapsed: node.inputCollapsed,
        outputCollapsed: node.outputCollapsed,
        error: node.error,
        workflowRole: node.workflowRole || 'none',
        chatHistory: node.chatHistory || []
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
      if (node.contentType === 'image' ||
          node.aiProcessor === 'text-to-image' ||
          node.aiProcessor === 'image-to-image') {
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
  async loadWorkflowState(state) {
    // Clear the current state
    this.nodes = [];
    this.connections = [];

    // Clear the image cache to prevent showing old images
    if (typeof ImageStorage !== 'undefined') {
      ImageStorage.clearCache();
      ImageStorage.imageStore = {}; // Clear the image store as well
      DebugManager.addLog('Image cache cleared before loading workflow', 'info');
    }

    // Clear the workflow chat panel if it exists
    if (typeof WorkflowPanel !== 'undefined') {
      WorkflowPanel.clearChat();
      DebugManager.addLog('Workflow chat panel cleared', 'info');
    }

    // Show loading indicator
    DebugManager.addLog('Loading workflow...', 'info');

    // Create a loading indicator in the DOM
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'workflow-loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading workflow...</div>
    `;
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.borderRadius = '5px';
    loadingIndicator.style.zIndex = '9999';
    loadingIndicator.style.display = 'flex';
    loadingIndicator.style.flexDirection = 'column';
    loadingIndicator.style.alignItems = 'center';
    loadingIndicator.style.justifyContent = 'center';

    // Add spinner styles
    const style = document.createElement('style');
    style.textContent = `
      .loading-spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid white;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(loadingIndicator);

    // Start loading workflow images if this is a server workflow
    if (state._id) {
      try {
        DebugManager.addLog('Loading workflow images...', 'info');

        // Update loading indicator text
        const loadingText = loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
          loadingText.textContent = 'Loading workflow images...';
        }

        // Start loading images progressively
        await ImageStorage.loadWorkflowImages(state._id);

        // Update loading indicator
        if (loadingText) {
          loadingText.textContent = 'Processing workflow...';
        }

        DebugManager.addLog('Initial workflow images loaded, continuing with workflow setup', 'success');
      } catch (error) {
        console.warn('Error loading workflow images:', error);
        DebugManager.addLog(`Error loading workflow images: ${error.message}`, 'warning');
        // Continue even if image loading fails
      }
    }

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

      // Explicitly reset contentImage to prevent caching issues
      node.contentImage = null;

      // Restore state properties
      node.hasBeenProcessed = nodeData.hasBeenProcessed || false;
      node.error = nodeData.error || null;
      node.selected = nodeData.selected || false;
      node.expanded = nodeData.expanded || false;
      node.inputCollapsed = nodeData.inputCollapsed || false;
      node.outputCollapsed = nodeData.outputCollapsed || false;
      node.autoSize = nodeData.autoSize !== undefined ? nodeData.autoSize : true;

      // Restore chat history if it exists
      if (nodeData.chatHistory && Array.isArray(nodeData.chatHistory)) {
        node.chatHistory = [...nodeData.chatHistory];
      }

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

        // Check if this is a truncated image reference
        if (node.content && node.content.includes('[image data truncated]')) {
          // This is a truncated image, try to load from ImageStorage
          DebugManager.addLog(`Loading truncated image for node ${node.id}...`, 'info');

          // We'll try to load the image asynchronously
          (async () => {
            try {
              // Try to find an image for this node in the workflow
              const images = await fetch(`/api/images/workflow/${state._id}`);
              if (images.ok) {
                const imageList = await images.json();
                const nodeImage = imageList.find(img => img.node === node.id);

                if (nodeImage) {
                  // Load the image data
                  const imageResponse = await fetch(`/api/images/${nodeImage.imageId}`);
                  if (imageResponse.ok) {
                    const imageData = await imageResponse.json();

                    // Update the node content with the actual image data
                    node.content = imageData.data;

                    // Preload the image
                    node.contentImage = null;
                    node.contentImage = new Image();

                    // Add load event listener to redraw when image loads
                    node.contentImage.onload = () => {
                      // When image loads, update node size if auto-sizing is enabled
                      if (node.autoSize) {
                        node.calculateOptimalSize();
                      }
                      // Force a redraw to show the image
                      App.draw();

                      // Log success for debugging
                      DebugManager.addLog(`Truncated image loaded for node ${node.id}`, 'success');
                    };

                    // Add error handler
                    node.contentImage.onerror = (err) => {
                      DebugManager.addLog(`Error loading truncated image for node ${node.id}: ${err.message || 'Unknown error'}`, 'error');
                      // Clear the image reference to allow retry
                      node.contentImage = null;
                    };

                    // Set the source last to trigger loading
                    node.contentImage.src = node.content;
                  }
                }
              }
            } catch (error) {
              console.warn(`Error loading image for node ${node.id}:`, error);
            }
          })();
        }
        // Regular image content
        else if (node.content) {
          // Force recreate the image object to ensure it loads properly
          node.contentImage = null;
          node.contentImage = new Image();

          // Add load event listener to redraw when image loads
          node.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (node.autoSize) {
              node.calculateOptimalSize();
            }
            // Force a redraw to show the image
            this.draw();

            // Log success for debugging
            DebugManager.addLog(`Image loaded for node ${node.id}`, 'success');
          };

          // Add error handler
          node.contentImage.onerror = (err) => {
            DebugManager.addLog(`Error loading image for node ${node.id}: ${err.message || 'Unknown error'}`, 'error');
            // Clear the image reference to allow retry
            node.contentImage = null;
          };

          // Set the source last to trigger loading
          node.contentImage.src = node.content;

          // Log attempt for debugging
          DebugManager.addLog(`Loading image for node ${node.id}...`, 'info');
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

    // Remove the loading indicator
    const loadingElement = document.getElementById('workflow-loading-indicator');
    if (loadingElement) {
      // Fade out the loading indicator
      loadingElement.style.transition = 'opacity 0.5s';
      loadingElement.style.opacity = '0';

      // Remove after animation completes
      setTimeout(() => {
        if (loadingElement.parentNode) {
          loadingElement.parentNode.removeChild(loadingElement);
        }
      }, 500);
    }

    // Force another redraw after a longer delay to ensure images are properly loaded
    setTimeout(() => {
      // Preload content for all nodes again
      this.nodes.forEach(node => node.preloadContent());
      this.draw();

      // Update WorkflowIO status if available
      if (typeof WorkflowIO !== 'undefined') {
        WorkflowIO.updateStatus();
        DebugManager.addLog('Updated workflow I/O status', 'info');
      }

      DebugManager.addLog('Workflow loaded successfully', 'success');
    }, 1000); // Increased timeout to allow for image loading

    DebugManager.updateCanvasStats();
  },

  // Add a node to the canvas
  addNode() {
    const id = this.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);
    this.nodes.push(node);
    DebugManager.addLog(`Added new node "Node ${id}" (ID: ${id})`, 'info');
    DebugManager.updateCanvasStats();
    this.draw();
  },

  // Open a custom chat input modal
  openCustomChatInputModal(node) {
    // Create modal container if it doesn't exist
    let chatModal = document.getElementById('chatInputModal');
    if (!chatModal) {
      chatModal = document.createElement('div');
      chatModal.id = 'chatInputModal';
      chatModal.className = 'modal';

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content chat-input-modal';

      // Create header
      const header = document.createElement('div');
      header.className = 'modal-header';

      const title = document.createElement('h2');
      title.textContent = 'Chat Message';

      const closeBtn = document.createElement('span');
      closeBtn.className = 'close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = () => {
        chatModal.style.display = 'none';
      };

      header.appendChild(title);
      header.appendChild(closeBtn);

      // Create body
      const body = document.createElement('div');
      body.className = 'modal-body';

      const inputContainer = document.createElement('div');
      inputContainer.className = 'chat-input-container';

      const textarea = document.createElement('textarea');
      textarea.id = 'customChatInput';
      textarea.placeholder = 'Type your message here...';
      textarea.rows = 4;

      // Add event listener for Enter key
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          document.getElementById('sendCustomChatBtn').click();
        }
      });

      inputContainer.appendChild(textarea);

      // Create footer
      const footer = document.createElement('div');
      footer.className = 'modal-footer';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.onclick = () => {
        chatModal.style.display = 'none';
      };

      const sendBtn = document.createElement('button');
      sendBtn.id = 'sendCustomChatBtn';
      sendBtn.textContent = 'Send';
      sendBtn.className = 'btn btn-primary';
      sendBtn.onclick = () => {
        const message = document.getElementById('customChatInput').value.trim();
        if (message) {
          // Store the input text in the node
          this.activeChatNode.chatInputText = message;

          // Send the message
          this.sendChatMessageFromNode(this.activeChatNode);

          // Close the modal
          chatModal.style.display = 'none';
        }
      };

      footer.appendChild(cancelBtn);
      footer.appendChild(sendBtn);

      // Assemble modal
      modalContent.appendChild(header);
      body.appendChild(inputContainer);
      modalContent.appendChild(body);
      modalContent.appendChild(footer);
      chatModal.appendChild(modalContent);

      // Add to document
      document.body.appendChild(chatModal);
    }

    // Set the current value if any
    const textarea = document.getElementById('customChatInput');
    if (textarea) {
      textarea.value = node.chatInputText || '';
    }

    // Show the modal
    chatModal.style.display = 'block';

    // Focus the textarea
    setTimeout(() => {
      const textarea = document.getElementById('customChatInput');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  },

  // Add a chat node to the canvas
  addChatNode() {
    // Check if we're already in the process of adding a chat node
    if (this._addingChatNode) {
      DebugManager.addLog('Already adding a chat node, please wait...', 'warning');
      return;
    }

    // Set flag to prevent multiple calls
    this._addingChatNode = true;

    try {
      const id = this.nodes.length + 1;
      const x = window.innerWidth/2 - 80;
      const y = window.innerHeight/2 - 40;
      const node = new Node(x, y, id);

      // Configure as a chat node
      node.title = "Chat Node " + id;
      node.contentType = 'chat';
      node.aiProcessor = 'chat';
      node.inputType = 'text';
      node.outputType = 'text';
      node.systemPrompt = "You are a helpful assistant. Respond to the user's messages in a friendly and informative way.";
      node.width = 300; // Make chat nodes wider by default
      node.height = 200; // Make chat nodes taller by default

      // Initialize chat history array
      node.chatHistory = [];

      // Select the new node
      this.nodes.forEach(n => n.selected = false);
      node.selected = true;

      this.nodes.push(node);
      DebugManager.addLog(`Added new chat node "Chat Node ${id}" (ID: ${id})`, 'info');
      DebugManager.updateCanvasStats();
      this.draw();

      // Open the node editor for the new chat node
      this.openNodeEditor(node);
    } finally {
      // Clear the flag after a short delay to prevent accidental double-clicks
      setTimeout(() => {
        this._addingChatNode = false;
      }, 500);
    }
  },

  // Send a chat message directly from a node in the canvas
  async sendChatMessageFromNode(node) {
    if (!node || !node.chatInputText || node.processing) {
      return;
    }

    // Get the message from the node's chat input
    const message = node.chatInputText;

    // Clear the input text
    node.chatInputText = '';

    // Set processing state
    node.processing = true;

    try {
      // Add the message to the chat history
      node.addChatMessage(message, 'user');

      // Process the message to get AI response
      await node.processChatMessage(message);

      // Ensure the node is visible on the canvas
      this.ensureNodeVisible(node);

      // Redraw the canvas
      this.draw();
    } catch (error) {
      DebugManager.addLog(`Error processing chat message: ${error.message}`, 'error');
      node.error = error.message;
    } finally {
      // Clear processing state
      node.processing = false;
      this.draw();
    }
  },

  // Ensure a node is visible on the canvas
  ensureNodeVisible(node) {
    if (!node) return;

    // Get the current canvas dimensions
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // Calculate node boundaries in canvas coordinates
    const nodeLeft = node.x * this.scale + this.offsetX;
    const nodeTop = node.y * this.scale + this.offsetY;
    const nodeRight = (node.x + node.width) * this.scale + this.offsetX;
    const nodeBottom = (node.y + node.height) * this.scale + this.offsetY;

    // Check if the node is completely outside the visible area
    const isOutsideX = nodeRight < 0 || nodeLeft > canvasWidth;
    const isOutsideY = nodeBottom < 0 || nodeTop > canvasHeight;

    if (isOutsideX || isOutsideY) {
      // Node is outside the visible area, center it on the canvas
      this.offsetX = canvasWidth / 2 - (node.x + node.width / 2) * this.scale;
      this.offsetY = canvasHeight / 2 - (node.y + node.height / 2) * this.scale;

      DebugManager.addLog(`Repositioned node "${node.title}" (ID: ${node.id}) to be visible on the canvas`, 'info');
    }
  },

  // Send a chat message from a chat node
  async sendChatMessage(node, message) {
    if (!node || !message || message.trim() === '') {
      DebugManager.addLog('Cannot send empty message', 'error');
      return;
    }

    try {
      // Set node to processing state
      node.processing = true;
      this.draw();

      // Add user message to chat history
      if (!node.chatHistory) {
        node.chatHistory = [];
      }

      // Add user message
      node.chatHistory.push({
        role: 'user',
        content: message
      });

      // Get the system prompt
      const systemPrompt = node.systemPrompt || "You are a helpful assistant.";

      // Prepare the messages array for the API
      const messages = [
        { role: 'system', content: systemPrompt },
        ...node.chatHistory
      ];

      // Get OpenAI config
      const config = ApiService.openai.getConfig();

      // Log the request
      DebugManager.addLog(`Sending chat request to OpenAI API (model: ${config.model})`, 'info');

      // Make API request
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          model: config.model,
          max_tokens: config.max_tokens,
          temperature: config.temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from OpenAI API');
      }

      const data = await response.json();

      // Extract the assistant's response
      const assistantResponse = data.choices[0].message.content;

      // Add assistant response to chat history
      node.chatHistory.push({
        role: 'assistant',
        content: assistantResponse
      });

      // Update node state
      node.processing = false;
      node.hasBeenProcessed = true;
      node.error = null;

      // Set the node content to the latest message for connections
      node.content = assistantResponse;

      // Auto-resize the node if needed
      if (node.autoSize) {
        node.calculateOptimalSize();
      }

      // Ensure the node is visible on the canvas
      this.ensureNodeVisible(node);

      // Redraw the canvas
      this.draw();

      // Log success
      DebugManager.addLog(`Chat response received for node ${node.id}`, 'success');

      // Process any connected nodes
      const connections = this.connections.filter(conn => conn.fromNode === node);
      if (connections.length > 0) {
        DebugManager.addLog(`Processing ${connections.length} connected node(s)...`, 'info');

        // Process each connected node
        for (const connection of connections) {
          try {
            await this.processNodeAndConnections(connection.toNode, assistantResponse);
          } catch (err) {
            DebugManager.addLog(`Error processing connected node ${connection.toNode.id}: ${err.message}`, 'error');
          }
        }
      }

      return assistantResponse;
    } catch (error) {
      // Handle errors
      node.processing = false;
      node.error = error.message;
      DebugManager.addLog(`Chat error: ${error.message}`, 'error');
      this.draw();
      throw error;
    }
  },

  // Send a chat message from the node editor
  async sendChatMessageFromEditor() {
    if (!this.editingNode) {
      DebugManager.addLog('No node being edited', 'error');
      return;
    }

    // Get the chat input
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) {
      DebugManager.addLog('Cannot send empty message', 'error');
      return;
    }

    // Get the message
    const message = chatInput.value.trim();

    try {
      // Disable the input and send button while processing
      chatInput.disabled = true;
      const sendButton = document.getElementById('sendChatMessage');
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';
      }

      // Update the processing log
      const processingLog = document.getElementById('processingLog');
      if (processingLog) {
        processingLog.innerHTML += `
          <div class="log-entry">
            <div>Sending message: ${message}</div>
          </div>
        `;
      }

      // Update the chat history UI
      this.updateChatHistoryUI(this.editingNode, message, 'user');

      // Send the message
      const response = await this.sendChatMessage(this.editingNode, message);

      // Update the chat history UI with the response
      this.updateChatHistoryUI(this.editingNode, response, 'assistant');

      // Update the processing log
      if (processingLog) {
        processingLog.innerHTML += `
          <div class="log-entry success">
            <div>Response received: ${response}</div>
          </div>
        `;
      }

      // Clear the input
      chatInput.value = '';

      // Update the message count
      const messageCount = document.getElementById('messageCount');
      if (messageCount) {
        messageCount.textContent = this.editingNode.chatHistory.length;
      }

      // Log success
      DebugManager.addLog('Chat message sent and response received', 'success');

      return response;
    } catch (error) {
      // Update the processing log with the error
      const processingLog = document.getElementById('processingLog');
      if (processingLog) {
        processingLog.innerHTML += `
          <div class="log-entry error">
            <div>Error: ${error.message}</div>
          </div>
        `;
      }

      // Log the error
      DebugManager.addLog(`Chat error: ${error.message}`, 'error');
    } finally {
      // Re-enable the input and send button
      chatInput.disabled = false;
      chatInput.focus();
      const sendButton = document.getElementById('sendChatMessage');
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
      }
    }
  },

  // Update the chat history UI
  updateChatHistoryUI(node, message, role) {
    if (!node || !message) return;

    // Get the chat history container
    const chatHistory = document.getElementById('chatHistory');
    if (!chatHistory) return;

    // Create a new message element
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${role}`;

    // Add role label
    const roleLabel = document.createElement('div');
    roleLabel.className = 'chat-role';
    roleLabel.textContent = role === 'user' ? 'User' : 'Assistant';

    // Add message content
    const contentElement = document.createElement('div');
    contentElement.className = 'chat-content';
    contentElement.textContent = message;

    // Add elements to the message
    messageElement.appendChild(roleLabel);
    messageElement.appendChild(contentElement);

    // Add the message to the chat history
    chatHistory.appendChild(messageElement);

    // Scroll to the bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
  },

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply pan and zoom transformations
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // Draw grid background
    this.drawGrid();

    // Draw connections and nodes
    this.connections.forEach(conn => conn.draw(this.ctx));
    this.nodes.forEach(node => node.draw(this.ctx));

    // Restore the context
    this.ctx.restore();

    // Draw zoom level indicator
    this.drawZoomIndicator();
  },

  // Draw a grid background
  drawGrid() {
    const gridSize = 20;
    const offsetX = this.offsetX % (gridSize * this.scale);
    const offsetY = this.offsetY % (gridSize * this.scale);

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 0.5;

    // Draw vertical lines
    for (let x = offsetX / this.scale; x < this.canvas.width / this.scale; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height / this.scale);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = offsetY / this.scale; y < this.canvas.height / this.scale; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width / this.scale, y);
      this.ctx.stroke();
    }
  },

  // Draw zoom level indicator
  drawZoomIndicator() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 80, 25);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Zoom: ${Math.round(this.scale * 100)}%`, 15, 25);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
