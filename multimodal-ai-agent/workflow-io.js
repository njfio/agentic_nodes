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
    // Create the workflow I/O modal
    this.createWorkflowIOModal();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add the workflow I/O button to the toolbar
    this.addWorkflowIOButton();
    
    // Add the node role options to the node editor
    this.addNodeRoleOptions();
  },
  
  // Create the workflow I/O modal
  createWorkflowIOModal() {
    // Create the modal HTML
    const modalHTML = `
      <div id="workflowIOModal" class="modal">
        <div class="modal-content workflow-io-modal">
          <h2>Workflow Interface</h2>
          <div id="workflowIOStatus" class="workflow-io-status">
            <div class="status-item">
              <span class="status-label">Input Node:</span>
              <span id="inputNodeStatus" class="status-value not-set">Not Set</span>
            </div>
            <div class="status-item">
              <span class="status-label">Output Node:</span>
              <span id="outputNodeStatus" class="status-value not-set">Not Set</span>
            </div>
          </div>
          
          <div class="workflow-io-container">
            <div class="workflow-input">
              <h3>Input</h3>
              <textarea id="workflowInput" placeholder="Enter your request here..."></textarea>
              <div class="input-options">
                <div class="checkbox-group">
                  <input type="checkbox" id="clearOutputOnRun" checked>
                  <label for="clearOutputOnRun">Clear output on run</label>
                </div>
              </div>
              <button id="runWorkflowBtn" class="primary-btn" type="button">Run Workflow</button>
            </div>
            
            <div class="workflow-output">
              <h3>Output</h3>
              <div id="workflowOutput" class="output-container">
                <div class="no-output-message">Output will appear here after running the workflow</div>
              </div>
              <div class="output-actions">
                <button id="copyOutputBtn" class="secondary-btn" type="button">Copy Output</button>
                <button id="clearOutputBtn" class="secondary-btn" type="button">Clear Output</button>
              </div>
            </div>
          </div>
          
          <div class="workflow-io-help">
            <h3>How to Use</h3>
            <ol>
              <li>Designate one node as the "Input Node" and another as the "Output Node" in the node editor</li>
              <li>Enter your request in the input field</li>
              <li>Click "Run Workflow" to process your request</li>
              <li>View the result in the output area</li>
            </ol>
          </div>
          
          <div class="button-group">
            <button id="closeWorkflowIO" class="secondary-btn" type="button">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Close button
    document.getElementById('closeWorkflowIO').addEventListener('click', () => {
      this.closeWorkflowIO();
    });
    
    // Run workflow button
    document.getElementById('runWorkflowBtn').addEventListener('click', () => {
      this.runWorkflow();
    });
    
    // Copy output button
    document.getElementById('copyOutputBtn').addEventListener('click', () => {
      this.copyOutput();
    });
    
    // Clear output button
    document.getElementById('clearOutputBtn').addEventListener('click', () => {
      this.clearOutput();
    });
    
    // Input field enter key
    document.getElementById('workflowInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        this.runWorkflow();
      }
    });
  },
  
  // Add the workflow I/O button to the toolbar
  addWorkflowIOButton() {
    // Create the button
    const workflowIOBtn = document.createElement('button');
    workflowIOBtn.id = 'workflowIOBtn';
    workflowIOBtn.type = 'button';
    workflowIOBtn.textContent = 'Workflow Interface';
    
    // Add click event listener
    workflowIOBtn.addEventListener('click', () => {
      this.openWorkflowIO();
    });
    
    // Add the button to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      // Insert after the document view button
      const documentViewBtn = document.getElementById('documentViewBtn');
      if (documentViewBtn) {
        toolbar.insertBefore(workflowIOBtn, documentViewBtn.nextSibling);
      } else {
        toolbar.appendChild(workflowIOBtn);
      }
    }
  },
  
  // Add the node role options to the node editor
  addNodeRoleOptions() {
    // Find the form group in the node editor
    const formGroups = document.querySelectorAll('#nodeEditorForm .form-group');
    
    if (formGroups.length > 0) {
      // Create a new form group for node roles
      const nodeRoleGroup = document.createElement('div');
      nodeRoleGroup.className = 'form-group';
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
  
  // Open the workflow I/O modal
  openWorkflowIO() {
    // Update the status
    this.updateStatus();
    
    // Show the modal
    ModalManager.openModal('workflowIOModal');
  },
  
  // Close the workflow I/O modal
  closeWorkflowIO() {
    // Hide the modal
    ModalManager.closeModal('workflowIOModal');
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
      
      // Get the output from the output node
      const output = this.outputNode.content;
      
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
        workflowOutput.innerHTML = '<div class="no-output-message">No output was generated</div>';
        DebugManager.addLog('Workflow completed but no output was generated', 'warning');
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

// Initialize the workflow I/O interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    WorkflowIO.init();
  }, 100);
});
