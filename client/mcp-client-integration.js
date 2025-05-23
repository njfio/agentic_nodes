// MCP Client Integration for Agent Nodes
console.log('🔌 MCP Client Integration - Initializing...');

// MCP Configuration (can be loaded from external source)
window.MCPClientConfig = {
  servers: {
    "perplexity": {
      id: "github.com.pashpashpash/perplexity-mcp",
      name: "Perplexity Search",
      tools: [
        {
          name: "search",
          description: "Search the web for current information using Perplexity AI",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              }
            },
            required: ["query"]
          }
        },
        {
          name: "get_documentation",
          description: "Get documentation for a specific technology or API",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The technology, library, or API to get documentation for"
              }
            },
            required: ["query"]
          }
        }
      ]
    },
    "browser-tools": {
      id: "github.com/AgentDeskAI/browser-tools-mcp",
      name: "Browser Tools",
      tools: [
        {
          name: "browse",
          description: "Browse to a URL and get its content",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The URL to browse"
              }
            },
            required: ["url"]
          }
        }
      ]
    },
    "memory": {
      id: "github.com/modelcontextprotocol/servers/tree/main/src/memory",
      name: "Memory Server",
      tools: [
        {
          name: "create_entities",
          description: "Create entities in the knowledge graph",
          inputSchema: {
            type: "object",
            properties: {
              entities: {
                type: "array",
                description: "Array of entities to create",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            },
            required: ["entities"]
          }
        },
        {
          name: "search_nodes",
          description: "Search for nodes in the knowledge graph",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query"
              }
            },
            required: ["query"]
          }
        }
      ]
    }
  }
};

// Create MCP-compatible tool definitions
window.MCPClient = {
  // Get all MCP tools in OpenAI format
  getMCPTools() {
    const tools = [];
    
    Object.entries(window.MCPClientConfig.servers).forEach(([serverId, server]) => {
      server.tools.forEach(tool => {
        tools.push({
          type: "function",
          function: {
            name: `mcp_${serverId}_${tool.name}`,
            description: `[${server.name}] ${tool.description}`,
            parameters: tool.inputSchema
          }
        });
      });
    });
    
    return tools;
  },
  
  // Execute MCP tool
  async executeMCPTool(toolName, args) {
    console.log(`🔧 Executing MCP tool: ${toolName} with args:`, args);
    
    // Parse the tool name to get server and method
    const match = toolName.match(/^mcp_([^_]+)_(.+)$/);
    if (!match) {
      throw new Error(`Invalid MCP tool name: ${toolName}`);
    }
    
    const [, serverId, methodName] = match;
    
    // Route to appropriate handler
    if (serverId === 'perplexity') {
      return this.executePerplexityTool(methodName, args);
    } else if (serverId === 'browser') {
      return this.executeBrowserTool(methodName, args);
    } else if (serverId === 'memory') {
      return this.executeMemoryTool(methodName, args);
    }
    
    throw new Error(`Unknown MCP server: ${serverId}`);
  },
  
  // Execute Perplexity tools
  async executePerplexityTool(method, args) {
    console.log(`🔍 Executing Perplexity ${method}:`, args);
    
    // First try the existing MCP tools integration
    if (window.MCPTools && window.MCPTools.executeTool) {
      try {
        // Map method names to MCP tool names
        let mcpToolName;
        if (method === 'search') {
          mcpToolName = 'search_perplexity-server';
        } else if (method === 'get_documentation') {
          mcpToolName = 'get_documentation_perplexity-server';
        }
        
        if (mcpToolName) {
          console.log(`Using MCPTools.executeTool for ${mcpToolName}`);
          const result = await window.MCPTools.executeTool(mcpToolName, args);
          return typeof result === 'string' ? result : JSON.stringify(result);
        }
      } catch (error) {
        console.error('MCPTools execution failed:', error);
      }
    }
    
    // Try the server proxy
    try {
      const response = await fetch(`/api/mcp-proxy/perplexity/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.result;
      }
    } catch (error) {
      console.error('MCP proxy failed:', error);
    }
    
    // Final fallback
    return `Searched for: "${args.query}" (MCP server connection needed)`;
  },
  
  // Execute browser tools
  async executeBrowserTool(method, args) {
    console.log(`🌐 Executing Browser ${method}:`, args);
    return `Browsed: ${args.url} (Note: Real browser tool integration needed)`;
  },
  
  // Execute memory tools
  async executeMemoryTool(method, args) {
    console.log(`🧠 Executing Memory ${method}:`, args);
    return `Memory operation: ${method} (Note: Real memory server integration needed)`;
  }
};

// Override agent processing to use MCP tools
setTimeout(() => {
  console.log('🔌 Installing MCP client for agent nodes...');
  
  if (!window.App || !window.App.nodes) {
    console.error('No nodes to enhance with MCP');
    return;
  }
  
  // Find agent nodes and enhance them
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`🔌 Enhancing node ${node.id} with MCP client capabilities`);
      
      // Store original process if not already stored
      if (!node._originalProcess) {
        node._originalProcess = node.process;
      }
      
      // Override process method
      node.process = async function(input) {
        console.log(`🤖 MCP-ENHANCED Agent Node ${this.id} processing`);
        
        try {
          this.processing = true;
          this.error = null;
          
          // Get OpenAI config
          const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
          if (!config.apiKey) {
            throw new Error('OpenAI API key not configured');
          }
          
          // Get MCP tools
          const mcpTools = window.MCPClient.getMCPTools();
          console.log(`📦 Loaded ${mcpTools.length} MCP tools`);
          
          // Enhanced system prompt for MCP
          const systemPrompt = `You are an AI agent with access to MCP (Model Context Protocol) tools.

Available MCP tools:
${mcpTools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')}

Instructions:
1. For web searches about current events, use mcp_perplexity_search
2. For technical documentation, use mcp_perplexity_get_documentation
3. For browsing specific URLs, use mcp_browser_browse
4. For storing information, use mcp_memory_create_entities
5. For retrieving stored information, use mcp_memory_search_nodes

IMPORTANT: When asked about current events or recent information, you MUST use mcp_perplexity_search to get up-to-date information.`;
          
          // Prepare messages
          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: input }
          ];
          
          // Make API call with MCP tools
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify({
              model: config.model || 'gpt-4o',
              messages: messages,
              tools: mcpTools,
              tool_choice: "auto",
              temperature: 0.7,
              max_tokens: 2000
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
          }
          
          const data = await response.json();
          let finalResponse = data.choices[0].message.content;
          
          // Handle tool calls
          if (data.choices[0].message.tool_calls) {
            console.log(`🛠️ Processing ${data.choices[0].message.tool_calls.length} MCP tool calls`);
            
            const toolResults = [];
            
            for (const toolCall of data.choices[0].message.tool_calls) {
              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
              
              console.log(`Executing MCP tool: ${toolName}`);
              
              try {
                const result = await window.MCPClient.executeMCPTool(toolName, toolArgs);
                toolResults.push({
                  tool: toolName,
                  result: result
                });
              } catch (error) {
                console.error(`MCP tool error:`, error);
                toolResults.push({
                  tool: toolName,
                  error: error.message
                });
              }
            }
            
            // Format results
            finalResponse = `Used MCP tools:\n${toolResults.map(r => 
              `- ${r.tool}: ${r.result || r.error}`
            ).join('\n')}\n\n${finalResponse || 'Processing complete.'}`;
          }
          
          this.content = finalResponse;
          this.hasBeenProcessed = true;
          
          return finalResponse;
          
        } catch (error) {
          console.error('MCP processing error:', error);
          this.error = error.message;
          throw error;
        } finally {
          this.processing = false;
          if (window.App && window.App.draw) {
            window.App.draw();
          }
        }
      };
      
      console.log(`✅ Node ${node.id} enhanced with MCP client`);
    }
  });
  
  console.log('🔌 MCP client integration complete');
}, 3000);

// Export for manual testing
window.testMCPClient = async function() {
  const tools = window.MCPClient.getMCPTools();
  console.log('Available MCP tools:', tools);
  
  // Test a search
  const result = await window.MCPClient.executeMCPTool('mcp_perplexity_search', {
    query: 'blockchain news May 2025'
  });
  console.log('Search result:', result);
};