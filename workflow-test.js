// Workflow Testing Utility
const WorkflowTest = {
  // Current workflow being tested
  currentWorkflow: null,
  
  // List of available workflows
  workflows: {
    'basic': [
      { action: 'openModal', modalId: 'configModal', description: 'Opening Config Modal' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'apiKey', value: 'test-api-key', description: 'Filling API Key' },
      { action: 'fillInput', inputId: 'model', value: 'gpt-3.5-turbo', description: 'Selecting Model' },
      { action: 'clickButton', buttonId: 'saveConfig', description: 'Saving Config' },
      { action: 'wait', time: 1000, description: 'Waiting for config to save' },
      { action: 'addNode', description: 'Adding a new node' },
      { action: 'wait', time: 500, description: 'Waiting for node to be created' },
      { action: 'openNodeEditor', description: 'Opening Node Editor' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'nodeTitle', value: 'Test Node', description: 'Setting Node Title' },
      { action: 'fillInput', inputId: 'nodeContent', value: 'Test Content', description: 'Adding Content' },
      { action: 'clickButton', buttonId: 'saveNode', description: 'Saving Node' },
      { action: 'wait', time: 1000, description: 'Waiting for node to save' },
      { action: 'complete', description: 'Workflow test completed' }
    ],
    'advanced': [
      { action: 'openModal', modalId: 'configModal', description: 'Opening Config Modal' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'apiKey', value: 'test-api-key', description: 'Filling API Key' },
      { action: 'fillInput', inputId: 'model', value: 'gpt-3.5-turbo', description: 'Selecting Model' },
      { action: 'clickButton', buttonId: 'saveConfig', description: 'Saving Config' },
      { action: 'wait', time: 1000, description: 'Waiting for config to save' },
      { action: 'addNode', description: 'Adding first node' },
      { action: 'wait', time: 500, description: 'Waiting for node to be created' },
      { action: 'openNodeEditor', description: 'Opening Node Editor' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'nodeTitle', value: 'Input Node', description: 'Setting Node Title' },
      { action: 'fillInput', inputId: 'nodeContent', value: 'This is the input content', description: 'Adding Content' },
      { action: 'clickButton', buttonId: 'saveNode', description: 'Saving Node' },
      { action: 'wait', time: 1000, description: 'Waiting for node to save' },
      { action: 'addNode', description: 'Adding second node' },
      { action: 'wait', time: 500, description: 'Waiting for node to be created' },
      { action: 'openNodeEditor', nodeIndex: 1, description: 'Opening Node Editor for second node' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'nodeTitle', value: 'Output Node', description: 'Setting Node Title' },
      { action: 'clickButton', buttonId: 'saveNode', description: 'Saving Node' },
      { action: 'wait', time: 1000, description: 'Waiting for node to save' },
      { action: 'connectNodes', fromIndex: 0, toIndex: 1, description: 'Connecting nodes' },
      { action: 'wait', time: 1000, description: 'Waiting for connection to be made' },
      { action: 'complete', description: 'Workflow test completed' }
    ]
  },
  
  // Initialize the workflow testing utility
  init() {
    // Create test UI
    this.createTestUI();
    
    // Add event listeners
    this.addEventListeners();
    
    console.log('Workflow Testing Utility initialized');
  },
  
  // Create the testing UI
  createTestUI() {
    // Create the test panel
    const testPanel = document.createElement('div');
    testPanel.id = 'workflowTestPanel';
    testPanel.className = 'workflow-test-panel';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Workflow Testing';
    testPanel.appendChild(header);
    
    // Create workflow selector
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = 'Select Workflow:';
    label.setAttribute('for', 'workflowSelector');
    selectorDiv.appendChild(label);
    
    const select = document.createElement('select');
    select.id = 'workflowSelector';
    
    // Add options for each workflow
    for (const [key, _workflow] of Object.entries(this.workflows)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = this.formatWorkflowName(key);
      select.appendChild(option);
    }
    
    selectorDiv.appendChild(select);
    testPanel.appendChild(selectorDiv);
    
    // Create buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    const runBtn = document.createElement('button');
    runBtn.id = 'runWorkflowBtn';
    runBtn.className = 'primary-btn';
    runBtn.textContent = 'Run Workflow';
    buttonGroup.appendChild(runBtn);
    
    const stopBtn = document.createElement('button');
    stopBtn.id = 'stopWorkflowBtn';
    stopBtn.className = 'secondary-btn';
    stopBtn.textContent = 'Stop';
    stopBtn.disabled = true;
    buttonGroup.appendChild(stopBtn);
    
    testPanel.appendChild(buttonGroup);
    
    // Create progress section
    const progressSection = document.createElement('div');
    progressSection.className = 'workflow-progress-section';
    
    const progressHeader = document.createElement('h4');
    progressHeader.textContent = 'Progress';
    progressSection.appendChild(progressHeader);
    
    const progressBar = document.createElement('div');
    progressBar.id = 'workflowProgress';
    progressBar.className = 'workflow-progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.id = 'workflowProgressFill';
    progressFill.className = 'workflow-progress-fill';
    progressFill.style.width = '0%';
    
    progressBar.appendChild(progressFill);
    progressSection.appendChild(progressBar);
    
    const progressText = document.createElement('div');
    progressText.id = 'workflowProgressText';
    progressText.className = 'workflow-progress-text';
    progressText.textContent = 'Not running';
    
    progressSection.appendChild(progressText);
    testPanel.appendChild(progressSection);
    
    // Add to document
    document.body.appendChild(testPanel);
    
    // Add styles
    this.addStyles();
  },
  
  // Add event listeners to the test UI
  addEventListeners() {
    // Run workflow button
    document.getElementById('runWorkflowBtn').addEventListener('click', () => {
      const workflowId = document.getElementById('workflowSelector').value;
      this.runWorkflow(workflowId);
    });
    
    // Stop workflow button
    document.getElementById('stopWorkflowBtn').addEventListener('click', () => {
      this.stopWorkflow();
    });
  },
  
  // Add styles for the test panel
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .workflow-test-panel {
        position: fixed;
        bottom: 10px;
        right: 10px;
        background-color: #2e2e2e;
        padding: 15px;
        border-radius: 8px;
        z-index: 1000;
        width: 250px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      
      .workflow-test-panel h3 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #eee;
      }
      
      .workflow-test-panel h4 {
        margin-top: 15px;
        margin-bottom: 5px;
        color: #ccc;
      }
      
      .workflow-test-panel .form-group {
        margin-bottom: 15px;
      }
      
      .workflow-test-panel label {
        display: block;
        margin-bottom: 5px;
        color: #eee;
      }
      
      .workflow-test-panel select {
        width: 100%;
        padding: 5px;
        background-color: #1e1e1e;
        color: #eee;
        border: 1px solid #444;
        border-radius: 4px;
      }
      
      .workflow-test-panel .button-group {
        display: flex;
        gap: 5px;
        margin-bottom: 15px;
      }
      
      .workflow-test-panel button {
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .workflow-test-panel .primary-btn {
        background-color: #4CAF50;
        color: white;
      }
      
      .workflow-test-panel .secondary-btn {
        background-color: #555;
        color: white;
      }
      
      .workflow-test-panel button:disabled {
        background-color: #333;
        color: #777;
        cursor: not-allowed;
      }
      
      .workflow-progress-section {
        border-top: 1px solid #444;
        padding-top: 10px;
      }
      
      .workflow-progress-bar {
        width: 100%;
        height: 10px;
        background-color: #1e1e1e;
        border-radius: 5px;
        margin-bottom: 10px;
        overflow: hidden;
      }
      
      .workflow-progress-fill {
        height: 100%;
        background-color: #4CAF50;
        width: 0%;
        transition: width 0.3s;
      }
      
      .workflow-progress-text {
        font-size: 12px;
        color: #ccc;
      }
      
      .workflow-notification {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.3s;
      }
    `;
    document.head.appendChild(style);
  },
  
  // Format workflow ID to a readable name
  formatWorkflowName(workflowId) {
    return workflowId
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/-/g, ' '); // Replace hyphens with spaces
  },
  
  // Run a workflow
  runWorkflow(workflowId) {
    if (this.currentWorkflow) {
      this.showNotification('A workflow is already running');
      return;
    }
    
    const workflow = this.workflows[workflowId];
    if (!workflow) {
      this.showNotification('Workflow not found');
      return;
    }
    
    // Update UI
    document.getElementById('runWorkflowBtn').disabled = true;
    document.getElementById('stopWorkflowBtn').disabled = false;
    document.getElementById('workflowProgressText').textContent = 'Starting...';
    document.getElementById('workflowProgressFill').style.width = '0%';
    
    // Set current workflow
    this.currentWorkflow = {
      id: workflowId,
      steps: workflow,
      currentStep: 0,
      totalSteps: workflow.length,
      running: true
    };
    
    // Start executing the workflow
    this.executeWorkflowStep();
  },
  
  // Stop the current workflow
  stopWorkflow() {
    if (!this.currentWorkflow) return;
    
    this.currentWorkflow.running = false;
    
    // Update UI
    document.getElementById('runWorkflowBtn').disabled = false;
    document.getElementById('stopWorkflowBtn').disabled = true;
    document.getElementById('workflowProgressText').textContent = 'Stopped';
    
    this.showNotification('Workflow stopped');
    
    this.currentWorkflow = null;
  },
  
  // Execute a single step in the workflow
  executeWorkflowStep() {
    if (!this.currentWorkflow || !this.currentWorkflow.running) return;
    
    const { steps, currentStep, totalSteps } = this.currentWorkflow;
    
    if (currentStep >= totalSteps) {
      this.completeWorkflow();
      return;
    }
    
    const step = steps[currentStep];
    const progress = Math.round((currentStep / totalSteps) * 100);
    
    // Update progress
    document.getElementById('workflowProgressFill').style.width = `${progress}%`;
    document.getElementById('workflowProgressText').textContent = step.description;
    
    // Execute the step
    this.executeStep(step)
      .then(() => {
        // Move to the next step
        this.currentWorkflow.currentStep++;
        
        // Schedule the next step
        setTimeout(() => {
          this.executeWorkflowStep();
        }, step.time || 500);
      })
      .catch(error => {
        console.error('Error executing workflow step:', error);
        this.showNotification(`Error: ${error.message}`);
        this.stopWorkflow();
      });
  },
  
  // Execute a specific step
  async executeStep(step) {
    console.log(`Executing step: ${step.description}`);
    
    switch (step.action) {
      case 'openModal':
        if (typeof ModalManager !== 'undefined') {
          ModalManager.openModal(step.modalId);
        } else {
          const modal = document.getElementById(step.modalId);
          if (modal) {
            modal.style.display = 'block';
          } else {
            throw new Error(`Modal not found: ${step.modalId}`);
          }
        }
        break;
        
      case 'wait':
        // Do nothing, just wait
        break;
        
      case 'fillInput': {
        const input = document.getElementById(step.inputId);
        if (input) {
          input.value = step.value;
          
          // Trigger change event for select elements
          if (input.tagName === 'SELECT') {
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
          }
        } else {
          throw new Error(`Input not found: ${step.inputId}`);
        }
        break;
      }
        
      case 'clickButton': {
        const button = document.getElementById(step.buttonId);
        if (button) {
          button.click();
        } else {
          throw new Error(`Button not found: ${step.buttonId}`);
        }
        break;
      }
        
      case 'addNode':
        if (typeof App !== 'undefined') {
          App.addNode();
        } else {
          throw new Error('App not found');
        }
        break;
        
      case 'openNodeEditor':
        if (typeof App !== 'undefined') {
          const nodeIndex = step.nodeIndex || 0;
          if (App.nodes[nodeIndex]) {
            App.openNodeEditor(App.nodes[nodeIndex]);
          } else {
            throw new Error(`Node not found at index: ${nodeIndex}`);
          }
        } else {
          throw new Error('App not found');
        }
        break;
        
      case 'connectNodes':
        if (typeof App !== 'undefined') {
          const fromNode = App.nodes[step.fromIndex];
          const toNode = App.nodes[step.toIndex];
          
          if (fromNode && toNode) {
            App.connections.push(new Connection(fromNode, toNode));
            App.draw();
          } else {
            throw new Error('Nodes not found for connection');
          }
        } else {
          throw new Error('App not found');
        }
        break;
        
      case 'complete':
        // Final step
        break;
        
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  },
  
  // Complete the workflow
  completeWorkflow() {
    if (!this.currentWorkflow) return;
    
    // Update UI
    document.getElementById('runWorkflowBtn').disabled = false;
    document.getElementById('stopWorkflowBtn').disabled = true;
    document.getElementById('workflowProgressFill').style.width = '100%';
    document.getElementById('workflowProgressText').textContent = 'Completed';
    
    this.showNotification('Workflow completed successfully');
    
    this.currentWorkflow = null;
  },
  
  // Show a notification
  showNotification(message) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('workflowNotification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'workflowNotification';
      notification.className = 'workflow-notification';
      document.body.appendChild(notification);
    }
    
    // Set message and show
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 3000);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the workflow test utility
  setTimeout(() => {
    WorkflowTest.init();
  }, 1000); // Delay to ensure App is initialized
});
