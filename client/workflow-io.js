/**
 * Workflow Input/Output Interface
 * Provides a simple interface for inputting requests and getting responses from workflows
 */

const WorkflowIO = {
  // Properties
  inputNode: null,
  outputNode: null,
  isProcessing: false,

  // Initialize the workflow I/O interface
  init() {
    // Set up event listeners
    this.setupEventListeners();

    // Add the workflow I/O button to the toolbar
    this.addWorkflowIOButton();

    // Add the node role options to the node editor
    this.addNodeRoleOptions();
  },

  // Set up event listeners
  setupEventListeners() {
    // Workflow interface button in toolbar
    document.getElementById('workflowInterfaceBtn').addEventListener('click', () => {
      this.openWorkflowIO();
    });

    // Input field enter key
    const workflowInput = document.getElementById('workflowInput');
    if (workflowInput) {
      workflowInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          this.runWorkflow();
        }
      });
    }

    // Clear input button
    const clearInputBtn = document.getElementById('clearInputBtn');
    if (clearInputBtn) {
      clearInputBtn.addEventListener('click', () => {
        const workflowInput = document.getElementById('workflowInput');
        if (workflowInput) {
          workflowInput.value = '';
        }
      });
    }
  },

  // Add the workflow I/O button to the toolbar
  addWorkflowIOButton() {
    // The button is already added in the HTML
    // We just need to make sure it's properly styled
    const button = document.getElementById('workflowInterfaceBtn');
    if (button) {
      button.style.backgroundColor = '#9b59b6'; // Purple color to make it stand out
    }
  },

  // Add the node role options to the node editor
  addNodeRoleOptions() {
    // Find the form group in the node editor
    const formGroups = document.querySelectorAll('#nodeEditorForm .form-group');

    if (formGroups.length > 0) {
      // Create a new form group for node roles
      const nodeRoleGroup = document.createElement('div');
      nodeRoleGroup.className = 'form-group node-role-group';
      nodeRoleGroup.innerHTML = `
        <label>Node Role:</label>
        <div class="radio-group-container">
          <div class="radio-group">
            <input type="radio" id="nodeRoleNone" name="nodeRole" value="none" checked>
            <label for="nodeRoleNone">None</label>
          </div>
          <div class="radio-group">
            <input type="radio" id="nodeRoleInput" name="nodeRole" value="input">
            <label for="nodeRoleInput">Input Node</label>
          </div>
          <div class="radio-group">
            <input type="radio" id="nodeRoleOutput" name="nodeRole" value="output">
            <label for="nodeRoleOutput">Output Node</label>
          </div>
        </div>
      `;

      // Insert after the AI processor form group
      const aiProcessorGroup = Array.from(formGroups).find(group =>
        group.querySelector('label[for="aiProcessor"]')
      );

      if (aiProcessorGroup) {
        aiProcessorGroup.parentNode.insertBefore(nodeRoleGroup, aiProcessorGroup.nextSibling);

        // Add event listeners to the radio buttons
        document.getElementById('nodeRoleNone').addEventListener('change', (e) => {
          if (e.target.checked && App.editingNode) {
            this.setNodeRole(App.editingNode, 'none');
          }
        });

        document.getElementById('nodeRoleInput').addEventListener('change', (e) => {
          if (e.target.checked && App.editingNode) {
            this.setNodeRole(App.editingNode, 'input');
          }
        });

        document.getElementById('nodeRoleOutput').addEventListener('change', (e) => {
          if (e.target.checked && App.editingNode) {
            this.setNodeRole(App.editingNode, 'output');
          }
        });
      }
    }
  },

  // Set the role of a node
  setNodeRole(node, role) {
    // If this node was previously an input or output node, remove that role
    if (node.workflowRole === 'input' && this.inputNode === node) {
      this.inputNode = null;
    } else if (node.workflowRole === 'output' && this.outputNode === node) {
      this.outputNode = null;
    }

    // Set the new role
    node.workflowRole = role;

    // If the new role is input or output, update the corresponding property
    if (role === 'input') {
      // If there was a previous input node, remove its role
      if (this.inputNode && this.inputNode !== node) {
        this.inputNode.workflowRole = 'none';
        DebugManager.addLog(`Node ${this.inputNode.id} is no longer the input node`, 'info');
      }

      this.inputNode = node;
      DebugManager.addLog(`Node ${node.id} set as input node`, 'success');
    } else if (role === 'output') {
      // If there was a previous output node, remove its role
      if (this.outputNode && this.outputNode !== node) {
        this.outputNode.workflowRole = 'none';
        DebugManager.addLog(`Node ${this.outputNode.id} is no longer the output node`, 'info');
      }

      this.outputNode = node;
      DebugManager.addLog(`Node ${node.id} set as output node`, 'success');
    }

    // Update the status in the modal if it's open
    this.updateStatus();
  },

  // Open the workflow I/O panel
  openWorkflowIO() {
    // Update the status
    this.updateStatus();

    // Show the panel by removing the collapsed class
    const panel = document.getElementById('workflowPanel');
    if (panel) {
      panel.classList.remove('collapsed');

      // Update the toggle button
      const toggleBtn = document.getElementById('toggleWorkflowPanel');
      if (toggleBtn) {
        toggleBtn.textContent = '-';
      }
    }
  },

  // Close the workflow I/O panel (collapse it)
  closeWorkflowIO() {
    // Collapse the panel
    const panel = document.getElementById('workflowPanel');
    if (panel) {
      panel.classList.add('collapsed');

      // Update the toggle button
      const toggleBtn = document.getElementById('toggleWorkflowPanel');
      if (toggleBtn) {
        toggleBtn.textContent = '+';
      }
    }
  },

  // Update the input and output node status
  updateStatus() {
    const inputNodeStatus = document.getElementById('inputNodeStatus');
    const outputNodeStatus = document.getElementById('outputNodeStatus');

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
    const runWorkflowBtn = document.getElementById('runWorkflowBtn');
    if (runWorkflowBtn) {
      runWorkflowBtn.disabled = !this.inputNode || !this.outputNode || this.isProcessing;
    }
  },

  // Run the workflow
  async runWorkflow() {
    // Check if input and output nodes are set
    if (!this.inputNode || !this.outputNode) {
      DebugManager.addLog('Input and output nodes must be set to run the workflow', 'error');
      return;
    }

    // Get the input text
    const workflowInput = document.getElementById('workflowInput');
    const inputText = workflowInput.value.trim();

    if (!inputText) {
      DebugManager.addLog('Please enter input text', 'error');
      return;
    }

    // Check if we should clear the output
    const clearOutputOnRun = document.getElementById('clearOutputOnRun').checked;
    if (clearOutputOnRun) {
      this.clearOutput();
    }

    // Set processing state
    this.isProcessing = true;
    this.updateStatus();

    // Update the output to show processing
    const workflowOutput = document.getElementById('workflowOutput');
    workflowOutput.innerHTML = '<div class="processing-message">Processing your request...</div>';

    try {
      // Set the input node's content
      this.inputNode.content = inputText;
      this.inputNode.hasBeenProcessed = false;

      // Clear the output node's content
      this.outputNode.content = '';
      this.outputNode.hasBeenProcessed = false;

      // Process the input node
      DebugManager.addLog(`Running workflow with input: ${inputText.substring(0, 50)}${inputText.length > 50 ? '...' : ''}`, 'info');

      // Process the node chain starting from the input node
      await App.processNodeChain(this.inputNode);

      // Add a small delay to ensure all processing is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the output from the output node - make sure we're getting the latest content
      const output = this.outputNode.content;

      DebugManager.addLog(`Output node content: ${output ? (output.length > 50 ? output.substring(0, 50) + '...' : output) : 'empty'}`, 'info');

      // Update the output display
      if (output) {
        if (this.outputNode.contentType === 'image') {
          workflowOutput.innerHTML = `
            <div class="output-content">
              <img src="${output}" class="output-image" alt="Workflow output image">
            </div>
          `;
        } else {
          workflowOutput.innerHTML = `
            <div class="output-content">
              <pre>${output}</pre>
            </div>
          `;
        }

        DebugManager.addLog('Workflow completed successfully', 'success');
      } else {
        // If the output node has been processed but has no content, check if it has inputContent
        if (this.outputNode.hasBeenProcessed && this.outputNode.inputContent) {
          const fallbackOutput = this.outputNode.inputContent;

          workflowOutput.innerHTML = `
            <div class="output-content">
              <pre>${fallbackOutput}</pre>
            </div>
          `;

          DebugManager.addLog('Workflow completed. Using input content as output.', 'warning');
        } else {
          workflowOutput.innerHTML = '<div class="no-output-message">No output was generated</div>';
          DebugManager.addLog('Workflow completed but no output was generated', 'warning');
        }
      }
    } catch (error) {
      // Show the error in the output
      workflowOutput.innerHTML = `
        <div class="error-message">
          <h4>Error:</h4>
          <pre>${error.message}</pre>
        </div>
      `;

      DebugManager.addLog(`Workflow execution failed: ${error.message}`, 'error');
    } finally {
      // Reset processing state
      this.isProcessing = false;
      this.updateStatus();
    }
  },

  // Copy the output to clipboard
  copyOutput() {
    const workflowOutput = document.getElementById('workflowOutput');
    if (!workflowOutput) return;

    // Get the output content
    let outputText = '';

    // Check if there's an image
    const outputImage = workflowOutput.querySelector('.output-image');
    if (outputImage) {
      outputText = '[Image output]';
    } else {
      // Get text content
      const outputContent = workflowOutput.querySelector('.output-content pre');
      if (outputContent) {
        outputText = outputContent.textContent;
      }
    }

    if (!outputText) {
      DebugManager.addLog('No output to copy', 'error');
      return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(outputText)
      .then(() => {
        DebugManager.addLog('Output copied to clipboard', 'success');
      })
      .catch(err => {
        DebugManager.addLog(`Failed to copy output: ${err.message}`, 'error');
      });
  },

  // Clear the output
  clearOutput() {
    const workflowOutput = document.getElementById('workflowOutput');
    if (workflowOutput) {
      workflowOutput.innerHTML = '<div class="no-output-message">Output will appear here after running the workflow</div>';
    }
  },

  // Process a message through the workflow (for chat interface)
  async processMessage(message) {
    console.log("processMessage called with:", message);

    // Check if input and output nodes are set
    if (!this.inputNode || !this.outputNode) {
      console.error("Input or output node not set:", { inputNode: this.inputNode, outputNode: this.outputNode });
      DebugManager.addLog('Input and output nodes must be set to process messages', 'error');
      WorkflowPanel.addMessage('Please set input and output nodes before sending messages.', 'assistant');
      return;
    }

    console.log("Input node:", this.inputNode.id, this.inputNode.title);
    console.log("Output node:", this.outputNode.id, this.outputNode.title);

    // Check if we should clear the output
    const clearOutputOnRun = document.getElementById('clearOutputOnRun')?.checked || false;
    console.log("Clear output on run:", clearOutputOnRun);

    // Set processing state
    this.isProcessing = true;
    this.updateStatus();

    // Show processing message
    WorkflowPanel.addMessage('Processing your request...', 'assistant');

    try {
      // Reset the input node's state
      console.log("Resetting input node state");
      this.inputNode.reset();

      // Set the input node's content
      console.log("Setting input node content");
      this.inputNode.content = message;
      this.inputNode.inputContent = message;
      this.inputNode.hasBeenProcessed = false;

      // Clear the output node's content if needed
      if (clearOutputOnRun) {
        console.log("Clearing output node content");
        this.outputNode.content = '';
        this.outputNode.inputContent = '';
      }
      this.outputNode.hasBeenProcessed = false;

      // Process the input node
      DebugManager.addLog(`Processing message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'info');

      // Process the node chain starting from the input node
      console.log("Calling processNodeChain");
      try {
        await App.processNodeChain(this.inputNode);
        console.log("processNodeChain completed");
      } catch (chainError) {
        console.error("Error in processNodeChain:", chainError);
        throw chainError;
      }

      // Add a small delay to ensure all processing is complete
      console.log("Waiting for processing to complete");
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get the output from the output node
      console.log("Getting output from output node");
      const output = this.outputNode.content;
      console.log("Output node content:", output ? (output.length > 100 ? output.substring(0, 100) + "..." : output) : "empty");

      DebugManager.addLog(`Output node content: ${output ? (output.length > 50 ? output.substring(0, 50) + '...' : output) : 'empty'}`, 'info');

      // Add the response to the chat
      if (output) {
        console.log("Adding output to chat");
        WorkflowPanel.addMessage(output, 'assistant');
        DebugManager.addLog('Message processed successfully', 'success');
      } else {
        console.log("No output from output node, checking alternatives");
        // If the output node has been processed but has no content, check if it has inputContent
        if (this.outputNode.hasBeenProcessed && this.outputNode.inputContent) {
          console.log("Using output node inputContent as fallback");
          const fallbackOutput = this.outputNode.inputContent;
          WorkflowPanel.addMessage(fallbackOutput, 'assistant');
          DebugManager.addLog('Message processed. Using input content as output.', 'warning');
        } else {
          // Check if any node in the chain has content we can use
          console.log("Checking connected nodes for content");
          const connectedNodes = App.getConnectedNodes(this.inputNode);
          console.log("Connected nodes:", connectedNodes.map(n => n.id));
          let foundOutput = false;

          for (const node of connectedNodes) {
            console.log(`Checking node ${node.id} - processed: ${node.hasBeenProcessed}, has content: ${!!node.content}`);
            if (node.hasBeenProcessed && node.content && node !== this.inputNode) {
              console.log(`Using content from node ${node.id}`);
              WorkflowPanel.addMessage(node.content, 'assistant');
              DebugManager.addLog(`Using content from node ${node.id} as response`, 'info');
              foundOutput = true;
              break;
            }
          }

          if (!foundOutput) {
            console.log("No output found in any node");
            WorkflowPanel.addMessage('I couldn\'t generate a response. Please try again.', 'assistant');
            DebugManager.addLog('Message processed but no output was generated', 'warning');
          }
        }
      }
    } catch (error) {
      console.error("Error in processMessage:", error);
      // Show the error in the chat
      WorkflowPanel.addMessage(`Error: ${error.message}`, 'assistant');
      DebugManager.addLog(`Message processing failed: ${error.message}`, 'error');
    } finally {
      console.log("Resetting processing state");
      // Reset processing state
      this.isProcessing = false;
      this.updateStatus();
    }
  }
};

// Add the workflowRole property to the Node class
Object.defineProperty(Node.prototype, 'workflowRole', {
  get: function() {
    return this._workflowRole || 'none';
  },
  set: function(value) {
    this._workflowRole = value;
  }
});

// Initialize the workflow I/O interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    // Make sure App is defined before using it
    if (typeof App !== 'undefined') {
      // Modify the openNodeEditor method to update the node role radio buttons
      const originalOpenNodeEditorForWorkflowIO = App.openNodeEditor;
      App.openNodeEditor = function(node) {
        // Call the original openNodeEditor method
        originalOpenNodeEditorForWorkflowIO.call(this, node);

        // Update the node role radio buttons
        if (this.editingNode) {
          const role = this.editingNode.workflowRole || 'none';
          const radioButton = document.getElementById(`nodeRole${role.charAt(0).toUpperCase() + role.slice(1)}`);
          if (radioButton) {
            radioButton.checked = true;
          }
        }
      };

      // Modify the draw method to indicate input and output nodes
      const originalDrawForWorkflowIO = App.draw;
      App.draw = function() {
        // Call the original draw method
        originalDrawForWorkflowIO.call(this);

        // Draw indicators for input and output nodes
        this.nodes.forEach(node => {
          if (node.workflowRole === 'input' || node.workflowRole === 'output') {
            this.ctx.save();

            // Draw a badge in the top-right corner
            const badgeX = node.x + node.width - 10;
            const badgeY = node.y + 10;
            const badgeRadius = 10;

            // Draw the badge circle
            this.ctx.fillStyle = node.workflowRole === 'input' ? '#27ae60' : '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw the badge text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.workflowRole === 'input' ? 'I' : 'O', badgeX, badgeY);

            this.ctx.restore();
          }
        });
      };

      // Initialize workflow I/O
      WorkflowIO.init();
    } else {
      console.warn('App not defined yet, workflow I/O initialization delayed');
      // Try again after a longer delay
      setTimeout(() => {
        if (typeof App !== 'undefined') {
          // Modify the openNodeEditor method to update the node role radio buttons
          const originalOpenNodeEditorForWorkflowIO = App.openNodeEditor;
          App.openNodeEditor = function(node) {
            // Call the original openNodeEditor method
            originalOpenNodeEditorForWorkflowIO.call(this, node);

            // Update the node role radio buttons
            if (this.editingNode) {
              const role = this.editingNode.workflowRole || 'none';
              const radioButton = document.getElementById(`nodeRole${role.charAt(0).toUpperCase() + role.slice(1)}`);
              if (radioButton) {
                radioButton.checked = true;
              }
            }
          };

          // Modify the draw method to indicate input and output nodes
          const originalDrawForWorkflowIO = App.draw;
          App.draw = function() {
            // Call the original draw method
            originalDrawForWorkflowIO.call(this);

            // Draw indicators for input and output nodes
            this.nodes.forEach(node => {
              if (node.workflowRole === 'input' || node.workflowRole === 'output') {
                this.ctx.save();

                // Draw a badge in the top-right corner
                const badgeX = node.x + node.width - 10;
                const badgeY = node.y + 10;
                const badgeRadius = 10;

                // Draw the badge circle
                this.ctx.fillStyle = node.workflowRole === 'input' ? '#27ae60' : '#e74c3c';
                this.ctx.beginPath();
                this.ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw the badge text
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(node.workflowRole === 'input' ? 'I' : 'O', badgeX, badgeY);

                this.ctx.restore();
              }
            });
          };

          WorkflowIO.init();
        } else {
          console.error('App still not defined, workflow I/O initialization failed');
        }
      }, 500);
    }
  }, 100);
});
