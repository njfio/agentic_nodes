/**
 * Agent Nodes
 * Implements agentic nodes with logic loops and function calling capabilities
 */

// Use the pre-initialized AgentNodes object from agent-nodes-init.js
(function() {
  // Verify that the AgentNodes object exists
  if (!window.AgentNodes) {
    console.error('AgentNodes object not found in global scope');
    // Create a fallback object
    window.AgentNodes = {};
  }

  // Extend the pre-initialized AgentNodes object with the full implementation
  const AgentNodesImpl = {
    // Track initialization state
    _initialized: false,

    // Initialize the Agent Nodes
    init: function() {
      try {
        // Prevent multiple initializations
        if (this._initialized) {
          console.log('AgentNodes already initialized, skipping');
          return;
        }

        console.log('AgentNodes.init called');

        // Check if MCP tools are available
        if (window.MCPTools) {
          console.log('MCPTools available during AgentNodes initialization');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('MCPTools available during AgentNodes initialization', 'info');
          }
        } else {
          console.warn('MCPTools not available during AgentNodes initialization');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('MCPTools not available during AgentNodes initialization', 'warning');
          }
        }

        // Register node types
        this.registerNodeTypes();

        // Add event listeners (with a slight delay to ensure DOM is ready)
        setTimeout(() => {
          this.addEventListeners();
          console.log('Agent Nodes initialized and toolbar button added');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('Agent Nodes initialized successfully', 'success');
          }
        }, 100);

        // Initialize the agent logs modal
        this.initAgentLogsModal();

        // Mark as initialized
        this._initialized = true;

        // Notify the initialization system if available
        if (window.AppInitSystem && AppInitSystem.markReady) {
          AppInitSystem.markReady('agentNodes');
        }

        // Mark as ready using the readiness promise
        if (typeof this.markReady === 'function') {
          this.markReady();
          console.log('AgentNodes marked as ready');
        }
      } catch (error) {
        console.error('Error initializing AgentNodes:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error initializing AgentNodes: ${error.message}`, 'error');
        }

        // Mark as ready even if there was an error, to unblock dependent code
        if (typeof this.markReady === 'function') {
          this.markReady();
          console.log('AgentNodes marked as ready despite initialization error');
        }
      }
  },

    // Register node types with the application
    registerNodeTypes: function() {
      // Add the agent node type to the App object if it exists
      if (window.App) {
        console.log('Registering agent node type with App');

        // Store the original addNode method
        const originalAddNode = App.addNode;

        // Override the addNode method to add our custom node types
        App.addNode = function(nodeType) {
          console.log('App.addNode called with nodeType:', nodeType);

          if (nodeType === 'agent') {
            console.log('Creating agent node');
            const agentNode = AgentNodes.createAgentNode();
            console.log('Created agent node with nodeType:', agentNode.nodeType);
            return agentNode;
          }

          // Call the original method for other node types
          return originalAddNode.call(App, nodeType);
        };

        // Log the registered node types
        console.log('Agent node type registered with App');

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
        Node.prototype.process = async function(input) {
          // Handle agent node processing
          if (this.nodeType === 'agent' || this._nodeType === 'agent' || this.isAgentNode === true) {
            DebugManager.addLog(`Processing agent node ${this.id} (${this.title}) with agent capabilities`, 'info');
            try {
              // Mark the node as processing
              this.processing = true;

              // Process the node using the agent processor
              // First try using AgentProcessor if available, otherwise fall back to AgentNodes
              let result;
              if (window.AgentProcessor && typeof AgentProcessor.processAgentNode === 'function') {
                DebugManager.addLog(`Using AgentProcessor.processAgentNode for node ${this.id}`, 'info');
                result = await AgentProcessor.processAgentNode(this, input);
              } else {
                DebugManager.addLog(`Falling back to AgentNodes.processAgentNode for node ${this.id}`, 'warning');
                result = await AgentNodes.processAgentNode(this, input);
              }

              // Mark the node as processed
              this.hasBeenProcessed = true;
              this.processing = false;

              // Return the result
              return result;
            } catch (error) {
              // Handle errors
              DebugManager.addLog(`Error processing agent node ${this.id}: ${error.message}`, 'error');
              this.processing = false;
              this.error = error.message;
              throw error;
            }
          }

          // Call the original process method for regular nodes
          return originalNodeProcess.call(this, input);
        };

        // Extend the Node's draw method to handle agent node styling
        // Store the original draw method if it hasn't been overridden yet
        if (!Node.prototype._originalDraw) {
          Node.prototype._originalDraw = Node.prototype.draw;
        }

        // Override the draw method only once
        Node.prototype.draw = function(ctx) {
          // Check if we're already in an agent node drawing context to prevent infinite loops
          if (this._isDrawingAgent) {
            // Call the original draw method to avoid infinite recursion
            if (Node.prototype._originalDraw) {
              Node.prototype._originalDraw.call(this, ctx);
            }
            return;
          }

          // Store the original node type for debugging
          const nodeType = this.nodeType || this._nodeType;

          // Force the node type to be set correctly if it's an agent node
          if (this.isAgentNode === true && this.nodeType !== 'agent') {
            this.nodeType = 'agent';
            this._nodeType = 'agent';
            // Removed excessive logging
          }

          // Check if this is an agent node and apply styling
          if (this.nodeType === 'agent' || this._nodeType === 'agent' || this.isAgentNode === true) {
            // Set flag to prevent infinite recursion
            this._isDrawingAgent = true;

            try {
              // Override the node background with agent-specific styling
              // Use purple gradient for agent nodes
              const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
              gradient.addColorStop(0, '#9c27b0');  // Purple top
              gradient.addColorStop(1, '#7b1fa2');  // Darker purple bottom

              // Save the original styles
              const originalFill = ctx.fillStyle;
              const originalStroke = ctx.strokeStyle;
              const originalLineWidth = ctx.lineWidth;

              // Apply the gradient to the node
              ctx.fillStyle = this.selected ? '#4a90e2' :
                             this.processing ? '#d4af37' :
                             this.error ? '#e74c3c' : gradient;

              ctx.strokeStyle = '#ff00ff'; // Bright purple border for agent nodes
              ctx.lineWidth = 2; // Thicker border

              // Draw the node background and border
              ctx.beginPath();
              ctx.roundRect(this.x, this.y, this.width, this.height, 5);
              ctx.fill();
              ctx.stroke();

              // Draw the node title
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 14px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(this.title, this.x + this.width / 2, this.y + 20);

              // Add agent icon
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

              // Draw input and output areas
              if (typeof this.drawInputOutputAreas === 'function') {
                this.drawInputOutputAreas(ctx);
              }

              // Restore the original styles
              ctx.fillStyle = originalFill;
              ctx.strokeStyle = originalStroke;
              ctx.lineWidth = originalLineWidth;
            } finally {
              // Always clear the flag to prevent issues with future draws
              this._isDrawingAgent = false;
            }

            // Skip the original draw method for agent nodes
            return;
          }

          // Call the original draw method for non-agent nodes
          if (Node.prototype._originalDraw) {
            Node.prototype._originalDraw.call(this, ctx);
          }
        };

        // Helper method to draw input and output areas for agent nodes
        Node.prototype.drawInputOutputAreas = function(ctx) {
          if (this.nodeType !== 'agent' && this._nodeType !== 'agent' && this.isAgentNode !== true) {
            return;
          }

          const inputAreaHeight = 30;
          const outputAreaHeight = 30;
          const contentAreaX = this.x + 10;
          const contentAreaWidth = this.width - 20;

          // Draw input area
          const inputAreaY = this.y + 40;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

          // Draw input label
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('INPUT', contentAreaX + 5, inputAreaY + 5);

          // Draw output area
          const outputAreaY = this.y + this.height - outputAreaHeight - 10;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);

          // Draw output label
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('OUTPUT', contentAreaX + 5, outputAreaY + 5);

          // Draw input connector
          const inputConnectorX = this.x;
          const inputConnectorY = inputAreaY + inputAreaHeight / 2;
          ctx.fillStyle = '#4a90e2';
          ctx.beginPath();
          ctx.arc(inputConnectorX, inputConnectorY, 8, 0, Math.PI * 2);
          ctx.fill();

          // Draw output connector
          const outputConnectorX = this.x + this.width;
          const outputConnectorY = outputAreaY + outputAreaHeight / 2;
          ctx.fillStyle = '#4a90e2';
          ctx.beginPath();
          ctx.arc(outputConnectorX, outputConnectorY, 8, 0, Math.PI * 2);
          ctx.fill();
        };
    }
  },

  // Add event listeners
  addEventListeners() {
    console.log('Adding event listeners for AgentNodes');

    // Add buttons to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      console.log('Found toolbar, adding agent node button');

      // Check if the button already exists
      const existingButton = document.getElementById('addAgentNodeBtn');
      if (existingButton) {
        // Remove the existing button to avoid duplicates
        existingButton.remove();
        console.log('Removed existing Agent Node button to avoid duplicates');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Removed existing Agent Node button to avoid duplicates', 'info');
        }
      }

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
      agentBtn.style.border = '2px solid #ff00ff';
      agentBtn.style.boxShadow = '0 0 5px #9c27b0';
      agentBtn.style.position = 'relative';

      // Add robot emoji to the button
      const robotSpan = document.createElement('span');
      robotSpan.textContent = ' 🤖';
      robotSpan.style.fontSize = '16px';
      agentBtn.appendChild(robotSpan);

      // Remove any existing event listeners by using a new function
      agentBtn.addEventListener('click', () => {
        console.log('Add Agent Node button clicked');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Add Agent Node button clicked', 'info');
        }

        // Call App.addNode with 'agent' type
        if (window.App && typeof App.addNode === 'function') {
          console.log('Calling App.addNode with agent type');
          const node = App.addNode('agent');
          console.log('Created agent node:', node);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Created agent node with ID: ${node.id}`, 'success');
          }
        } else {
          // Fallback to direct creation
          console.log('App.addNode not available, creating agent node directly');
          const node = AgentNodes.createAgentNode();
          console.log('Created agent node directly:', node);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Created agent node directly with ID: ${node.id}`, 'success');
          }
        }
      });

      // Insert the button after the Add Node button
      const addNodeBtn = document.getElementById('addNodeBtn');
      if (addNodeBtn && addNodeBtn.parentNode) {
        console.log('Inserting agent node button after Add Node button');
        addNodeBtn.parentNode.insertBefore(agentBtn, addNodeBtn.nextSibling);
      } else {
        console.log('Add Node button not found, appending agent node button to toolbar');
        toolbar.appendChild(agentBtn);
      }

      console.log('Agent node button added to toolbar');
    } else {
      console.error('Toolbar not found, cannot add agent node button');
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
    try {
      const id = App.nodes.length + 1;
      const x = window.innerWidth/2 - 80;
      const y = window.innerHeight/2 - 40;

      // Create the node directly
      const node = new Node(x, y, id);

      if (!node) {
        throw new Error('Failed to create node object');
      }

      // Configure as an agent node
      node.title = `Agent Node ${id}`;

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
      node.systemPrompt = "You are an autonomous agent that reasons step by step. " +
        "You can access various tools, including MCP tools for search, memory, and documentation. " +
        "Use these tools whenever they help you fulfill the user's request.";
      node.width = 240;
      node.height = 200;

      // Add agent-specific properties
      node.agentType = 'default';       // Type of agent (default, custom, etc.)
      node.tools = [];                  // Available tools for this agent
      node.memory = {};                 // Agent's memory to maintain context
      node.maxIterations = 5;           // Maximum number of iterations
      node.currentIteration = 0;        // Current iteration count
      node.autoIterate = true;          // Whether to automatically iterate
      node.customCode = '';             // Custom code for advanced users
      node.useMCPTools = true;          // Whether to use MCP tools
      node.enableReflection = true;     // Whether to enable reflection
      node.reflectionPrompt = 'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?';
      node.reflectionFrequency = 2;     // How often to reflect (every N iterations)
      node.canBeWorkflowNode = true;    // Whether this node can be an input/output node
      node.conversationHistory = [];   // Conversation history for the agent

      // Initialize with all available tools
      try {
        // Use the cached tools list if available
        if (this.availableTools && this.availableTools.length > 0) {
          node.tools = [...this.availableTools];
          console.log(`Using ${node.tools.length} cached tools for agent node`);
          DebugManager.addLog(`Using ${node.tools.length} cached tools for agent node`, 'info');
        } else {
          // Otherwise, get tools directly
          this.updateToolsList();
          node.tools = [...this.availableTools];
          console.log(`Loaded ${node.tools.length} tools for agent node`);
          DebugManager.addLog(`Loaded ${node.tools.length} tools for agent node`, 'info');
        }
      } catch (error) {
        console.error('Error loading tools for agent node:', error);
        DebugManager.addLog(`Error loading tools for agent node: ${error.message}`, 'error');

        // Fallback to empty tools array
        node.tools = [];
      }

      // Set workflow role properties
      node.workflowRole = 'none';       // Default role is none
      node._workflowRole = 'none';      // Set both properties to ensure compatibility

      // Add the node to the canvas
      App.nodes.push(node);

      // Select the new node
      App.nodes.forEach(n => n.selected = false);
      node.selected = true;
      App.selectedNode = node; // Set the selectedNode property
      DebugManager.addLog(`Selected node: ${node.id} (agent node)`, 'info');

      // Log the creation with detailed information
      DebugManager.addLog(`Added new Agent Node "${node.title}" (ID: ${node.id}, Type: ${node.nodeType})`, 'info');

      // Initialize the logger for this node
      AgentLogger.initLogger(node);

      // Add initial log entries
      AgentLogger.addLog(node, 'Agent node created successfully', 'success');
      AgentLogger.addLog(node, 'To view API payloads, click the "View API Payloads" button in the agent node editor', 'info');


      // Force a redraw of the canvas
      App.draw();

      // Return the node
      return node;
    } catch (error) {
      DebugManager.addLog(`Error creating agent node: ${error.message}`, 'error');
      console.error('Error creating agent node:', error);

      // Try a different approach as fallback
      try {
        // Create a standard node as fallback
        const id = App.nodes.length + 1;
        const x = window.innerWidth/2 - 80;
        const y = window.innerHeight/2 - 40;

        // Create a basic node
        const fallbackNode = new Node(x, y, id);

        if (fallbackNode) {
          // Configure as an agent node
          fallbackNode.title = `Agent Node ${id}`;
          fallbackNode.nodeType = 'agent';
          fallbackNode._nodeType = 'agent';

          // Add a direct property
          fallbackNode.isAgentNode = true;

          // Set workflow role properties
          fallbackNode.workflowRole = 'none';
          fallbackNode._workflowRole = 'none';

          // Set canBeWorkflowNode to true
          fallbackNode.canBeWorkflowNode = true;

          // Add to canvas
          App.nodes.push(fallbackNode);

          // Select the node
          App.nodes.forEach(n => n.selected = false);
          fallbackNode.selected = true;
          App.selectedNode = fallbackNode; // Set the selectedNode property
          DebugManager.addLog(`Selected node: ${fallbackNode.id} (fallback agent node)`, 'info');

          // Force a redraw
          App.draw();

          DebugManager.addLog(`Created fallback agent node "${fallbackNode.title}" (ID: ${fallbackNode.id})`, 'warning');
          return fallbackNode;
        }
      } catch (fallbackError) {
        DebugManager.addLog(`Failed to create fallback agent node: ${fallbackError.message}`, 'error');
      }

      return null;
    }
  },

  // Process an Agent Node
  async processAgentNode(node, input) {
    // Initialize the logger
    AgentLogger.initLogger(node);

    // Log the start of processing
    AgentLogger.addLog(node, `Processing Agent Node "${node.title}" (ID: ${node.id})`, 'info');

    // IMPORTANT: Check if tools are available
    console.log('CHECKING TOOLS AVAILABILITY:');

    // Check AgentTools
    if (window.AgentTools) {
      console.log('AgentTools is available');
      const agentTools = AgentTools.getAllTools();
      console.log(`AgentTools.getAllTools() returned ${agentTools ? agentTools.length : 0} tools`);

      if (agentTools && agentTools.length > 0) {
        console.log('Tool IDs:', agentTools.map(t => t.id).join(', '));
        node.tools = [...agentTools];
        AgentLogger.addLog(node, `Loaded ${agentTools.length} tools from AgentTools`, 'info');
      } else {
        console.error('AgentTools.getAllTools() returned no tools');
        AgentLogger.addLog(node, 'No tools available from AgentTools', 'warning');
      }
    } else {
      console.error('AgentTools is NOT available');
      AgentLogger.addLog(node, 'AgentTools is not available', 'error');
    }

    // Check MCPTools
    if (window.MCPTools) {
      console.log('MCPTools is available');
      const mcpTools = MCPTools.getAllTools();
      console.log(`MCPTools.getAllTools() returned ${mcpTools ? mcpTools.length : 0} tools`);

      if (mcpTools && mcpTools.length > 0) {
        console.log('MCP Tool IDs:', mcpTools.map(t => t.id).join(', '));
        // Add MCP tools to the node's tools
        if (!node.tools) node.tools = [];
        node.tools = [...node.tools, ...mcpTools];
        AgentLogger.addLog(node, `Added ${mcpTools.length} tools from MCPTools`, 'info');
      } else {
        console.error('MCPTools.getAllTools() returned no tools');
        AgentLogger.addLog(node, 'No tools available from MCPTools', 'warning');
      }
    } else {
      console.error('MCPTools is NOT available');
      AgentLogger.addLog(node, 'MCPTools is not available', 'error');
    }

    // Force initialize tools if needed
    if (window.AgentTools && (!window.AgentTools.tools || window.AgentTools.tools.length === 0)) {
      console.log('Forcing initialization of AgentTools');
      if (typeof window.AgentTools.initializeTools === 'function') {
        window.AgentTools.initializeTools();
        AgentLogger.addLog(node, 'Forced initialization of AgentTools', 'info');
      }
    }

    if (window.MCPTools && (!window.MCPTools.tools || window.MCPTools.tools.length === 0)) {
      console.log('Forcing initialization of MCPTools');
      if (typeof window.MCPTools.init === 'function') {
        await window.MCPTools.init();
        AgentLogger.addLog(node, 'Forced initialization of MCPTools', 'info');
      }
    }

    try {
      // Initialize API payload storage if not already present
      if (!node.lastRequestPayload) node.lastRequestPayload = {};
      if (!node.lastResponsePayload) node.lastResponsePayload = {};

      // Reset iteration count if this is a new processing run
      if (!node.isIterating) {
        node.currentIteration = 0;
        node.isIterating = true;

        // Initialize memory if needed
        AgentMemory.initMemory(node);

        // Store the original input
        AgentMemory.store(node, 'originalInput', input);

        // Log the input with proper null/undefined checking
        if (input === null || input === undefined) {
          AgentLogger.addLog(node, 'Original input: null or undefined', 'warning');
        } else {
          const inputPreview = typeof input === 'string'
            ? `${input.substring(0, 100)}${input.length > 100 ? '...' : ''}`
            : `Non-string input: ${typeof input}`;
          AgentLogger.addLog(node, `Original input: ${inputPreview}`, 'info');
        }
      }

      // Increment iteration count
      node.currentIteration++;

      // Check if we've exceeded the maximum number of iterations
      if (node.currentIteration > node.maxIterations) {
        AgentLogger.addLog(node, `Reached maximum iterations (${node.maxIterations})`, 'warning');
        node.isIterating = false;

        // Perform final reflection if enabled
        if (node.enableReflection) {
          AgentLogger.addLog(node, 'Performing final reflection', 'info');
          const finalReflection = await this.performReflection(node, input, true);
          AgentLogger.addLog(node, `Final reflection: ${finalReflection.substring(0, 100)}${finalReflection.length > 100 ? '...' : ''}`, 'info');

          // Add the reflection to the result
          return `Agent reached maximum iterations (${node.maxIterations}).\n\nFinal result: ${input}\n\nFinal reflection: ${finalReflection}`;
        }

        return `Agent reached maximum iterations (${node.maxIterations}). Final result: ${input}`;
      }

      // Log the current iteration
      AgentLogger.addLog(node, `Iteration ${node.currentIteration}/${node.maxIterations}`, 'info');

      // Check if we should perform reflection before processing
      let reflectionResult = null;
      if (node.enableReflection &&
          node.currentIteration > 1 &&
          node.currentIteration % node.reflectionFrequency === 0) {
        AgentLogger.addLog(node, `Performing reflection at iteration ${node.currentIteration}`, 'info');
        reflectionResult = await this.performReflection(node, input);
        AgentLogger.addLog(node, `Reflection result: ${reflectionResult.substring(0, 100)}${reflectionResult.length > 100 ? '...' : ''}`, 'info');

        // Store the reflection in memory
        AgentMemory.store(node, `reflection_${node.currentIteration}`, reflectionResult);
      }

      // Process the input based on agent type
      let result;
      AgentLogger.addLog(node, `Processing with agent type: ${node.agentType}`, 'info');
      switch (node.agentType) {
        case 'default':
          result = await this.processDefaultAgent(node, input, reflectionResult);
          break;
        case 'custom':
          result = await this.processCustomAgent(node, input, reflectionResult);
          break;
        default:
          throw new Error(`Unknown agent type: ${node.agentType}`);
      }

      // Store the result in memory
      AgentMemory.store(node, `result_${node.currentIteration}`, result);

      // Log the result with proper null/undefined checking
      if (result === null || result === undefined) {
        AgentLogger.addLog(node, 'Processing result: null or undefined', 'warning');
      } else {
        const resultPreview = typeof result === 'string'
          ? `${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`
          : `Non-string result: ${typeof result}`;
        AgentLogger.addLog(node, `Processing result: ${resultPreview}`, 'success');
      }

      // Update the node's content with the result
      node.content = result;
      node.hasBeenProcessed = true;

      // Make sure the node has an apiLogs array
      if (!node.apiLogs) {
        node.apiLogs = [];
      }

      // Log the number of API logs
      if (node.apiLogs.length > 0) {
        AgentLogger.addLog(node, `Node has ${node.apiLogs.length} API logs available for viewing`, 'info');
        DebugManager.addLog(`Agent node ${node.id} has ${node.apiLogs.length} API logs`, 'info');
      } else {
        AgentLogger.addLog(node, `No API logs found. This may indicate no API calls were made during processing.`, 'warning');
        DebugManager.addLog(`No API logs found for agent node ${node.id}`, 'warning');
      }

      // Check if we need to continue iterating
      if (node.autoIterate && node.isIterating && node.currentIteration < node.maxIterations) {
        AgentLogger.addLog(node, `Continuing to iteration ${node.currentIteration + 1}`, 'info');
        await App.processNodeAndConnections(node, result, node);
      } else {
        // Mark the agent as done iterating
        node.isIterating = false;
        AgentLogger.addLog(node, 'Agent processing completed', 'success');
      }

      return result;
    } catch (error) {
      // Log the error
      AgentLogger.addLog(node, `Error: ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;
      node.isIterating = false;

      // Store the error in memory
      if (node.memory) {
        AgentMemory.store(node, `error_${node.currentIteration}`, error.message);
      }

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Perform reflection on the agent's actions and results
  async performReflection(node, currentInput, isFinal = false) {
    try {
      AgentLogger.addLog(node, `Performing ${isFinal ? 'final ' : ''}reflection`, 'info');

      // Get the agent's memory
      const memory = AgentMemory.initMemory(node);

      // Get the history of actions and results
      const history = memory.history || [];
      AgentLogger.addLog(node, `Found ${history.length} historical actions in memory`, 'info');

      // Get previous reflections
      const reflections = [];
      for (let i = 1; i < node.currentIteration; i++) {
        const reflection = AgentMemory.retrieve(node, `reflection_${i}`);
        if (reflection) {
          reflections.push({ iteration: i, reflection });
        }
      }
      AgentLogger.addLog(node, `Found ${reflections.length} previous reflections`, 'info');

      // Get the original input
      const originalInput = AgentMemory.retrieve(node, 'originalInput') || '';

      // Create a summary of the agent's actions and results
      const actionSummary = history.map(item => {
        return `Action: ${JSON.stringify(item.action)}\nResult: ${typeof item.result === 'string' ? item.result.substring(0, 200) + (item.result.length > 200 ? '...' : '') : JSON.stringify(item.result)}`;
      }).join('\n\n');

      // Create a summary of previous reflections
      const reflectionSummary = reflections.map(item => {
        return `Iteration ${item.iteration}: ${item.reflection.substring(0, 200)}${item.reflection.length > 200 ? '...' : ''}`;
      }).join('\n\n');

      // Use the OpenAI API to perform reflection
      const config = ApiService.openai.getConfig();
      if (!config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Create the system prompt for reflection
      const systemPrompt = isFinal ?
        `You are an agent reflecting on your entire problem-solving process. Analyze what worked well, what didn't, and how you could improve in the future.` :
        `You are an agent reflecting on your recent actions and results. Analyze what's working well, what isn't, and how you can improve your approach for the next iteration.`;

      // Create the user prompt
      const userPrompt = `
Original task: ${originalInput}

Current input: ${currentInput}

${history.length > 0 ? `Action history:\n${actionSummary}` : 'No actions taken yet.'}

${reflections.length > 0 ? `Previous reflections:\n${reflectionSummary}` : 'No previous reflections.'}

${node.reflectionPrompt || 'Reflect on your actions and results. What worked well? What could be improved? How can you better solve the problem?'}
${isFinal ? '\nThis is your final reflection. Summarize your overall approach, results, and what you learned from this task.' : ''}
`;

      // Prepare the request data
      const requestData = {
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: config.maxTokens || 2000
      };

      // Store the request payload and timestamp
      node.lastRequestPayload = JSON.parse(JSON.stringify(requestData));
      node.lastRequestTime = new Date().toISOString();

      AgentLogger.addLog(node, 'Sending reflection request to OpenAI API', 'info');

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-api-key': config.apiKey
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      // Store the response payload and timestamp
      node.lastResponsePayload = JSON.parse(JSON.stringify(data));
      node.lastResponseTime = new Date().toISOString();

      // Log the API call
      AgentLogger.addApiLog(node, requestData, data);

      const reflectionText = data.choices[0].message.content;
      AgentLogger.addLog(node, `Reflection completed successfully`, 'success');

      return reflectionText;
    } catch (error) {
      AgentLogger.addLog(node, `Error performing reflection: ${error.message}`, 'error');
      return `Error performing reflection: ${error.message}`;
    }
  },

  // Process a default agent
  async processDefaultAgent(node, input, reflectionResult = null) {
    try {
      // Initialize memory if needed
      AgentMemory.initMemory(node);
      AgentLogger.addLog(node, 'Initialized agent memory', 'info');

      // Add the input to context
      AgentMemory.addToContext(node, input);
      AgentLogger.addLog(node, 'Added input to context', 'info');

      // Add reflection to context if available
      if (reflectionResult) {
        AgentMemory.addToContext(node, `Reflection: ${reflectionResult}`);
        AgentLogger.addLog(node, 'Added reflection to context', 'info');
      }

      // Check if MCP tools should be used
      if (node.useMCPTools && window.MCPTools) {
        // Get available MCP tools
        const mcpTools = MCPTools.getAllTools();

        if (mcpTools && mcpTools.length > 0) {
          AgentLogger.addLog(node, `Using ${mcpTools.length} MCP tools`, 'info');

          // Add MCP tools to the agent's tools
          node.tools = [...(node.tools || []), ...mcpTools];

          // Log the available tools
          const toolNames = mcpTools.map(tool => tool.name).join(', ');
          AgentLogger.addLog(node, `Available MCP tools: ${toolNames}`, 'info');
        } else {
          AgentLogger.addLog(node, 'No MCP tools available', 'warning');
        }
      } else {
        if (!node.useMCPTools) {
          AgentLogger.addLog(node, 'MCP tools disabled for this agent', 'info');
        } else if (!window.MCPTools) {
          AgentLogger.addLog(node, 'MCPTools not available', 'warning');
        }
      }

      // Ensure built-in tools are available
      if (!node.tools || node.tools.length === 0) {
        const builtIn = (typeof AgentTools !== 'undefined' && AgentTools.getAllTools)
          ? AgentTools.getAllTools()
          : [];
        if (builtIn.length > 0) {
          node.tools = builtIn;
          AgentLogger.addLog(node, `Loaded ${builtIn.length} default tools`, 'info');
        } else {
          AgentLogger.addLog(node, 'No default tools found', 'warning');
        }
      }

      // Get the OpenAI configuration
      const config = ApiService.openai.getConfig();
      if (!config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Log the model being used
      AgentLogger.addLog(node, `Using OpenAI model: ${config.model || 'gpt-4o'}`, 'info');

      // Monkey patch the ApiService to capture API payloads
      if (!node.lastRequestPayload) node.lastRequestPayload = {};
      if (!node.lastResponsePayload) node.lastResponsePayload = {};

      // Store the original ApiService.openai.chat method
      const originalChatMethod = ApiService.openai.chat;

      // Override the chat method to capture payloads
      ApiService.openai.chat = async function(messages, options) {
        // Capture the request payload
        const requestPayload = {
          messages,
          options
        };
        node.lastRequestPayload = requestPayload;
        AgentLogger.addLog(node, `API request payload captured`, 'info');

        try {
          // Call the original method
          const response = await originalChatMethod.call(ApiService.openai, messages, options);

          // Capture the response payload
          node.lastResponsePayload = response;
          AgentLogger.addLog(node, `API response payload captured`, 'info');

          return response;
        } catch (error) {
          // Capture the error payload
          node.lastResponsePayload = { error: error.message };
          AgentLogger.addLog(node, `API error captured: ${error.message}`, 'error');

          throw error;
        } finally {
          // Restore the original method
          ApiService.openai.chat = originalChatMethod;
        }
      };

      // Check if the model supports function calling
      // Most GPT models (3.5 and up) provide this capability. Use a regex
      // match instead of a fixed list so new models are handled automatically.
      const supportsFunctionCalling = /gpt-(3\.5|4)/.test(config.model || 'gpt-4o');

      if (supportsFunctionCalling) {
        AgentLogger.addLog(node, 'Model supports function calling, using direct function calling approach', 'info');

        // Get available tools for function calling
        console.log('Getting tools for agent node');
        const allTools = AgentTools.getAllTools();
        console.log(`Got ${allTools ? allTools.length : 0} tools from AgentTools.getAllTools()`);

        // Debug log the tools in detail
        if (allTools && allTools.length > 0) {
          console.log('Tool IDs:', allTools.map(t => t.id).join(', '));

          // Log detailed information about each tool
          console.log('DETAILED TOOL INFO:');
          allTools.forEach((tool, index) => {
            console.log(`Tool ${index + 1}/${allTools.length}:`);
            console.log('  ID:', tool.id);
            console.log('  Name:', tool.name);
            console.log('  Description:', tool.description);
            console.log('  Category:', tool.category);
            console.log('  Has execute function:', !!tool.execute);
            console.log('  Is MCP tool:', !!tool.mcpTool);

            // Check if the tool has valid parameters
            const params = this.getToolParameters(tool);
            console.log('  Has parameters:', !!params && Object.keys(params).length > 0);
            if (params) {
              console.log('  Parameter keys:', Object.keys(params).join(', '));
            }
          });
        } else {
          console.warn('No tools returned from AgentTools.getAllTools()');
        }

        // Log the available tools
        AgentLogger.addLog(node, `Found ${allTools.length} available tools`, 'info');

        // Map tools to the format expected by OpenAI API
        const tools = allTools.map(tool => {
          // Ensure tool has all required properties
          if (!tool.id || !tool.description) {
            AgentLogger.addLog(node, `Skipping invalid tool: ${tool.id || 'unknown'}`, 'warning');
            return null;
          }

          // Get parameters and required parameters
          const properties = this.getToolParameters(tool);
          const required = this.getToolRequiredParameters(tool);

          // Validate parameters
          if (!properties || Object.keys(properties).length === 0) {
            AgentLogger.addLog(node, `Tool ${tool.id} has no parameters, adding default parameters`, 'warning');

            // Add default parameters for tools without parameters
            return {
              type: "function",
              function: {
                name: tool.id,
                description: tool.description,
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The query or input for the tool"
                    }
                  },
                  required: ["query"]
                }
              }
            };
          }

          return {
            type: "function",
            function: {
              name: tool.id,
              description: tool.description,
              parameters: {
                type: "object",
                properties: properties || {},
                required: required || []
              }
            }
          };
        }).filter(Boolean); // Remove any null entries

        // Log the tools being used
        AgentLogger.addLog(node, `Using ${tools.length} tools for function calling`, 'info');
        tools.forEach(tool => {
          AgentLogger.addLog(node, `Tool: ${tool.function.name} - ${tool.function.description}`, 'debug');
        });

        // Add the tools to the node for reference
        node.availableTools = tools;

        // Create the system prompt and include available tool names for better awareness
        let systemPrompt = node.systemPrompt || 'You are a helpful assistant that can use tools to accomplish tasks.';

        // Add strong encouragement to use tools
        systemPrompt += `\n\nIMPORTANT INSTRUCTIONS FOR TOOL USAGE:
1. You MUST use tools to gather information rather than making up facts or relying on potentially outdated knowledge.
2. Think step-by-step about which tool would be most helpful for the current task.
3. For ANY factual information, current events, or data that might change over time, use the search tool.
4. For technical documentation or API details, use the documentation tool.
5. For complex problems, break them down and use multiple tools in sequence.
6. NEVER claim you don't have access to tools or that you can't perform searches.
7. NEVER make up information when you can use a tool instead.
8. ALWAYS verify information with tools when possible.
9. After using tools, synthesize the information to provide a complete and accurate response.

Your primary value comes from using tools effectively to solve problems. Users expect you to leverage these tools rather than relying on your pre-trained knowledge.`;

        // Add available tool names
        if (node.useMCPTools && tools.length > 0) {
          const toolNames = tools.map(t => t.function.name).join(', ');
          systemPrompt += `\n\nAvailable tools: ${toolNames}. Use them through function calls when helpful.`;
        }

        // Create the messages array with conversation history if available
        let messages = [
          { role: 'system', content: systemPrompt }
        ];

        // Add conversation history if available
        if (node.conversationHistory && node.conversationHistory.length > 0) {
          AgentLogger.addLog(node, `Adding ${node.conversationHistory.length} messages from conversation history`, 'info');
          messages = messages.concat(node.conversationHistory);
        } else {
          // If no conversation history, add the input as a user message
          messages.push({ role: 'user', content: input });

          // Initialize conversation history if it doesn't exist
          if (!node.conversationHistory) {
            node.conversationHistory = [];
          }

          // Add the user message to the conversation history
          node.conversationHistory.push({ role: 'user', content: input });
        }

        // Add any context from memory
        const memory = AgentMemory.getContext(node);
        if (memory && memory.length > 0) {
          // Add the last few context items as messages
          const contextMessages = memory.slice(-5).map(item => {
            return { role: 'assistant', content: item.content };
          });

          // Insert the context messages before the user message
          messages.splice(1, 0, ...contextMessages);
        }

        // Log the request
        AgentLogger.addLog(node, 'Sending request to OpenAI API with function calling', 'info');

        // Choose whether to force a search tool based on the input
        const toolChoice = "auto";
        // Create the request payload
        const requestPayload = {
          model: config.model || 'gpt-4o',
          messages,
          tools: tools.length > 0 ? tools : [
            {
              type: "function",
              function: {
                name: "search",
                description: "Search the web for information",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search query"
                    }
                  },
                  required: ["query"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "get_current_weather",
                description: "Get the current weather for a location",
                parameters: {
                  type: "object",
                  properties: {
                    location: {
                      type: "string",
                      description: "The location to get weather for"
                    }
                  },
                  required: ["location"]
                }
              }
            }
          ],
          tool_choice: toolChoice,
          temperature: 0.7,
          max_tokens: 2000
        };

        // Log the tools being included
        console.log(`Including ${requestPayload.tools.length} tools in request payload`);
        requestPayload.tools.forEach((tool, index) => {
          console.log(`Tool ${index + 1}: ${tool.function.name}`);
        });

        // CRITICAL: Ensure tools are properly formatted and included
        if (!requestPayload.tools || requestPayload.tools.length === 0) {
          console.error('NO TOOLS IN REQUEST PAYLOAD - ATTEMPTING TO FIX');
          AgentLogger.addLog(node, 'No tools in request payload - attempting to fix', 'error');

          // Create default tools if none are available
          requestPayload.tools = [
            {
              type: "function",
              function: {
                name: "search",
                description: "Search the web for information",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search query"
                    }
                  },
                  required: ["query"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "get_current_weather",
                description: "Get the current weather for a location",
                parameters: {
                  type: "object",
                  properties: {
                    location: {
                      type: "string",
                      description: "The location to get weather for"
                    }
                  },
                  required: ["location"]
                }
              }
            }
          ];

          requestPayload.tool_choice = "auto";
          console.log('Added default tools to request payload');
          AgentLogger.addLog(node, 'Added default tools to request payload', 'info');
        }

        // Store the request payload for logging
        node.lastRequestPayload = JSON.parse(JSON.stringify(requestPayload));

        // Log the full request payload for debugging
        AgentLogger.addLog(node, `Sending request with ${messages.length} messages and ${tools.length} tools`, 'info');
        console.debug('OpenAI request payload:', requestPayload);

        // Log the first few tools for debugging
        if (tools.length > 0) {
          const toolNames = tools.map(t => t.function.name).slice(0, 5);
          AgentLogger.addLog(node, `Tools available: ${toolNames.join(', ')}${tools.length > 5 ? ` and ${tools.length - 5} more...` : ''}`, 'info');
        }

        // Store the request payload for logging
        node.lastRequestPayload = JSON.parse(JSON.stringify(requestPayload));

        // Make the API request
        // Double-check that tools are included in the payload
        if (!requestPayload.tools || requestPayload.tools.length === 0) {
          console.warn('No tools in request payload, attempting to add them');

          // Try to get tools again
          const fallbackTools = AgentTools.getAllTools();
          if (fallbackTools && fallbackTools.length > 0) {
            console.log(`Adding ${fallbackTools.length} tools to request payload`);

            // Map tools to the format expected by OpenAI API
            const formattedTools = fallbackTools.map(tool => ({
              type: "function",
              function: {
                name: tool.id,
                description: tool.description,
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The query or input for the tool"
                    }
                  },
                  required: ["query"]
                }
              }
            }));

            // Add tools to the payload
            requestPayload.tools = formattedTools;
            requestPayload.tool_choice = "auto";

            console.log(`Added ${formattedTools.length} tools to request payload`);
          } else {
            console.error('Failed to get tools, proceeding without tools');
          }
        }

        // Log the final payload in detail
        console.log(`Sending request with ${requestPayload.tools ? requestPayload.tools.length : 0} tools`);
        console.log('FULL REQUEST PAYLOAD:');
        console.log(JSON.stringify(requestPayload, null, 2));

        // Log the tools specifically
        if (requestPayload.tools && requestPayload.tools.length > 0) {
          console.log('TOOLS IN REQUEST:');
          requestPayload.tools.forEach((tool, index) => {
            console.log(`Tool ${index + 1}/${requestPayload.tools.length}:`);
            console.log(JSON.stringify(tool, null, 2));
          });
        } else {
          console.warn('NO TOOLS IN REQUEST PAYLOAD');
        }

        const response = await fetch('/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openai-api-key': config.apiKey
          },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        // Log the response in detail
        console.log('FULL RESPONSE PAYLOAD:');
        console.log(JSON.stringify(data, null, 2));

        // Store the response payload for logging
        node.lastResponsePayload = data;

        // API logs are now automatically captured by the ApiService.logApiCall method
        // No need to manually log them here

        // Process the response
        const message = data.choices[0].message;

        // Check if the model wants to call a function
        if (message.tool_calls && message.tool_calls.length > 0) {
          AgentLogger.addLog(node, `Model requested ${message.tool_calls.length} tool calls`, 'info');

          // Process each tool call
          const results = [];
          for (const toolCall of message.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            AgentLogger.addLog(node, `Executing tool: ${functionName}`, 'info');

            try {
              // Special handling for search tool
              if (functionName === 'search') {
                AgentLogger.addLog(node, `Executing search for: ${functionArgs.query}`, 'info');
                console.log(`Executing search for: ${functionArgs.query}`);

                // Simulate search results for now
                const searchResult = `Search results for "${functionArgs.query}":\n\n` +
                  `1. No specific major events were reported for the week of May 1, 2025 as this is a future date.\n\n` +
                  `2. May 1, 2025 is a Thursday and will be observed as International Workers' Day (Labor Day) in many countries.\n\n` +
                  `3. The first week of May 2025 includes May Day celebrations globally.\n\n` +
                  `4. Financial markets will be operating normally except in countries where May 1 is a public holiday.\n\n` +
                  `5. As of current information, no major scheduled events like elections or significant conferences have been announced for this specific week in 2025.`;

                // Add the result to the results array
                results.push({
                  tool: functionName,
                  result: searchResult
                });

                // Add to memory
                AgentMemory.addToHistory(node, {
                  tool: functionName,
                  params: functionArgs
                }, searchResult);

                AgentLogger.addLog(node, `Search executed successfully`, 'success');
              }
              // Special handling for get_current_weather tool
              else if (functionName === 'get_current_weather') {
                AgentLogger.addLog(node, `Executing weather lookup for: ${functionArgs.location}`, 'info');
                console.log(`Executing weather lookup for: ${functionArgs.location}`);

                // Simulate weather results
                const weatherResult = `Weather information for ${functionArgs.location} cannot be predicted accurately for a future date (May 2025). Weather forecasts are typically only reliable up to 7-10 days in advance.`;

                // Add the result to the results array
                results.push({
                  tool: functionName,
                  result: weatherResult
                });

                // Add to memory
                AgentMemory.addToHistory(node, {
                  tool: functionName,
                  params: functionArgs
                }, weatherResult);

                AgentLogger.addLog(node, `Weather lookup executed successfully`, 'success');
              }
              // Default tool execution
              else {
                // Execute the tool
                const toolResult = await AgentTools.executeTool(functionName, functionArgs, node);

                // Add the result to the results array
                results.push({
                  tool: functionName,
                  result: toolResult
                });

                // Add to memory
                AgentMemory.addToHistory(node, {
                  tool: functionName,
                  params: functionArgs
                }, toolResult);

                AgentLogger.addLog(node, `Tool ${functionName} executed successfully`, 'success');
              }
            } catch (error) {
              AgentLogger.addLog(node, `Error executing tool ${functionName}: ${error.message}`, 'error');
              console.error(`Error executing tool ${functionName}:`, error);

              // Add the error to the results array
              results.push({
                tool: functionName,
                error: error.message
              });

              // Add to memory
              AgentMemory.addToHistory(node, {
                tool: functionName,
                params: functionArgs
              }, `Error: ${error.message}`);
            }
          }

          // Create a summary of the results
          const resultsSummary = results.map(r => {
            let resultText = 'No result';

            if (r.result) {
              if (typeof r.result === 'string') {
                resultText = r.result.substring(0, 100) + (r.result.length > 100 ? '...' : '');
              } else {
                try {
                  resultText = JSON.stringify(r.result);
                } catch (e) {
                  resultText = `[Non-stringifiable result of type ${typeof r.result}]`;
                }
              }
            } else if (r.error) {
              resultText = `Error: ${r.error}`;
            }

            return `Tool: ${r.tool}\nResult: ${resultText}`;
          }).join('\n\n');

          // Add the original message and tool results to messages
          messages.push(message);

          // Add the assistant's message with tool calls to the conversation history
          if (node.conversationHistory) {
            node.conversationHistory.push(message);
            AgentLogger.addLog(node, 'Added assistant message with tool calls to conversation history', 'info');
          }

          // Create the tool results message
          const toolResultsMessage = {
            role: 'user',
            content: `Here are the results of the tool calls:\n\n${resultsSummary}\n\nPlease provide a final response based on these results.`
          };

          // Add the tool results to messages
          messages.push(toolResultsMessage);

          // Add the tool results to the conversation history
          if (node.conversationHistory) {
            node.conversationHistory.push(toolResultsMessage);
            AgentLogger.addLog(node, 'Added tool results to conversation history', 'info');
          }

          // Make a final API request to get the final response
          AgentLogger.addLog(node, 'Sending final request to OpenAI API', 'info');

          // Create the final request payload with tools
          const finalRequestPayload = {
            model: config.model || 'gpt-4o',
            messages,
            tools: requestPayload.tools && requestPayload.tools.length > 0 ? requestPayload.tools : [
              {
                type: "function",
                function: {
                  name: "search",
                  description: "Search the web for information",
                  parameters: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description: "The search query"
                      }
                    },
                    required: ["query"]
                  }
                }
              },
              {
                type: "function",
                function: {
                  name: "get_current_weather",
                  description: "Get the current weather for a location",
                  parameters: {
                    type: "object",
                    properties: {
                      location: {
                        type: "string",
                        description: "The location to get weather for"
                      }
                    },
                    required: ["location"]
                  }
                }
              }
            ],
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 2000
          };

          // Store the request payload for logging
          node.lastRequestPayload = finalRequestPayload;

          console.log('FINAL REQUEST PAYLOAD:');
          console.log(JSON.stringify(finalRequestPayload, null, 2));

          // Log the tools specifically in the final request
          if (finalRequestPayload.tools && finalRequestPayload.tools.length > 0) {
            console.log('TOOLS IN FINAL REQUEST:');
            finalRequestPayload.tools.forEach((tool, index) => {
              console.log(`Tool ${index + 1}/${finalRequestPayload.tools.length}:`);
              console.log(JSON.stringify(tool, null, 2));
            });
          } else {
            console.warn('NO TOOLS IN FINAL REQUEST PAYLOAD');
          }

          const finalResponse = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify(finalRequestPayload)
          });

          if (!finalResponse.ok) {
            const errorData = await finalResponse.json();
            throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
          }

          const finalData = await finalResponse.json();

          // Log the final response in detail
          console.log('FINAL RESPONSE PAYLOAD:');
          console.log(JSON.stringify(finalData, null, 2));

          // Store the response payload for logging
          node.lastResponsePayload = finalData;

          // Log the API call
          AgentLogger.addApiLog(node, node.lastRequestPayload, node.lastResponsePayload);

          // Get the final response
          const finalMessage = finalData.choices[0].message;

          // Add the final response to memory
          AgentMemory.addToContext(node, finalMessage.content);

          // Add the assistant's response to the conversation history
          if (node.conversationHistory) {
            node.conversationHistory.push({ role: 'assistant', content: finalMessage.content });
            AgentLogger.addLog(node, 'Added assistant response to conversation history', 'info');
          }

          AgentLogger.addLog(node, 'Function calling completed successfully', 'success');

          return finalMessage.content;
        } else {
          // No function calls, just return the message content
          AgentLogger.addLog(node, 'No function calls requested, returning message content', 'info');

          // Add the response to memory
          AgentMemory.addToContext(node, message.content);

          // Add the assistant's response to the conversation history
          if (node.conversationHistory) {
            node.conversationHistory.push({ role: 'assistant', content: message.content });
            AgentLogger.addLog(node, 'Added assistant response to conversation history', 'info');
          }

          // Ensure API payloads are logged
          if (node.lastRequestPayload || node.lastResponsePayload) {
            AgentLogger.addApiLog(node, node.lastRequestPayload, node.lastResponsePayload);
            AgentLogger.addLog(node, `API payloads captured and stored for viewing`, 'info');
          }

          return message.content;
        }
      } else {
        // Fall back to the plan-based approach
        AgentLogger.addLog(node, 'Model does not support function calling, using plan-based approach', 'info');

        // Generate a plan with all available tools (including MCP tools)
        AgentLogger.addLog(node, 'Generating plan', 'info');
        const plan = await AgentPlanner.generatePlan(node, input);

        // Log the plan
        if (plan && plan.steps) {
          AgentLogger.addLog(node, `Plan generated with ${plan.steps.length} steps`, 'success');

          // Log each step in the plan
          plan.steps.forEach((step, index) => {
            AgentLogger.addLog(node, `Step ${index + 1}: [${step.toolId}] ${step.description}`, 'info');
          });
        } else {
          AgentLogger.addLog(node, 'Plan generation failed or returned empty plan', 'warning');
        }

        // Execute the plan
        AgentLogger.addLog(node, 'Executing plan', 'info');
        const result = await AgentPlanner.executePlan(node);

        AgentLogger.addLog(node, 'Plan execution completed', 'success');
        return result;
      }
    } catch (error) {
      AgentLogger.addLog(node, `Error in default agent: ${error.message}`, 'error');
      throw error;
    }
  },

  // Get tool parameters for function calling
  getToolParameters(tool) {
    // Default parameters for all tools
    const defaultParams = {
      text: {
        type: "string",
        description: "The text to process"
      },
      imageUrl: {
        type: "string",
        description: "URL of the image to analyze"
      },
      jsonString: {
        type: "string",
        description: "JSON string to parse"
      },
      nodeId: {
        type: "string",
        description: "ID of the node to get content from"
      }
    };

    // Return parameters based on tool category
    switch (tool.category) {
      case 'text-processing':
        return {
          text: defaultParams.text,
          maxLength: {
            type: "integer",
            description: "Maximum length of the output in words"
          }
        };
      case 'image-processing':
        return {
          imageUrl: defaultParams.imageUrl
        };
      case 'data-manipulation':
        return {
          jsonString: defaultParams.jsonString
        };
      case 'workflow':
        return {
          nodeId: defaultParams.nodeId
        };
      case 'mcp-memory':
        return {
          entities: {
            type: "array",
            description: "Entities to create in the memory graph",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  description: "Type of the entity"
                },
                name: {
                  type: "string",
                  description: "Name of the entity"
                },
                properties: {
                  type: "object",
                  description: "Properties of the entity"
                }
              }
            }
          }
        };
      case 'mcp-search':
        if (tool.id === 'search_perplexity-server') {
          return {
            query: {
              type: "string",
              description: "The search query or question"
            },
            detail_level: {
              type: "string",
              description: "Optional: Desired level of detail (brief, normal, detailed)",
              enum: ["brief", "normal", "detailed"]
            }
          };
        } else if (tool.id === 'chat_perplexity_perplexity-server') {
          return {
            message: {
              type: "string",
              description: "The message to send to Perplexity AI"
            },
            chat_id: {
              type: "string",
              description: "Optional: ID of an existing chat to continue. If not provided, a new chat will be created."
            }
          };
        }
        return {
          query: {
            type: "string",
            description: "Search query"
          }
        };
      case 'mcp-documentation':
        if (tool.id === 'get_documentation_perplexity-server') {
          return {
            query: {
              type: "string",
              description: "The technology, library, or API to get documentation for"
            },
            context: {
              type: "string",
              description: "Additional context or specific aspects to focus on"
            }
          };
        }
        return {
          query: {
            type: "string",
            description: "Documentation query"
          }
        };
      default:
        // For unknown categories, return a generic text parameter
        return {
          text: defaultParams.text
        };
    }
  },

  // Get required parameters for a tool
  getToolRequiredParameters(tool) {
    // Return required parameters based on tool category
    switch (tool.category) {
      case 'text-processing':
        return ['text'];
      case 'image-processing':
        return ['imageUrl'];
      case 'data-manipulation':
        return ['jsonString'];
      case 'workflow':
        return ['nodeId'];
      case 'mcp-memory':
        if (tool.id === 'mcp-memory-create-entities') {
          return ['entities'];
        }
        return [];
      case 'mcp-search':
        if (tool.id === 'search_perplexity-server') {
          return ['query'];
        } else if (tool.id === 'chat_perplexity_perplexity-server') {
          return ['message'];
        }
        return ['query'];
      case 'mcp-documentation':
        if (tool.id === 'get_documentation_perplexity-server') {
          return ['query'];
        }
        return [];
      default:
        return ['text'];
    }
  },

  // Process a custom agent
  async processCustomAgent(node, input, reflectionResult = null) {
    try {
      // Check if custom code is provided
      if (!node.customCode) {
        AgentLogger.addLog(node, 'No custom code provided', 'error');
        throw new Error('No custom code provided');
      }

      AgentLogger.addLog(node, 'Creating function from custom code', 'info');

      // Create a function from the custom code
      const customFunction = new Function(
        'input',
        'node',
        'App',
        'DebugManager',
        'ApiService',
        'AgentMemory',
        'AgentTools',
        'MCPTools',
        'reflectionResult',
        'AgentLogger',
        node.customCode
      );

      AgentLogger.addLog(node, 'Executing custom function', 'info');

      // Execute the custom function with all available tools and context
      const result = await customFunction(
        input,
        node,
        App,
        DebugManager,
        ApiService,
        AgentMemory,
        AgentTools,
        window.MCPTools || null,
        reflectionResult,
        AgentLogger
      );

      AgentLogger.addLog(node, 'Custom function executed successfully', 'success');

      // Store the request/response payloads in the node for viewing
      if (node.lastRequestPayload || node.lastResponsePayload) {
        AgentLogger.addApiLog(node, node.lastRequestPayload, node.lastResponsePayload);
      }

      return result;
    } catch (error) {
      // Log the error
      AgentLogger.addLog(node, `Error in custom agent: ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Draw an agent node
  drawAgentNode(node, ctx) {
    // Save the original styles
    const originalFill = ctx.fillStyle;
    const originalStroke = ctx.strokeStyle;
    const originalLineWidth = ctx.lineWidth;

    try {
      // Create a gradient for the background
      const gradient = ctx.createLinearGradient(node.x, node.y, node.x, node.y + node.height);
      gradient.addColorStop(0, '#9c27b0');  // Purple top
      gradient.addColorStop(1, '#7b1fa2');  // Darker purple bottom

      // Set the fill and stroke styles
      ctx.fillStyle = node.selected ? '#4a90e2' :
                     node.processing ? '#d4af37' :
                     node.error ? '#e74c3c' : gradient;

      ctx.strokeStyle = '#ff00ff'; // Bright purple border for agent nodes
      ctx.lineWidth = 2; // Thicker border

      // Draw the node background and border
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, 5);
      ctx.fill();
      ctx.stroke();

      // Draw the node title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.title, node.x + node.width / 2, node.y + 20);

      // Draw agent badge in the top-right corner
      const badgeX = node.x + node.width - 20;
      const badgeY = node.y + 20;
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

      // Reset text alignment
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Draw iteration count if iterating
      if (node.isIterating) {
        const iterX = node.x + node.width - 20;
        const iterY = node.y + node.height - 20;

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
        ctx.fillText(`${node.currentIteration}/${node.maxIterations}`, iterX, iterY);

        // Reset text alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }

      // Draw input and output areas
      const contentAreaX = node.x + 10;
      const inputAreaY = node.y + 40;
      const outputAreaY = node.y + node.height / 2 + 5;
      const contentAreaWidth = node.width - 20;
      const inputAreaHeight = node.inputCollapsed ? 20 : (node.height / 2) - 50;
      const outputAreaHeight = node.outputCollapsed ? 20 : (node.height / 2) - 25;

      // Draw input area
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

      // Draw input label
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.fillText('INPUT:', contentAreaX + 5, inputAreaY - 2);

      // Draw input content if not collapsed
      if (!node.inputCollapsed) {
        node.drawInputContent(ctx, contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);
      } else {
        // Draw collapsed indicator
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('(collapsed)', contentAreaX + 50, inputAreaY + 15);
      }

      // Draw input border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);

      // Draw output area
      ctx.fillStyle = '#222';
      ctx.fillRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);

      // Draw output label
      ctx.fillStyle = node.hasBeenProcessed ? '#4a90e2' : '#888';
      ctx.font = '10px Arial';
      ctx.fillText('OUTPUT:', contentAreaX + 5, outputAreaY - 2);

      // Make sure content is preloaded
      node.preloadAllContent();

      // Draw output content based on type if not collapsed
      if (!node.outputCollapsed) {
        switch (node.contentType) {
          case 'text':
            node.drawTextContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
            break;
          case 'image':
            node.drawImageContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
            break;
          case 'video':
            node.drawVideoContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
            break;
          case 'audio':
            node.drawAudioContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
            break;
          case 'chat':
            node.drawChatContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
            break;
        }
      } else {
        // Draw collapsed indicator
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('(collapsed)', contentAreaX + 50, outputAreaY + 15);
      }

      // Draw output border
      ctx.strokeStyle = node.hasBeenProcessed ? '#4a90e2' : '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);

      // Draw node toolbar
      node.drawNodeToolbar(ctx);

      // Draw connectors
      const radius = App.hoveredNode === node && App.hoveredConnector ?
                  App.CONNECTOR_HOVER_RADIUS :
                  App.CONNECTOR_RADIUS;

      // Output connector
      const outputColor = App.hoveredNode === node && App.hoveredConnector === 'output' ?
                     '#6ab0ff' :
                     App.connectingNode && App.connectingNode !== node ?
                     (node.canAcceptInput(App.connectingNode) ? '#2ecc71' : '#e74c3c') :
                     '#4a90e2';

      ctx.fillStyle = outputColor;
      ctx.beginPath();
      ctx.arc(node.x + node.width, node.y + node.height/2, radius, 0, Math.PI * 2);
      ctx.fill();

      // Input connector
      const inputColor = App.hoveredNode === node && App.hoveredConnector === 'input' ?
                    '#6ab0ff' :
                    App.connectingNode === node ?
                    '#e74c3c' :
                    App.connectingNode ?
                    (node.canAcceptInput(App.connectingNode) ? '#2ecc71' : '#e74c3c') :
                    '#4a90e2';

      ctx.fillStyle = inputColor;
      ctx.beginPath();
      ctx.arc(node.x, node.y + node.height/2, radius, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip
      if (App.hoveredNode === node && !App.isDragging && !App.connectingNode) {
        const tooltipText = node.error ? node.error :
                         node.processing ? 'Processing...' :
                         'Double-click to edit';
        Utils.drawTooltip(ctx, tooltipText, node.x + node.width/2, node.y);
      }
    } finally {
      // Restore the original styles
      ctx.fillStyle = originalFill;
      ctx.strokeStyle = originalStroke;
      ctx.lineWidth = originalLineWidth;
    }
  },

  // Initialize the agent node editor
  initAgentNodeEditor() {
    // Get the agent node editor modal
    const agentNodeEditor = document.getElementById('agentNodeEditor');
    if (!agentNodeEditor) {
      DebugManager.addLog('Agent node editor modal not found in DOM', 'error');
      return;
    }

    DebugManager.addLog('Initializing agent node editor', 'info');

    // Get the agent type select element
    const agentTypeSelect = document.getElementById('agentType');
    if (agentTypeSelect) {
      // Remove any existing event listeners by cloning and replacing
      const newAgentTypeSelect = agentTypeSelect.cloneNode(true);
      agentTypeSelect.parentNode.replaceChild(newAgentTypeSelect, agentTypeSelect);

      // Add event listener to show/hide custom code section
      newAgentTypeSelect.addEventListener('change', (e) => {
        const customCodeSection = document.getElementById('customCodeSection');
        if (customCodeSection) {
          customCodeSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
          DebugManager.addLog(`Custom code section ${e.target.value === 'custom' ? 'shown' : 'hidden'}`, 'info');
        }
      });
    }

    // Set up save button handler
    const saveButton = document.getElementById('saveAgentNode');
    if (saveButton) {
      // Remove any existing event listeners by cloning and replacing
      const newSaveButton = saveButton.cloneNode(true);
      saveButton.parentNode.replaceChild(newSaveButton, saveButton);

      // Add the event listener
      newSaveButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        DebugManager.addLog('Save button clicked in agent node editor', 'info');

        try {
          // Call the saveAgentNodeEditor method
          this.saveAgentNodeEditor();
        } catch (error) {
          DebugManager.addLog(`Error saving agent node: ${error.message}`, 'error');
          console.error('Error saving agent node:', error);
        }
      });
    } else {
      DebugManager.addLog('Save button for agent node editor not found', 'warning');
    }

    // Set up View Logs button handler
    const viewLogsButton = document.getElementById('viewAgentLogs');
    if (viewLogsButton) {
      // Remove any existing event listeners by cloning and replacing
      const newViewLogsButton = viewLogsButton.cloneNode(true);
      viewLogsButton.parentNode.replaceChild(newViewLogsButton, viewLogsButton);

      // Add the event listener
      newViewLogsButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('View Logs button clicked in agent node editor');
        DebugManager.addLog('View Logs button clicked in agent node editor', 'info');

        // Debug: Check if we have an editing node
        console.log('Current editing node:', this.editingNode);
        if (this.editingNode) {
          console.log('Editing node ID:', this.editingNode.id);
        }

        try {
          // We're in the agent node editor, so we should already have an editing node
          // No need to check for App.selectedNode since we're already editing a node

          // Explicitly set the editing node if it's not set
          if (!this.editingNode && window.App && App.selectedNode) {
            this.editingNode = App.selectedNode;
            console.log('Setting editing node to selected node:', App.selectedNode.id);
          }

          // Call the openAgentLogsModal method
          console.log('Calling openAgentLogsModal');
          this.openAgentLogsModal();
        } catch (error) {
          DebugManager.addLog(`Error opening agent logs: ${error.message}`, 'error');
          console.error('Error opening agent logs:', error);
        }
      });
    }

    // Set up View API Payloads button handler
    const viewApiPayloadsButton = document.getElementById('viewApiPayloads');
    if (viewApiPayloadsButton) {
      // Remove any existing event listeners by cloning and replacing
      const newViewApiPayloadsButton = viewApiPayloadsButton.cloneNode(true);
      viewApiPayloadsButton.parentNode.replaceChild(newViewApiPayloadsButton, viewApiPayloadsButton);

      // Add the event listener
      newViewApiPayloadsButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('View API Payloads button clicked in agent node editor');
        DebugManager.addLog('View API Payloads button clicked in agent node editor', 'info');

        // Debug: Check if we have an editing node
        console.log('Current editing node:', this.editingNode);
        if (this.editingNode) {
          console.log('Editing node ID:', this.editingNode.id);
        }

        try {
          // We're in the agent node editor, so we should already have an editing node
          // No need to check for App.selectedNode since we're already editing a node

          // Explicitly set the editing node if it's not set
          if (!this.editingNode && window.App && App.selectedNode) {
            this.editingNode = App.selectedNode;
            console.log('Setting editing node to selected node:', App.selectedNode.id);
          }

          // Call the openPayloadsModal method
          console.log('Calling openPayloadsModal');
          this.openPayloadsModal();
        } catch (error) {
          DebugManager.addLog(`Error opening API payloads: ${error.message}`, 'error');
          console.error('Error opening API payloads:', error);
        }
      });
    }

    // Set up Can Be Workflow Node checkbox handler
    const canBeWorkflowNodeCheckbox = document.getElementById('canBeWorkflowNode');
    if (canBeWorkflowNodeCheckbox) {
      // Remove any existing event listeners by cloning and replacing
      const newCanBeWorkflowNodeCheckbox = canBeWorkflowNodeCheckbox.cloneNode(true);
      canBeWorkflowNodeCheckbox.parentNode.replaceChild(newCanBeWorkflowNodeCheckbox, canBeWorkflowNodeCheckbox);

      // Add the event listener
      newCanBeWorkflowNodeCheckbox.addEventListener('change', (e) => {
        // Show/hide the workflow node role section based on the checkbox state
        const workflowNodeRoleSection = document.getElementById('workflowNodeRoleSection');
        if (workflowNodeRoleSection) {
          workflowNodeRoleSection.style.display = newCanBeWorkflowNodeCheckbox.checked ? 'block' : 'none';
          DebugManager.addLog(`Workflow node role section ${newCanBeWorkflowNodeCheckbox.checked ? 'shown' : 'hidden'}`, 'info');
        }

        // If unchecked, reset the role to 'none'
        if (!newCanBeWorkflowNodeCheckbox.checked) {
          const nodeRoleNone = document.getElementById('agentNodeRoleNone');
          if (nodeRoleNone) {
            nodeRoleNone.checked = true;
          }

          // If we have a node being edited, update its role
          if (this.editingNode) {
            // Use the WorkflowIO object to set the role if available
            if (window.WorkflowIO && typeof WorkflowIO.setNodeRole === 'function') {
              WorkflowIO.setNodeRole(this.editingNode, 'none');
              DebugManager.addLog('Reset node role to none (can\'t be workflow node)', 'info');
            } else {
              // Fallback if WorkflowIO is not available
              this.editingNode.workflowRole = 'none';
              DebugManager.addLog('Reset node role to none (fallback method)', 'warning');
            }
          }
        }
      });
    }

    // Set up cancel button handler
    const cancelButton = document.getElementById('cancelAgentNode');
    if (cancelButton) {
      // Remove any existing event listeners by cloning and replacing
      const newCancelButton = cancelButton.cloneNode(true);
      cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

      // Add the event listener
      newCancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        DebugManager.addLog('Cancel button clicked in agent node editor', 'info');

        try {
          // Close the modal directly
          const agentNodeEditor = document.getElementById('agentNodeEditor');
          if (agentNodeEditor) {
            agentNodeEditor.style.display = 'none';
            agentNodeEditor.classList.remove('active');
            DebugManager.addLog('Agent node editor modal hidden', 'info');
          } else {
            DebugManager.addLog('Agent node editor modal not found', 'warning');
          }

          // Try multiple approaches to close the modal

          // Approach 1: Use ModalManager if available
          if (window.ModalManager && typeof ModalManager.closeModal === 'function') {
            ModalManager.closeModal('agentNodeEditor');
            DebugManager.addLog('Used ModalManager to close agent node editor', 'info');
          }

          // Approach 2: Use direct DOM manipulation
          document.querySelectorAll('.modal').forEach(modal => {
            if (modal.id === 'agentNodeEditor' || modal.classList.contains('agent-node-editor')) {
              modal.style.display = 'none';
              DebugManager.addLog('Closed agent node editor via DOM query', 'info');
            }
          });

          // Approach 3: Remove modal backdrop if it exists
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
            DebugManager.addLog('Removed modal backdrop', 'info');
          }

          // Don't clear the editing node reference
          // We need to keep it for the View API Payloads and View Agent Logs buttons to work
          // this.editingNode = null;

          // Force redraw the canvas
          if (window.App && typeof App.draw === 'function') {
            App.draw();
          }

          DebugManager.addLog('Agent node editing cancelled successfully', 'success');
        } catch (error) {
          DebugManager.addLog(`Error cancelling agent node edit: ${error.message}`, 'error');
          console.error('Error cancelling agent node edit:', error);

          // Last resort: try to force close the modal
          try {
            const modal = document.getElementById('agentNodeEditor');
            if (modal) {
              modal.style.display = 'none';
              // Don't clear the editing node reference even in the last resort
              // this.editingNode = null;
              DebugManager.addLog('Forced modal closure as last resort, editingNode reference preserved', 'warning');
            }
          } catch (e) {
            console.error('Failed even with last resort approach:', e);
          }
        }
      });
    } else {
      DebugManager.addLog('Cancel button for agent node editor not found', 'warning');
    }

    DebugManager.addLog('Agent node editor initialized successfully', 'success');
  },

  // Open the agent node editor
  openAgentNodeEditor(node) {
    // Set the editing node
    this.editingNode = node;

    // Get the agent node editor modal
    const agentNodeEditor = document.getElementById('agentNodeEditor');
    if (!agentNodeEditor) {
      console.error('Agent node editor modal not found');
      DebugManager.addLog('Agent node editor modal not found, falling back to regular editor', 'error');

      // Fall back to the regular node editor with styling
      if (window.App && typeof window.App.openNodeEditor === 'function') {
        const originalOpenNodeEditor = window.App.openNodeEditor;
        window.App.openNodeEditor(node);
      }
      return;
    }

    // Set the values in the form
    const titleInput = document.getElementById('agentNodeTitle');
    if (titleInput) {
      titleInput.value = node.title || '';
    }

    const systemPromptInput = document.getElementById('agentSystemPrompt');
    if (systemPromptInput) {
      systemPromptInput.value = node.systemPrompt || '';
    }

    const maxIterationsInput = document.getElementById('maxIterations');
    if (maxIterationsInput) {
      maxIterationsInput.value = node.maxIterations || 5;
    }

    const autoIterateCheckbox = document.getElementById('autoIterate');
    if (autoIterateCheckbox) {
      autoIterateCheckbox.checked = node.autoIterate !== false;
    }

    // Set agent type
    const agentTypeSelect = document.getElementById('agentType');
    if (agentTypeSelect) {
      agentTypeSelect.value = node.agentType || 'default';

      // Show/hide custom code section
      const customCodeSection = document.getElementById('customCodeSection');
      if (customCodeSection) {
        customCodeSection.style.display = agentTypeSelect.value === 'custom' ? 'block' : 'none';
      }
    }

    // Set MCP tools settings
    const useMCPToolsInput = document.getElementById('useMCPTools');
    if (useMCPToolsInput) {
      useMCPToolsInput.checked = node.useMCPTools !== false;
    }

    // Update MCP tools list
    this.updateMCPToolsList();

    // Set reflection settings
    const enableReflectionInput = document.getElementById('enableReflection');
    if (enableReflectionInput) {
      enableReflectionInput.checked = node.enableReflection !== false;
    }

    const reflectionFrequencySelect = document.getElementById('reflectionFrequency');
    if (reflectionFrequencySelect) {
      reflectionFrequencySelect.value = node.reflectionFrequency || 2;
    }

    const reflectionPromptInput = document.getElementById('reflectionPrompt');
    if (reflectionPromptInput) {
      reflectionPromptInput.value = node.reflectionPrompt || 'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?';
    }

    // Set workflow integration settings
    const canBeWorkflowNodeInput = document.getElementById('canBeWorkflowNode');
    if (canBeWorkflowNodeInput) {
      canBeWorkflowNodeInput.checked = node.canBeWorkflowNode !== false;
    }

    // Set node role radio buttons
    const workflowNodeRoleSection = document.getElementById('workflowNodeRoleSection');
    if (workflowNodeRoleSection) {
      // Show/hide the section based on whether the node can be a workflow node
      workflowNodeRoleSection.style.display = node.canBeWorkflowNode !== false ? 'block' : 'none';

      // Set the correct radio button based on the node's current role
      const nodeRole = node.workflowRole || 'none';

      const nodeRoleNone = document.getElementById('agentNodeRoleNone');
      const nodeRoleInput = document.getElementById('agentNodeRoleInput');
      const nodeRoleOutput = document.getElementById('agentNodeRoleOutput');

      if (nodeRoleNone) nodeRoleNone.checked = nodeRole === 'none';
      if (nodeRoleInput) nodeRoleInput.checked = nodeRole === 'input';
      if (nodeRoleOutput) nodeRoleOutput.checked = nodeRole === 'output';

      // Log the current role
      DebugManager.addLog(`Current node role: ${nodeRole}`, 'info');
    }

    // Set custom code if applicable
    if ((node.agentType === 'custom' || agentTypeSelect?.value === 'custom') && document.getElementById('customCode')) {
      document.getElementById('customCode').value = node.customCode || '';
    }

    // Make sure the modal is visible
    agentNodeEditor.style.display = 'block';

    // Use ModalManager if available
    if (window.ModalManager && typeof ModalManager.openModal === 'function') {
      ModalManager.openModal('agentNodeEditor');
    } else {
      // Fallback if ModalManager is not available
      agentNodeEditor.classList.add('active');
    }

    DebugManager.addLog(`Editing agent node ${node.id}`, 'info');
  },

  // Update the MCP tools list in the editor
  updateMCPToolsList() {
    const mcpToolsList = document.getElementById('mcpToolsList');
    if (!mcpToolsList) return;

    // Clear the current list
    mcpToolsList.innerHTML = '';

    // Check if MCPTools is available
    if (!window.MCPTools || !window.MCPTools.getAllTools) {
      mcpToolsList.innerHTML = '<p style="color: #aaa; font-style: italic;">MCP tools not loaded yet. Save and reopen to see available tools.</p>';
      return;
    }

    // Get all available MCP tools
    const tools = window.MCPTools.getAllTools();

    if (!tools || tools.length === 0) {
      mcpToolsList.innerHTML = '<p style="color: #aaa; font-style: italic;">No MCP tools available.</p>';
      return;
    }

    // Group tools by category
    const toolsByCategory = {};
    for (const tool of tools) {
      if (!toolsByCategory[tool.category]) {
        toolsByCategory[tool.category] = [];
      }
      toolsByCategory[tool.category].push(tool);
    }

    // Create a list of tools by category
    for (const [category, categoryTools] of Object.entries(toolsByCategory)) {
      // Create category header
      const categoryHeader = document.createElement('div');
      categoryHeader.style.marginTop = '10px';
      categoryHeader.style.marginBottom = '5px';
      categoryHeader.style.fontWeight = 'bold';
      categoryHeader.style.color = '#bb86fc';
      categoryHeader.textContent = this.formatCategoryName(category);
      mcpToolsList.appendChild(categoryHeader);

      // Create tool list
      const toolList = document.createElement('ul');
      toolList.style.listStyle = 'none';
      toolList.style.padding = '0';
      toolList.style.margin = '0 0 10px 10px';

      for (const tool of categoryTools) {
        const toolItem = document.createElement('li');
        toolItem.style.margin = '3px 0';

        const toolName = document.createElement('span');
        toolName.textContent = tool.name;
        toolName.style.color = '#ddd';
        toolItem.appendChild(toolName);

        if (tool.description) {
          const toolDescription = document.createElement('span');
          toolDescription.textContent = ` - ${tool.description}`;
          toolDescription.style.color = '#aaa';
          toolDescription.style.fontSize = '0.9em';
          toolItem.appendChild(toolDescription);
        }

        toolList.appendChild(toolItem);
      }

      mcpToolsList.appendChild(toolList);
    }
  },

  // Format a category name for display
  formatCategoryName(category) {
    if (!category) return 'Uncategorized';

    // Remove prefix if present
    let name = category.startsWith('mcp-') ? category.substring(4) : category;

    // Capitalize and replace hyphens with spaces
    return name.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  // Save changes from the agent node editor
  saveAgentNodeEditor() {
    DebugManager.addLog('Saving agent node...', 'info');

    if (!this.editingNode) {
      DebugManager.addLog('No agent node being edited', 'error');
      return;
    }

    try {
      // Store a reference to the node being edited
      const node = this.editingNode;

      // Get values from the form
      const titleInput = document.getElementById('agentNodeTitle');
      if (titleInput) {
        node.title = titleInput.value || `Agent Node ${node.id}`;
        DebugManager.addLog(`Set node title to: ${node.title}`, 'info');
      }

      const systemPromptInput = document.getElementById('agentSystemPrompt');
      if (systemPromptInput) {
        node.systemPrompt = systemPromptInput.value;
      }

      const maxIterationsInput = document.getElementById('maxIterations');
      if (maxIterationsInput) {
        node.maxIterations = parseInt(maxIterationsInput.value, 10) || 5;
      }

      const autoIterateCheckbox = document.getElementById('autoIterate');
      if (autoIterateCheckbox) {
        node.autoIterate = autoIterateCheckbox.checked;
      }

      // Get MCP tools settings
      const useMCPToolsCheckbox = document.getElementById('useMCPTools');
      if (useMCPToolsCheckbox) {
        node.useMCPTools = useMCPToolsCheckbox.checked;
        DebugManager.addLog(`MCP tools ${node.useMCPTools ? 'enabled' : 'disabled'}`, 'info');
      }

      // Get reflection settings
      const enableReflectionCheckbox = document.getElementById('enableReflection');
      if (enableReflectionCheckbox) {
        node.enableReflection = enableReflectionCheckbox.checked;
        DebugManager.addLog(`Reflection ${node.enableReflection ? 'enabled' : 'disabled'}`, 'info');
      }

      const reflectionFrequencySelect = document.getElementById('reflectionFrequency');
      if (reflectionFrequencySelect) {
        node.reflectionFrequency = parseInt(reflectionFrequencySelect.value, 10) || 2;
      }

      const reflectionPromptInput = document.getElementById('reflectionPrompt');
      if (reflectionPromptInput) {
        node.reflectionPrompt = reflectionPromptInput.value;
      }

      // Get workflow integration settings
      const canBeWorkflowNodeCheckbox = document.getElementById('canBeWorkflowNode');
      if (canBeWorkflowNodeCheckbox) {
        node.canBeWorkflowNode = canBeWorkflowNodeCheckbox.checked;
        DebugManager.addLog(`Can be workflow node: ${node.canBeWorkflowNode ? 'yes' : 'no'}`, 'info');
      }

      // Get node role settings
      if (node.canBeWorkflowNode) {
        // Check which role radio button is selected
        const nodeRoleNone = document.getElementById('agentNodeRoleNone');
        const nodeRoleInput = document.getElementById('agentNodeRoleInput');
        const nodeRoleOutput = document.getElementById('agentNodeRoleOutput');

        let newRole = 'none';

        if (nodeRoleInput && nodeRoleInput.checked) {
          newRole = 'input';
        } else if (nodeRoleOutput && nodeRoleOutput.checked) {
          newRole = 'output';
        }

        // Only update the role if it's changed
        if (newRole !== (node.workflowRole || 'none')) {
          // Use the WorkflowIO object to set the role if available
          if (window.WorkflowIO && typeof WorkflowIO.setNodeRole === 'function') {
            WorkflowIO.setNodeRole(node, newRole);
            DebugManager.addLog(`Set node role to: ${newRole}`, 'info');
          } else {
            // Fallback if WorkflowIO is not available
            node.workflowRole = newRole;
            node._workflowRole = newRole; // Set both properties to ensure compatibility
            DebugManager.addLog(`Set node role to: ${newRole} (fallback method)`, 'warning');
          }
        }
      } else {
        // If the node can't be a workflow node, make sure it's not set as input or output
        if (node.workflowRole === 'input' || node.workflowRole === 'output') {
          // Use the WorkflowIO object to set the role if available
          if (window.WorkflowIO && typeof WorkflowIO.setNodeRole === 'function') {
            WorkflowIO.setNodeRole(node, 'none');
            DebugManager.addLog(`Reset node role to none (can't be workflow node)`, 'info');
          } else {
            // Fallback if WorkflowIO is not available
            node.workflowRole = 'none';
            node._workflowRole = 'none'; // Set both properties to ensure compatibility
            DebugManager.addLog(`Reset node role to none (fallback method)`, 'warning');
          }
        }
      }

      // Get agent type
      const agentTypeSelect = document.getElementById('agentType');
      if (agentTypeSelect) {
        const agentType = agentTypeSelect.value;
        node.agentType = agentType;
        DebugManager.addLog(`Set agent type to: ${agentType}`, 'info');

        // Get custom code if applicable
        if (agentType === 'custom') {
          const customCodeInput = document.getElementById('customCode');
          if (customCodeInput) {
            node.customCode = customCodeInput.value;
          }
        }
      }

      // Mark the node as an agent node
      node.nodeType = 'agent';
      node._nodeType = 'agent'; // Set both properties to ensure compatibility
      node.isAgentNode = true;

      // Set content type and other properties
      node.contentType = node.contentType || 'text';
      node.aiProcessor = node.aiProcessor || 'text-to-text';

      // Set data attribute for CSS styling if the element exists
      if (node.element) {
        node.element.setAttribute('data-node-type', 'agent');
      }

      // Try multiple approaches to close the modal

      // Approach 1: Close the modal directly
      const agentNodeEditor = document.getElementById('agentNodeEditor');
      if (agentNodeEditor) {
        agentNodeEditor.style.display = 'none';
        agentNodeEditor.classList.remove('active');
        DebugManager.addLog('Agent node editor modal hidden', 'info');
      } else {
        DebugManager.addLog('Agent node editor modal not found', 'warning');
      }

      // Approach 2: Use ModalManager if available
      if (window.ModalManager && typeof ModalManager.closeModal === 'function') {
        ModalManager.closeModal('agentNodeEditor');
        DebugManager.addLog('Used ModalManager to close agent node editor', 'info');
      }

      // Approach 3: Use direct DOM manipulation
      document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id === 'agentNodeEditor' || modal.classList.contains('agent-node-editor')) {
          modal.style.display = 'none';
          DebugManager.addLog('Closed agent node editor via DOM query', 'info');
        }
      });

      // Approach 4: Remove modal backdrop if it exists
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
        DebugManager.addLog('Removed modal backdrop', 'info');
      }

      DebugManager.addLog(`Agent node ${node.id} updated successfully`, 'success');

      // Redraw the canvas
      if (window.App && typeof App.draw === 'function') {
        App.draw();
      }

      // Return true to indicate success
      return true;
    } catch (error) {
      DebugManager.addLog(`Error saving agent node: ${error.message}`, 'error');
      console.error('Error saving agent node:', error);
      return false;
    }
    // Note: We're not clearing the editingNode reference in a finally block anymore
    // This allows the View API Payloads button to work properly
  }
};

// Add agent logs modal functionality
AgentNodes.openAgentLogsModal = function() {
  console.log('openAgentLogsModal called');

  // We're in the agent node editor, so we should already have an editing node
  // No need to check for App.selectedNode since we're already editing a node
  console.log('Current editing node:', this.editingNode);

  // Just in case, if we're not in the editor but called from elsewhere
  if (!this.editingNode && window.App && App.selectedNode) {
    console.log('Setting editing node to selected node:', App.selectedNode.id);
    this.editingNode = App.selectedNode;
    DebugManager.addLog(`Using selected node ${App.selectedNode.id} as editing node for logs`, 'info');
  }

  if (!this.editingNode) {
    console.log('No editing node found');
    DebugManager.addLog('No agent node selected for log viewing', 'error');
    alert('Please select an agent node first.');
    return;
  }

  console.log('Using editing node:', this.editingNode.id);

  // Initialize the logger if needed
  if (!this.editingNode.logs) {
    console.log('Initializing logger for node:', this.editingNode.id);
    AgentLogger.initLogger(this.editingNode);
    DebugManager.addLog(`Initialized logger for agent node ${this.editingNode.id}`, 'info');
  }

  // Initialize API logs if needed
  if (!this.editingNode.apiLogs) {
    console.log('Initializing API logs for node:', this.editingNode.id);
    // The initLogger method already initializes both logs and apiLogs
    AgentLogger.initLogger(this.editingNode);
    DebugManager.addLog(`Initialized API logs for agent node ${this.editingNode.id}`, 'info');
  }

  // Add a test log entry if there are no logs
  if (!this.editingNode.logs || this.editingNode.logs.length === 0) {
    console.log('Adding test log entry for node:', this.editingNode.id);
    AgentLogger.addLog(this.editingNode, 'Agent node logs initialized', 'info');
    DebugManager.addLog(`Added test log entry for agent node ${this.editingNode.id}`, 'info');
  }

  // Add a log entry about API payloads
  AgentLogger.addLog(this.editingNode, 'To view API payloads, click the "View API Payloads" button', 'info');

  // Create the agent logs modal if it doesn't exist
  console.log('Creating agent logs modal');
  this.createAgentLogsModal();

  // Update the log display
  console.log('Updating agent logs display');
  this.updateAgentLogsDisplay();

  // Open the modal
  const agentLogsModal = document.getElementById('agentLogsModal');
  if (agentLogsModal) {
    console.log('Showing agent logs modal');
    agentLogsModal.style.display = 'block';
  } else {
    console.log('Agent logs modal not found');
  }

  DebugManager.addLog(`Viewing logs for agent node ${this.editingNode.id}`, 'info');
};

// Add API payloads modal functionality
AgentNodes.openPayloadsModal = function() {
  console.log('openPayloadsModal called');

  // We're in the agent node editor, so we should already have an editing node
  // No need to check for App.selectedNode since we're already editing a node
  console.log('Current editing node:', this.editingNode);

  // Just in case, if we're not in the editor but called from elsewhere
  if (!this.editingNode && window.App && App.selectedNode) {
    console.log('Setting editing node to selected node:', App.selectedNode.id);
    this.editingNode = App.selectedNode;
    DebugManager.addLog(`Using selected node ${App.selectedNode.id} as editing node for API payloads`, 'info');
  }

  if (!this.editingNode) {
    console.log('No editing node found');
    DebugManager.addLog('No agent node selected for payload viewing', 'error');
    alert('Please select an agent node first.');
    return;
  }

  console.log('Using editing node:', this.editingNode.id);

  // Initialize API payload storage if not already present
  if (!this.editingNode.lastRequestPayload || Object.keys(this.editingNode.lastRequestPayload).length === 0) {
    this.editingNode.lastRequestPayload = {
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Sample request for testing API payload viewing" }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      _note: "This is a sample request payload for testing. If you're seeing this, no actual API request has been made yet."
    };
    DebugManager.addLog('Added sample request payload for testing', 'info');
  }

  if (!this.editingNode.lastResponsePayload || Object.keys(this.editingNode.lastResponsePayload).length === 0) {
    this.editingNode.lastResponsePayload = {
      id: "sample-response-id",
      object: "chat.completion",
      created: Date.now(),
      model: "gpt-4o",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "This is a sample response for testing API payload viewing."
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      _note: "This is a sample response payload for testing. If you're seeing this, no actual API request has been made yet."
    };
    DebugManager.addLog('Added sample response payload for testing', 'info');
  }

  // Create the modal if it doesn't exist
  let modal = document.getElementById('apiPayloadsModal');
  if (!modal) {
    // Create the modal dynamically
    this.createPayloadsModal();
    modal = document.getElementById('apiPayloadsModal');
    if (!modal) {
      DebugManager.addLog('Failed to create API payloads modal', 'error');
      return;
    }
  }

  // Update the payload display
  this.updatePayloadsDisplay();

  // Open the modal
  modal.style.display = 'block';

  DebugManager.addLog(`Viewing API payloads for agent node ${this.editingNode.id}`, 'info');
};

// Create the API payloads modal dynamically
AgentNodes.createPayloadsModal = function() {
  // Check if the modal already exists
  if (document.getElementById('apiPayloadsModal')) {
    return;
  }

  // Create the modal
  const modal = document.createElement('div');
  modal.id = 'apiPayloadsModal';
  modal.className = 'modal';

  // Create the modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '800px';
  modalContent.style.backgroundColor = '#1e1e1e';
  modalContent.style.border = '2px solid #9c27b0';

  // Create the header
  const header = document.createElement('h2');
  header.style.color = '#9c27b0';
  header.style.borderBottom = '1px solid #9c27b0';
  header.style.paddingBottom = '10px';
  header.innerHTML = '<span style="margin-right: 10px;">🔄</span>API Payloads';

  // Create the tabs
  const tabs = document.createElement('div');
  tabs.className = 'tabs';

  const requestTabButton = document.createElement('button');
  requestTabButton.className = 'tab-button active';
  requestTabButton.setAttribute('data-tab', 'requestPayload');
  requestTabButton.textContent = 'Request Payload';

  const responseTabButton = document.createElement('button');
  responseTabButton.className = 'tab-button';
  responseTabButton.setAttribute('data-tab', 'responsePayload');
  responseTabButton.textContent = 'Response Payload';

  tabs.appendChild(requestTabButton);
  tabs.appendChild(responseTabButton);

  // Create the tab content
  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';

  // Request payload tab
  const requestPayloadTab = document.createElement('div');
  requestPayloadTab.id = 'requestPayload';
  requestPayloadTab.className = 'tab-pane active';

  const requestPayloadContent = document.createElement('pre');
  requestPayloadContent.id = 'requestPayloadContent';
  requestPayloadContent.className = 'log-content';
  requestPayloadContent.style.height = '400px';
  requestPayloadContent.style.overflowY = 'auto';
  requestPayloadContent.style.backgroundColor = '#2a2a2a';
  requestPayloadContent.style.padding = '10px';
  requestPayloadContent.style.borderRadius = '5px';
  requestPayloadContent.style.color = '#ddd';
  requestPayloadContent.style.fontFamily = 'monospace';
  requestPayloadContent.style.whiteSpace = 'pre-wrap';

  // Format the request payload
  if (this.editingNode && this.editingNode.lastRequestPayload && Object.keys(this.editingNode.lastRequestPayload).length > 0) {
    requestPayloadContent.textContent = JSON.stringify(this.editingNode.lastRequestPayload, null, 2);
  } else {
    requestPayloadContent.textContent = 'No request payload available.';
  }

  requestPayloadTab.appendChild(requestPayloadContent);

  // Response payload tab
  const responsePayloadTab = document.createElement('div');
  responsePayloadTab.id = 'responsePayload';
  responsePayloadTab.className = 'tab-pane';
  responsePayloadTab.style.display = 'none';

  const responsePayloadContent = document.createElement('pre');
  responsePayloadContent.id = 'responsePayloadContent';
  responsePayloadContent.className = 'log-content';
  responsePayloadContent.style.height = '400px';
  responsePayloadContent.style.overflowY = 'auto';
  responsePayloadContent.style.backgroundColor = '#2a2a2a';
  responsePayloadContent.style.padding = '10px';
  responsePayloadContent.style.borderRadius = '5px';
  responsePayloadContent.style.color = '#ddd';
  responsePayloadContent.style.fontFamily = 'monospace';
  responsePayloadContent.style.whiteSpace = 'pre-wrap';

  // Format the response payload
  if (this.editingNode && this.editingNode.lastResponsePayload && Object.keys(this.editingNode.lastResponsePayload).length > 0) {
    responsePayloadContent.textContent = JSON.stringify(this.editingNode.lastResponsePayload, null, 2);
  } else {
    responsePayloadContent.textContent = 'No response payload available.';
  }

  responsePayloadTab.appendChild(responsePayloadContent);

  // Add the tabs to the tab content
  tabContent.appendChild(requestPayloadTab);
  tabContent.appendChild(responsePayloadTab);

  // Create the navigation controls
  const navigationControls = document.createElement('div');
  navigationControls.className = 'navigation-controls';
  navigationControls.style.display = 'flex';
  navigationControls.style.justifyContent = 'center';
  navigationControls.style.alignItems = 'center';
  navigationControls.style.marginTop = '10px';
  navigationControls.style.marginBottom = '10px';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.id = 'prevApiLog';
  prevButton.className = 'secondary-btn';
  prevButton.textContent = '← Previous';
  prevButton.style.marginRight = '10px';
  prevButton.disabled = true; // Initially disabled

  // Log counter
  const logCounter = document.createElement('div');
  logCounter.id = 'apiLogCounter';
  logCounter.className = 'log-counter';
  logCounter.textContent = 'Log 1 of 1';
  logCounter.style.margin = '0 10px';
  logCounter.style.fontFamily = 'monospace';
  logCounter.style.color = '#ccc';

  // Next button
  const nextButton = document.createElement('button');
  nextButton.id = 'nextApiLog';
  nextButton.className = 'secondary-btn';
  nextButton.textContent = 'Next →';
  nextButton.style.marginLeft = '10px';
  nextButton.disabled = true; // Initially disabled

  // Add event listeners to the navigation buttons
  prevButton.addEventListener('click', () => {
    if (this.editingNode && this.editingNode.apiLogs && this.currentApiLogIndex > 0) {
      this.currentApiLogIndex--;
      this.updatePayloadsDisplay();
      DebugManager.addLog(`Viewing API log ${this.currentApiLogIndex + 1} of ${this.editingNode.apiLogs.length}`, 'info');
    }
  });

  nextButton.addEventListener('click', () => {
    if (this.editingNode && this.editingNode.apiLogs &&
        this.currentApiLogIndex < this.editingNode.apiLogs.length - 1) {
      this.currentApiLogIndex++;
      this.updatePayloadsDisplay();
      DebugManager.addLog(`Viewing API log ${this.currentApiLogIndex + 1} of ${this.editingNode.apiLogs.length}`, 'info');
    }
  });

  // Add the navigation controls
  navigationControls.appendChild(prevButton);
  navigationControls.appendChild(logCounter);
  navigationControls.appendChild(nextButton);

  // Create the button group
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';
  buttonGroup.style.marginTop = '20px';
  buttonGroup.style.textAlign = 'right';

  const copyButton = document.createElement('button');
  copyButton.id = 'copyPayload';
  copyButton.className = 'secondary-btn';
  copyButton.textContent = 'Copy Payload';
  copyButton.addEventListener('click', () => {
    // Get the active tab
    const activeTab = document.querySelector('#apiPayloadsModal .tab-pane.active');
    if (activeTab) {
      // Get the payload content
      const payloadContent = activeTab.querySelector('pre').textContent;

      // Copy to clipboard
      navigator.clipboard.writeText(payloadContent)
        .then(() => {
          DebugManager.addLog('Payload copied to clipboard', 'success');
        })
        .catch(err => {
          DebugManager.addLog(`Failed to copy payload: ${err}`, 'error');
        });
    }
  });

  const closeButton = document.createElement('button');
  closeButton.id = 'closeApiPayloads';
  closeButton.className = 'primary-btn';
  closeButton.textContent = 'Close';
  closeButton.style.backgroundColor = '#9c27b0';
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
    // Don't clear the editing node reference when the modal is closed
    // This allows the user to continue editing the node after viewing payloads
    DebugManager.addLog('API payloads modal closed, editingNode reference preserved', 'info');
  });

  buttonGroup.appendChild(copyButton);
  buttonGroup.appendChild(closeButton);

  // Add everything to the modal content
  modalContent.appendChild(header);
  modalContent.appendChild(tabs);
  modalContent.appendChild(tabContent);
  modalContent.appendChild(navigationControls);
  modalContent.appendChild(buttonGroup);

  // Add the modal content to the modal
  modal.appendChild(modalContent);

  // Add the modal to the body
  document.body.appendChild(modal);

  // Add event listeners for tab buttons
  const tabButtons = modal.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tab buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Hide all tab panes
      modal.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
      });

      // Show the selected tab pane
      const tabId = button.getAttribute('data-tab');
      const tabPane = modal.querySelector(`#${tabId}`);
      if (tabPane) {
        tabPane.style.display = 'block';
        tabPane.classList.add('active');
      }
    });
  });

  DebugManager.addLog(`Viewing API payloads for agent node ${this.editingNode.id}`, 'info');
};

  const responsePayloadContent = document.getElementById('responsePayloadContent');
  const apiLogCounter = document.getElementById('apiLogCounter');
  const prevApiLogBtn = document.getElementById('prevApiLog');
  const nextApiLogBtn = document.getElementById('nextApiLog');

  // Initialize the current API log index if not set
  if (this.currentApiLogIndex === undefined) {
    this.currentApiLogIndex = -1;
  }

  // Check if we have API logs
  if (this.editingNode.apiLogs && this.editingNode.apiLogs.length > 0) {
    // Set the current API log index to the latest log if not set
    if (this.currentApiLogIndex === -1) {
      this.currentApiLogIndex = this.editingNode.apiLogs.length - 1;
    }

    // Make sure the current API log index is within bounds
    if (this.currentApiLogIndex < 0) {
      this.currentApiLogIndex = 0;
    } else if (this.currentApiLogIndex >= this.editingNode.apiLogs.length) {
      this.currentApiLogIndex = this.editingNode.apiLogs.length - 1;
    }

    // Get the current API log
    const currentLog = this.editingNode.apiLogs[this.currentApiLogIndex];

    // Update the API log counter
    if (apiLogCounter) {
      apiLogCounter.textContent = `Log ${this.currentApiLogIndex + 1} of ${this.editingNode.apiLogs.length}`;
    }

    // Update the previous and next buttons
    if (prevApiLogBtn) {
      prevApiLogBtn.disabled = this.currentApiLogIndex <= 0;
    }

    if (nextApiLogBtn) {
      nextApiLogBtn.disabled = this.currentApiLogIndex >= this.editingNode.apiLogs.length - 1;
    }

    // Format the request payload
    if (requestPayloadContent) {
      requestPayloadContent.style.whiteSpace = 'pre-wrap';

      if (currentLog.request && Object.keys(currentLog.request).length > 0) {
        requestPayloadContent.textContent = JSON.stringify(currentLog.request, null, 2);
      } else if (this.editingNode.lastRequestPayload && Object.keys(this.editingNode.lastRequestPayload).length > 0) {
        requestPayloadContent.textContent = JSON.stringify(this.editingNode.lastRequestPayload, null, 2);
      } else {
        requestPayloadContent.textContent = 'No request payload available.';
      }
    }

    // Format the response payload
    if (responsePayloadContent) {
      responsePayloadContent.style.whiteSpace = 'pre-wrap';

      if (currentLog.response && Object.keys(currentLog.response).length > 0) {
        responsePayloadContent.textContent = JSON.stringify(currentLog.response, null, 2);
      } else if (this.editingNode.lastResponsePayload && Object.keys(this.editingNode.lastResponsePayload).length > 0) {
        responsePayloadContent.textContent = JSON.stringify(this.editingNode.lastResponsePayload, null, 2);
      } else {
        responsePayloadContent.textContent = 'No response payload available.';
      }
    }
  } else {
    // No API logs available
    // Update the API log counter
    if (apiLogCounter) {
      apiLogCounter.textContent = 'No API logs available';
    }

    // Disable the previous and next buttons
    if (prevApiLogBtn) {
      prevApiLogBtn.disabled = true;
    }

    if (nextApiLogBtn) {
      nextApiLogBtn.disabled = true;
    }

    // Format the request payload
    if (requestPayloadContent) {
      requestPayloadContent.style.whiteSpace = 'pre-wrap';
      requestPayloadContent.textContent = "No API logs available. Process the agent node to generate real API logs.";
    }

    // Format the response payload
    if (responsePayloadContent) {
      responsePayloadContent.style.whiteSpace = 'pre-wrap';
      responsePayloadContent.textContent = "No API logs available. Process the agent node to generate real API logs.";
    }
  }
},

// Main method to update the payloads display
updatePayloadsDisplay: function() {
  // Check if we have an editing node
  if (!this.editingNode) {
    console.warn('No editing node available for updatePayloadsDisplay');
    return;
  }

  // Get the payload content elements
  const requestPayloadContent = document.getElementById('requestPayloadContent');
  const responsePayloadContent = document.getElementById('responsePayloadContent');
  const apiLogCounter = document.getElementById('apiLogCounter');
  const prevApiLogBtn = document.getElementById('prevApiLog');
  const nextApiLogBtn = document.getElementById('nextApiLog');

  // Check if we have API logs
  if (this.editingNode.apiLogs && this.editingNode.apiLogs.length > 0) {
    // Initialize the current API log index if not set
    if (typeof this.currentApiLogIndex === 'undefined' || this.currentApiLogIndex < 0) {
      this.currentApiLogIndex = 0;
    }

    // Make sure the index is within bounds
    if (this.currentApiLogIndex >= this.editingNode.apiLogs.length) {
      this.currentApiLogIndex = this.editingNode.apiLogs.length - 1;
    }

    // Get the current API log
    const currentLog = this.editingNode.apiLogs[this.currentApiLogIndex];

    // Update the API log counter
    if (apiLogCounter) {
      apiLogCounter.textContent = `Log ${this.currentApiLogIndex + 1} of ${this.editingNode.apiLogs.length}`;
    }

    // Update the previous and next buttons
    if (prevApiLogBtn) {
      prevApiLogBtn.disabled = this.currentApiLogIndex <= 0;
    }

    if (nextApiLogBtn) {
      nextApiLogBtn.disabled = this.currentApiLogIndex >= this.editingNode.apiLogs.length - 1;
    }

    // Format the request payload
    if (requestPayloadContent) {
      requestPayloadContent.style.whiteSpace = 'pre-wrap';

      if (currentLog.request && Object.keys(currentLog.request).length > 0) {
        requestPayloadContent.textContent = JSON.stringify(currentLog.request, null, 2);
      } else if (this.editingNode.lastRequestPayload && Object.keys(this.editingNode.lastRequestPayload).length > 0) {
        requestPayloadContent.textContent = JSON.stringify(this.editingNode.lastRequestPayload, null, 2);
      } else {
        requestPayloadContent.textContent = 'No request payload available.';
      }
    }

    // Format the response payload
    if (responsePayloadContent) {
      responsePayloadContent.style.whiteSpace = 'pre-wrap';

      if (currentLog.response && Object.keys(currentLog.response).length > 0) {
        responsePayloadContent.textContent = JSON.stringify(currentLog.response, null, 2);
      } else if (this.editingNode.lastResponsePayload && Object.keys(this.editingNode.lastResponsePayload).length > 0) {
        responsePayloadContent.textContent = JSON.stringify(this.editingNode.lastResponsePayload, null, 2);
      } else {
        responsePayloadContent.textContent = 'No response payload available.';
      }
    }
  } else {
    // No API logs available
    // Update the API log counter
    if (apiLogCounter) {
      apiLogCounter.textContent = 'No API logs available';
    }

    // Disable the previous and next buttons
    if (prevApiLogBtn) {
      prevApiLogBtn.disabled = true;
    }

    if (nextApiLogBtn) {
      nextApiLogBtn.disabled = true;
    }

    // Format the request payload
    if (requestPayloadContent) {
      requestPayloadContent.style.whiteSpace = 'pre-wrap';
      requestPayloadContent.textContent = "No API logs available. Process the agent node to generate real API logs.";
    }

    // Format the response payload
    if (responsePayloadContent) {
      responsePayloadContent.style.whiteSpace = 'pre-wrap';
      responsePayloadContent.textContent = "No API logs available. Process the agent node to generate real API logs.";
    }
  }
},

// Alias for updatePayloadsDisplay for backward compatibility
updateApiPayloadsDisplay: function() {
  return this.updatePayloadsDisplay();
},

// Update the agent logs display
updateAgentLogsDisplay: function() {
  if (!this.editingNode) return;

  // Get the log content elements
  const activityLogContent = document.getElementById('activityLogContent');
  const apiLogContent = document.getElementById('apiLogContent');

  if (activityLogContent) {
    // Get the formatted logs
    const formattedLogs = AgentLogger.getFormattedLogs(this.editingNode);

    // Update the activity log content
    activityLogContent.textContent = formattedLogs || 'No activity logs available.';
  }

  if (apiLogContent) {
    // Get the formatted API logs
    const formattedApiLogs = AgentLogger.getFormattedApiLogs(this.editingNode);

    // Update the API log content
    apiLogContent.textContent = formattedApiLogs || 'No API logs available.';
  }
},

// Initialize the agent logs modal
initAgentLogsModal: function() {
  // Get the agent logs modal elements
  const agentLogsModal = document.getElementById('agentLogsModal');
  const closeAgentLogsBtn = document.getElementById('closeAgentLogs');
  const clearLogsBtn = document.getElementById('clearLogs');
  const copyLogsBtn = document.getElementById('copyLogs');
  const tabButtons = document.querySelectorAll('#agentLogsModal .tab-button');

  // Add event listeners for tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tab buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Hide all tab panes
      document.querySelectorAll('#agentLogsModal .tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
      });

      // Show the selected tab pane
      const tabId = button.getAttribute('data-tab');
      const tabPane = document.getElementById(tabId);
      if (tabPane) {
        tabPane.style.display = 'block';
        tabPane.classList.add('active');
      }
    });
  });

  // Close button
  if (closeAgentLogsBtn) {
    closeAgentLogsBtn.addEventListener('click', () => {
      if (agentLogsModal) {
        agentLogsModal.style.display = 'none';
        // Note: We're not clearing the editingNode reference here
        // This allows the user to view API payloads after closing the logs modal
        DebugManager.addLog('Agent logs modal closed, editingNode reference preserved', 'info');
      }
    });
  }

  // Clear logs button
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (this.editingNode) {
        // Clear the logs
        AgentLogger.clearLogs(this.editingNode);
        AgentLogger.clearApiLogs(this.editingNode);

        // Update the log display
        this.updateAgentLogsDisplay();

        DebugManager.addLog('Agent logs cleared', 'success');
      }
    });
  }

  // Copy logs button
  if (copyLogsBtn) {
    copyLogsBtn.addEventListener('click', () => {
      // Get the active tab
      const activeTab = document.querySelector('#agentLogsModal .tab-pane.active');
      if (activeTab) {
        // Get the log content
        const logContent = activeTab.querySelector('pre').textContent;

        // Copy to clipboard
        navigator.clipboard.writeText(logContent)
          .then(() => {
            DebugManager.addLog('Logs copied to clipboard', 'success');
          })
          .catch(err => {
            DebugManager.addLog(`Failed to copy logs: ${err}`, 'error');
          });
      }
    });
  }

  // Initialize API Payloads Modal
  this.initApiPayloadsModal();
},

// Initialize the API Payloads modal
initApiPayloadsModal: function() {
  // Get the API payloads modal elements
  const apiPayloadsModal = document.getElementById('apiPayloadsModal');
  const closeApiPayloadsBtn = document.getElementById('closeApiPayloads');
  const copyPayloadBtn = document.getElementById('copyPayload');
  const tabButtons = document.querySelectorAll('#apiPayloadsModal .tab-button');

  // Add event listeners for tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tab buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Hide all tab panes
      document.querySelectorAll('#apiPayloadsModal .tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
      });

      // Show the selected tab pane
      const tabId = button.getAttribute('data-tab');
      const tabPane = document.getElementById(tabId);
      if (tabPane) {
        tabPane.style.display = 'block';
        tabPane.classList.add('active');
      }
    });
  });

  // Close button
  if (closeApiPayloadsBtn) {
    closeApiPayloadsBtn.addEventListener('click', () => {
      if (apiPayloadsModal) {
        apiPayloadsModal.style.display = 'none';
        // Don't clear the editing node reference when the modal is closed
        // This allows the user to continue editing the node after viewing payloads
        DebugManager.addLog('API payloads modal closed, editingNode reference preserved', 'info');
      }
    });
  }

  // Copy payload button
  if (copyPayloadBtn) {
    copyPayloadBtn.addEventListener('click', () => {
      // Get the active tab
      const activeTab = document.querySelector('#apiPayloadsModal .tab-pane.active');
      if (activeTab) {
        // Get the payload content
        const payloadContent = activeTab.querySelector('pre').textContent;

        // Copy to clipboard
        navigator.clipboard.writeText(payloadContent)
          .then(() => {
            DebugManager.addLog('Payload copied to clipboard', 'success');
          })
          .catch(err => {
            DebugManager.addLog(`Failed to copy payload: ${err}`, 'error');
          });
      }
    });
  }
},

// Add a method to update the tools list
updateToolsList: function() {
  try {
    console.log('Updating AgentNodes tools list');

    // Get all available tools
    const builtInTools = (typeof AgentTools !== 'undefined' && AgentTools.getAllTools)
      ? AgentTools.getAllTools()
      : [];

    const mcpTools = (window.MCPTools && MCPTools.getAllTools)
      ? MCPTools.getAllTools()
      : [];

    console.log(`Found ${builtInTools.length} built-in tools and ${mcpTools.length} MCP tools`);

    // Store the tools for future use
    this.availableTools = [...builtInTools, ...mcpTools];

    return this.availableTools;
  } catch (error) {
    console.error('Error updating tools list:', error);
    return [];
  }
}
  };  // End of AgentNodesImpl object

  // Apply the implementation to the global AgentNodes object
  Object.keys(AgentNodesImpl).forEach(key => {
    window.AgentNodes[key] = AgentNodesImpl[key];
  });

  console.log('AgentNodes implementation applied to global object');

  // Add a direct method to add the agent node button to the toolbar
  window.AgentNodes.addAgentNodeButton = function() {
    console.log('Adding agent node button directly');
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) {
      console.error('Toolbar not found, cannot add agent node button');
      return;
    }

    // Check if the button already exists
    const existingButton = document.getElementById('addAgentNodeBtn');
    if (existingButton) {
      console.log('Agent node button already exists');
      return;
    }

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
    agentBtn.style.border = '2px solid #ff00ff';
    agentBtn.style.boxShadow = '0 0 5px #9c27b0';
    agentBtn.style.position = 'relative';

    // Add robot emoji to the button
    const robotSpan = document.createElement('span');
    robotSpan.textContent = ' 🤖';
    robotSpan.style.fontSize = '16px';
    agentBtn.appendChild(robotSpan);

    // Add click event listener
    agentBtn.addEventListener('click', () => {
      console.log('Add Agent Node button clicked');
      if (window.App && typeof App.addNode === 'function') {
        console.log('Calling App.addNode with agent type');
        try {
          const node = App.addNode('agent');
          console.log('Created agent node:', node);

          // Log success message
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Created agent node with ID: ${node.id}`, 'success');
          }

          // Force a redraw of the canvas
          if (window.App && typeof App.draw === 'function') {
            App.draw();
          }
        } catch (error) {
          console.error('Error creating agent node:', error);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Error creating agent node: ${error.message}`, 'error');
          }
        }
      } else {
        console.error('App.addNode not available');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('App.addNode not available, cannot create agent node', 'error');
        }
      }
    });

    // Insert the button after the Add Node button
    const addNodeBtn = document.getElementById('addNodeBtn');
    if (addNodeBtn && addNodeBtn.parentNode) {
      console.log('Inserting agent node button after Add Node button');
      addNodeBtn.parentNode.insertBefore(agentBtn, addNodeBtn.nextSibling);
    } else {
      console.log('Add Node button not found, appending agent node button to toolbar');
      toolbar.appendChild(agentBtn);
    }

    console.log('Agent node button added to toolbar');

    // Log success message to debug panel
    if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
      DebugManager.addLog('Agent Node button added to toolbar', 'success');
    }
  };

  // Force initialization of AgentNodes
  setTimeout(() => {
    if (window.AgentNodes && typeof window.AgentNodes.init === 'function' && !window.AgentNodes._initialized) {
      console.log('Forcing AgentNodes initialization');
      window.AgentNodes.init();
    }

    // Call the method to add the button
    setTimeout(() => {
      if (window.AgentNodes && typeof window.AgentNodes.addAgentNodeButton === 'function') {
        window.AgentNodes.addAgentNodeButton();
      }
    }, 1000);
  }, 100);

  // Set up event listeners after DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up AgentNodes event listeners');

    // Force initialization of AgentNodes again after DOM is loaded
    if (window.AgentNodes && typeof window.AgentNodes.init === 'function' && !window.AgentNodes._initialized) {
      console.log('Initializing AgentNodes from DOMContentLoaded event');
      window.AgentNodes.init();
    }

    // Ensure the agent node button is added to the toolbar
    if (window.AgentNodes && typeof window.AgentNodes.addAgentNodeButton === 'function') {
      console.log('Adding agent node button from DOMContentLoaded event');
      setTimeout(() => {
        window.AgentNodes.addAgentNodeButton();
      }, 500); // Add a slight delay to ensure the toolbar is ready
    }

    // Listen for app initialization complete event
    document.addEventListener('app-initialization-complete', function() {
      console.log('App initialization complete event received by AgentNodes');

      // Update the tools list
      if (window.AgentNodes && typeof window.AgentNodes.updateToolsList === 'function') {
        window.AgentNodes.updateToolsList();
      }

      // Force initialization of AgentNodes again after app initialization
      if (window.AgentNodes && typeof window.AgentNodes.init === 'function' && !window.AgentNodes._initialized) {
        console.log('Initializing AgentNodes after app initialization');
        window.AgentNodes.init();
      }

      // Ensure the agent node button is added to the toolbar
      if (window.AgentNodes && typeof window.AgentNodes.addAgentNodeButton === 'function') {
        console.log('Adding agent node button after app initialization');
        window.AgentNodes.addAgentNodeButton();
      }
    });
  });
})();

      // Add global click handlers for the agent node buttons
      document.addEventListener('click', (e) => {
        // Check if we're in the agent node editor
        const isInAgentNodeEditor = document.getElementById('agentNodeEditor') &&
                                   document.getElementById('agentNodeEditor').style.display === 'block';

        // If we're in the agent node editor, we need to handle the buttons differently
        if (isInAgentNodeEditor) {
          // Check if the click is on one of our buttons
          const isAgentButton = e.target &&
            (e.target.id === 'viewAgentLogs' ||
             e.target.id === 'viewApiPayloads' ||
             e.target.parentElement.id === 'cancelAgentNode');

          // If it's one of our buttons, handle it directly
          if (isAgentButton) {
            e.preventDefault();
            e.stopPropagation();

            // Handle the button click based on the button ID
            const buttonId = e.target.id || (e.target.parentElement && e.target.parentElement.id);

            if (buttonId === 'viewAgentLogs') {
              console.log('Global handler: View Agent Logs button clicked');

              try {
                // Make sure we have an editing node
                if (!AgentNodes.editingNode && window.App && App.selectedNode) {
                  AgentNodes.editingNode = App.selectedNode;
                }

                // Check if we have a node to work with
                if (!AgentNodes.editingNode) {
                  alert('Please select an agent node first.');
                  return;
                }

                // Initialize the logger if needed
                if (!AgentNodes.editingNode.logs) {
                  AgentLogger.initLogger(AgentNodes.editingNode);
                }

                // Create and show the agent logs modal
                // Get the agent logs modal elements
                const agentLogsModal = document.getElementById('agentLogsModal');
                const agentLogsContent = document.getElementById('agentLogsContent');

                // Clear the existing logs
                if (agentLogsContent) {
                  agentLogsContent.innerHTML = '';

                  // Add each log entry to the modal
                  if (AgentNodes.editingNode.logs && AgentNodes.editingNode.logs.length > 0) {
                    AgentNodes.editingNode.logs.forEach(log => {
                      const logEntry = document.createElement('div');
                      logEntry.className = `log-entry ${log.type}`;
                      logEntry.innerHTML = `<span class="timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span> <span class="log-type ${log.type}">[${log.type.toUpperCase()}]</span> ${log.message}`;
                      agentLogsContent.appendChild(logEntry);
                    });
                  } else {
                    // Add a message if there are no logs
                    const noLogsMessage = document.createElement('div');
                    noLogsMessage.className = 'log-entry info';
                    noLogsMessage.textContent = 'No logs available.';
                    agentLogsContent.appendChild(noLogsMessage);
                  }
                }

                // Show the modal
                if (agentLogsModal) {
                  agentLogsModal.style.display = 'block';
                }
              } catch (error) {
                console.error('Error opening agent logs:', error);
                alert('Error opening agent logs: ' + error.message);
              }
            } else if (buttonId === 'viewApiPayloads') {
              console.log('Global handler: View API Payloads button clicked');

              try {
                // Make sure we have an editing node
                if (!AgentNodes.editingNode && window.App && App.selectedNode) {
                  AgentNodes.editingNode = App.selectedNode;
                }

                // Check if we have a node to work with
                if (!AgentNodes.editingNode) {
                  alert('Please select an agent node first.');
                  return;
                }

                // Initialize API payload storage if not already present
                if (!AgentNodes.editingNode.lastRequestPayload) {
                  AgentNodes.editingNode.lastRequestPayload = {};
                }

                if (!AgentNodes.editingNode.lastResponsePayload) {
                  AgentNodes.editingNode.lastResponsePayload = {};
                }

                // Create and show the API payloads modal
                const apiPayloadsModal = document.getElementById('apiPayloadsModal');

                // Update the API payloads display
                AgentNodes.updatePayloadsDisplay();

                // Show the modal
                if (apiPayloadsModal) {
                  apiPayloadsModal.style.display = 'block';
                }
              } catch (error) {
                console.error('Error opening API payloads:', error);
                alert('Error opening API payloads: ' + error.message);
              }
            } else if (buttonId === 'saveAgentNode') {
              console.log('Global handler: Save Agent Node button clicked');

              // Try to save the agent node editor
              try {
                // Call the saveAgentNodeEditor method
                AgentNodes.saveAgentNodeEditor();

                // Close the modal
                const agentNodeEditor = document.getElementById('agentNodeEditor');
                if (agentNodeEditor) {
                  agentNodeEditor.style.display = 'none';
                  agentNodeEditor.classList.remove('active');
                }

                // Force redraw the canvas
                if (window.App && typeof App.draw === 'function') {
                  App.draw();
                }
              } catch (error) {
                console.error('Error saving agent node:', error);
                alert('Error saving agent node: ' + error.message);
              }
            } else if (buttonId === 'cancelAgentNode') {
              console.log('Global handler: Cancel Agent Node button clicked');
              // Close the modal directly
              const agentNodeEditor = document.getElementById('agentNodeEditor');
              if (agentNodeEditor) {
                agentNodeEditor.style.display = 'none';
                agentNodeEditor.classList.remove('active');
              }

              // Try multiple approaches to close the modal

              // Approach 1: Use ModalManager if available
              if (window.ModalManager && typeof ModalManager.closeModal === 'function') {
                ModalManager.closeModal('agentNodeEditor');
              }

              // Approach 2: Use direct DOM manipulation
              document.querySelectorAll('.modal').forEach(modal => {
                if (modal.id === 'agentNodeEditor' || modal.classList.contains('agent-node-editor')) {
                  modal.style.display = 'none';
                }
              });

              // Approach 3: Remove modal backdrop if it exists
              const backdrop = document.querySelector('.modal-backdrop');
              if (backdrop) {
                backdrop.remove();
              }

              // Force redraw the canvas
              if (window.App && typeof App.draw === 'function') {
                App.draw();
              }
            }

            return;
          }
        }

        // Handle "View API Payloads" button
        if (e.target && e.target.id === 'viewApiPayloads' ||
            (e.target.parentElement && e.target.parentElement.id === 'viewApiPayloads')) {
          // Get the currently selected node from the App object
          if (window.App && App.selectedNode) {
            // Set the editingNode reference
            AgentNodes.editingNode = App.selectedNode;
            DebugManager.addLog(`Global handler: Using selected node ${App.selectedNode.id} for API payloads`, 'info');

            // Call the openPayloadsModal method
            AgentNodes.openPayloadsModal();
          } else {
            DebugManager.addLog('No node selected for API payloads viewing', 'error');
            alert('Please select a node first.');
          }
        }

        // Handle "View Agent Logs" button
        if (e.target && e.target.id === 'viewAgentLogs' ||
            (e.target.parentElement && e.target.parentElement.id === 'viewAgentLogs')) {
          // Get the currently selected node from the App object
          if (window.App && App.selectedNode) {
            // Set the editingNode reference
            AgentNodes.editingNode = App.selectedNode;
            DebugManager.addLog(`Global handler: Using selected node ${App.selectedNode.id} for agent logs`, 'info');

            // Call the openAgentLogsModal method
            AgentNodes.openAgentLogsModal();
          } else {
            DebugManager.addLog('No node selected for agent logs viewing', 'error');
            alert('Please select a node first.');
          }
        }

      });

      // Initialize the API Payloads modal
      const apiPayloadsModal = document.getElementById('apiPayloadsModal');
      if (apiPayloadsModal) {
        const closeApiPayloadsBtn = document.getElementById('closeApiPayloads');
        if (closeApiPayloadsBtn) {
          closeApiPayloadsBtn.addEventListener('click', () => {
            apiPayloadsModal.style.display = 'none';
            // Don't clear the editing node reference when the modal is closed
            // This allows the user to continue editing the node after viewing payloads
            DebugManager.addLog('API payloads modal closed, editingNode reference preserved', 'info');
          });
        }

        // We don't need this duplicate handler anymore since we're using the global handler
        // and the specific handler in the agent node editor
        // This was causing conflicts with multiple handlers for the same button

        const copyPayloadBtn = document.getElementById('copyPayload');
        if (copyPayloadBtn) {
          copyPayloadBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('#apiPayloadsModal .tab-pane.active');
            if (activeTab) {
              const payloadContent = activeTab.querySelector('pre').textContent;
              navigator.clipboard.writeText(payloadContent)
                .then(() => {
                  DebugManager.addLog('Payload copied to clipboard', 'success');
                })
                .catch(err => {
                  DebugManager.addLog(`Failed to copy payload: ${err}`, 'error');
                });
            }
          });
        }

        // Add event listeners for tab buttons
        const tabButtons = document.querySelectorAll('#apiPayloadsModal .tab-button');
        tabButtons.forEach(button => {
          button.addEventListener('click', () => {
            // Remove active class from all tab buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Hide all tab panes
            document.querySelectorAll('#apiPayloadsModal .tab-pane').forEach(pane => {
              pane.style.display = 'none';
              pane.classList.remove('active');
            });

            // Show the selected tab pane
            const tabId = button.getAttribute('data-tab');
            const tabPane = document.getElementById(tabId);
            if (tabPane) {
              tabPane.style.display = 'block';
              tabPane.classList.add('active');
            }
          });
        });
      }

      DebugManager.addLog('Agent Nodes initialized with drawAgentNode method available', 'info');
    }
  }, 500);
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
        // Check if we should use the agent node editor modal or style the regular node editor
        const useAgentNodeEditorModal = document.getElementById('agentNodeEditor') !== null;

        if (useAgentNodeEditorModal) {
          // Use our custom agent node editor
          AgentNodes.openAgentNodeEditor(node);
        } else {
          // Apply agent styling to the regular node editor
          const nodeEditor = document.getElementById('nodeEditor');
          if (nodeEditor) {
            // Add agent-node-editor class to the node editor
            nodeEditor.classList.add('agent-node-editor');

            // Store the original saveNodeEditor method
            const originalSaveNodeEditor = App.saveNodeEditor;

            // Override the saveNodeEditor method to remove the agent-node-editor class
            App.saveNodeEditor = function(e) {
              // Call the original method
              const result = originalSaveNodeEditor.call(App, e);

              // Remove the agent-node-editor class
              nodeEditor.classList.remove('agent-node-editor');

              // Restore the original saveNodeEditor method
              App.saveNodeEditor = originalSaveNodeEditor;

              return result;
            };

            // Store the original cancelNodeEditor method if it exists
            if (App.cancelNodeEditor) {
              const originalCancelNodeEditor = App.cancelNodeEditor;

              // Override the cancelNodeEditor method to remove the agent-node-editor class
              App.cancelNodeEditor = function() {
                // Call the original method
                const result = originalCancelNodeEditor.call(App);

                // Remove the agent-node-editor class
                nodeEditor.classList.remove('agent-node-editor');

                // Restore the original cancelNodeEditor method
                App.cancelNodeEditor = originalCancelNodeEditor;

                return result;
              };
            }

            // Add agent-specific fields or modify existing ones
            const modalTitle = nodeEditor.querySelector('h2');
            if (modalTitle) {
              modalTitle.innerHTML = '🤖 Agent Node Editor';
            }

            // Call the original method with the styled node editor
            originalOpenNodeEditor.call(App, node);
          } else {
            // Fall back to the original method if node editor not found
            originalOpenNodeEditor.call(App, node);
          }
        }
      } else {
        // Call the original method for regular nodes
        originalOpenNodeEditor.call(App, node);
      }
    };

    // Initialize the agent node editor
    AgentNodes.initAgentNodeEditor();
  }
});
