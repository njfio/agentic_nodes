// Modal Testing Utility
const ModalTest = {
  // List of all modals in the application
  modals: ['nodeEditor', 'configModal', 'saveLoadModal', 'helpModal'],
  
  // Current modal being tested
  currentModal: null,
  
  // Original modal state before testing
  originalState: {},
  
  // Initialize the modal testing utility
  init() {
    // Create test UI
    this.createTestUI();
    
    // Add event listeners
    this.addEventListeners();
    
    console.log('Modal Testing Utility initialized');
  },
  
  // Create the testing UI
  createTestUI() {
    // Create the test panel
    const testPanel = document.createElement('div');
    testPanel.id = 'modalTestPanel';
    testPanel.className = 'modal-test-panel';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Modal Testing';
    testPanel.appendChild(header);
    
    // Create modal selector
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = 'Select Modal:';
    label.setAttribute('for', 'modalSelector');
    selectorDiv.appendChild(label);
    
    const select = document.createElement('select');
    select.id = 'modalSelector';
    
    // Add options for each modal
    this.modals.forEach(modalId => {
      const option = document.createElement('option');
      option.value = modalId;
      option.textContent = this.formatModalName(modalId);
      select.appendChild(option);
    });
    
    selectorDiv.appendChild(select);
    testPanel.appendChild(selectorDiv);
    
    // Create buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    const openBtn = document.createElement('button');
    openBtn.id = 'openModalBtn';
    openBtn.className = 'primary-btn';
    openBtn.textContent = 'Open Modal';
    buttonGroup.appendChild(openBtn);
    
    const saveStateBtn = document.createElement('button');
    saveStateBtn.id = 'saveModalStateBtn';
    saveStateBtn.className = 'secondary-btn';
    saveStateBtn.textContent = 'Save State';
    buttonGroup.appendChild(saveStateBtn);
    
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetModalBtn';
    resetBtn.className = 'secondary-btn';
    resetBtn.textContent = 'Reset';
    buttonGroup.appendChild(resetBtn);
    
    testPanel.appendChild(buttonGroup);
    
    // Create workflow test section
    const workflowSection = document.createElement('div');
    workflowSection.className = 'workflow-test-section';
    
    const workflowHeader = document.createElement('h3');
    workflowHeader.textContent = 'Workflow Testing';
    workflowSection.appendChild(workflowHeader);
    
    const workflowBtn = document.createElement('button');
    workflowBtn.id = 'testWorkflowBtn';
    workflowBtn.className = 'primary-btn';
    workflowBtn.textContent = 'Test Complete Workflow';
    workflowSection.appendChild(workflowBtn);
    
    testPanel.appendChild(workflowSection);
    
    // Add to document
    document.body.appendChild(testPanel);
    
    // Add styles
    this.addStyles();
  },
  
  // Add event listeners to the test UI
  addEventListeners() {
    // Open modal button
    document.getElementById('openModalBtn').addEventListener('click', () => {
      const modalId = document.getElementById('modalSelector').value;
      this.openModal(modalId);
    });
    
    // Save state button
    document.getElementById('saveModalStateBtn').addEventListener('click', () => {
      this.saveModalState();
    });
    
    // Reset button
    document.getElementById('resetModalBtn').addEventListener('click', () => {
      this.resetModal();
    });
    
    // Test workflow button
    document.getElementById('testWorkflowBtn').addEventListener('click', () => {
      this.testWorkflow();
    });
  },
  
  // Add styles for the test panel
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .modal-test-panel {
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: #2e2e2e;
        padding: 15px;
        border-radius: 8px;
        z-index: 1000;
        width: 250px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      
      .modal-test-panel h3 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #eee;
      }
      
      .modal-test-panel .form-group {
        margin-bottom: 15px;
      }
      
      .modal-test-panel label {
        display: block;
        margin-bottom: 5px;
        color: #eee;
      }
      
      .modal-test-panel select {
        width: 100%;
        padding: 5px;
        background-color: #1e1e1e;
        color: #eee;
        border: 1px solid #444;
        border-radius: 4px;
      }
      
      .modal-test-panel .button-group {
        display: flex;
        gap: 5px;
        margin-bottom: 15px;
      }
      
      .modal-test-panel button {
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .modal-test-panel .primary-btn {
        background-color: #4CAF50;
        color: white;
      }
      
      .modal-test-panel .secondary-btn {
        background-color: #555;
        color: white;
      }
      
      .workflow-test-section {
        border-top: 1px solid #444;
        padding-top: 10px;
      }
    `;
    document.head.appendChild(style);
  },
  
  // Format modal ID to a readable name
  formatModalName(modalId) {
    return modalId
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  },
  
  // Open a modal for testing
  openModal(modalId) {
    // Save the current modal
    this.currentModal = modalId;
    
    // Save original state before opening
    this.saveOriginalState(modalId);
    
    // Open the modal
    if (typeof ModalManager !== 'undefined') {
      ModalManager.openModal(modalId);
    } else {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'block';
      }
    }
    
    // Make modal content editable
    this.makeModalEditable(modalId);
    
    console.log(`Opened modal: ${modalId} for testing`);
  },
  
  // Save the original state of the modal
  saveOriginalState(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      this.originalState[modalId] = {
        html: modal.innerHTML,
        inputs: this.getModalInputValues(modalId)
      };
    }
  },
  
  // Get all input values from a modal
  getModalInputValues(modalId) {
    const modal = document.getElementById(modalId);
    const inputs = {};
    
    if (modal) {
      // Get all input elements
      const inputElements = modal.querySelectorAll('input, textarea, select');
      
      // Save their values
      inputElements.forEach(input => {
        if (input.id) {
          inputs[input.id] = input.value;
        }
      });
    }
    
    return inputs;
  },
  
  // Make modal content editable
  makeModalEditable(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      // Find all input elements
      const inputElements = modal.querySelectorAll('input, textarea, select');
      
      // Make sure they're editable
      inputElements.forEach(input => {
        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
      });
      
      // Add a save button if it doesn't exist
      if (!modal.querySelector('.modal-test-save')) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'modal-test-save primary-btn';
        saveBtn.textContent = 'Save Changes';
        saveBtn.style.marginTop = '10px';
        
        saveBtn.addEventListener('click', () => {
          this.saveModalChanges(modalId);
        });
        
        // Find the button group or create one
        let buttonGroup = modal.querySelector('.button-group');
        if (!buttonGroup) {
          buttonGroup = document.createElement('div');
          buttonGroup.className = 'button-group';
          modal.querySelector('.modal-content').appendChild(buttonGroup);
        }
        
        buttonGroup.appendChild(saveBtn);
      }
    }
  },
  
  // Save changes made to the modal
  saveModalChanges(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      // Get all input elements
      const inputElements = modal.querySelectorAll('input, textarea, select');
      
      // Create an object to store the values
      const values = {};
      
      // Save their values
      inputElements.forEach(input => {
        if (input.id) {
          values[input.id] = input.value;
        }
      });
      
      // Save to localStorage for persistence
      localStorage.setItem(`modal_test_${modalId}`, JSON.stringify(values));
      
      console.log(`Saved changes for modal: ${modalId}`);
      
      // Show a success message
      this.showNotification('Changes saved successfully');
    }
  },
  
  // Save the current state of the modal
  saveModalState() {
    if (this.currentModal) {
      this.saveModalChanges(this.currentModal);
    } else {
      console.log('No modal is currently open for testing');
    }
  },
  
  // Reset the modal to its original state
  resetModal() {
    if (this.currentModal && this.originalState[this.currentModal]) {
      const modal = document.getElementById(this.currentModal);
      if (modal) {
        // Restore HTML
        modal.innerHTML = this.originalState[this.currentModal].html;
        
        // Restore input values
        const inputs = this.originalState[this.currentModal].inputs;
        for (const id in inputs) {
          const input = document.getElementById(id);
          if (input) {
            input.value = inputs[id];
          }
        }
        
        console.log(`Reset modal: ${this.currentModal} to original state`);
        
        // Show a success message
        this.showNotification('Modal reset to original state');
        
        // Make it editable again
        this.makeModalEditable(this.currentModal);
      }
    } else {
      console.log('No original state found for the current modal');
    }
  },
  
  // Test the complete workflow
  testWorkflow() {
    console.log('Starting workflow test...');
    
    // Define the workflow steps
    const workflowSteps = [
      { action: 'openModal', modalId: 'configModal', description: 'Opening Config Modal' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'apiKey', value: 'test-api-key', description: 'Filling API Key' },
      { action: 'fillInput', inputId: 'model', value: 'gpt-3.5-turbo', description: 'Selecting Model' },
      { action: 'clickButton', buttonId: 'saveConfig', description: 'Saving Config' },
      { action: 'wait', time: 1000, description: 'Waiting for config to save' },
      { action: 'openModal', modalId: 'nodeEditor', description: 'Opening Node Editor' },
      { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
      { action: 'fillInput', inputId: 'nodeTitle', value: 'Test Node', description: 'Setting Node Title' },
      { action: 'fillInput', inputId: 'nodeContent', value: 'Test Content', description: 'Adding Content' },
      { action: 'clickButton', buttonId: 'saveNode', description: 'Saving Node' },
      { action: 'wait', time: 1000, description: 'Waiting for node to save' },
      { action: 'complete', description: 'Workflow test completed' }
    ];
    
    // Execute the workflow
    this.executeWorkflow(workflowSteps);
  },
  
  // Execute a workflow step by step
  executeWorkflow(steps, index = 0) {
    if (index >= steps.length) {
      console.log('Workflow completed successfully');
      this.showNotification('Workflow test completed successfully');
      return;
    }
    
    const step = steps[index];
    console.log(`Executing step ${index + 1}/${steps.length}: ${step.description}`);
    
    // Show progress
    this.showNotification(`Step ${index + 1}/${steps.length}: ${step.description}`);
    
    // Execute the step
    switch (step.action) {
      case 'openModal':
        this.openModal(step.modalId);
        break;
        
      case 'wait':
        // Do nothing, just wait
        break;
        
      case 'fillInput':
        const input = document.getElementById(step.inputId);
        if (input) {
          input.value = step.value;
        }
        break;
        
      case 'clickButton':
        const button = document.getElementById(step.buttonId);
        if (button) {
          button.click();
        }
        break;
        
      case 'complete':
        // Final step
        break;
    }
    
    // Move to the next step after a delay
    setTimeout(() => {
      this.executeWorkflow(steps, index + 1);
    }, step.time || 500);
  },
  
  // Show a notification
  showNotification(message) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('modalTestNotification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'modalTestNotification';
      notification.className = 'modal-test-notification';
      document.body.appendChild(notification);
      
      // Add style
      const style = document.createElement('style');
      style.textContent = `
        .modal-test-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
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
  // Initialize the modal test utility
  ModalTest.init();
});
