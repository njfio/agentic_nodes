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

    // Check if we should show all node outputs
    const showAllNodeOutputs = document.getElementById('showAllNodeOutputs')?.checked || false;
    console.log("Show all node outputs:", showAllNodeOutputs);

    // Set processing state
    this.isProcessing = true;
    this.updateStatus();

    // Show processing message
    WorkflowPanel.addMessage('Processing your request...', 'assistant');

    try {
      // If clearOutputOnRun is checked, reset all nodes in the workflow
      if (clearOutputOnRun) {
        console.log("Clearing all nodes in the workflow");
        // Get all nodes in the workflow
        const allNodes = [...App.nodes];

        // Reset each node
        for (const node of allNodes) {
          // Reset node state
          if (typeof node.reset === 'function') {
            node.reset();
          } else {
            // Fallback if reset method doesn't exist
            node.inputSources = new Map();
            node.imageInputs = [];
            node.additionalImages = [];
            node.inputImage = null;
            node.waitingForInputs = false;
          }

          // Clear content and mark as not processed
          if (node !== this.inputNode) { // Don't clear the input node yet
            node.content = '';
            node.inputContent = '';
            node.hasBeenProcessed = false;
          }
        }

        DebugManager.addLog('Reset all nodes in the workflow', 'info');
      } else {
        // Only reset the input node's state if the method exists
        console.log("Resetting only input node state");
        if (typeof this.inputNode.reset === 'function') {
          this.inputNode.reset();
        } else {
          // Fallback if reset method doesn't exist
          console.log("Node.reset method not found, using fallback");
          this.inputNode.inputSources = new Map();
          this.inputNode.imageInputs = [];
          this.inputNode.additionalImages = [];
          this.inputNode.inputImage = null;
          this.inputNode.waitingForInputs = false;
        }
      }

      // Set the input node's content
      console.log("Setting input node content");
      this.inputNode.content = message;
      this.inputNode.inputContent = message;

      // Process the input node
      DebugManager.addLog(`Processing message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'info');

      // Mark the input node as processed with the user's message
      this.inputNode.hasBeenProcessed = true;

      // Process the node chain starting from the input node
      console.log("Calling processNodeChain");
      try {
        await App.processNodeChain(this.inputNode);
        console.log("processNodeChain completed");
      } catch (chainError) {
        console.error("Error in processNodeChain:", chainError);
        throw chainError;
      }

      // Add a longer delay to ensure all processing is complete
      console.log("Waiting for processing to complete");

      // Show a waiting message that we'll replace later
      const waitingMessageId = WorkflowPanel.addMessage('Processing your workflow...', 'assistant');

      // Wait for nodes to finish processing (longer delay)
      await new Promise(resolve => setTimeout(resolve, 5000)); // Increased to 5 seconds

      // Check if any nodes are still processing
      let stillProcessing = App.nodes.some(node => node.processing);

      // Force mark nodes as processed if they have content but aren't marked as processed
      App.nodes.forEach(node => {
        if (node.content && !node.hasBeenProcessed) {
          DebugManager.addLog(`Node ${node.id} (${node.title}) has content but wasn't marked as processed. Fixing...`, 'warning');
          node.hasBeenProcessed = true;
        }

        // Special handling for image nodes - they might be processed but not marked as such
        if (node.aiProcessor === 'text-to-image' || node.contentType === 'image') {
          // Check if this is Node 2 (the image node)
          if (node.id === 2 || node.title === 'Node 2') {
            DebugManager.addLog(`Forcing image node ${node.id} (${node.title}) to be processed`, 'warning');
            node.hasBeenProcessed = true;

            // If the node has a contentImage but no content, use the contentImage.src as content
            if (node.contentImage && node.contentImage.src && !node.content) {
              node.content = node.contentImage.src;
              DebugManager.addLog(`Setting content from contentImage.src for node ${node.id}`, 'info');
            }
          }
        }
      });

      let waitAttempts = 0;
      const maxWaitAttempts = 3; // Maximum number of additional waits

      // Keep waiting if nodes are still processing, up to a maximum number of attempts
      while (stillProcessing && waitAttempts < maxWaitAttempts) {
        console.log(`Some nodes are still processing, waiting longer... (attempt ${waitAttempts + 1}/${maxWaitAttempts})`);
        // Wait even longer if nodes are still processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Check again
        stillProcessing = App.nodes.some(node => node.processing);
        waitAttempts++;
      }

      // If we've waited the maximum time and nodes are still processing,
      // we'll consider them done anyway to avoid hanging indefinitely
      if (stillProcessing) {
        console.log("Maximum wait time reached, proceeding anyway");
        DebugManager.addLog("Some nodes are still processing, but maximum wait time reached", "warning");
      }

      // Always remove the waiting message before showing results
      try {
        console.log("Removing waiting message:", waitingMessageId);
        // Use a small delay to ensure the message is removed before adding new ones
        await new Promise(resolve => setTimeout(resolve, 100));
        WorkflowPanel.removeMessage(waitingMessageId);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn("Error removing waiting message:", error);
      }

      // Get all nodes connected to the input node
      const connectedNodes = App.getConnectedNodes(this.inputNode);

      // Add the input node to the list and include the output node if it's not already included
      let allNodes = [this.inputNode, ...connectedNodes];
      if (this.outputNode && !allNodes.includes(this.outputNode)) {
        allNodes.push(this.outputNode);
      }

      // Sort nodes by their position in the workflow (if possible)
      allNodes.sort((a, b) => {
        // Try to sort by y position first (top to bottom)
        if (Math.abs(a.y - b.y) > 50) {
          return a.y - b.y;
        }
        // If y positions are similar, sort by x position (left to right)
        return a.x - b.x;
      });

      // Debug all nodes to see their status
      allNodes.forEach(node => {
        DebugManager.addLog(`Node ${node.id} (${node.title}) - processed: ${node.hasBeenProcessed}, has content: ${!!node.content}, content type: ${node.contentType}, aiProcessor: ${node.aiProcessor}`, 'info');
      });

      // Force include Node 2 (the image node) if it exists
      const node2 = App.nodes.find(node => node.id === 2 || node.title === 'Node 2');
      if (node2 && !allNodes.includes(node2)) {
        DebugManager.addLog(`Adding Node 2 (${node2.title}) to the list of nodes to process`, 'warning');
        allNodes.push(node2);
      }

      // Filter out nodes that haven't been processed or don't have content
      // Note: We now include the input node if it has been processed and has content
      const processedNodes = allNodes.filter(node =>
        node && (node.hasBeenProcessed || node.id === 2) && (node.content || node.contentImage)
      );

      console.log(`Found ${processedNodes.length} processed nodes with content`);

      // If we have processed nodes with content
      if (processedNodes.length > 0) {
        if (showAllNodeOutputs) {
          // Show outputs from all processed nodes
          console.log("Showing outputs from all processed nodes");
          for (const node of processedNodes) {
            console.log(`Adding output from node ${node.id} (${node.title})`);

            // Check if this is an image node
            const isImageContent = node.contentType === 'image' ||
                (node.content && typeof node.content === 'string' &&
                 (node.content.startsWith('data:image') ||
                  node.content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)));

            console.log(`Node ${node.id} (${node.title}) content type:`, node.contentType);
            console.log(`Node ${node.id} is image content:`, isImageContent);
            console.log(`Node ${node.id} content preview:`, typeof node.content === 'string' ?
                node.content.substring(0, 100) + "..." : node.content);

            if (isImageContent) {
              // For image nodes, add the title and then the image on a new line
              console.log(`Adding image from node ${node.id} (${node.title}) to chat`);

              // Get the actual image content - if it's an image node, use the contentImage.src if available
              let imageContent = node.content;
              if (node.contentImage && node.contentImage.src) {
                console.log(`Using contentImage.src for node ${node.id}`);
                imageContent = node.contentImage.src;
              }

              // Verify that the image content is valid before adding it to the chat
              if (imageContent && typeof imageContent === 'string' &&
                  (imageContent.startsWith('data:image') ||
                   imageContent.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i))) {

                // First add the title
                WorkflowPanel.addMessage(`**${node.title}**:`, 'assistant');
                // Then add the image as a separate message
                WorkflowPanel.addMessage(imageContent, 'assistant', true); // true = force image rendering
              } else {
                // If image content is invalid, just add the title and a placeholder message
                console.warn(`Invalid image content for node ${node.id}, skipping image display`);
                WorkflowPanel.addMessage(`**${node.title}**: [Image could not be displayed]`, 'assistant');
              }
            } else {
              // For text nodes, add the title and content
              console.log(`Adding text from node ${node.id} (${node.title}) to chat`);
              WorkflowPanel.addMessage(`**${node.title}**: ${node.content}`, 'assistant');
            }
          }
          DebugManager.addLog(`Displayed outputs from ${processedNodes.length} nodes`, 'success');
        } else {
          // Only show output from the output node or the last processed node
          if (this.outputNode && this.outputNode.hasBeenProcessed && this.outputNode.content) {
            // Use the output node's content
            console.log("Using output node content");

            // Check if this is an image node
            const isImageContent = this.outputNode.contentType === 'image' ||
                (this.outputNode.content && typeof this.outputNode.content === 'string' &&
                 (this.outputNode.content.startsWith('data:image') ||
                  this.outputNode.content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)));

            console.log("Output node content type:", this.outputNode.contentType);
            console.log("Is image content:", isImageContent);
            console.log("Output content preview:", typeof this.outputNode.content === 'string' ?
                this.outputNode.content.substring(0, 100) + "..." : this.outputNode.content);

            // For image nodes, just send the image content
            if (isImageContent) {
              console.log("Sending image content to chat");

              // Get the actual image content - if it's an image node, use the contentImage.src if available
              let imageContent = this.outputNode.content;
              if (this.outputNode.contentImage && this.outputNode.contentImage.src) {
                console.log(`Using contentImage.src for output node ${this.outputNode.id}`);
                imageContent = this.outputNode.contentImage.src;
              }

              // Verify that the image content is valid before adding it to the chat
              if (imageContent && typeof imageContent === 'string' &&
                  (imageContent.startsWith('data:image') ||
                   imageContent.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i))) {

                // Force the content to be treated as an image by adding a special marker
                WorkflowPanel.addMessage(imageContent, 'assistant', true); // true = force image rendering
              } else {
                // If image content is invalid, just add a placeholder message
                console.warn(`Invalid image content for output node ${this.outputNode.id}, skipping image display`);
                WorkflowPanel.addMessage(`[Image could not be displayed]`, 'assistant');
              }
            } else {
              // For text nodes, add the content
              console.log("Sending text content to chat");
              WorkflowPanel.addMessage(this.outputNode.content, 'assistant');
            }

            DebugManager.addLog('Message processed successfully', 'success');
          } else {
            // Use the last processed node's content as fallback
            const lastNode = processedNodes[processedNodes.length - 1];
            console.log(`Using content from node ${lastNode.id} (${lastNode.title}) as fallback`);

            // Check if this is an image node
            const isLastNodeImage = lastNode.contentType === 'image' ||
                (lastNode.content && typeof lastNode.content === 'string' &&
                 (lastNode.content.startsWith('data:image') ||
                  lastNode.content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i)));

            console.log(`Last node ${lastNode.id} (${lastNode.title}) content type:`, lastNode.contentType);
            console.log(`Last node is image content:`, isLastNodeImage);

            if (isLastNodeImage) {
              // For image nodes, send the image content with force image flag
              console.log(`Adding image from last node ${lastNode.id} (${lastNode.title}) to chat`);

              // Get the actual image content - if it's an image node, use the contentImage.src if available
              let imageContent = lastNode.content;
              if (lastNode.contentImage && lastNode.contentImage.src) {
                console.log(`Using contentImage.src for last node ${lastNode.id}`);
                imageContent = lastNode.contentImage.src;
              }

              // Verify that the image content is valid before adding it to the chat
              if (imageContent && typeof imageContent === 'string' &&
                  (imageContent.startsWith('data:image') ||
                   imageContent.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i))) {

                WorkflowPanel.addMessage(imageContent, 'assistant', true); // true = force image rendering
              } else {
                // If image content is invalid, just add a placeholder message
                console.warn(`Invalid image content for last node ${lastNode.id}, skipping image display`);
                WorkflowPanel.addMessage(`[Image could not be displayed]`, 'assistant');
              }
            } else {
              // For text nodes, add the content
              console.log(`Adding text from last node ${lastNode.id} (${lastNode.title}) to chat`);
              WorkflowPanel.addMessage(lastNode.content, 'assistant');
            }

            DebugManager.addLog(`Using content from node ${lastNode.id} as response`, 'info');
          }
        }
      } else {
        // Check if any nodes are still processing after our maximum wait time
        // At this point, we'll consider the workflow complete even if nodes report they're still processing
        // This prevents the "still processing" message from persisting indefinitely

        // Force reset processing state on any nodes that might be stuck
        let stuckNodes = 0;
        for (const node of App.nodes) {
          if (node.processing) {
            node.processing = false;
            stuckNodes++;
          }
        }

        if (stuckNodes > 0) {
          DebugManager.addLog(`Reset processing state on ${stuckNodes} nodes that appeared to be stuck`, 'warning');
        }

        // No nodes processed successfully, show error message
        console.log("No output found in any node");
        WorkflowPanel.addMessage('I couldn\'t generate a response. Please try again.', 'assistant');
        DebugManager.addLog('Message processed but no output was generated', 'warning');
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
