/**
 * Agent Processor Module
 * Handles processing logic for agent nodes
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  console.log('🛠️ AgentProcessor loaded at', new Date().toISOString());
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
        node.systemPrompt = "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. Your goal is to help users by:\n" +
          "1. Breaking down complex tasks into steps\n" +
          "2. Using tools actively - especially browser.search for current information\n" +
          "3. Reasoning through problems step-by-step\n" +
          "4. Iterating and refining your approach based on results\n\n" +
          "When asked about current events, news, or real-time information, you MUST use browser.search. Never say you cannot access current information.";
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
        
        // IMPORTANT: Ensure autoIterate is always true for agent nodes
        node.autoIterate = true;

        // Reasoning capabilities
        node.enableReasoning = true;      // Whether to enable step-by-step reasoning
        node.reasoningStyle = 'cot';      // Reasoning style (cot, tot, react, planner)
        node.reasoningDepth = '3';        // Reasoning depth (1, 3, 5, 10)
        node.showReasoning = true;        // Whether to show reasoning in output

        // Reflection capabilities
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
        systemPrompt: "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. Your goal is to help users by:\n" +
          "1. Breaking down complex tasks into steps\n" +
          "2. Using tools actively - especially browser.search for current information\n" +
          "3. Reasoning through problems step-by-step\n" +
          "4. Iterating and refining your approach based on results\n\n" +
          "When asked about current events, news, or real-time information, you MUST use browser.search. Never say you cannot access current information.",
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

        // Reasoning capabilities
        enableReasoning: true,
        reasoningStyle: 'cot',
        reasoningDepth: '3',
        showReasoning: true,

        // Reflection capabilities
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

    // Process an Agent Node with full iterative execution and tool usage
    processAgentNode: async function(node, input) {
      try {
        console.log(`Processing agent node ${node.id} with input:`, input);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`=== AGENT NODE ${node.id} PROCESSING START ===`, 'info');
          DebugManager.addLog(`Input: ${input}`, 'info');
          DebugManager.addLog(`Max iterations: ${node.maxIterations || 5}`, 'info');
          DebugManager.addLog(`Auto iterate: ${node.autoIterate}`, 'info');
        }

        // Initialize the node logger if not already initialized
        if (window.AgentLogger && typeof AgentLogger.initNodeLogger === 'function') {
          AgentLogger.initNodeLogger(node);
        }

        // Log the input
        if (window.AgentLogger && typeof AgentLogger.logInput === 'function') {
          AgentLogger.logInput(node, input);
        }

        // Initialize memory if needed
        if (window.AgentMemory && typeof AgentMemory.initMemory === 'function') {
          AgentMemory.initMemory(node);
          AgentLogger.addLog(node, 'Initialized agent memory', 'info');
        }

        // Add the input to context
        if (window.AgentMemory && typeof AgentMemory.addToContext === 'function') {
          AgentMemory.addToContext(node, input);
          AgentLogger.addLog(node, 'Added input to context', 'info');
        }

        // Prepare for iterative execution
        const config = (window.ApiService && window.ApiService.openai && window.ApiService.openai.getConfig)
          ? window.ApiService.openai.getConfig()
          : { apiKey: null, model: 'gpt-4o' };

        if (!config.apiKey) {
          DebugManager.addLog('ERROR: OpenAI API key not configured!', 'error');
          DebugManager.addLog('Please configure your OpenAI API key in the settings', 'error');
          throw new Error('OpenAI API key not configured');
        }
        
        DebugManager.addLog(`Using model: ${config.model || 'gpt-4o'}`, 'info');

        let finalOutput = null;
        let continueIteration = true;
        node.currentIteration = 0;
        
        // Initialize conversation messages array outside the loop to maintain history
        const messages = [];
        let systemPrompt = '';
        let tools = [];
        
        // Setup tools and system prompt once
        const supportsFunctionCalling = /^gpt-[34][\w.-]*/i.test(config.model || '');
        
        if (supportsFunctionCalling) {
          AgentLogger.addLog(node, 'Model supports function calling, preparing tools', 'info');
          DebugManager.addLog(`Model ${config.model} supports function calling`, 'success');
          
          // Get available tools for function calling
          const allTools = (window.AgentTools && typeof window.AgentTools.getAllTools === 'function')
            ? window.AgentTools.getAllTools()
            : [];
          
          AgentLogger.addLog(node, `Found ${allTools.length} available tools`, 'info');
          DebugManager.addLog(`Loading ${allTools.length} tools for agent`, 'info');
          
          if (allTools.length === 0) {
            DebugManager.addLog('⚠️ WARNING: No tools available! Check AgentTools and MCPTools initialization', 'warning');
          } else {
            const toolNames = allTools.slice(0, 5).map(t => t.id).join(', ');
            DebugManager.addLog(`Available tools: ${toolNames}${allTools.length > 5 ? ` and ${allTools.length - 5} more` : ''}`, 'info');
          }
          
          // Map tools to the format expected by OpenAI API
          tools = allTools.map(tool => {
            if (!tool.id || !tool.description) {
              AgentLogger.addLog(node, `Skipping invalid tool: ${tool.id || 'unknown'}`, 'warning');
              return null;
            }
            
            // Get parameters and required parameters
            const properties = (window.AgentNodes && typeof window.AgentNodes.getToolParameters === 'function')
              ? window.AgentNodes.getToolParameters(tool)
              : {};
            const required = (window.AgentNodes && typeof window.AgentNodes.getToolRequiredParameters === 'function')
              ? window.AgentNodes.getToolRequiredParameters(tool)
              : [];
            
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
          }).filter(Boolean);
          
          // Create the system prompt
          systemPrompt = node.systemPrompt ||
            'You are a helpful assistant that can use tools to accomplish tasks. ' +
            'You MUST call a tool when it can help fulfill the user\'s request.';
          
          if (tools.length > 0) {
            const toolDescriptions = tools
              .map(t => `- ${t.function.name}: ${t.function.description}`)
              .slice(0, 10)
              .join('\n');
            systemPrompt += `\n\nYou have access to the following tools:\n${toolDescriptions}\n\n` +
              'When you need to use a tool, the model will automatically call it for you. ' +
              'You should use tools whenever they can help answer the user\'s question or complete their request. ' +
              'After receiving tool results, continue reasoning about the problem and either call more tools or provide a final answer. ' +
              'Think step by step and use multiple tools in sequence when needed to fully address the user\'s request.';
          }
          
          // Initialize messages with system prompt
          messages.push({ role: 'system', content: systemPrompt });
          
          // Add initial user message
          messages.push({ role: 'user', content: input });
        }

        while (continueIteration && node.currentIteration < (node.maxIterations || 5)) {
          node.currentIteration++;
          node.isIterating = true;
          AgentLogger.addLog(node, `Starting iteration ${node.currentIteration}`, 'info');

          if (supportsFunctionCalling) {
            DebugManager.addLog(`Iteration ${node.currentIteration}: Model supports function calling`, 'success');
            AgentLogger.addLog(node, `Sending request with ${messages.length} messages and ${tools.length} tools`, 'info');

            // Log the request
            AgentLogger.addLog(node, `Sending request to OpenAI API with function calling, iteration ${node.currentIteration}`, 'info');

            // Store the request payload for logging
            const requestPayload = {
              model: config.model || 'gpt-4o',
              messages,
              tools: tools,
              tool_choice: 'auto' // Encourage the model to use tools when appropriate
            };

            // Log the full request payload for debugging
            AgentLogger.addLog(node, `Sending request with ${messages.length} messages and ${tools.length} tools`, 'info');
            console.debug('OpenAI request payload:', requestPayload);

            // Store the request payload for logging
            node.lastRequestPayload = JSON.parse(JSON.stringify(requestPayload));

            // Make the API request
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
              DebugManager.addLog(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`, 'error');
              throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();

            // Store the response payload for logging
            node.lastResponsePayload = data;

            // Process the response
            const message = data.choices[0].message;

            // Log the response
            DebugManager.addLog(`API Response received for iteration ${node.currentIteration}`, 'info');
            if (message.content) {
              DebugManager.addLog(`Response preview: ${message.content.substring(0, 100)}...`, 'info');
            }
            
            // Handle old function_call format by converting to new tool_calls format
            if (message.function_call && !message.tool_calls) {
              AgentLogger.addLog(node, 'Converting legacy function_call to tool_calls format', 'info');
              message.tool_calls = [{
                id: `call_${Date.now()}`,
                type: 'function',
                function: {
                  name: message.function_call.name,
                  arguments: message.function_call.arguments
                }
              }];
            }

            // Check if the model wants to call tools (new format) or function (old format)
            if (message.tool_calls && message.tool_calls.length > 0) {
              // Handle new tool_calls format
              AgentLogger.addLog(node, `Model requested ${message.tool_calls.length} tool call(s)`, 'info');
              DebugManager.addLog(`🔧 Tool calls requested: ${message.tool_calls.map(tc => tc.function.name).join(', ')}`, 'success');
              
              const toolResults = [];
              
              // Execute all tool calls
              for (const toolCall of message.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                
                AgentLogger.addLog(node, `Executing tool: ${functionName}`, 'info');
                DebugManager.addLog(`Executing tool: ${functionName}`, 'info');
                DebugManager.addLog(`Tool args: ${JSON.stringify(functionArgs)}`, 'debug');

                try {
                  // Execute the tool
                  const toolResult = await (window.AgentTools && typeof window.AgentTools.executeTool === 'function')
                    ? window.AgentTools.executeTool(functionName, functionArgs, node)
                    : null;

                  // Add the result to the results array
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    tool: functionName,
                    result: toolResult
                  });

                  // Add to memory
                  if (window.AgentMemory && typeof window.AgentMemory.addToHistory === 'function') {
                    window.AgentMemory.addToHistory(node, {
                      tool: functionName,
                      params: functionArgs
                    }, toolResult);
                  }

                  AgentLogger.addLog(node, `Tool ${functionName} executed successfully`, 'success');
                  DebugManager.addLog(`✅ Tool ${functionName} completed`, 'success');
                  DebugManager.addLog(`Result preview: ${toolResult ? String(toolResult).substring(0, 100) + '...' : 'No result'}`, 'info');
                } catch (error) {
                  AgentLogger.addLog(node, `Error executing tool ${functionName}: ${error.message}`, 'error');

                  // Add the error to the results array
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    tool: functionName,
                    error: error.message
                  });

                  // Add to memory
                  if (window.AgentMemory && typeof window.AgentMemory.addToHistory === 'function') {
                    window.AgentMemory.addToHistory(node, {
                      tool: functionName,
                      params: functionArgs
                    }, `Error: ${error.message}`);
                  }
                }
              }

              // After all tools are executed, prepare the next message
              messages.push(message);
              
              // Add tool results as assistant messages
              for (const result of toolResults) {
                messages.push({
                  role: 'tool',
                  tool_call_id: result.tool_call_id,
                  content: result.result ? JSON.stringify(result.result) : `Error: ${result.error}`
                });
              }

              // Continue iteration to get the model's response to the tool results
              continueIteration = true;
              AgentLogger.addLog(node, 'Tool calls completed, continuing to get model response', 'info');
              DebugManager.addLog(`Continuing to iteration ${node.currentIteration + 1} for model response`, 'info');
            } else {
              // No function calls: decide whether to continue iterating or finish
              AgentLogger.addLog(node, 'No function calls requested, evaluating if need to continue iteration', 'info');
              DebugManager.addLog('No tool calls in this response', 'info');

              // Add the response to memory
              if (window.AgentMemory && typeof window.AgentMemory.addToContext === 'function') {
                window.AgentMemory.addToContext(node, message.content);
              }

              // Add the assistant's response to the conversation
              messages.push(message);
              
              const lowerContent = message.content ? message.content.toLowerCase() : '';
              if (node.currentIteration >= (node.maxIterations || 5)) {
                // Max iterations reached, stop iterating
                continueIteration = false;
                finalOutput = message.content;
                AgentLogger.addLog(node, 'Max iterations reached, stopping', 'info');
              } else if (
                lowerContent.includes('final answer') ||
                lowerContent.includes('final response') ||
                lowerContent.includes('i have completed') ||
                lowerContent.includes('task is complete') ||
                lowerContent.includes('here is the final') ||
                lowerContent.includes('to summarize')
              ) {
                // Explicit completion, stop iterating
                continueIteration = false;
                finalOutput = message.content;
                AgentLogger.addLog(node, 'Model indicated completion, stopping', 'info');
              } else if (message.content && !message.tool_calls) {
                // Model provided content without tool calls, ask if more help is needed
                continueIteration = true;
                finalOutput = message.content;
                messages.push({
                  role: 'user',
                  content: 'Do you need to use any tools to better answer my original question, or is your response complete?'
                });
                AgentLogger.addLog(node, 'Asking model if more tools are needed', 'info');
              }
            }
          } else {
            // Fall back to the plan-based approach with iterative execution
            AgentLogger.addLog(node, 'Model does not support function calling, using iterative plan-based approach', 'info');

            // Generate a plan with all available tools (including MCP tools)
            if (window.AgentPlanner && typeof window.AgentPlanner.generatePlan === 'function') {
              AgentLogger.addLog(node, 'Generating plan', 'info');
              const plan = await window.AgentPlanner.generatePlan(node, finalOutput || input);

              if (plan && plan.steps) {
                AgentLogger.addLog(node, `Plan generated with ${plan.steps.length} steps`, 'success');

                plan.steps.forEach((step, index) => {
                  AgentLogger.addLog(node, `Step ${index + 1}: [${step.toolId}] ${step.description}`, 'info');
                });
              } else {
                AgentLogger.addLog(node, 'Plan generation failed or returned empty plan', 'warning');
              }

              AgentLogger.addLog(node, 'Executing plan', 'info');
              const result = await window.AgentPlanner.executePlan(node);

              if (window.AgentMemory && typeof window.AgentMemory.addToContext === 'function') {
                window.AgentMemory.addToContext(node, result);
              }

              if (node.currentIteration >= (node.maxIterations || 5)) {
                continueIteration = false;
                finalOutput = result;
                AgentLogger.addLog(node, 'Max iterations reached, stopping', 'info');
              } else {
                const lowerResult = result.toLowerCase();
                if (lowerResult.includes('final response') || lowerResult.includes('done') || lowerResult.includes('complete')) {
                  continueIteration = false;
                  finalOutput = result;
                  AgentLogger.addLog(node, 'Plan execution indicated completion, stopping', 'info');
                } else {
                  continueIteration = true;
                  finalOutput = result;
                  AgentLogger.addLog(node, 'Continuing to next iteration', 'info');
                }
              }
            } else {
              // If AgentPlanner is not available, fallback to direct processing and evaluate iteration
              AgentLogger.addLog(node, 'AgentPlanner not available, falling back to direct processing', 'warning');
              const result = await this.directProcessNode(node, finalOutput || input);

              if (window.AgentMemory && typeof window.AgentMemory.addToContext === 'function') {
                window.AgentMemory.addToContext(node, result);
              }

              const lowerResult = result ? result.toLowerCase() : '';
              if (node.currentIteration >= (node.maxIterations || 5)) {
                // Max iterations reached, stop iterating
                continueIteration = false;
                finalOutput = result;
                AgentLogger.addLog(node, 'Max iterations reached, stopping', 'info');
              } else if (
                lowerResult.includes('final response') ||
                lowerResult.includes('done') ||
                lowerResult.includes('complete') ||
                lowerResult.includes('clarify') ||
                lowerResult.includes('clarification')
              ) {
                // Explicit completion or request for clarification, stop iterating
                continueIteration = false;
                finalOutput = result;
                AgentLogger.addLog(node, 'Model indicated completion or requested clarification, stopping', 'info');
              } else {
                // Continue to next iteration
                continueIteration = true;
                finalOutput = result;
                AgentLogger.addLog(node, 'Continuing to next iteration', 'info');
              }
            }
          }

          // Perform reflection if enabled and at the configured frequency
          if (node.enableReflection && node.currentIteration % (node.reflectionFrequency || 2) === 0) {
            AgentLogger.addLog(node, 'Performing reflection', 'info');
            if (window.AgentNodes && typeof window.AgentNodes.performReflection === 'function') {
              const reflection = await window.AgentNodes.performReflection(node, finalOutput, false);
              if (window.AgentMemory && typeof window.AgentMemory.addToContext === 'function') {
                window.AgentMemory.addToContext(node, `Reflection: ${reflection}`);
              }
              AgentLogger.addLog(node, 'Reflection added to context', 'info');
            }
          }
        }

        node.isIterating = false;
        node.currentIteration = 0;

        // Perform final reflection if enabled
        if (node.enableReflection) {
          AgentLogger.addLog(node, 'Performing final reflection', 'info');
          if (window.AgentNodes && typeof window.AgentNodes.performReflection === 'function') {
            const finalReflection = await window.AgentNodes.performReflection(node, finalOutput, true);
            if (window.AgentMemory && typeof window.AgentMemory.addToContext === 'function') {
              window.AgentMemory.addToContext(node, `Final Reflection: ${finalReflection}`);
            }
            AgentLogger.addLog(node, 'Final reflection added to context', 'info');
          }
        }

        AgentLogger.addLog(node, 'Multi-round iterative execution completed', 'success');
        DebugManager.addLog(`=== AGENT NODE ${node.id} COMPLETED ===`, 'success');
        DebugManager.addLog(`Total iterations used: ${node.currentIteration}`, 'info');
        DebugManager.addLog(`Final output length: ${finalOutput ? finalOutput.length : 0} chars`, 'info');
        return finalOutput;
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

        // Prepare the system prompt with reasoning instructions if enabled
        let systemPrompt = node.systemPrompt || 'You are a helpful assistant.';

        // Add reasoning instructions if enabled
        if (node.enableReasoning) {
          const reasoningStyle = node.reasoningStyle || 'cot';
          const reasoningDepth = node.reasoningDepth || '3';

          // Add reasoning style instructions
          if (reasoningStyle === 'cot') {
            systemPrompt += '\n\nYou should use chain-of-thought reasoning to solve problems. Think step by step and explain your reasoning clearly.';
          } else if (reasoningStyle === 'tot') {
            systemPrompt += '\n\nYou should use tree-of-thought reasoning to solve problems. Consider multiple possible approaches, evaluate them, and choose the best one.';
          } else if (reasoningStyle === 'react') {
            systemPrompt += '\n\nYou should use ReAct (Reasoning + Action) to solve problems. Alternate between reasoning about the problem and proposing actions to take.';
          } else if (reasoningStyle === 'planner') {
            systemPrompt += '\n\nYou should use a planner-executor approach to solve problems. First create a detailed plan, then execute each step of the plan.';
          }

          // Add reasoning depth instructions
          if (reasoningDepth === '1') {
            systemPrompt += '\n\nUse minimal reasoning with just 1 step to solve problems quickly.';
          } else if (reasoningDepth === '3') {
            systemPrompt += '\n\nUse standard reasoning with about 3 steps to solve problems effectively.';
          } else if (reasoningDepth === '5') {
            systemPrompt += '\n\nUse deep reasoning with about 5 steps to solve problems thoroughly.';
          } else if (reasoningDepth === '10') {
            systemPrompt += '\n\nUse exhaustive reasoning with 10+ steps to solve problems comprehensively.';
          }

          // Add formatting instructions if showing reasoning
          if (node.showReasoning) {
            systemPrompt += '\n\nFormat your response with clear reasoning steps. Use markdown formatting to make your reasoning clear.';
          } else {
            systemPrompt += '\n\nAfter reasoning through the problem, provide only your final answer without showing your reasoning steps.';
          }
        }

        // Prepare the request payload
        const payload = {
          model: config.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 2000
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

        // Get the API configuration
        const config = (window.ApiService && window.ApiService.openai && window.ApiService.openai.getConfig)
          ? window.ApiService.openai.getConfig()
          : { apiKey: null };
        
        if (!config.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        
        // Make the API request
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openai-api-key': config.apiKey
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
    // Dispatch event to signal that AgentProcessor is ready for integration
    document.dispatchEvent(new Event('agent-processor-ready'));
  });
})();
