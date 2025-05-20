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
          "Use these tools whenever they help you fulfill the user's request. " +
          "ALWAYS use tools when they would be helpful rather than making up information. " +
          "Think carefully about which tools to use for each task.";
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

        // Add the node to the canvas if App is available
        if (window.App && Array.isArray(window.App.nodes)) {
          // Check if the node is already in the array
          const nodeExists = window.App.nodes.some(n => n.id === node.id);

          if (!nodeExists) {
            console.log(`Adding agent node ${node.id} to App.nodes array from AgentProcessor`);
            window.App.nodes.push(node);

            // Select the new node
            window.App.nodes.forEach(n => n.selected = false);
            node.selected = true;
            window.App.selectedNode = node; // Set the selectedNode property

            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Selected node: ${node.id} (agent node)`, 'info');
            }

            // Force a redraw of the canvas
            if (typeof window.App.draw === 'function') {
              console.log('Forcing canvas redraw from AgentProcessor');
              window.App.draw();
            }
          } else {
            console.log(`Node ${node.id} already exists in App.nodes array`);
          }
        } else {
          console.warn('App.nodes array not available in AgentProcessor, node will not be rendered on canvas');
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
          "Use these tools whenever they help you fulfill the user's request. " +
          "ALWAYS use tools when they would be helpful rather than making up information. " +
          "Think carefully about which tools to use for each task.",
        width: 240,
        height: 200,
        selected: true,
        content: '',
        inputContent: '',
        agentType: 'default',
        tools: this.availableTools || [],
        memory: {},
        // Iteration properties
        maxIterations: 5,
        currentIteration: 0,
        autoIterate: true,
        isIterating: false,
        // Agent capabilities
        customCode: '',
        useMCPTools: true,
        // Reflection properties
        enableReflection: true,
        reflectionPrompt: 'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?',
        reflectionFrequency: 2,
        // Workflow properties
        canBeWorkflowNode: true,
        workflowRole: 'none',
        _workflowRole: 'none',
        // API logs
        apiLogs: [],

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

      // Add the node to the App.nodes array if available
      if (window.App && Array.isArray(window.App.nodes)) {
        // Check if the node is already in the array
        const nodeExists = window.App.nodes.some(n => n.id === node.id);

        if (!nodeExists) {
          console.log(`Adding standalone agent node ${node.id} to App.nodes array`);
          window.App.nodes.push(node);

          // Select the new node
          window.App.nodes.forEach(n => n.selected = false);
          node.selected = true;
          window.App.selectedNode = node;

          // Force a redraw of the canvas
          if (typeof window.App.draw === 'function') {
            console.log('Forcing canvas redraw for standalone agent node');
            window.App.draw();
          }
        } else {
          console.log(`Node ${node.id} already exists in App.nodes array`);
        }
      } else {
        console.warn('App.nodes array not available, standalone node will not be rendered on canvas');
      }

      console.log('Created standalone agent node:', node);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Created standalone agent node with ID: ${node.id}`, 'warning');
      }

      return node;
    },

    // Process an Agent Node
    processAgentNode: async function(node, input, reflectionResult = null) {
      try {
        console.log(`Processing agent node ${node.id} with input:`, input);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Processing agent node ${node.id} with input`, 'info');
        }

        // Initialize node properties if not already set
        if (node.currentIteration === undefined) {
          node.currentIteration = 0;
        }

        if (node.isIterating === undefined) {
          node.isIterating = true;
        }

        // Increment iteration counter
        node.currentIteration++;

        // Initialize the node logger if not already initialized
        if (window.AgentLogger && typeof AgentLogger.initNodeLogger === 'function') {
          AgentLogger.initNodeLogger(node);
        }

        // Log the input
        if (window.AgentLogger && typeof AgentLogger.logInput === 'function') {
          AgentLogger.logInput(node, input);
        }

        // Log reflection if provided
        if (reflectionResult && window.AgentLogger && typeof AgentLogger.addLog === 'function') {
          AgentLogger.addLog(node, `Reflection: ${reflectionResult}`, 'info');
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

        // Check if we need to continue iterating
        if (node.autoIterate && node.isIterating && node.currentIteration < node.maxIterations) {
          // Perform reflection if needed
          const newReflectionResult = await this.performReflection(
            node,
            input,
            node.memory ? node.memory.history || [] : []
          );

          // Continue to the next iteration
          if (window.AgentLogger && typeof AgentLogger.addLog === 'function') {
            AgentLogger.addLog(node, `Continuing to iteration ${node.currentIteration + 1}`, 'info');
          }

          // Process the node again with the current result as input
          return await this.processAgentNode(node, result, newReflectionResult);
        } else {
          // Mark the agent as done iterating
          node.isIterating = false;

          if (window.AgentLogger && typeof AgentLogger.addLog === 'function') {
            AgentLogger.addLog(node, 'Agent processing completed', 'success');
          }

          return result;
        }

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

        // Get available tools
        const availableTools = [];

        // Add built-in tools
        if (window.AgentTools && typeof AgentTools.getAllTools === 'function') {
          availableTools.push(...AgentTools.getAllTools());
        }

        // Add MCP tools if enabled
        if (node.useMCPTools && window.MCPTools && typeof MCPTools.getAllTools === 'function') {
          availableTools.push(...MCPTools.getAllTools());
        }

        // Convert tools to OpenAI format
        const toolsForAPI = availableTools.map(tool => ({
          type: 'function',
          function: {
            name: tool.id,
            description: tool.description,
            parameters: this.getToolParameters(tool)
          }
        }));

        // Get the API endpoint
        const apiEndpoint = '/api/openai/chat';

        // Prepare the request payload
        const payload = {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: this.getEnhancedSystemPrompt(node) },
            { role: 'user', content: input }
          ],
          tools: toolsForAPI,
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

        // Process the response
        return await this.processToolCalls(node, data, input, payload.messages);
      } catch (error) {
        console.error(`Error in direct processing of agent node ${node.id}:`, error);
        throw error;
      }
    },

    // Helper method to get tool parameters
    getToolParameters: function(tool) {
      // Default parameters structure
      const defaultParams = {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Input text for the tool'
          }
        },
        required: []
      };

      // Tool-specific parameter schemas
      switch (tool.id) {
        case 'text-summarize':
          return {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to summarize'
              },
              maxLength: {
                type: 'integer',
                description: 'Maximum length of the summary in words'
              }
            },
            required: ['text']
          };
        case 'text-extract-entities':
          return {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to extract entities from'
              }
            },
            required: ['text']
          };
        case 'image-analyze':
          return {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: 'URL of the image to analyze'
              }
            },
            required: ['imageUrl']
          };
        case 'data-parse-json':
          return {
            type: 'object',
            properties: {
              jsonString: {
                type: 'string',
                description: 'The JSON string to parse'
              }
            },
            required: ['jsonString']
          };
        case 'workflow-get-node-content':
          return {
            type: 'object',
            properties: {
              nodeId: {
                type: 'string',
                description: 'ID of the node to get content from'
              }
            },
            required: ['nodeId']
          };
        case 'search_perplexity-server':
          return {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              },
              detail_level: {
                type: 'string',
                description: 'Level of detail (brief, normal, detailed)',
                enum: ['brief', 'normal', 'detailed']
              }
            },
            required: ['query']
          };
        case 'get_documentation_perplexity-server':
          return {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The technology, library, or API to get documentation for'
              },
              context: {
                type: 'string',
                description: 'Additional context or specific aspects to focus on'
              }
            },
            required: ['query']
          };
        case 'chat_perplexity_perplexity-server':
          return {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to send to Perplexity AI'
              },
              chat_id: {
                type: 'string',
                description: 'Optional: ID of an existing chat to continue'
              }
            },
            required: ['message']
          };
        case 'browser.search':
          return {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            },
            required: ['query']
          };
        case 'computer.execute':
          return {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to execute'
              }
            },
            required: ['command']
          };
        // Add more tool-specific schemas as needed
        default:
          // If we don't have a specific schema, try to infer from the tool's execute method
          if (tool.execute && tool.execute.toString) {
            const fnStr = tool.execute.toString();
            const paramMatch = fnStr.match(/function\s*\(([^)]*)\)/);
            if (paramMatch && paramMatch[1]) {
              const params = paramMatch[1].split(',').map(p => p.trim()).filter(p => p && p !== 'node');
              if (params.length > 0) {
                const properties = {};
                params.forEach(param => {
                  properties[param] = {
                    type: 'string',
                    description: `Parameter: ${param}`
                  };
                });
                return {
                  type: 'object',
                  properties,
                  required: params
                };
              }
            }
          }
          return defaultParams;
      }
    },

    // Get enhanced system prompt with tool descriptions
    getEnhancedSystemPrompt: function(node) {
      const basePrompt = node.systemPrompt || 'You are a helpful assistant.';

      // Get available tools
      const availableTools = [];
      if (window.AgentTools && typeof AgentTools.getAllTools === 'function') {
        availableTools.push(...AgentTools.getAllTools());
      }
      if (node.useMCPTools && window.MCPTools && typeof MCPTools.getAllTools === 'function') {
        availableTools.push(...MCPTools.getAllTools());
      }

      // Group tools by category
      const toolsByCategory = {};
      availableTools.forEach(tool => {
        if (!toolsByCategory[tool.category]) {
          toolsByCategory[tool.category] = [];
        }
        toolsByCategory[tool.category].push(tool);
      });

      // Create tool descriptions
      let toolDescriptions = '';
      Object.entries(toolsByCategory).forEach(([category, tools]) => {
        toolDescriptions += `\n\n${category.toUpperCase()} TOOLS:`;
        tools.forEach(tool => {
          toolDescriptions += `\n- ${tool.name} (${tool.id}): ${tool.description}`;
        });
      });

      // Create enhanced prompt
      const enhancedPrompt = `${basePrompt}

You have access to the following tools:${toolDescriptions}

When you need information or need to perform an action:
1. ALWAYS use the appropriate tool rather than making up information
2. Think step-by-step about which tool would be most helpful
3. If you need to search for information, use the search tool
4. If you need documentation, use the documentation tool
5. If you need to analyze an image, use the image analysis tool

After using tools, synthesize the information to provide a complete and accurate response.`;

      return enhancedPrompt;
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

  // Add reflection method
  AgentProcessor.performReflection = async function(node, input, history) {
    try {
      console.log(`Performing reflection for node ${node.id} at iteration ${node.currentIteration}`);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Performing reflection for node ${node.id} at iteration ${node.currentIteration}`, 'info');
      }

      // Skip reflection if disabled or not time yet
      if (!node.enableReflection || node.currentIteration % node.reflectionFrequency !== 0) {
        return null;
      }

      // Get the reflection prompt
      const reflectionPrompt = node.reflectionPrompt ||
        'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?';

      // Format the history for reflection
      const historyText = history.map(item =>
        `Action: ${item.action ? JSON.stringify(item.action) : 'N/A'}\nResult: ${
          typeof item.result === 'string' ? item.result : JSON.stringify(item.result)
        }`
      ).join('\n\n');

      // Make the API request
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are reflecting on your previous actions to improve your problem-solving approach.'
            },
            {
              role: 'user',
              content: `${reflectionPrompt}\n\nOriginal input: ${input}\n\nPrevious actions:\n${historyText}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Reflection API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const reflectionResult = data.choices[0].message.content;

      // Store the reflection in memory
      if (node.memory) {
        AgentMemory.store(node, `reflection_${node.currentIteration}`, reflectionResult);
      }

      console.log(`Reflection completed for node ${node.id}:`, reflectionResult);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Reflection completed for node ${node.id}: ${reflectionResult}`, 'info');
      }

      return reflectionResult;
    } catch (error) {
      console.error(`Error performing reflection for node ${node.id}:`, error);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Error performing reflection for node ${node.id}: ${error.message}`, 'error');
      }
      return null;
    }
  };

  AgentProcessor.processToolCalls = async function(node, data, originalInput, messages) {
    try {
      const message = data.choices[0].message;

      // If there are no tool calls, return the content directly
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content;
      }

      console.log(`Processing ${message.tool_calls.length} tool calls for node ${node.id}`);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Processing ${message.tool_calls.length} tool calls for node ${node.id}`, 'info');
      }

      // Create a new messages array that includes the assistant's response with tool calls
      const updatedMessages = [...messages, message];

      // Process each tool call
      for (const toolCall of message.tool_calls) {
        try {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`Executing tool ${functionName} with args:`, functionArgs);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Executing tool ${functionName} with args: ${JSON.stringify(functionArgs)}`, 'info');
          }

          // Execute the tool
          let toolResult;
          if (window.AgentTools && typeof AgentTools.getToolById === 'function') {
            const tool = AgentTools.getToolById(functionName);
            if (tool) {
              toolResult = await AgentTools.executeTool(functionName, functionArgs, node);
            } else if (window.MCPTools && typeof MCPTools.getToolById === 'function') {
              const mcpTool = MCPTools.getToolById(functionName);
              if (mcpTool) {
                toolResult = await MCPTools.executeMCPTool(functionName, functionArgs, node);
              } else {
                toolResult = `Error: Tool ${functionName} not found`;
              }
            } else {
              toolResult = `Error: Tool ${functionName} not found`;
            }
          } else {
            toolResult = `Error: AgentTools not available`;
          }

          // Add the tool result to the messages
          updatedMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
          });

          // Store the tool execution in memory
          if (node.memory) {
            AgentMemory.addToHistory(node, {
              tool: functionName,
              params: functionArgs
            }, toolResult);
          }

          // Log the tool execution
          if (window.AgentLogger && typeof AgentLogger.addLog === 'function') {
            AgentLogger.addLog(node, `Tool ${functionName} executed with result: ${typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)}`, 'info');
          }
        } catch (error) {
          console.error(`Error executing tool ${toolCall.function.name}:`, error);
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Error executing tool ${toolCall.function.name}: ${error.message}`, 'error');
          }

          // Add the error to the messages
          updatedMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: ${error.message}`
          });

          // Log the error
          if (window.AgentLogger && typeof AgentLogger.addLog === 'function') {
            AgentLogger.addLog(node, `Error executing tool ${toolCall.function.name}: ${error.message}`, 'error');
          }
        }
      }

      // Make another API call with the updated messages
      console.log(`Making follow-up API call with ${updatedMessages.length} messages`);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Making follow-up API call with ${updatedMessages.length} messages`, 'info');
      }

      const followUpResponse = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: updatedMessages,
          tools: data.tools, // Reuse the same tools
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!followUpResponse.ok) {
        throw new Error(`Follow-up API request failed with status ${followUpResponse.status}`);
      }

      const followUpData = await followUpResponse.json();

      // Log the follow-up response
      if (!node.apiLogs) {
        node.apiLogs = [];
      }

      node.apiLogs.push({
        timestamp: new Date().toISOString(),
        request: {
          messages: updatedMessages,
          tools: data.tools
        },
        response: followUpData
      });

      // Check if there are more tool calls
      const followUpMessage = followUpData.choices[0].message;
      if (followUpMessage.tool_calls && followUpMessage.tool_calls.length > 0) {
        // Recursively process more tool calls
        return await this.processToolCalls(node, followUpData, originalInput, updatedMessages);
      }

      // Return the final content
      return followUpMessage.content;
    } catch (error) {
      console.error(`Error processing tool calls for node ${node.id}:`, error);
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Error processing tool calls for node ${node.id}: ${error.message}`, 'error');
      }
      return `Error processing tools: ${error.message}. Original response: ${data.choices[0].message.content}`;
    }
  },

  // Export the AgentProcessor object to the global scope
  window.AgentProcessor = AgentProcessor;

  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentProcessor');
    AgentProcessor.init();
  });
})();
