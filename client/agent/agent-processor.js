/**
 * Agent Processor Module
 * Handles processing logic for agent nodes
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Create the AgentProcessor object
  const AgentProcessor = {
    // Initialize the processor
    init: function() {
      console.log('Initializing AgentProcessor');

      // Update the tools list
      this.updateToolsList();

      console.log('AgentProcessor initialized');
    },

    // Create an Agent Node
    createAgentNode: function() {
      try {
        // Check if App object is available
        if (!window.App || !window.App.nodes) {
          console.error('App object or App.nodes not available');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('App object or App.nodes not available, cannot create agent node', 'error');
          }

          // Create a standalone node that's not connected to the App
          console.warn('Creating standalone agent node not connected to App');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('Creating standalone agent node not connected to App', 'warning');
          }

          return this.createStandaloneAgentNode();
        }

        const id = window.App.nodes.length + 1;
        const x = window.innerWidth/2 - 80;
        const y = window.innerHeight/2 - 40;

        // Check if Node constructor is available
        if (typeof Node !== 'function') {
          console.error('Node constructor not available');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('Node constructor not available, cannot create agent node', 'error');
          }

          // Create a standalone node
          return this.createStandaloneAgentNode();
        }

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

        // Initialize with all available tools
        try {
          // Use the cached tools list if available
          if (this.availableTools && this.availableTools.length > 0) {
            node.tools = [...this.availableTools];
            console.log(`Using ${node.tools.length} cached tools for agent node`);
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Using ${node.tools.length} cached tools for agent node`, 'info');
            }
          } else {
            // Otherwise, get tools directly
            this.updateToolsList();
            node.tools = [...this.availableTools];
            console.log(`Loaded ${node.tools.length} tools for agent node`);
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Loaded ${node.tools.length} tools for agent node`, 'info');
            }
          }
        } catch (error) {
          console.error('Error loading tools for agent node:', error);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Error loading tools for agent node: ${error.message}`, 'error');
          }

          // Fallback to empty tools array
          node.tools = [];
        }

        // Set workflow role properties
        node.workflowRole = 'none';       // Default role is none
        node._workflowRole = 'none';      // Set both properties to ensure compatibility

        // Add the node to the canvas
        window.App.nodes.push(node);

        // Select the new node
        window.App.nodes.forEach(n => n.selected = false);
        node.selected = true;
        window.App.selectedNode = node; // Set the selectedNode property
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Selected node: ${node.id} (agent node)`, 'info');
        }

        // Log the creation with detailed information
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Added new Agent Node "${node.title}" (ID: ${node.id}, Type: ${node.nodeType})`, 'info');
        }

        // Initialize the logger for this node
        if (window.AgentLogger && typeof AgentLogger.initNodeLogger === 'function') {
          AgentLogger.initNodeLogger(node);
        }

        // Force a redraw of the canvas
        if (window.App && typeof App.draw === 'function') {
          App.draw();
        }

        return node;
      } catch (error) {
        console.error('Error creating agent node:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error creating agent node: ${error.message}`, 'error');
        }

        // Try to create a standalone node as a fallback
        try {
          console.warn('Attempting to create standalone agent node as fallback');
          return this.createStandaloneAgentNode();
        } catch (fallbackError) {
          console.error('Error creating standalone agent node:', fallbackError);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Error creating standalone agent node: ${fallbackError.message}`, 'error');
          }
          throw error; // Throw the original error
        }
      }
    },

    // Create a standalone agent node that's not connected to the App
    createStandaloneAgentNode: function() {
      console.log('Creating standalone agent node');

      // Create a simple object to represent the node
      const node = {
        id: Math.floor(Math.random() * 10000), // Generate a random ID
        x: window.innerWidth/2 - 80,
        y: window.innerHeight/2 - 40,
        title: `Agent Node (Standalone)`,
        _nodeType: 'agent',
        nodeType: 'agent',
        isAgentNode: true,
        contentType: 'text',
        aiProcessor: 'text-to-text',
        inputType: 'text',
        outputType: 'text',
        systemPrompt: "You are an autonomous agent that reasons step by step. " +
          "You can access various tools, including MCP tools for search, memory, and documentation. " +
          "Use these tools whenever they help you fulfill the user's request.",
        width: 240,
        height: 200,
        selected: true,
        content: '',
        inputContent: '',
        agentType: 'default',
        tools: this.availableTools || [],
        memory: {},
        maxIterations: 5,
        currentIteration: 0,
        autoIterate: true,
        customCode: '',
        useMCPTools: true,
        enableReflection: true,
        reflectionPrompt: 'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?',
        reflectionFrequency: 2,
        canBeWorkflowNode: true,
        workflowRole: 'none',
        _workflowRole: 'none',

        // Add basic methods
        process: async function(input) {
          console.log('Processing standalone agent node with input:', input);
          return 'This is a standalone agent node that is not connected to the App. It cannot be fully processed.';
        },

        draw: function(ctx) {
          console.log('Drawing standalone agent node (no-op)');
        }
      };

      // Initialize the logger for this node
      if (window.AgentLogger && typeof AgentLogger.initNodeLogger === 'function') {
        AgentLogger.initNodeLogger(node);
      }

      console.log('Created standalone agent node:', node);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Created standalone agent node with ID: ${node.id}`, 'warning');
      }

      return node;
    },

    // Process an Agent Node
    processAgentNode: async function(node, input) {
      try {
        console.log(`Processing agent node ${node.id} with input:`, input);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Processing agent node ${node.id} with input`, 'info');
        }

        // Initialize the node logger if not already initialized
        if (window.AgentLogger && typeof AgentLogger.initNodeLogger === 'function') {
          AgentLogger.initNodeLogger(node);
        }

        // Log the input
        if (window.AgentLogger && typeof AgentLogger.logInput === 'function') {
          AgentLogger.logInput(node, input);
        }

        // Process the node using the agent planner
        let result;
        if (window.AgentPlanner && typeof AgentPlanner.processNode === 'function') {
          result = await AgentPlanner.processNode(node, input);
        } else {
          // Fallback to direct processing
          result = await this.directProcessNode(node, input);
        }

        // Log the result
        if (window.AgentLogger && typeof AgentLogger.logOutput === 'function') {
          AgentLogger.logOutput(node, result);
        }

        return result;
      } catch (error) {
        console.error(`Error processing agent node ${node.id}:`, error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error processing agent node ${node.id}: ${error.message}`, 'error');
        }

        // Log the error
        if (window.AgentLogger && typeof AgentLogger.logError === 'function') {
          AgentLogger.logError(node, error);
        }

        throw error;
      }
    },

    // Direct process node (fallback if AgentPlanner is not available)
    directProcessNode: async function(node, input) {
      try {
        console.log(`Direct processing agent node ${node.id} with input:`, input);

        // Get the API endpoint
        const apiEndpoint = '/api/openai/chat';

        // Prepare the request payload
        const payload = {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: node.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: input }
          ],
          temperature: 0.7,
          max_tokens: 2000
        };

        // Log the request payload
        node.lastRequestPayload = payload;

        // Add to API logs
        if (!node.apiLogs) {
          node.apiLogs = [];
        }

        const apiLog = {
          timestamp: new Date().toISOString(),
          request: payload,
          response: null
        };

        node.apiLogs.push(apiLog);

        // Make the API request
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        // Log the response
        node.lastResponsePayload = data;

        // Update the API log
        apiLog.response = data;

        // Extract the result
        const result = data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : 'No response from the API';

        return result;
      } catch (error) {
        console.error(`Error in direct processing of agent node ${node.id}:`, error);
        throw error;
      }
    },

    // Add a method to update the tools list
    updateToolsList: function() {
      try {
        console.log('Updating AgentProcessor tools list');

        // Get all available tools
        const builtInTools = (typeof window.AgentTools !== 'undefined' && window.AgentTools.getAllTools)
          ? window.AgentTools.getAllTools()
          : [];

        const mcpTools = (window.MCPTools && window.MCPTools.getAllTools)
          ? window.MCPTools.getAllTools()
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
  };

  // Export the AgentProcessor object to the global scope
  window.AgentProcessor = AgentProcessor;

  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentProcessor');
    AgentProcessor.init();
  });
})();
