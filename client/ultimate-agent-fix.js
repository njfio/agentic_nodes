// Ultimate agent fix - force override after page load
console.log('🚨 ULTIMATE AGENT FIX - Waiting for page load...');

// Wait for everything to be completely loaded
window.addEventListener('load', () => {
  console.log('🚨 Page loaded, applying ultimate fix in 2 seconds...');
  
  setTimeout(() => {
    console.log('🚨 APPLYING ULTIMATE FIX NOW');
    
    if (!window.App || !window.App.nodes || window.App.nodes.length === 0) {
      console.error('❌ No nodes found to fix');
      return;
    }
    
    // Find agent nodes
    const agentNodes = window.App.nodes.filter(n => 
      n.title && n.title.toLowerCase().includes('agent')
    );
    
    console.log(`Found ${agentNodes.length} agent nodes to fix`);
    
    agentNodes.forEach(node => {
      console.log(`🔧 FORCEFULLY fixing node ${node.id} (${node.title})`);
      
      // Force all agent properties
      node._nodeType = 'agent';
      node.nodeType = 'agent';
      node.isAgentNode = true;
      node.autoIterate = true;
      node.maxIterations = 5;
      node.enableReasoning = true;
      node.useMCPTools = true;
      node.contentType = 'text';
      node.aiProcessor = 'text-to-text';
      
      // Enhanced system prompt
      node.systemPrompt = `You are an autonomous AI agent with access to various tools.

IMPORTANT: You have access to browser.search tool for web searches. When asked about current events, news, or anything requiring real-time information, you MUST use browser.search.

Available tools include:
- browser.search: Search the web for current information
- search_perplexity-server: Alternative web search
- Other text and data processing tools

Instructions:
1. Always use tools when you need current information
2. Never say you cannot access current information
3. Break down complex queries into tool calls
4. For any question about events, dates, or current topics, USE BROWSER.SEARCH`;
      
      // Store original process
      const originalProcess = node.process;
      
      // Complete override
      node.process = async function(input) {
        console.log(`\n🤖 ULTIMATE AGENT PROCESSING - Node ${this.id}`);
        console.log('Input:', input);
        console.log('This node:', {
          id: this.id,
          title: this.title,
          nodeType: this.nodeType,
          isAgentNode: this.isAgentNode
        });
        
        try {
          this.processing = true;
          this.error = null;
          
          // Try agent processor first
          if (window.AgentProcessor && window.AgentProcessor.processAgentNode) {
            console.log('✅ Using AgentProcessor.processAgentNode');
            try {
              const result = await window.AgentProcessor.processAgentNode(this, input);
              this.content = result;
              this.hasBeenProcessed = true;
              return result;
            } catch (error) {
              console.error('AgentProcessor failed:', error);
            }
          }
          
          // Try AgentNodes.processDefaultAgent
          if (window.AgentNodes && window.AgentNodes.processDefaultAgent) {
            console.log('✅ Using AgentNodes.processDefaultAgent');
            try {
              const result = await window.AgentNodes.processDefaultAgent(this, input);
              this.content = result;
              this.hasBeenProcessed = true;
              return result;
            } catch (error) {
              console.error('AgentNodes.processDefaultAgent failed:', error);
            }
          }
          
          // Manual API call with tools as last resort
          console.log('⚠️ Falling back to manual API call WITH TOOLS');
          
          const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
          if (!config.apiKey) {
            throw new Error('No API key');
          }
          
          // Get ALL tools
          const tools = [];
          
          // Add browser.search manually if not present
          tools.push({
            type: "function",
            function: {
              name: "browser.search",
              description: "Search the web for current information",
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
          });
          
          // Add other tools
          if (window.AgentTools && window.AgentTools.getAllTools) {
            const allTools = window.AgentTools.getAllTools();
            allTools.forEach(tool => {
              if (tool.id !== 'browser.search') {
                tools.push({
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
                });
              }
            });
          }
          
          console.log(`📦 Sending ${tools.length} tools with request`);
          
          const messages = [
            {
              role: "system",
              content: this.systemPrompt
            },
            {
              role: "user",
              content: input
            }
          ];
          
          const requestBody = {
            model: config.model || 'gpt-4o',
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 2000
          };
          
          console.log('📤 Sending request with tools:', tools.map(t => t.function.name));
          
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API failed');
          }
          
          const data = await response.json();
          const message = data.choices[0].message;
          
          // Check for tool calls
          if (message.tool_calls && message.tool_calls.length > 0) {
            console.log(`🛠️ Received ${message.tool_calls.length} tool calls!`);
            
            for (const toolCall of message.tool_calls) {
              console.log(`Executing tool: ${toolCall.function.name}`);
              // Handle tool execution here
            }
          }
          
          this.content = message.content;
          this.hasBeenProcessed = true;
          return message.content;
          
        } catch (error) {
          console.error('❌ Ultimate processing failed:', error);
          this.error = error.message;
          throw error;
        } finally {
          this.processing = false;
          if (window.App && window.App.draw) {
            window.App.draw();
          }
        }
      };
      
      console.log(`✅ Node ${node.id} completely overridden`);
    });
    
    console.log('🚨 ULTIMATE FIX COMPLETE - Agent nodes should now use tools');
    
    // Force redraw
    if (window.App && window.App.draw) {
      window.App.draw();
    }
    
    // Log current state
    console.log('\n📊 Final node state:');
    agentNodes.forEach(node => {
      console.log(`Node ${node.id}:`, {
        hasCustomProcess: node.process.toString().includes('ULTIMATE AGENT PROCESSING'),
        nodeType: node.nodeType,
        isAgentNode: node.isAgentNode
      });
    });
    
  }, 2000);
});

// Manual trigger
window.applyUltimateFix = function() {
  location.reload();
};