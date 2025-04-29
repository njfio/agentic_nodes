/**
 * Keyboard Shortcuts functionality
 * Provides keyboard shortcuts for common operations
 */

const KeyboardShortcuts = {
  // Properties
  shortcuts: [
    { key: 'n', description: 'Add new node', action: () => App.addNode() },
    { key: 'q', description: 'Add chat node', action: () => App.addChatNode() },
    { key: 'Delete', description: 'Delete selected node', action: () => App.deleteSelectedNode() },
    { key: 'Escape', description: 'Cancel connection/Close modal', action: () => App.cancelConnection() },
    { key: 'g', description: 'Create group', action: () => NodeGroups.startCreatingGroup() },
    { key: 'e', description: 'Edit selected node', action: () => App.editSelectedNode() },
    { key: 't', description: 'Test workflow', action: () => WorkflowTest.startSelectingStartNode() },
    { key: 'x', description: 'Copy selected node', action: () => App.copySelectedNode() },
    { key: 'v', description: 'Paste node', action: () => App.pasteNode() },
    { key: 'z', ctrlKey: true, description: 'Undo', action: () => App.undo() },
    { key: 'y', ctrlKey: true, description: 'Redo', action: () => App.redo() },
    { key: 's', ctrlKey: true, description: 'Save canvas', action: () => App.handleSave() },
    { key: 'o', ctrlKey: true, description: 'Load canvas', action: () => App.handleLoad() },
    { key: 'h', description: 'Show/hide help', action: () => ModalManager.toggleModal('helpModal') },
    { key: '+', description: 'Zoom in', action: () => App.zoomIn() },
    { key: '-', description: 'Zoom out', action: () => App.zoomOut() },
    { key: '0', description: 'Reset zoom', action: () => App.resetZoom() },
    { key: 'ArrowUp', description: 'Move selected node up', action: () => App.moveSelectedNode(0, -10) },
    { key: 'ArrowDown', description: 'Move selected node down', action: () => App.moveSelectedNode(0, 10) },
    { key: 'ArrowLeft', description: 'Move selected node left', action: () => App.moveSelectedNode(-10, 0) },
    { key: 'ArrowRight', description: 'Move selected node right', action: () => App.moveSelectedNode(10, 0) },
  ],

  // Initialize the keyboard shortcuts
  init() {
    // Set up event listeners
    this.setupEventListeners();

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

          // Execute the action
          shortcut.action();

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
