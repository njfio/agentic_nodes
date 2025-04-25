// Modal Edit Functionality
document.addEventListener('DOMContentLoaded', function() {
  // Add double-click handlers to all modals
  setupModalEditability();

  // Add test button to toolbar
  addTestButton();
});

// Add test button to toolbar
function addTestButton() {
  const toolbar = document.getElementById('toolbar');
  if (toolbar) {
    const testBtn = document.createElement('button');
    testBtn.id = 'testModalsBtn';
    testBtn.type = 'button';
    testBtn.textContent = 'Test Modals';
    testBtn.title = 'Test modals and workflows';

    testBtn.addEventListener('click', showModalTester);

    toolbar.appendChild(testBtn);
  }
}

// Setup modal editability
function setupModalEditability() {
  // Get all modals
  const modals = document.querySelectorAll('.modal');

  // Add double-click event listener to each modal
  modals.forEach(modal => {
    // Add the event listener to the modal content
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      // Add double-click event
      modalContent.addEventListener('dblclick', function(event) {
        // Don't trigger if clicking on inputs or buttons
        if (event.target.tagName === 'INPUT' ||
            event.target.tagName === 'TEXTAREA' ||
            event.target.tagName === 'SELECT' ||
            event.target.tagName === 'BUTTON') {
          return;
        }

        // Make the modal editable
        makeModalEditable(modal);
      });
    }
  });
}

// Make a modal editable
function makeModalEditable(modal) {
  // Add editable class
  modal.classList.add('editable-modal');

  // Add edit mode indicator
  if (!modal.querySelector('.edit-indicator')) {
    const indicator = document.createElement('div');
    indicator.className = 'edit-indicator';
    indicator.textContent = 'EDIT MODE';
    indicator.style.position = 'absolute';
    indicator.style.top = '5px';
    indicator.style.right = '10px';
    indicator.style.backgroundColor = '#4CAF50';
    indicator.style.color = 'white';
    indicator.style.padding = '3px 8px';
    indicator.style.borderRadius = '4px';
    indicator.style.fontSize = '12px';
    indicator.style.fontWeight = 'bold';

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.position = 'relative';
      modalContent.appendChild(indicator);
    }
  }

  // Make all inputs editable
  const inputs = modal.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');
    input.style.border = '1px solid #4CAF50';
  });

  // Add save button if it doesn't exist
  const buttonGroup = modal.querySelector('.button-group');
  if (buttonGroup && !modal.querySelector('.save-edits-btn')) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'primary-btn save-edits-btn';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save Edits';
    saveBtn.style.backgroundColor = '#4CAF50';

    saveBtn.addEventListener('click', function() {
      alert(`Changes saved for ${modal.id}`);
    });

    buttonGroup.prepend(saveBtn);
  }
}

// Show modal tester dialog
function showModalTester() {
  // Create a simple dialog
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.id = 'modalTesterDialog';
  dialog.style.display = 'block';
  dialog.style.zIndex = '1000';

  const content = document.createElement('div');
  content.className = 'modal-content';

  const header = document.createElement('h2');
  header.textContent = 'Modal Tester';
  content.appendChild(header);

  // Create modal selection section
  const modalSection = document.createElement('div');
  modalSection.style.backgroundColor = '#1e1e1e';
  modalSection.style.padding = '15px';
  modalSection.style.borderRadius = '8px';
  modalSection.style.marginBottom = '15px';

  const modalHeader = document.createElement('h3');
  modalHeader.textContent = 'Test Individual Modals';
  modalSection.appendChild(modalHeader);

  // Get all modals
  const modals = document.querySelectorAll('.modal');

  // Create buttons for each modal
  modals.forEach(modal => {
    if (modal.id !== 'modalTesterDialog') { // Don't include this dialog
      const modalButton = document.createElement('button');
      modalButton.className = 'primary-btn';
      modalButton.type = 'button';
      modalButton.textContent = formatModalName(modal.id);
      modalButton.style.margin = '5px';

      modalButton.addEventListener('click', function() {
        // Close this dialog
        document.body.removeChild(dialog);

        // Open the selected modal
        openModal(modal.id);

        // Make it editable
        makeModalEditable(modal);
      });

      modalSection.appendChild(modalButton);
    }
  });

  content.appendChild(modalSection);

  // Create workflow testing section
  const workflowSection = document.createElement('div');
  workflowSection.style.backgroundColor = '#1e1e1e';
  workflowSection.style.padding = '15px';
  workflowSection.style.borderRadius = '8px';
  workflowSection.style.marginTop = '20px';

  const workflowHeader = document.createElement('h3');
  workflowHeader.textContent = 'Test Complete Workflow';
  workflowSection.appendChild(workflowHeader);

  const workflowButton = document.createElement('button');
  workflowButton.className = 'primary-btn';
  workflowButton.type = 'button';
  workflowButton.textContent = 'Run Test Workflow';
  workflowButton.style.margin = '5px';

  workflowButton.addEventListener('click', function() {
    // Close this dialog
    document.body.removeChild(dialog);

    // Run the test workflow
    testWorkflow();
  });

  workflowSection.appendChild(workflowButton);
  content.appendChild(workflowSection);

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'secondary-btn';
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.style.marginTop = '20px';

  closeButton.addEventListener('click', function() {
    document.body.removeChild(dialog);
  });

  content.appendChild(closeButton);
  dialog.appendChild(content);

  // Add to document
  document.body.appendChild(dialog);
}

// Format modal ID to a readable name
function formatModalName(modalId) {
  return modalId
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
}

// Open a modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
  }
}

// Test the complete workflow
function testWorkflow() {
  alert('Testing workflow...');

  // Define the workflow steps
  const steps = [
    { action: 'openModal', modalId: 'configModal', description: 'Opening Config Modal' },
    { action: 'wait', time: 1000, description: 'Waiting for modal to open' },
    { action: 'fillInput', inputId: 'apiKey', value: 'test-api-key', description: 'Filling API Key' },
    { action: 'fillInput', inputId: 'model', value: 'gpt-4o', description: 'Selecting Model' },
    { action: 'clickButton', buttonId: 'saveConfig', description: 'Saving Config' },
    { action: 'wait', time: 1000, description: 'Waiting for config to save' },
    { action: 'complete', description: 'Workflow test completed' }
  ];

  // Execute the workflow
  executeWorkflow(steps);
}

// Execute a workflow step by step
function executeWorkflow(steps, index = 0) {
  if (index >= steps.length) {
    alert('Workflow completed successfully');
    return;
  }

  const step = steps[index];
  console.log(`Executing step ${index + 1}/${steps.length}: ${step.description}`);

  // Execute the step
  try {
    switch (step.action) {
      case 'openModal':
        openModal(step.modalId);
        break;

      case 'wait':
        // Do nothing, just wait
        break;

      case 'fillInput':
        const input = document.getElementById(step.inputId);
        if (input) {
          input.value = step.value;

          // Trigger change event for select elements
          if (input.tagName === 'SELECT') {
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
          }
        } else {
          console.error(`Input not found: ${step.inputId}`);
        }
        break;

      case 'clickButton':
        const button = document.getElementById(step.buttonId);
        if (button) {
          button.click();
        } else {
          console.error(`Button not found: ${step.buttonId}`);
        }
        break;

      case 'complete':
        // Final step
        break;

      default:
        console.error(`Unknown action: ${step.action}`);
    }

    // Move to the next step after a delay
    setTimeout(function() {
      executeWorkflow(steps, index + 1);
    }, step.time || 500);
  } catch (error) {
    console.error('Error executing workflow step:', error);
    alert(`Error: ${error.message}`);
  }
}
