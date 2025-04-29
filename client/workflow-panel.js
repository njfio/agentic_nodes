// Workflow Panel - Integrated workflow interface
const WorkflowPanel = {
  // Properties
  isCollapsed: false,
  messageHistory: [],
  isResizing: false,
  initialHeight: 300,
  initialY: 0,

  // Default panel height (px)
  defaultHeight: 300,

  // Min and max heights (px)
  minHeight: 150,
  maxHeight: window.innerHeight - 100,

  // Initialize the workflow panel
  init() {
    // Set up event listeners
    this.setupEventListeners();

    // Update the status
    WorkflowIO.updateStatus();

    // Initialize the chat input
    this.initChatInput();

    // Initialize resize functionality
    this.initResizeHandle();
  },

  // Set up event listeners
  setupEventListeners() {
    // Toggle panel collapse/expand
    const toggleBtn = document.getElementById('toggleWorkflowPanel');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('workflowPanel');
        if (panel) {
          panel.classList.toggle('collapsed');
          this.isCollapsed = panel.classList.contains('collapsed');
          toggleBtn.textContent = this.isCollapsed ? '+' : '-';
        }
      });
    }

    // Run workflow button (Send message)
    const runWorkflowBtn = document.getElementById('runWorkflowBtn');
    if (runWorkflowBtn) {
      runWorkflowBtn.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    // Chat input keypress (Enter to send)
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-resize the textarea as user types
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
      });
    }
  },

  // Initialize the chat input
  initChatInput() {
    const chatInput = document.getElementById('workflowChatInput');
    if (chatInput) {
      // Set initial height
      chatInput.style.height = 'auto';
      chatInput.style.height = (chatInput.scrollHeight) + 'px';

      // Focus the input
      chatInput.focus();
    }
  },

  // Send a message through the workflow
  async sendMessage() {
    try {
      const chatInput = document.getElementById('workflowChatInput');
      if (!chatInput || !chatInput.value.trim()) {
        console.log("No workflow chat input or empty message");
        return;
      }

      const userMessage = chatInput.value.trim();
      console.log("Sending message:", userMessage);

      // Add user message to the chat
      this.addMessage(userMessage, 'user');

      // Clear the input
      chatInput.value = '';
      chatInput.style.height = 'auto';

      // Focus the input again
      chatInput.focus();

      // Process the message through the workflow
      try {
        console.log("Calling WorkflowIO.processMessage with:", userMessage);
        await WorkflowIO.processMessage(userMessage);
      } catch (error) {
        console.error("Error in WorkflowIO.processMessage:", error);
        this.addMessage(`Error processing message: ${error.message}`, 'assistant');
        DebugManager.addLog(`Error processing message: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      DebugManager.addLog(`Error in sendMessage: ${error.message}`, 'error');
    }
  },

  // Add a message to the chat and return its ID
  addMessage(content, sender, forceImage = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;

    // Debug the content before rendering
    DebugManager.addLog(`Adding message to chat: ${typeof content === 'string' ?
      (content.startsWith('data:image') ? 'Image data URL' : content.substring(0, 30) + '...') :
      'Non-string content'} (forceImage: ${forceImage})`, 'info');

    // Check if this is an image that needs to be forced
    if (forceImage || (typeof content === 'string' && (
        content.startsWith('data:image') ||
        content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)
    ))) {
      DebugManager.addLog(`Detected image content in addMessage, forceImage=${forceImage}`, 'info');
    }

    // Create a unique ID for the message
    const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${sender}-message`;
    messageEl.id = messageId;

    // Create message content
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';

    // Process the content
    this.renderContent(content, contentEl, sender, forceImage);

    // Add content to message
    messageEl.appendChild(contentEl);

    // Add message to chat
    chatMessages.appendChild(messageEl);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add to message history
    this.messageHistory.push({
      id: messageId,
      content,
      sender,
      timestamp: new Date().toISOString()
    });

    // Return the message ID so it can be referenced later
    return messageId;
  },

  // Render content in the message element
  renderContent(content, contentEl, sender, forceImage = false) {
    // Check if content is empty
    if (!content) {
      contentEl.textContent = '';
      return;
    }

    // Add a special debug message for workflow chat
    console.log("WorkflowPanel.renderContent called with:", {
      contentType: typeof content,
      isString: typeof content === 'string',
      isDataImage: typeof content === 'string' && content.startsWith('data:image'),
      forceImage: forceImage,
      contentLength: typeof content === 'string' ? content.length : 'N/A',
      contentPreview: typeof content === 'string' ? content.substring(0, 100) : 'N/A'
    });

    try {
      // Check if content is an image (data URL or image URL) or if forceImage is true
      const isImageContent = forceImage || (typeof content === 'string' && (
          content.startsWith('data:image') ||
          content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)
      ));

      if (isImageContent) {
        console.log("Detected image content in workflow chat");

        // Additional validation to ensure the image content is valid
        if (!content || typeof content !== 'string' ||
            !(content.startsWith('data:image') ||
              content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i))) {
          console.warn("Invalid image content detected, displaying error message instead");
          const errorEl = document.createElement('div');
          errorEl.className = 'image-error-details';
          errorEl.textContent = 'Invalid image content';
          contentEl.appendChild(errorEl);
          return;
        }

        // Create image element
        const img = document.createElement('img');

        // Add a timestamp to force a refresh of the image
        let imageUrl = content;
        if (typeof imageUrl === 'string') {
          const timestamp = Date.now();
          if (imageUrl.includes('?')) {
            imageUrl = imageUrl.split('?')[0] + '?t=' + timestamp;
          } else if (!imageUrl.startsWith('data:')) {
            imageUrl = imageUrl + '?t=' + timestamp;
          }
          console.log(`Adding cache-busting to image URL: ${imageUrl.substring(0, 50)}...`);
        }

        // Set the image source with cache-busting
        img.src = imageUrl;
        img.alt = 'Image';
        img.className = 'chat-message-image';

        // Add loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'image-loading-indicator';
        loadingIndicator.textContent = 'Loading image...';
        contentEl.appendChild(loadingIndicator);

        // Handle image load
        img.onload = () => {
          console.log("Image loaded successfully in workflow chat");
          // Remove loading indicator
          if (loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
          }

          // Add image info if needed
          if (content.startsWith('data:image')) {
            const infoEl = document.createElement('div');
            infoEl.className = 'image-info';
            infoEl.textContent = 'Generated image';
            contentEl.appendChild(infoEl);
          }

          // Scroll to bottom after image loads
          const chatMessages = document.getElementById('chatMessages');
          if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        };

        // Handle image error
        img.onerror = (e) => {
          console.error("Error loading image in workflow chat:", e);
          if (loadingIndicator.parentNode) {
            loadingIndicator.textContent = 'Error loading image';
            loadingIndicator.className = 'image-error-indicator';
          }

          // Try to display error details
          const errorEl = document.createElement('div');
          errorEl.className = 'image-error-details';
          errorEl.textContent = `Failed to load image. Length: ${content.length}`;
          contentEl.appendChild(errorEl);
        };

        // Add image to content
        contentEl.appendChild(img);

        // Force image load
        if (img.complete) {
          img.onload();
        }
      }
    // Check for mixed content with embedded images
    else if (typeof content === 'string' && content.includes('data:image')) {
      console.log("Detected mixed content with embedded images");

      // Extract image data URLs
      const imageMatches = content.match(/data:image\/[^;]+;base64,[^\s"')]+/g);

      if (imageMatches && imageMatches.length > 0) {
        console.log(`Found ${imageMatches.length} embedded images`);

        // Split content by image URLs
        const parts = content.split(/(data:image\/[^;]+;base64,[^\s"')]+)/g);

        // Process each part
        parts.forEach(part => {
          if (part.startsWith('data:image')) {
            // This part is an image
            const img = document.createElement('img');

            // Add a timestamp to force a refresh of the image
            let imageUrl = part;
            if (typeof imageUrl === 'string') {
              const timestamp = Date.now();
              if (imageUrl.includes('?')) {
                imageUrl = imageUrl.split('?')[0] + '?t=' + timestamp;
              } else if (!imageUrl.startsWith('data:')) {
                imageUrl = imageUrl + '?t=' + timestamp;
              }
            }

            img.src = imageUrl;
            img.alt = 'Image';
            img.className = 'chat-message-image';

            // Handle image load
            img.onload = () => {
              console.log("Embedded image loaded successfully");
              // Scroll to bottom after image loads
              const chatMessages = document.getElementById('chatMessages');
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            };

            // Handle image error
            img.onerror = (e) => {
              console.error("Error loading embedded image:", e);
            };

            contentEl.appendChild(img);

            // Force image load
            if (img.complete) {
              img.onload();
            }
          } else if (part.trim()) {
            // This part is text
            const textNode = document.createElement('div');

            // Handle markdown-style bold text for node titles
            if (part.includes('**') && sender === 'assistant') {
              textNode.innerHTML = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            } else {
              textNode.textContent = part;
            }

            contentEl.appendChild(textNode);
          }
        });
      } else {
        console.log("No embedded images found in content that includes 'data:image'");
        // Handle as regular text with markdown
        if (content.includes('**') && sender === 'assistant') {
          contentEl.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } else {
          contentEl.textContent = content;
        }
      }
    }
    // Handle markdown-style bold text for node titles
    else if (typeof content === 'string' && content.includes('**') && sender === 'assistant') {
      contentEl.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    // Regular text content
    else {
      contentEl.textContent = content;
    }
    } catch (error) {
      // If there's an error rendering the content, show it as text
      console.error("Error rendering content:", error);
      contentEl.innerHTML = `<div class="error-content">Error rendering content: ${error.message}</div>`;
      if (typeof content === 'string') {
        // Try to show the content as text
        const textContent = document.createElement('div');
        textContent.className = 'fallback-content';
        textContent.textContent = content.substring(0, 500) + (content.length > 500 ? '...' : '');
        contentEl.appendChild(textContent);
      }
    }
  },

  // Remove a message from the chat by ID
  removeMessage(messageId) {
    if (!messageId) {
      console.warn("removeMessage called with no messageId");
      return false;
    }

    console.log("Removing message with ID:", messageId);
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      console.log("Found message element, removing it");
      messageEl.remove();

      // Also remove from message history
      this.messageHistory = this.messageHistory.filter(msg => msg.id !== messageId);
      console.log("Message removed from history");
      return true;
    } else {
      console.warn("Message element not found:", messageId);
    }

    return false;
  },

  // Clear the chat
  clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      // Keep only the welcome message
      chatMessages.innerHTML = `
        <div class="chat-message assistant-message">
          <div class="message-content">Welcome! I'm your workflow assistant. Set up your input and output nodes, then send me a message to process through the workflow.</div>
        </div>
      `;

      // Clear message history
      this.messageHistory = [];
    }
  },

  // Initialize the resize handle
  initResizeHandle() {
    const resizeHandle = document.getElementById('workflowPanelResizeHandle');
    const panel = document.getElementById('workflowPanel');

    if (!resizeHandle || !panel) return;

    // Store the initial panel height
    this.initialHeight = parseInt(window.getComputedStyle(panel).height, 10) || this.defaultHeight;

    // Mouse down event on the resize handle
    resizeHandle.addEventListener('mousedown', (e) => {
      // Prevent default to avoid text selection during resize
      e.preventDefault();

      // Start resizing
      this.isResizing = true;
      this.initialY = e.clientY;
      this.initialHeight = parseInt(window.getComputedStyle(panel).height, 10);

      // Add resizing class to disable transitions during resize
      panel.classList.add('resizing');

      // Add global mouse move and mouse up event listeners
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    });

    // Touch events for mobile support
    resizeHandle.addEventListener('touchstart', (e) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        this.isResizing = true;
        this.initialY = e.touches[0].clientY;
        this.initialHeight = parseInt(window.getComputedStyle(panel).height, 10);

        panel.classList.add('resizing');

        document.addEventListener('touchmove', this.handleTouchMove);
        document.addEventListener('touchend', this.handleTouchEnd);
      }
    });
  },

  // Handle mouse move during resize
  handleMouseMove: function(e) {
    if (!WorkflowPanel.isResizing) return;

    const panel = document.getElementById('workflowPanel');
    if (!panel) return;

    // Calculate the new height based on mouse movement
    // Moving up (negative delta) increases height, moving down decreases height
    const delta = WorkflowPanel.initialY - e.clientY;
    let newHeight = WorkflowPanel.initialHeight + delta;

    // Constrain the height within min and max bounds
    newHeight = Math.max(WorkflowPanel.minHeight, Math.min(newHeight, WorkflowPanel.maxHeight));

    // Apply the new height
    panel.style.height = `${newHeight}px`;

    // Update chat messages container to scroll to bottom if needed
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  },

  // Handle mouse up to stop resizing
  handleMouseUp: function() {
    if (!WorkflowPanel.isResizing) return;

    const panel = document.getElementById('workflowPanel');
    if (panel) {
      // Remove resizing class to re-enable transitions
      panel.classList.remove('resizing');
    }

    // Stop resizing
    WorkflowPanel.isResizing = false;

    // Remove global event listeners
    document.removeEventListener('mousemove', WorkflowPanel.handleMouseMove);
    document.removeEventListener('mouseup', WorkflowPanel.handleMouseUp);
  },

  // Handle touch move during resize (for mobile)
  handleTouchMove: function(e) {
    if (!WorkflowPanel.isResizing || e.touches.length !== 1) return;

    const panel = document.getElementById('workflowPanel');
    if (!panel) return;

    const delta = WorkflowPanel.initialY - e.touches[0].clientY;
    let newHeight = WorkflowPanel.initialHeight + delta;

    newHeight = Math.max(WorkflowPanel.minHeight, Math.min(newHeight, WorkflowPanel.maxHeight));

    panel.style.height = `${newHeight}px`;

    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  },

  // Handle touch end to stop resizing (for mobile)
  handleTouchEnd: function() {
    if (!WorkflowPanel.isResizing) return;

    const panel = document.getElementById('workflowPanel');
    if (panel) {
      panel.classList.remove('resizing');
    }

    WorkflowPanel.isResizing = false;

    document.removeEventListener('touchmove', WorkflowPanel.handleTouchMove);
    document.removeEventListener('touchend', WorkflowPanel.handleTouchEnd);
  }
};

// Initialize the workflow panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    // Make sure WorkflowIO is defined before using it
    if (typeof WorkflowIO !== 'undefined') {
      WorkflowPanel.init();

      // Update the WorkflowIO methods to work with the panel

      // Override the openWorkflowIO method
      const originalOpenWorkflowIO = WorkflowIO.openWorkflowIO;
      WorkflowIO.openWorkflowIO = function() {
        // Update the status
        this.updateStatus();

        // Show the panel
        const panel = document.getElementById('workflowPanel');
        if (panel) {
          panel.classList.remove('collapsed');
          WorkflowPanel.isCollapsed = false;

          const toggleBtn = document.getElementById('toggleWorkflowPanel');
          if (toggleBtn) {
            toggleBtn.textContent = '-';
          }
        }
      };

      // Override the closeWorkflowIO method
      const originalCloseWorkflowIO = WorkflowIO.closeWorkflowIO;
      WorkflowIO.closeWorkflowIO = function() {
        // Do nothing, as we don't want to close the panel
        // The user can collapse it if they want
      };

      // Override the updateStatus method
      const originalUpdateStatus = WorkflowIO.updateStatus;
      WorkflowIO.updateStatus = function() {
        // Call the original method if it exists
        if (typeof originalUpdateStatus === 'function') {
          originalUpdateStatus.call(this);
        }

        // Update the status in the panel
        const inputNodeStatus = document.getElementById('inputNodeStatus');
        const outputNodeStatus = document.getElementById('outputNodeStatus');
        const runWorkflowBtn = document.getElementById('runWorkflowBtn');

        if (!inputNodeStatus || !outputNodeStatus) return;

        // Update input node status
        if (this.inputNode) {
          inputNodeStatus.textContent = `Node ${this.inputNode.id}: ${this.inputNode.title || 'Untitled'}`;
          inputNodeStatus.className = 'status-value set';
        } else {
          inputNodeStatus.textContent = 'Not Set';
          inputNodeStatus.className = 'status-value not-set';
        }

        // Update output node status
        if (this.outputNode) {
          outputNodeStatus.textContent = `Node ${this.outputNode.id}: ${this.outputNode.title || 'Untitled'}`;
          outputNodeStatus.className = 'status-value set';
        } else {
          outputNodeStatus.textContent = 'Not Set';
          outputNodeStatus.className = 'status-value not-set';
        }

        // Update the run button state
        if (runWorkflowBtn) {
          runWorkflowBtn.disabled = !this.inputNode || !this.outputNode || this.isProcessing;

          // Update button text based on processing state
          runWorkflowBtn.textContent = this.isProcessing ? 'Processing...' : 'Send';
        }
      };

      // Override the runWorkflow method to use the chat interface
      const originalRunWorkflow = WorkflowIO.runWorkflow;
      WorkflowIO.runWorkflow = function() {
        // Get the input from the chat input instead of the workflow input
        const chatInput = document.getElementById('workflowChatInput');
        if (chatInput && chatInput.value.trim()) {
          // Use the processMessage method instead
          WorkflowPanel.sendMessage();
        } else {
          // Fall back to original method if chat input is not available
          originalRunWorkflow.call(this);
        }
      };

      // Override the clearOutput method to clear the chat
      const originalClearOutput = WorkflowIO.clearOutput;
      WorkflowIO.clearOutput = function() {
        // Call the original method
        originalClearOutput.call(this);

        // Also clear the chat
        WorkflowPanel.clearChat();
      };
    }
  }, 100);
});
