/**
 * Agent Nodes
 * Implements agentic nodes with logic loops and function calling capabilities
 */

const AgentNodes = {
  // Initialize the Agent Nodes
  init() {
    console.log('Agent Nodes initialized');
    this.registerNodeTypes();
    this.addEventListeners();
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
    node._nodeType = 'agent'; // Use the underlying property directly
    node.nodeType = 'agent';  // Also set via the setter for good measure
    node.contentType = 'text';
    node.aiProcessor = 'text-to-text';
    node.inputType = 'text';
    node.outputType = 'text';
    node.systemPrompt = "You are an agent that can process content and make decisions. Use your tools to complete tasks.";
    node.width = 240;
    node.height = 200;

    console.log('Created agent node:', node);

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

  // Update the node editor to show agent node options
  updateNodeEditor(node) {
    console.log('Updating node editor for agent node:', node);

    if (!node || node.nodeType !== 'agent') {
      console.log('Not an agent node or node is null');
      return;
    }

    // Get the node editor element
    const nodeEditor = document.getElementById('nodeEditor');
    if (!nodeEditor) {
      console.log('Node editor element not found');
      return;
    }

    // Find or create the agent options section
    // First, remove any existing agent options section to avoid duplicates
    const existingSection = document.getElementById('agentOptionsSection');
    if (existingSection) {
      existingSection.remove();
    }

    // Create a new agent options section
    const agentOptionsSection = document.createElement('div');
    agentOptionsSection.id = 'agentOptionsSection';
    agentOptionsSection.className = 'editor-section';

    // Find the button group to insert before
    const buttonGroup = nodeEditor.querySelector('.button-group');
    if (buttonGroup) {
      nodeEditor.insertBefore(agentOptionsSection, buttonGroup);
    } else {
      // If no button group, just append to the end
      nodeEditor.appendChild(agentOptionsSection);
    }

    // Add a header
    const header = document.createElement('h3');
    header.textContent = 'Agent Options';
    agentOptionsSection.appendChild(header);

    // Add agent type selector
    const agentTypeGroup = document.createElement('div');
    agentTypeGroup.className = 'form-group';

    const agentTypeLabel = document.createElement('label');
    agentTypeLabel.htmlFor = 'agentType';
    agentTypeLabel.textContent = 'Agent Type:';

    const agentTypeSelect = document.createElement('select');
    agentTypeSelect.id = 'agentType';
    agentTypeSelect.className = 'form-control';

    const agentTypes = [
      { value: 'default', text: 'Default Agent' },
      { value: 'custom', text: 'Custom Agent' }
    ];

    agentTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type.value;
      option.textContent = type.text;
      option.selected = node.agentType === type.value;
      agentTypeSelect.appendChild(option);
    });

    agentTypeGroup.appendChild(agentTypeLabel);
    agentTypeGroup.appendChild(agentTypeSelect);
    agentOptionsSection.appendChild(agentTypeGroup);

    // Max iterations option
    const maxIterationsGroup = document.createElement('div');
    maxIterationsGroup.className = 'form-group';

    const maxIterationsLabel = document.createElement('label');
    maxIterationsLabel.htmlFor = 'maxIterations';
    maxIterationsLabel.textContent = 'Maximum Iterations:';

    const maxIterationsInput = document.createElement('input');
    maxIterationsInput.type = 'number';
    maxIterationsInput.id = 'maxIterations';
    maxIterationsInput.className = 'form-control';
    maxIterationsInput.value = node.maxIterations || 5;
    maxIterationsInput.min = 1;
    maxIterationsInput.max = 20;

    maxIterationsGroup.appendChild(maxIterationsLabel);
    maxIterationsGroup.appendChild(maxIterationsInput);
    agentOptionsSection.appendChild(maxIterationsGroup);

    // Auto iterate option
    const autoIterateGroup = document.createElement('div');
    autoIterateGroup.className = 'form-group';

    const autoIterateCheckbox = document.createElement('div');
    autoIterateCheckbox.className = 'checkbox-group';

    const autoIterateInput = document.createElement('input');
    autoIterateInput.type = 'checkbox';
    autoIterateInput.id = 'autoIterate';
    autoIterateInput.checked = node.autoIterate !== false;

    const autoIterateLabel = document.createElement('label');
    autoIterateLabel.htmlFor = 'autoIterate';
    autoIterateLabel.textContent = 'Auto-iterate';

    autoIterateCheckbox.appendChild(autoIterateInput);
    autoIterateCheckbox.appendChild(autoIterateLabel);
    autoIterateGroup.appendChild(autoIterateCheckbox);
    agentOptionsSection.appendChild(autoIterateGroup);

    // Current iteration display
    const currentIterationGroup = document.createElement('div');
    currentIterationGroup.className = 'form-group';

    const currentIterationLabel = document.createElement('label');
    currentIterationLabel.textContent = 'Current Iteration:';

    const currentIterationValue = document.createElement('span');
    currentIterationValue.id = 'currentIteration';
    currentIterationValue.textContent = node.currentIteration || 0;

    currentIterationGroup.appendChild(currentIterationLabel);
    currentIterationGroup.appendChild(currentIterationValue);
    agentOptionsSection.appendChild(currentIterationGroup);

    // Add agent-specific options based on the agent type
    if (node.agentType === 'custom') {
      // Custom code option
      const customCodeGroup = document.createElement('div');
      customCodeGroup.className = 'form-group';

      const customCodeLabel = document.createElement('label');
      customCodeLabel.htmlFor = 'customCode';
      customCodeLabel.textContent = 'Custom Code:';

      const customCodeTextarea = document.createElement('textarea');
      customCodeTextarea.id = 'customCode';
      customCodeTextarea.className = 'form-control';
      customCodeTextarea.rows = 10;
      customCodeTextarea.value = node.customCode || '';
      customCodeTextarea.placeholder = '// Custom JavaScript code\n// Available variables: input, node, App, DebugManager, ApiService\n// Return the processed result\nreturn input;';

      customCodeGroup.appendChild(customCodeLabel);
      customCodeGroup.appendChild(customCodeTextarea);
      agentOptionsSection.appendChild(customCodeGroup);

      // Add event listener for custom code
      customCodeTextarea.addEventListener('change', () => {
        node.customCode = customCodeTextarea.value;
      });
    }

    // Add event listeners to update the node properties
    agentTypeSelect.addEventListener('change', () => {
      node.agentType = agentTypeSelect.value;

      // Refresh the node editor to show/hide relevant options
      AgentNodes.updateNodeEditor(node);
    });

    maxIterationsInput.addEventListener('change', () => {
      node.maxIterations = parseInt(maxIterationsInput.value, 10);
    });

    autoIterateInput.addEventListener('change', () => {
      node.autoIterate = autoIterateInput.checked;
    });
  }
};

// Initialize the Agent Nodes when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Agent Nodes
  AgentNodes.init();
});

// Extend the App object to update the node editor for agent nodes
document.addEventListener('DOMContentLoaded', function() {
  if (window.App) {
    // Store the original openNodeEditor method
    const originalOpenNodeEditor = App.openNodeEditor;

    // Override the openNodeEditor method to add agent node options
    App.openNodeEditor = function(node) {
      // Call the original method
      originalOpenNodeEditor.call(App, node);

      // Add agent node options if needed
      if (node && node.nodeType === 'agent') {
        // Use setTimeout to ensure the DOM is fully updated after the original method
        setTimeout(() => {
          console.log('Calling updateNodeEditor for agent node after delay');
          AgentNodes.updateNodeEditor(node);
        }, 100);
      }
    };
  }
});
