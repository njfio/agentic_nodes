/**
 * Keyboard Shortcuts functionality
 * Provides keyboard shortcuts for common operations
 * Enhanced with customizable shortcuts
 */

const KeyboardShortcuts = {
  // Properties
  actionMap: {
    addNode: () => App.addNode(),
    addChatNode: () => App.addChatNode(),
    deleteNode: () => App.deleteSelectedNode(),
    cancelConnection: () => App.cancelConnection(),
    createGroup: () => NodeGroups.startCreatingGroup(),
    editNode: () => App.editSelectedNode(),
    testWorkflow: () => WorkflowTest.startSelectingStartNode(),
    copyNode: () => App.copySelectedNode(),
    pasteNode: () => App.pasteNode(),
    undo: () => App.undo(),
    redo: () => App.redo(),
    saveCanvas: () => App.handleSave(),
    loadCanvas: () => App.handleLoad(),
    showHelp: () => ModalManager.toggleModal('helpModal'),
    zoomIn: () => App.zoomIn(),
    zoomOut: () => App.zoomOut(),
    resetZoom: () => App.resetZoom(),
    moveNodeUp: () => App.moveSelectedNode(0, -10),
    moveNodeDown: () => App.moveSelectedNode(0, 10),
    moveNodeLeft: () => App.moveSelectedNode(-10, 0),
    moveNodeRight: () => App.moveSelectedNode(10, 0),
    selectAll: () => App.selectAllNodes(),
    groupNodes: () => App.groupSelectedNodes(),
    ungroupNodes: () => App.ungroupSelectedNodes(),
    togglePanel: () => App.toggleWorkflowPanel(),
    runWorkflow: () => App.runWorkflow(),
    saveWorkflow: () => App.saveWorkflow(),
    newWorkflow: () => App.newWorkflow(),
    toggleFullscreen: () => App.toggleFullscreen()
  },

  // Default shortcuts (used if no custom shortcuts are defined)
  defaultShortcuts: [
    { action: 'addNode', key: 'n', description: 'Add new node' },
    { action: 'addChatNode', key: 'c', description: 'Add chat node' },
    { action: 'deleteNode', key: 'Delete', description: 'Delete selected node' },
    { action: 'cancelConnection', key: 'Escape', description: 'Cancel connection/Close modal' },
    { action: 'createGroup', key: 'g', description: 'Create group' },
    { action: 'editNode', key: 'e', description: 'Edit selected node' },
    { action: 'testWorkflow', key: 't', description: 'Test workflow' },
    { action: 'copyNode', key: 'x', description: 'Copy selected node' },
    { action: 'pasteNode', key: 'v', description: 'Paste node' },
    { action: 'undo', key: 'ctrl+z', description: 'Undo' },
    { action: 'redo', key: 'ctrl+y', description: 'Redo' },
    { action: 'saveCanvas', key: 'ctrl+s', description: 'Save canvas' },
    { action: 'loadCanvas', key: 'ctrl+o', description: 'Load canvas' },
    { action: 'showHelp', key: 'h', description: 'Show/hide help' },
    { action: 'zoomIn', key: '+', description: 'Zoom in' },
    { action: 'zoomOut', key: '-', description: 'Zoom out' },
    { action: 'resetZoom', key: '0', description: 'Reset zoom' },
    { action: 'moveNodeUp', key: 'ArrowUp', description: 'Move selected node up' },
    { action: 'moveNodeDown', key: 'ArrowDown', description: 'Move selected node down' },
    { action: 'moveNodeLeft', key: 'ArrowLeft', description: 'Move selected node left' },
    { action: 'moveNodeRight', key: 'ArrowRight', description: 'Move selected node right' },
    { action: 'selectAll', key: 'ctrl+a', description: 'Select all nodes' },
    { action: 'groupNodes', key: 'ctrl+g', description: 'Group selected nodes' },
    { action: 'ungroupNodes', key: 'ctrl+u', description: 'Ungroup selected nodes' },
    { action: 'togglePanel', key: 'p', description: 'Toggle workflow panel' },
    { action: 'runWorkflow', key: 'ctrl+r', description: 'Run workflow' },
    { action: 'saveWorkflow', key: 'ctrl+shift+s', description: 'Save workflow' },
    { action: 'newWorkflow', key: 'ctrl+n', description: 'New workflow' },
    { action: 'toggleFullscreen', key: 'f', description: 'Toggle fullscreen' }
  ],

  // Active shortcuts (will be populated from custom or default shortcuts)
  shortcuts: [],

  // Initialize the keyboard shortcuts
  init() {
    // Load custom shortcuts if available
    this.loadShortcuts();

    // Set up event listeners
    this.setupEventListeners();

    // Listen for shortcut updates
    window.addEventListener('shortcutsUpdated', (e) => {
      this.loadShortcuts();
    });
  },

  // Load shortcuts from localStorage or use defaults
  loadShortcuts() {
    // Clear existing shortcuts
    this.shortcuts = [];

    // Check if we have a KeyboardConfig instance
    if (window.keyboardConfig) {
      // Convert the keyboard config format to our format
      for (const [action, shortcutData] of Object.entries(window.keyboardConfig.shortcuts)) {
        if (this.actionMap[action] && shortcutData.key) {
          // Parse the key string into our format
          const shortcut = {
            action: action,
            description: shortcutData.description
          };

          // Parse key combinations
          if (shortcutData.key.includes('ctrl+')) {
            shortcut.ctrlKey = true;
            shortcutData.key = shortcutData.key.replace('ctrl+', '');
          }

          if (shortcutData.key.includes('shift+')) {
            shortcut.shiftKey = true;
            shortcutData.key = shortcutData.key.replace('shift+', '');
          }

          if (shortcutData.key.includes('alt+')) {
            shortcut.altKey = true;
            shortcutData.key = shortcutData.key.replace('alt+', '');
          }

          shortcut.key = shortcutData.key;

          this.shortcuts.push(shortcut);
        }
      }
    } else {
      // Use default shortcuts
      this.defaultShortcuts.forEach(defaultShortcut => {
        const shortcut = { ...defaultShortcut };

        // Parse key combinations for default shortcuts
        if (shortcut.key.includes('ctrl+')) {
          shortcut.ctrlKey = true;
          shortcut.key = shortcut.key.replace('ctrl+', '');
        }

        if (shortcut.key.includes('shift+')) {
          shortcut.shiftKey = true;
          shortcut.key = shortcut.key.replace('shift+', '');
        }

        if (shortcut.key.includes('alt+')) {
          shortcut.altKey = true;
          shortcut.key = shortcut.key.replace('alt+', '');
        }

        this.shortcuts.push(shortcut);
      });
    }

    // Update the help modal with the shortcuts
    this.updateHelpModal();
  },

  // Set up event listeners
  setupEventListeners() {
    // Add keydown event listener to the document
    document.addEventListener('keydown', (e) => {
      // Don't handle shortcuts if an input element is focused
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Check each shortcut
      for (const shortcut of this.shortcuts) {
        if (
          e.key === shortcut.key &&
          (!shortcut.ctrlKey || (shortcut.ctrlKey && (e.ctrlKey || e.metaKey))) &&
          (!shortcut.altKey || (shortcut.altKey && e.altKey)) &&
          (!shortcut.shiftKey || (shortcut.shiftKey && e.shiftKey))
        ) {
          // Prevent default browser behavior
          e.preventDefault();

          // Get the action function
          const actionFn = this.actionMap[shortcut.action];

          // Execute the action if it exists
          if (actionFn) {
            actionFn();
          } else {
            console.warn(`Action ${shortcut.action} not found`);
          }

          // Break the loop
          break;
        }
      }
    });
  },

  // Update the help modal with the shortcuts
  updateHelpModal() {
    // Get the keyboard shortcuts section in the help modal
    const shortcutsSection = document.querySelector('.help-section:first-child ul');
    if (!shortcutsSection) return;

    // Clear the existing shortcuts
    shortcutsSection.innerHTML = '';

    // Add each shortcut to the list
    this.shortcuts.forEach(shortcut => {
      const li = document.createElement('li');

      // Create the keyboard shortcut display
      let keyDisplay = shortcut.key;

      // Handle special keys
      if (keyDisplay === ' ') {
        keyDisplay = 'Space';
      } else if (keyDisplay === 'ArrowUp') {
        keyDisplay = '↑';
      } else if (keyDisplay === 'ArrowDown') {
        keyDisplay = '↓';
      } else if (keyDisplay === 'ArrowLeft') {
        keyDisplay = '←';
      } else if (keyDisplay === 'ArrowRight') {
        keyDisplay = '→';
      }

      // Create the shortcut HTML
      let shortcutHTML = '';

      if (shortcut.ctrlKey) {
        shortcutHTML += '<kbd>Ctrl/Cmd</kbd> + ';
      }

      if (shortcut.altKey) {
        shortcutHTML += '<kbd>Alt</kbd> + ';
      }

      if (shortcut.shiftKey) {
        shortcutHTML += '<kbd>Shift</kbd> + ';
      }

      shortcutHTML += `<kbd>${keyDisplay}</kbd>`;

      // Set the HTML
      li.innerHTML = `${shortcutHTML} - ${shortcut.description}`;

      // Add the list item to the section
      shortcutsSection.appendChild(li);
    });
  }
};

// Add the required methods to the App object if they don't exist

// These methods will be added to the App object when it's available
const AppExtensions = {
  // Add the deleteSelectedNode method
  deleteSelectedNode: function() {
    // Find the selected node
    const selectedNode = this.nodes.find(node => node.selected);

    if (selectedNode) {
      // Remove all connections to/from this node
      this.connections = this.connections.filter(conn =>
        conn.fromNode !== selectedNode && conn.toNode !== selectedNode
      );

      // Remove the node
      const index = this.nodes.indexOf(selectedNode);
      if (index !== -1) {
        this.nodes.splice(index, 1);
      }

      // Clear the selectedNode property if it matches the deleted node
      if (this.selectedNode === selectedNode) {
        this.selectedNode = null;
      }

      DebugManager.addLog(`Node ${selectedNode.id} deleted`, 'info');
      DebugManager.updateCanvasStats();
      this.draw();
    }
  }
};

// Add the editSelectedNode method
AppExtensions.editSelectedNode = function() {
  // Find the selected node
  const selectedNode = this.nodes.find(node => node.selected);

  if (selectedNode) {
    // Open the node editor
    this.openNodeEditor(selectedNode);
  }
};

// Add the copySelectedNode method
AppExtensions.copySelectedNode = function() {
  // Find the selected node
  const selectedNode = this.nodes.find(node => node.selected);

  if (selectedNode) {
    // Store the node data in localStorage
    const nodeData = {
      title: selectedNode.title,
      content: selectedNode.content,
      inputContent: selectedNode.inputContent,
      contentType: selectedNode.contentType,
      systemPrompt: selectedNode.systemPrompt,
      aiProcessor: selectedNode.aiProcessor,
      inputType: selectedNode.inputType,
      outputType: selectedNode.outputType,
      autoSize: selectedNode.autoSize,
      chatHistory: selectedNode.chatHistory || []
    };

    localStorage.setItem('clipboard_node', JSON.stringify(nodeData));

    DebugManager.addLog('Node copied to clipboard', 'success');
  }
};

// Add the pasteNode method
AppExtensions.pasteNode = function() {
  // Get the node data from localStorage
  const nodeDataString = localStorage.getItem('clipboard_node');

  if (nodeDataString) {
    try {
      const nodeData = JSON.parse(nodeDataString);

      // Create a new node
      const id = this.nodes.length + 1;
      const x = window.innerWidth/2 - 80;
      const y = window.innerHeight/2 - 40;
      const node = new Node(x, y, id);

      // Set the node properties
      node.title = nodeData.title;
      node.content = nodeData.content;
      node.inputContent = nodeData.inputContent || '';
      node.contentType = nodeData.contentType;
      node.systemPrompt = nodeData.systemPrompt || '';
      node.aiProcessor = nodeData.aiProcessor;
      node.inputType = nodeData.inputType || 'text';
      node.outputType = nodeData.outputType || 'text';
      node.autoSize = nodeData.autoSize !== undefined ? nodeData.autoSize : true;

      // Copy chat history if it exists
      if (nodeData.chatHistory && Array.isArray(nodeData.chatHistory)) {
        node.chatHistory = [...nodeData.chatHistory];
      }

      // Preload any images
      node.preloadContent();

      // Add the node
      this.nodes.push(node);

      // Select the new node
      this.nodes.forEach(n => n.selected = false);
      node.selected = true;
      this.selectedNode = node; // Set the selectedNode property
      DebugManager.addLog(`Selected node: ${node.id} (pasted)`, 'info');

      DebugManager.addLog('Node pasted from clipboard', 'success');
      DebugManager.updateCanvasStats();
      this.draw();
    } catch (err) {
      DebugManager.addLog(`Failed to paste node: ${err.message}`, 'error');
    }
  } else {
    DebugManager.addLog('No node in clipboard', 'error');
  }
};

// Add the undo method
AppExtensions.undo = function() {
  // TODO: Implement undo functionality
  DebugManager.addLog('Undo functionality coming soon', 'info');
};

// Add the redo method
AppExtensions.redo = function() {
  // TODO: Implement redo functionality
  DebugManager.addLog('Redo functionality coming soon', 'info');
};

// Add the zoomIn method
AppExtensions.zoomIn = function() {
  this.zoom *= 1.1;
  this.draw();
  DebugManager.addLog(`Zoomed in to ${Math.round(this.zoom * 100)}%`, 'info');
};

// Add the zoomOut method
AppExtensions.zoomOut = function() {
  this.zoom /= 1.1;
  this.draw();
  DebugManager.addLog(`Zoomed out to ${Math.round(this.zoom * 100)}%`, 'info');
};

// Add the resetZoom method
AppExtensions.resetZoom = function() {
  this.zoom = 1;
  this.draw();
  DebugManager.addLog('Zoom reset to 100%', 'info');
};

// Add the moveSelectedNode method
AppExtensions.moveSelectedNode = function(dx, dy) {
  // Find the selected node
  const selectedNode = this.nodes.find(node => node.selected);

  if (selectedNode) {
    // Move the node
    selectedNode.x += dx;
    selectedNode.y += dy;

    // Redraw the canvas
    this.draw();
  }
};

// Initialize the keyboard shortcuts when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    // Make sure App is defined before using it
    if (typeof App !== 'undefined') {
      // Add all the extension methods to the App object
      for (const [methodName, methodFunction] of Object.entries(AppExtensions)) {
        if (!App[methodName]) {
          App[methodName] = methodFunction;
        }
      }

      // Initialize keyboard shortcuts
      KeyboardShortcuts.init();
    } else {
      console.warn('App not defined yet, keyboard shortcuts initialization delayed');
      // Try again after a longer delay
      setTimeout(() => {
        if (typeof App !== 'undefined') {
          // Add all the extension methods to the App object
          for (const [methodName, methodFunction] of Object.entries(AppExtensions)) {
            if (!App[methodName]) {
              App[methodName] = methodFunction;
            }
          }

          KeyboardShortcuts.init();
        } else {
          console.error('App still not defined, keyboard shortcuts initialization failed');
        }
      }, 500);
    }
  }, 100);
});
