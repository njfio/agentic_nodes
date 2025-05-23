// Force tools to be included in agent processing
console.log('🔧 Force Tools Fix - Starting...');

// Wait for components
setTimeout(() => {
  if (!window.App || !window.App.nodes) {
    console.error('App or nodes not available');
    return;
  }
  
  console.log('🔧 Forcing tools for agent nodes...');
  
  // Find all agent nodes
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`Fixing node ${node.id} to include tools`);
      
      // Override the process method completely
      node.process = async function(input) {
        console.log(`🤖 AGENT NODE ${this.id} - FORCED TOOL PROCESSING`);
        
        try {
          // Mark as processing
          this.processing = true;
          this.error = null;
          
          // Force agent properties
          this._nodeType = 'agent';
          this.nodeType = 'agent';
          this.isAgentNode = true;
          this.autoIterate = true;
          this.maxIterations = 5;
          this.enableReasoning = true;
          this.useMCPTools = true;
          
          // Use the agent processing method directly from agent-nodes.js
          if (window.AgentNodes && window.AgentNodes.processDefaultAgent) {
            console.log('Using AgentNodes.processDefaultAgent with tools');
            const result = await window.AgentNodes.processDefaultAgent(this, input);
            
            this.content = result;
            this.hasBeenProcessed = true;
            this.processing = false;
            
            if (window.App && window.App.draw) {
              window.App.draw();
            }
            
            return result;
          } else if (window.AgentProcessor && window.AgentProcessor.processAgentNode) {
            console.log('Using AgentProcessor.processAgentNode with tools');
            const result = await window.AgentProcessor.processAgentNode(this, input);
            
            this.content = result;
            this.hasBeenProcessed = true;
            this.processing = false;
            
            if (window.App && window.App.draw) {
              window.App.draw();
            }
            
            return result;
          } else {
            throw new Error('No agent processing method available');
          }
        } catch (error) {
          console.error('Agent processing error:', error);
          this.processing = false;
          this.error = error.message;
          
          // Fall back to basic processing
          console.log('Falling back to basic text processing');
          
          // Get OpenAI config
          const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
          if (!config.apiKey) {
            throw new Error('OpenAI API key not configured');
          }
          
          // Get all available tools
          const allTools = window.AgentTools?.getAllTools?.() || [];
          console.log(`Loading ${allTools.length} tools for fallback`);
          
          // Format tools for OpenAI
          const tools = allTools.map(tool => ({
            type: "function",
            function: {
              name: tool.id,
              description: tool.description,
              parameters: tool.parameters || {
                type: "object",
                properties: {},
                required: []
              }
            }
          }));
          
          // Create the API request with tools
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify({
              model: config.model || 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: this.systemPrompt || 'You are a helpful AI assistant with access to tools. Use browser.search for current information.'
                },
                {
                  role: 'user',
                  content: input
                }
              ],
              tools: tools,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 2000
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
          }
          
          const data = await response.json();
          const message = data.choices[0].message;
          
          // Handle tool calls if any
          if (message.tool_calls && message.tool_calls.length > 0) {
            console.log(`Handling ${message.tool_calls.length} tool calls`);
            
            for (const toolCall of message.tool_calls) {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
              
              console.log(`Executing tool: ${toolName}`);
              
              try {
                if (window.AgentTools && window.AgentTools.executeTool) {
                  const result = await window.AgentTools.executeTool(toolName, toolArgs, this);
                  console.log(`Tool ${toolName} result:`, result);
                }
              } catch (toolError) {
                console.error(`Tool ${toolName} error:`, toolError);
              }
            }
          }
          
          const result = message.content || 'No response';
          this.content = result;
          this.hasBeenProcessed = true;
          
          return result;
        } finally {
          this.processing = false;
          if (window.App && window.App.draw) {
            window.App.draw();
          }
        }
      };
      
      console.log(`✅ Fixed node ${node.id} with forced tool processing`);
    }
  });
  
  console.log('✅ Force tools fix complete');
}, 2000);

// Export test function
window.forceToolsTest = function() {
  const node = window.App?.nodes?.find(n => n.title?.toLowerCase().includes('agent'));
  if (node) {
    console.log('Testing tools with: "what happened in blockchain the week of 5/1/2025?"');
    node.process("what happened in blockchain the week of 5/1/2025?");
  }
};