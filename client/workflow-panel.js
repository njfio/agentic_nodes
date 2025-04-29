// Workflow Panel - Integrated workflow interface
const WorkflowPanel = {
  // Properties
  isCollapsed: false,
  messageHistory: [],

  // Initialize the workflow panel
  init() {
    // Set up event listeners
    this.setupEventListeners();

    // Update the status
    WorkflowIO.updateStatus();

    // Initialize the chat input
    this.initChatInput();
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
    const chatInput = document.getElementById('chatInput');
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
      const chatInput = document.getElementById('chatInput');
      if (!chatInput || !chatInput.value.trim()) {
        console.log("No chat input or empty message");
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

  // Add a message to the chat
  addMessage(content, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${sender}-message`;

    // Create message content
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';

    // Check if content is an image
    if (content.startsWith('data:image') || content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)) {
      const img = document.createElement('img');
      img.src = content;
      img.alt = 'Image';
      contentEl.appendChild(img);
    } else {
      // Text content
      contentEl.textContent = content;
    }

    // Add content to message
    messageEl.appendChild(contentEl);

    // Add message to chat
    chatMessages.appendChild(messageEl);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add to message history
    this.messageHistory.push({
      content,
      sender,
      timestamp: new Date().toISOString()
    });
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
        const chatInput = document.getElementById('chatInput');
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
