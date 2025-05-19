/**
 * Keyboard Shortcut Configuration
 * Allows users to customize keyboard shortcuts for the application
 */
class KeyboardConfig {
  constructor() {
    this.defaultShortcuts = {
      addNode: { key: 'n', description: 'Add new node' },
      addChatNode: { key: 'c', description: 'Add chat node' },
      copyNode: { key: 'x', description: 'Copy selected node' },
      pasteNode: { key: 'v', description: 'Paste node' },
      editNode: { key: 'e', description: 'Edit selected node' },
      deleteNode: { key: 'Delete', description: 'Delete selected node' },
      cancelConnection: { key: 'Escape', description: 'Cancel connection/Close modal' },
      saveCanvas: { key: 'ctrl+s', description: 'Save canvas' },
      loadCanvas: { key: 'ctrl+o', description: 'Load canvas' },
      zoomIn: { key: '+', description: 'Zoom in' },
      zoomOut: { key: '-', description: 'Zoom out' },
      resetZoom: { key: '0', description: 'Reset zoom' },
      showHelp: { key: 'h', description: 'Show/hide help' },
      moveNodeUp: { key: 'ArrowUp', description: 'Move selected node up' },
      moveNodeDown: { key: 'ArrowDown', description: 'Move selected node down' },
      moveNodeLeft: { key: 'ArrowLeft', description: 'Move selected node left' },
      moveNodeRight: { key: 'ArrowRight', description: 'Move selected node right' },
      undo: { key: 'ctrl+z', description: 'Undo last action' },
      redo: { key: 'ctrl+y', description: 'Redo last action' },
      selectAll: { key: 'ctrl+a', description: 'Select all nodes' },
      groupNodes: { key: 'ctrl+g', description: 'Group selected nodes' },
      ungroupNodes: { key: 'ctrl+u', description: 'Ungroup selected nodes' },
      togglePanel: { key: 'p', description: 'Toggle workflow panel' },
      runWorkflow: { key: 'ctrl+r', description: 'Run workflow' },
      saveWorkflow: { key: 'ctrl+shift+s', description: 'Save workflow' },
      newWorkflow: { key: 'ctrl+n', description: 'New workflow' },
      toggleFullscreen: { key: 'f', description: 'Toggle fullscreen' }
    };
    
    this.shortcuts = this.loadShortcuts();
    this.configModal = null;
    this.init();
  }

  init() {
    // Create the configuration modal
    this.createConfigModal();
    
    // Add keyboard shortcut config button to the help modal
    this.addConfigButton();
    
    // Update the help modal with current shortcuts
    this.updateHelpModal();
  }

  loadShortcuts() {
    // Load shortcuts from localStorage or use defaults
    const savedShortcuts = localStorage.getItem('keyboardShortcuts');
    return savedShortcuts ? JSON.parse(savedShortcuts) : { ...this.defaultShortcuts };
  }

  saveShortcuts() {
    // Save shortcuts to localStorage
    localStorage.setItem('keyboardShortcuts', JSON.stringify(this.shortcuts));
    
    // Update the help modal with new shortcuts
    this.updateHelpModal();
    
    // Dispatch event for other components to update
    window.dispatchEvent(new CustomEvent('shortcutsUpdated', { 
      detail: { shortcuts: this.shortcuts } 
    }));
  }

  createConfigModal() {
    // Create the modal element
    this.configModal = document.createElement('div');
    this.configModal.id = 'keyboardConfigModal';
    this.configModal.className = 'modal';
    
    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Keyboard Shortcut Configuration';
    modalContent.appendChild(header);
    
    // Add description
    const description = document.createElement('p');
    description.textContent = 'Customize keyboard shortcuts for the application. Click on a shortcut to edit it.';
    modalContent.appendChild(description);
    
    // Create shortcuts table
    const table = document.createElement('table');
    table.className = 'shortcuts-table';
    
    // Add table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const actionHeader = document.createElement('th');
    actionHeader.textContent = 'Action';
    headerRow.appendChild(actionHeader);
    
    const shortcutHeader = document.createElement('th');
    shortcutHeader.textContent = 'Shortcut';
    headerRow.appendChild(shortcutHeader);
    
    const descriptionHeader = document.createElement('th');
    descriptionHeader.textContent = 'Description';
    headerRow.appendChild(descriptionHeader);
    
    const resetHeader = document.createElement('th');
    resetHeader.textContent = 'Reset';
    headerRow.appendChild(resetHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement('tbody');
    
    // Populate shortcuts
    Object.entries(this.shortcuts).forEach(([action, shortcut]) => {
      const row = document.createElement('tr');
      
      const actionCell = document.createElement('td');
      actionCell.textContent = this.formatActionName(action);
      row.appendChild(actionCell);
      
      const shortcutCell = document.createElement('td');
      const shortcutButton = document.createElement('button');
      shortcutButton.className = 'shortcut-button';
      shortcutButton.textContent = this.formatShortcutKey(shortcut.key);
      shortcutButton.setAttribute('data-action', action);
      shortcutButton.addEventListener('click', (e) => this.editShortcut(e.target));
      shortcutCell.appendChild(shortcutButton);
      row.appendChild(shortcutCell);
      
      const descriptionCell = document.createElement('td');
      descriptionCell.textContent = shortcut.description;
      row.appendChild(descriptionCell);
      
      const resetCell = document.createElement('td');
      const resetButton = document.createElement('button');
      resetButton.className = 'reset-button';
      resetButton.textContent = 'Reset';
      resetButton.setAttribute('data-action', action);
      resetButton.addEventListener('click', () => this.resetShortcut(action));
      resetCell.appendChild(resetButton);
      row.appendChild(resetCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    modalContent.appendChild(table);
    
    // Add buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    const resetAllButton = document.createElement('button');
    resetAllButton.className = 'secondary-btn';
    resetAllButton.textContent = 'Reset All';
    resetAllButton.addEventListener('click', () => this.resetAllShortcuts());
    buttonGroup.appendChild(resetAllButton);
    
    const saveButton = document.createElement('button');
    saveButton.className = 'primary-btn';
    saveButton.textContent = 'Save Changes';
    saveButton.addEventListener('click', () => this.saveAndClose());
    buttonGroup.appendChild(saveButton);
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'secondary-btn';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => this.closeModal());
    buttonGroup.appendChild(cancelButton);
    
    modalContent.appendChild(buttonGroup);
    
    // Add the modal content to the modal
    this.configModal.appendChild(modalContent);
    
    // Add the modal to the document
    document.body.appendChild(this.configModal);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .shortcuts-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      .shortcuts-table th, .shortcuts-table td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid var(--border-color, #ddd);
      }
      
      .shortcuts-table th {
        background-color: var(--bg-secondary, #f5f5f5);
      }
      
      .shortcut-button {
        background-color: var(--bg-tertiary, #eee);
        border: 1px solid var(--border-color, #ddd);
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
        min-width: 80px;
        text-align: center;
      }
      
      .shortcut-button:hover {
        background-color: var(--accent-color, #4285f4);
        color: white;
      }
      
      .shortcut-button.listening {
        background-color: var(--accent-color, #4285f4);
        color: white;
        animation: pulse 1.5s infinite;
      }
      
      .reset-button {
        background-color: transparent;
        border: none;
        color: var(--accent-color, #4285f4);
        cursor: pointer;
        padding: 2px 5px;
      }
      
      .reset-button:hover {
        text-decoration: underline;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  addConfigButton() {
    // Find the help modal
    const helpModal = document.getElementById('helpModal');
    if (!helpModal) return;
    
    // Find the button group in the help modal
    const buttonGroup = helpModal.querySelector('.button-group');
    if (!buttonGroup) return;
    
    // Create the config button
    const configButton = document.createElement('button');
    configButton.id = 'keyboardConfigBtn';
    configButton.className = 'secondary-btn';
    configButton.textContent = 'Customize Shortcuts';
    configButton.addEventListener('click', () => this.openModal());
    
    // Add the button to the button group
    buttonGroup.insertBefore(configButton, buttonGroup.firstChild);
  }

  updateHelpModal() {
    // Find the help modal
    const helpModal = document.getElementById('helpModal');
    if (!helpModal) return;
    
    // Find the keyboard shortcuts list
    const shortcutsList = helpModal.querySelector('.help-section ul');
    if (!shortcutsList) return;
    
    // Clear the list
    shortcutsList.innerHTML = '';
    
    // Add the current shortcuts
    Object.entries(this.shortcuts).forEach(([action, shortcut]) => {
      const listItem = document.createElement('li');
      const kbd = document.createElement('kbd');
      kbd.textContent = this.formatShortcutKey(shortcut.key);
      listItem.appendChild(kbd);
      listItem.appendChild(document.createTextNode(` - ${shortcut.description}`));
      shortcutsList.appendChild(listItem);
    });
  }

  openModal() {
    // Close the help modal if it's open
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
      helpModal.style.display = 'none';
    }
    
    // Open the config modal
    this.configModal.style.display = 'block';
  }

  closeModal() {
    // Close the config modal
    this.configModal.style.display = 'none';
    
    // Reset any changes
    this.shortcuts = this.loadShortcuts();
  }

  saveAndClose() {
    // Save the shortcuts
    this.saveShortcuts();
    
    // Close the modal
    this.configModal.style.display = 'none';
  }

  editShortcut(button) {
    // Set the button to listening mode
    button.classList.add('listening');
    button.textContent = 'Press a key...';
    
    // Store the original shortcut in case we need to revert
    const action = button.getAttribute('data-action');
    const originalShortcut = this.shortcuts[action].key;
    
    // Function to handle key press
    const handleKeyPress = (e) => {
      e.preventDefault();
      
      // Get the key combination
      let key = '';
      
      if (e.ctrlKey || e.metaKey) key += 'ctrl+';
      if (e.shiftKey) key += 'shift+';
      if (e.altKey) key += 'alt+';
      
      // Add the main key
      if (e.key === ' ') {
        key += 'Space';
      } else if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') {
        // Ignore modifier keys on their own
        return;
      } else {
        key += e.key;
      }
      
      // Check if this shortcut is already in use
      const conflictAction = this.findConflictingShortcut(key, action);
      if (conflictAction) {
        if (!confirm(`This shortcut is already used for "${this.formatActionName(conflictAction)}". Do you want to reassign it?`)) {
          // Revert to original shortcut
          button.textContent = this.formatShortcutKey(originalShortcut);
          button.classList.remove('listening');
          document.removeEventListener('keydown', handleKeyPress);
          return;
        }
        
        // Clear the conflicting shortcut
        this.shortcuts[conflictAction].key = '';
        
        // Update the button for the conflicting action
        const conflictButton = this.configModal.querySelector(`button[data-action="${conflictAction}"]`);
        if (conflictButton) {
          conflictButton.textContent = 'Not set';
        }
      }
      
      // Update the shortcut
      this.shortcuts[action].key = key;
      
      // Update the button
      button.textContent = this.formatShortcutKey(key);
      button.classList.remove('listening');
      
      // Remove the event listener
      document.removeEventListener('keydown', handleKeyPress);
    };
    
    // Add the event listener
    document.addEventListener('keydown', handleKeyPress);
  }

  resetShortcut(action) {
    // Reset the shortcut to default
    this.shortcuts[action].key = this.defaultShortcuts[action].key;
    
    // Update the button
    const button = this.configModal.querySelector(`button[data-action="${action}"]`);
    if (button) {
      button.textContent = this.formatShortcutKey(this.shortcuts[action].key);
    }
  }

  resetAllShortcuts() {
    // Confirm reset
    if (!confirm('Are you sure you want to reset all shortcuts to their default values?')) {
      return;
    }
    
    // Reset all shortcuts
    this.shortcuts = { ...this.defaultShortcuts };
    
    // Update all buttons
    Object.entries(this.shortcuts).forEach(([action, shortcut]) => {
      const button = this.configModal.querySelector(`button[data-action="${action}"]`);
      if (button) {
        button.textContent = this.formatShortcutKey(shortcut.key);
      }
    });
  }

  findConflictingShortcut(key, currentAction) {
    // Check if any other action uses this shortcut
    for (const [action, shortcut] of Object.entries(this.shortcuts)) {
      if (action !== currentAction && shortcut.key === key) {
        return action;
      }
    }
    return null;
  }

  formatActionName(action) {
    // Convert camelCase to Title Case with spaces
    return action
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  }

  formatShortcutKey(key) {
    if (!key) return 'Not set';
    
    // Format the key for display
    return key
      .replace('ctrl+', 'Ctrl + ')
      .replace('shift+', 'Shift + ')
      .replace('alt+', 'Alt + ')
      .replace(/^./, (str) => str.toUpperCase());
  }

  // Get the current shortcut for an action
  getShortcut(action) {
    return this.shortcuts[action]?.key || this.defaultShortcuts[action]?.key;
  }
}

// Initialize the keyboard config when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.keyboardConfig = new KeyboardConfig();
});

// Export the KeyboardConfig class
export default KeyboardConfig;
