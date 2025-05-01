/**
 * Agent Nodes
 * Implements agentic nodes with logic loops and function calling capabilities
 */

const AgentNodes = {
  // Initialize the Agent Nodes
  init() {
    // Register node types
    this.registerNodeTypes();

    // Add event listeners (with a slight delay to ensure DOM is ready)
    setTimeout(() => {
      this.addEventListeners();
      console.log('Agent Nodes initialized and toolbar button added');
    }, 100);
  },

  // Register node types with the application
  registerNodeTypes() {
    // Add the agent node type to the App object if it exists
    if (window.App) {
      // Store the original addNode method
      const originalAddNode = App.addNode;

      // Override the addNode method to add our custom node types
      App.addNode = function(nodeType) {
        console.log('App.addNode called with nodeType:', nodeType);

        if (nodeType === 'agent') {
          const agentNode = AgentNodes.createAgentNode();
          console.log('Created agent node with nodeType:', agentNode.nodeType);
          return agentNode;
        }

        // Call the original method for other node types
        return originalAddNode.call(App, nodeType);
      };

      // Add the nodeType property to the Node class if it doesn't exist
      if (!Node.prototype.hasOwnProperty('nodeType')) {
        Object.defineProperty(Node.prototype, 'nodeType', {
          get: function() {
            return this._nodeType || 'default';
          },
          set: function(value) {
            this._nodeType = value;
          }
        });
      }

      // Extend the Node's process method to handle agent node processing
      const originalNodeProcess = Node.prototype.process;
      Node.prototype.process = function(input) {
        // Handle agent node processing
        if (this.nodeType === 'agent') {
          return AgentNodes.processAgentNode(this, input);
        }

        // Call the original process method for regular nodes
        return originalNodeProcess.call(this, input);
      };

      // Extend the Node's draw method to handle agent node styling
      const originalNodeDraw = Node.prototype.draw;
      Node.prototype.draw = function(ctx) {
        // Call the original draw method first
        originalNodeDraw.call(this, ctx);

        // Add agent-specific styling
        if (this.nodeType === 'agent') {
          // Set the data-node-type attribute for CSS styling
          if (this.element) {
            this.element.setAttribute('data-node-type', 'agent');
          }

          // Add agent icon
          ctx.save();

          // Draw agent badge in the top-right corner
          const badgeX = this.x + this.width - 20;
          const badgeY = this.y + 20;
          const badgeRadius = 12;

          // Draw the badge circle
          ctx.fillStyle = '#9c27b0'; // Purple for agent nodes
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fill();

          // Draw the badge icon (robot emoji)
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🤖', badgeX, badgeY);

          // Draw iteration count if iterating
          if (this.isIterating) {
            const iterX = this.x + this.width - 20;
            const iterY = this.y + this.height - 20;

            // Draw iteration badge
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(iterX, iterY, 15, 0, Math.PI * 2);
            ctx.fill();

            // Draw iteration text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${this.currentIteration}/${this.maxIterations}`, iterX, iterY);
          }

          ctx.restore();
        }
      };
    }
  },

  // Add event listeners
  addEventListeners() {
    // Add buttons to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      // Add Agent Node button
      const agentBtn = document.createElement('button');
      agentBtn.id = 'addAgentNodeBtn';
      agentBtn.type = 'button';
      agentBtn.textContent = 'Add Agent Node';
      agentBtn.title = 'Add a node with agentic capabilities';

      // Add a distinctive style to make it stand out
      agentBtn.style.backgroundColor = '#9c27b0';
      agentBtn.style.color = 'white';
      agentBtn.style.fontWeight = 'bold';

      agentBtn.addEventListener('click', () => {
        App.addNode('agent');
      });

      // Insert the button after the Add Node button
      const addNodeBtn = document.getElementById('addNodeBtn');
      if (addNodeBtn && addNodeBtn.parentNode) {
        addNodeBtn.parentNode.insertBefore(agentBtn, addNodeBtn.nextSibling);
      } else {
        toolbar.appendChild(agentBtn);
      }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Add Agent Node: Shift + A
      if (e.key === 'A' && e.shiftKey) {
        App.addNode('agent');
        e.preventDefault();
      }
    });
  },

  // Create an Agent Node
  createAgentNode() {
    const id = App.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);

    // Configure as an agent node
    node.title = "Agent Node " + id;

    // Set the node type in multiple ways to ensure it's properly set
    node._nodeType = 'agent'; // Use the underlying property directly
    node.nodeType = 'agent';  // Also set via the setter for good measure

    // Add a direct property to make absolutely sure
    Object.defineProperty(node, 'isAgentNode', {
      value: true,
      writable: false,
      enumerable: true,
      configurable: false
    });

    node.contentType = 'text';
    node.aiProcessor = 'text-to-text';
    node.inputType = 'text';
    node.outputType = 'text';
    node.systemPrompt = "You are an agent that can process content and make decisions. Use your tools to complete tasks.";
    node.width = 240;
    node.height = 200;

    console.log('Created agent node with properties:', {
      id: node.id,
      nodeType: node.nodeType,
      _nodeType: node._nodeType,
      isAgentNode: node.isAgentNode
    });

    // Add agent-specific properties
    node.agentType = 'default';       // Type of agent (default, custom, etc.)
    node.tools = [];                  // Available tools for this agent
    node.memory = {};                 // Agent's memory to maintain context
    node.maxIterations = 5;           // Maximum number of iterations
    node.currentIteration = 0;        // Current iteration count
    node.autoIterate = true;          // Whether to automatically iterate
    node.customCode = '';             // Custom code for advanced users

    // Add the node to the canvas
    App.nodes.push(node);

    // Select the new node
    App.nodes.forEach(n => n.selected = false);
    node.selected = true;

    // Log the creation
    DebugManager.addLog(`Added new Agent Node "${node.title}" (ID: ${node.id})`, 'info');
    DebugManager.updateCanvasStats();

    // Redraw the canvas
    App.draw();

    return node;
  },

  // Process an Agent Node
  async processAgentNode(node, input) {
    // Log the start of processing
    DebugManager.addLog(`Processing Agent Node "${node.title}" (ID: ${node.id})`, 'info');

    try {
      // Reset iteration count if this is a new processing run
      if (!node.isIterating) {
        node.currentIteration = 0;
        node.isIterating = true;
      }

      // Increment iteration count
      node.currentIteration++;

      // Check if we've exceeded the maximum number of iterations
      if (node.currentIteration > node.maxIterations) {
        DebugManager.addLog(`Agent Node "${node.title}" (ID: ${node.id}) reached maximum iterations (${node.maxIterations})`, 'warning');
        node.isIterating = false;
        return `Agent reached maximum iterations (${node.maxIterations}). Final result: ${input}`;
      }

      // Log the current iteration
      DebugManager.addLog(`Agent Node "${node.title}" (ID: ${node.id}) iteration ${node.currentIteration}/${node.maxIterations}`, 'info');

      // Process the input based on agent type
      let result;
      switch (node.agentType) {
        case 'default':
          result = await this.processDefaultAgent(node, input);
          break;
        case 'custom':
          result = await this.processCustomAgent(node, input);
          break;
        default:
          throw new Error(`Unknown agent type: ${node.agentType}`);
      }

      // Check if we need to continue iterating
      if (node.autoIterate && node.isIterating && node.currentIteration < node.maxIterations) {
        // Schedule the next iteration
        setTimeout(() => {
          // Process the node with the result as input
          App.processNodeAndConnections(node, result, node).catch(err => {
            DebugManager.addLog(`Error in agent iteration: ${err.message}`, 'error');
          });
        }, 100);
      } else {
        // Mark the agent as done iterating
        node.isIterating = false;
      }

      return result;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Agent Node "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;
      node.isIterating = false;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Process a default agent
  async processDefaultAgent(node, input) {
    try {
      // Initialize memory if needed
      AgentMemory.initMemory(node);

      // Add the input to context
      AgentMemory.addToContext(node, input);

      // Generate a plan
      const plan = await AgentPlanner.generatePlan(node, input);

      // Execute the plan
      const result = await AgentPlanner.executePlan(node);

      return result;
    } catch (error) {
      DebugManager.addLog(`Error in default agent: ${error.message}`, 'error');
      throw error;
    }
  },

  // Process a custom agent
  async processCustomAgent(node, input) {
    try {
      // Check if custom code is provided
      if (!node.customCode) {
        throw new Error('No custom code provided');
      }

      // Create a function from the custom code
      const customFunction = new Function('input', 'node', 'App', 'DebugManager', 'ApiService', node.customCode);

      // Execute the custom function
      const result = await customFunction(input, node, App, DebugManager, ApiService);

      return result;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Custom Agent "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Initialize the agent node editor
  initAgentNodeEditor() {
    // Get the agent node editor modal
    const agentNodeEditor = document.getElementById('agentNodeEditor');
    if (!agentNodeEditor) {
      console.error('Agent node editor modal not found');
      return;
    }

    // Get the agent type select element
    const agentTypeSelect = document.getElementById('agentType');
    if (agentTypeSelect) {
      // Add event listener to show/hide custom code section
      agentTypeSelect.addEventListener('change', () => {
        const customCodeSection = document.getElementById('customCodeSection');
        if (customCodeSection) {
          customCodeSection.style.display = agentTypeSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    // Set up save button handler
    const saveButton = document.getElementById('saveAgentNode');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.saveAgentNodeEditor();
      });
    }

    // Set up cancel button handler
    const cancelButton = document.getElementById('cancelAgentNode');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.editingNode = null;
        ModalManager.closeModal('agentNodeEditor');
      });
    }
  },

  // Open the agent node editor
  openAgentNodeEditor(node) {
    // Set the editing node
    this.editingNode = node;

    // Get the agent node editor modal
    const agentNodeEditor = document.getElementById('agentNodeEditor');
    if (!agentNodeEditor) {
      console.error('Agent node editor modal not found');
      return;
    }

    // Set the values in the form
    document.getElementById('agentNodeTitle').value = node.title || '';
    document.getElementById('agentSystemPrompt').value = node.systemPrompt || '';
    document.getElementById('maxIterations').value = node.maxIterations || 5;
    document.getElementById('autoIterate').checked = node.autoIterate !== false;

    // Set agent type
    const agentTypeSelect = document.getElementById('agentType');
    if (agentTypeSelect) {
      agentTypeSelect.value = node.agentType || 'default';

      // Show/hide custom code section
      const customCodeSection = document.getElementById('customCodeSection');
      if (customCodeSection) {
        customCodeSection.style.display = node.agentType === 'custom' ? 'block' : 'none';
      }
    }

    // Set custom code if applicable
    if (node.agentType === 'custom') {
      document.getElementById('customCode').value = node.customCode || '';
    }

    // Open the modal
    ModalManager.openModal('agentNodeEditor');
    DebugManager.addLog(`Editing agent node ${node.id}`, 'info');
  },

  // Save changes from the agent node editor
  saveAgentNodeEditor() {
    if (!this.editingNode) {
      DebugManager.addLog('No agent node being edited', 'error');
      return;
    }

    // Get values from the form
    this.editingNode.title = document.getElementById('agentNodeTitle').value;
    this.editingNode.systemPrompt = document.getElementById('agentSystemPrompt').value;
    this.editingNode.maxIterations = parseInt(document.getElementById('maxIterations').value, 10);
    this.editingNode.autoIterate = document.getElementById('autoIterate').checked;

    // Get agent type
    const agentType = document.getElementById('agentType').value;
    this.editingNode.agentType = agentType;

    // Get custom code if applicable
    if (agentType === 'custom') {
      this.editingNode.customCode = document.getElementById('customCode').value;
    }

    // Close the modal
    ModalManager.closeModal('agentNodeEditor');
    DebugManager.addLog('Agent node updated', 'success');

    // Redraw the canvas
    App.draw();

    // Clear the editing node reference
    this.editingNode = null;
  }
};

// Initialize the Agent Nodes when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Agent Nodes
  AgentNodes.init();
});

// Extend the App object to handle agent node editing
document.addEventListener('DOMContentLoaded', function() {
  if (window.App) {
    // Store the original openNodeEditor method
    const originalOpenNodeEditor = App.openNodeEditor;

    // Override the openNodeEditor method to use our custom editor for agent nodes
    App.openNodeEditor = function(node) {
      // Check if this is an agent node in multiple ways
      const isAgentNode = node && (
        node.nodeType === 'agent' ||
        node._nodeType === 'agent' ||
        node.isAgentNode === true
      );

      if (isAgentNode) {
        // Use our custom agent node editor
        AgentNodes.openAgentNodeEditor(node);
      } else {
        // Call the original method for regular nodes
        originalOpenNodeEditor.call(App, node);
      }
    };

    // Initialize the agent node editor
    AgentNodes.initAgentNodeEditor();
  }
});
