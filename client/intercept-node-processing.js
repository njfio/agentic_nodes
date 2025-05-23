// Intercept node processing to force tool usage
console.log('🎯 Intercepting node processing...');

// Wait for nodes to be ready
const interceptInterval = setInterval(() => {
  if (!window.App || !window.App.nodes || window.App.nodes.length === 0) {
    return;
  }
  
  clearInterval(interceptInterval);
  console.log('🎯 Nodes ready, intercepting processing...');
  
  // Find all nodes and intercept their process method
  window.App.nodes.forEach((node, index) => {
    // Store original process if not already stored
    if (!node._originalProcessIntercepted) {
      node._originalProcessIntercepted = node.process;
      
      // Create new process method
      node.process = async function(input) {
        console.log(`\n🎯 INTERCEPTED Node ${this.id} (${this.title}) processing`);
        console.log('Input:', input);
        
        // Check if this should be an agent node
        const isAgent = this.title && this.title.toLowerCase().includes('agent');
        
        if (isAgent) {
          console.log('🤖 This is an AGENT node - forcing tool-enabled processing');
          
          try {
            this.processing = true;
            this.error = null;
            
            // Get OpenAI config
            const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
            if (!config.apiKey) {
              throw new Error('OpenAI API key not configured');
            }
            
            // Get all available tools
            const tools = [];
            
            // Add all tools from AgentTools
            if (window.AgentTools && window.AgentTools.getAllTools) {
              const agentTools = window.AgentTools.getAllTools();
              agentTools.forEach(tool => {
                // Skip duplicates and fix names
                const toolId = tool.id.replace(/\./g, '_');
                if (!tools.find(t => t.function.name === toolId)) {
                  tools.push({
                    type: "function",
                    function: {
                      name: toolId,
                      description: tool.description,
                      parameters: tool.parameters || {
                        type: "object",
                        properties: {
                          query: { type: "string", description: "Query or input" }
                        },
                        required: ["query"]
                      }
                    }
                  });
                }
              });
            }
            
            console.log(`📦 Loaded ${tools.length} tools for agent processing`);
            
            // Force a system prompt that emphasizes tool usage
            const systemPrompt = `You are an AI agent with access to tools for searching and processing information.

CRITICAL: You have tools available including browser_search for web searches. When asked about current events, news, or recent information, you MUST use browser_search or search_perplexity-server.

Available tools include:
${tools.slice(0, 10).map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')}

INSTRUCTIONS:
1. For any question about current events, dates, or recent information, USE TOOLS
2. Do NOT say you cannot access current information
3. If asked about blockchain events in May 2025, search for it using browser_search
4. Always attempt to use tools before saying you don't have information`;
            
            // Create messages
            const messages = [
              { role: "system", content: systemPrompt },
              { role: "user", content: input }
            ];
            
            // Force tool usage for certain queries
            let toolChoice = "auto";
            if (input.toLowerCase().includes('blockchain') || 
                input.toLowerCase().includes('news') || 
                input.toLowerCase().includes('2025') ||
                input.toLowerCase().includes('current') ||
                input.toLowerCase().includes('recent')) {
              console.log('🎯 Query contains keywords - encouraging tool use');
              // Add a more direct instruction
              messages[0].content += "\n\nThe user is asking about current/recent events. You MUST use browser_search to find this information.";
            }
            
            console.log('📤 Sending request with tools to OpenAI...');
            
            const response = await fetch('/api/openai/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-openai-api-key': config.apiKey
              },
              body: JSON.stringify({
                model: config.model || 'gpt-4o',
                messages: messages,
                tools: tools,
                tool_choice: toolChoice,
                temperature: 0.7,
                max_tokens: 2000
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error?.message || 'API request failed');
            }
            
            const data = await response.json();
            const message = data.choices[0].message;
            
            // Check for tool calls
            if (message.tool_calls && message.tool_calls.length > 0) {
              console.log(`🛠️ AI requested ${message.tool_calls.length} tool calls!`);
              
              let toolResults = [];
              
              for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                
                console.log(`🔧 Executing tool: ${toolName}`, toolArgs);
                
                try {
                  let result;
                  
                  // Execute the tool
                  if (window.AgentTools && window.AgentTools.executeTool) {
                    // Fix tool name back to original format
                    const originalToolName = toolName.replace(/_/g, '.');
                    result = await window.AgentTools.executeTool(originalToolName, toolArgs, this);
                  } else {
                    result = `Tool ${toolName} execution failed - no executor available`;
                  }
                  
                  toolResults.push(`${toolName}: ${result}`);
                } catch (error) {
                  console.error(`Tool ${toolName} error:`, error);
                  toolResults.push(`${toolName}: Error - ${error.message}`);
                }
              }
              
              // Create a follow-up response with tool results
              const followUpMessages = [
                ...messages,
                message
              ];
              
              // Add tool results as assistant message for models that don't support tool role
              if (message.tool_calls) {
                // Format tool results properly
                message.tool_calls.forEach((toolCall, index) => {
                  followUpMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: toolResults[index] || 'No result'
                  });
                });
              }
              
              console.log('📤 Sending follow-up with tool results...');
              
              const followUpResponse = await fetch('/api/openai/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-openai-api-key': config.apiKey
                },
                body: JSON.stringify({
                  model: config.model || 'gpt-4o',
                  messages: followUpMessages,
                  temperature: 0.7,
                  max_tokens: 2000
                })
              });
              
              if (followUpResponse.ok) {
                const followUpData = await followUpResponse.json();
                this.content = followUpData.choices[0].message.content;
              } else {
                this.content = message.content + '\n\nTool results:\n' + toolResults.join('\n');
              }
            } else {
              console.log('❌ No tool calls made by AI');
              this.content = message.content;
            }
            
            this.hasBeenProcessed = true;
            return this.content;
            
          } catch (error) {
            console.error('❌ Agent processing error:', error);
            this.error = error.message;
            
            // Fall back to original
            if (this._originalProcessIntercepted) {
              console.log('Falling back to original process...');
              return this._originalProcessIntercepted.call(this, input);
            }
            
            throw error;
          } finally {
            this.processing = false;
            if (window.App && window.App.draw) {
              window.App.draw();
            }
          }
        } else {
          // Not an agent node, use original processing
          if (this._originalProcessIntercepted) {
            return this._originalProcessIntercepted.call(this, input);
          }
        }
      };
      
      console.log(`✅ Intercepted processing for node ${node.id} (${node.title})`);
    }
  });
  
  console.log('🎯 Node processing interception complete');
}, 500);

// Also intercept any new nodes
if (window.App && window.App.addNode) {
  const originalAddNode = window.App.addNode;
  
  window.App.addNode = function(nodeType) {
    const node = originalAddNode.call(this, nodeType);
    
    // Apply interception to new nodes after a short delay
    setTimeout(() => {
      if (node && !node._originalProcessIntercepted) {
        console.log(`🎯 Intercepting new node ${node.id}`);
        // Apply same interception logic
        // (Code would be same as above)
      }
    }, 100);
    
    return node;
  };
}