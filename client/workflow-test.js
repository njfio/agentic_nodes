/**
 * Workflow testing functionality
 * Allows testing entire workflows by selecting a starting node
 */

// Import DebugManager from debug.js
const DebugManager = window.DebugManager;

const WorkflowTest = {
  // Properties
  isSelecting: false,

  // Initialize the workflow test functionality
  init() {
    // Set up event listeners
    this.setupEventListeners();
  },

  // Set up event listeners
  setupEventListeners() {
    // Test workflow button
    const testWorkflowBtn = document.getElementById('testWorkflowBtn');
    if (testWorkflowBtn) {
      testWorkflowBtn.addEventListener('click', () => {
        this.startSelectingStartNode();
      });
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportWorkflow();
      });
    }

    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.importWorkflow();
      });
    }
  },

  // Start selecting a start node for workflow testing
  startSelectingStartNode() {
    // Check if there are any nodes
    if (!App.nodes || App.nodes.length === 0) {
      DebugManager.addLog('No nodes to test', 'error');
      return;
    }

    // Set the selecting flag
    this.isSelecting = true;

    // Show a notification
    DebugManager.addLog('Select a node to start the workflow test', 'info');

    // Change the cursor to indicate selection mode
    document.body.style.cursor = 'crosshair';

    // Highlight all nodes that can be selected
    App.nodes.forEach(node => {
      node.selectable = true;
    });

    // Redraw the canvas
    App.draw();

    // Add a one-time click event listener to the canvas
    const canvas = document.getElementById('canvas');
    const clickHandler = (e) => {
      // Get the mouse position
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
      const y = (e.clientY - rect.top) / App.zoom - App.offsetY;

      // Find the node that was clicked
      const clickedNode = App.nodes.find(node =>
        x >= node.x && x <= node.x + node.width &&
        y >= node.y && y <= node.y + node.height
      );

      // If a node was clicked, start the workflow test
      if (clickedNode) {
        this.runWorkflowTest(clickedNode);
      } else {
        // If no node was clicked, cancel the selection
        this.cancelSelection();
      }

      // Remove the event listener
      canvas.removeEventListener('click', clickHandler);
    };

    canvas.addEventListener('click', clickHandler);

    // Add an escape key handler to cancel selection
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        this.cancelSelection();
        document.removeEventListener('keydown', keyHandler);
        canvas.removeEventListener('click', clickHandler);
      }
    };

    document.addEventListener('keydown', keyHandler);
  },

  // Cancel the node selection
  cancelSelection() {
    // Reset the selecting flag
    this.isSelecting = false;

    // Reset the cursor
    document.body.style.cursor = 'default';

    // Reset node selectability
    App.nodes.forEach(node => {
      node.selectable = false;
    });

    // Redraw the canvas
    App.draw();

    DebugManager.addLog('Workflow test selection cancelled', 'info');
  },

  // Run the workflow test starting from the selected node
  async runWorkflowTest(startNode) {
    // Reset the selecting flag
    this.isSelecting = false;

    // Reset the cursor
    document.body.style.cursor = 'default';

    // Reset node selectability
    App.nodes.forEach(node => {
      node.selectable = false;
    });

    // Show a notification
    DebugManager.addLog(`Starting workflow test from node ${startNode.id}`, 'info');

    try {
      // Process the node chain
      await App.processNodeChain(startNode);

      DebugManager.addLog('Workflow test completed successfully', 'success');
    } catch (err) {
      DebugManager.addLog(`Workflow test failed: ${err.message}`, 'error');
    }
  },

  // Export the current workflow as a JSON file
  exportWorkflow() {
    // Check if there are any nodes
    if (!App.nodes || App.nodes.length === 0) {
      DebugManager.addLog('No nodes to export', 'error');
      return;
    }

    // Create a JSON representation of the current state
    const state = {
      nodes: App.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        title: node.title,
        content: node.content,
        inputContent: node.inputContent,
        contentType: node.contentType,
        systemPrompt: node.systemPrompt,
        aiProcessor: node.aiProcessor,
        inputType: node.inputType,
        outputType: node.outputType,
        hasBeenProcessed: node.hasBeenProcessed,
        autoSize: node.autoSize,
        selected: node.selected,
        expanded: node.expanded,
        error: node.error
      })),
      connections: App.connections.map(conn => ({
        fromNodeId: conn.fromNode.id,
        toNodeId: conn.toNode.id
      }))
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(state, null, 2);

    // Create a blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `workflow-${new Date().toISOString().slice(0, 10)}.json`;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    DebugManager.addLog('Workflow exported successfully', 'success');
  },

  // Import a workflow from a JSON file
  importWorkflow() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    // Add a change event listener
    fileInput.addEventListener('change', (e) => {
      // Get the selected file
      const file = e.target.files[0];
      if (!file) return;

      // Create a file reader
      const reader = new FileReader();

      // Add a load event listener
      reader.addEventListener('load', (e) => {
        try {
          // Parse the JSON data
          const state = JSON.parse(e.target.result);

          // Validate the state
          if (!state.nodes || !state.connections) {
            throw new Error('Invalid workflow file format');
          }

          // Clear the current state
          App.nodes = [];
          App.connections = [];

          // Recreate the nodes
          state.nodes.forEach(nodeData => {
            const node = new Node(nodeData.x, nodeData.y, nodeData.id);

            // Restore basic properties
            node.title = nodeData.title;
            node.content = nodeData.content;
            node.inputContent = nodeData.inputContent || '';
            node.contentType = nodeData.contentType;
            node.systemPrompt = nodeData.systemPrompt || '';
            node.aiProcessor = nodeData.aiProcessor;
            node.inputType = nodeData.inputType || 'text';
            node.outputType = nodeData.outputType || 'text';

            // Restore state properties
            node.hasBeenProcessed = nodeData.hasBeenProcessed || false;
            node.error = nodeData.error || null;
            node.selected = nodeData.selected || false;
            node.expanded = nodeData.expanded || false;
            node.autoSize = nodeData.autoSize !== undefined ? nodeData.autoSize : true;

            // Restore dimensions if saved
            if (nodeData.width && nodeData.height) {
              node.width = nodeData.width;
              node.height = nodeData.height;
            } else if (node.autoSize) {
              // If dimensions weren't saved but autoSize is enabled, calculate optimal size
              node.calculateOptimalSize();
            }

            // Special handling for image nodes
            if (node.contentType === 'image' || node.aiProcessor === 'text-to-image') {
              // Force content type to image for text-to-image nodes
              if (node.aiProcessor === 'text-to-image') {
                node.contentType = 'image';
              }

              // Preload the image content
              if (node.content) {
                // Force recreate the image object to ensure it loads properly
                node.contentImage = new Image();
                node.contentImage.src = node.content;

                // Add load event listener to redraw when image loads
                node.contentImage.onload = () => {
                  // When image loads, update node size if auto-sizing is enabled
                  if (node.autoSize) {
                    node.calculateOptimalSize();
                  }
                  // Force a redraw to show the image
                  App.draw();
                };
              }
            }

            App.nodes.push(node);
          });

          // Recreate the connections
          state.connections.forEach(connData => {
            const fromNode = App.nodes.find(node => node.id === connData.fromNodeId);
            const toNode = App.nodes.find(node => node.id === connData.toNodeId);

            if (fromNode && toNode) {
              App.connections.push(new Connection(fromNode, toNode));
            }
          });

          // Redraw the canvas
          App.draw();

          // Force another redraw after a short delay to ensure images are properly loaded
          setTimeout(() => {
            // Preload content for all nodes again
            App.nodes.forEach(node => node.preloadContent());
            App.draw();
          }, 500);

          DebugManager.addLog('Workflow imported successfully', 'success');
          DebugManager.updateCanvasStats();
        } catch (err) {
          DebugManager.addLog(`Failed to import workflow: ${err.message}`, 'error');
        }
      });

      // Read the file as text
      reader.readAsText(file);
    });

    // Trigger the file input
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }
};

// Add the selectable property to the Node class
Object.defineProperty(Node.prototype, 'selectable', {
  get: function() {
    return this._selectable || false;
  },
  set: function(value) {
    this._selectable = value;
  }
});

// Modify the Node's draw method to show selection highlight
const originalNodeDraw = Node.prototype.draw;
Node.prototype.draw = function(ctx) {
  // Call the original draw method
  originalNodeDraw.call(this, ctx);

  // If the node is selectable, draw a highlight
  if (this.selectable) {
    ctx.save();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }
};

// Initialize the workflow test functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    WorkflowTest.init();
  }, 100);
});
