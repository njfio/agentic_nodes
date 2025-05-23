// Fix MCP execution to include server and method
console.log('🔧 Fixing MCP execution...');

// Override MCPTools.executeTool to include server and method
if (window.MCPTools) {
  // Store the original execute function
  const originalExecute = window.MCPTools.executeTool;
  
  window.MCPTools.executeTool = async function(toolId, params, node) {
    console.log(`🛠️ Fixed MCP execution for: ${toolId}`, params);
    
    // Extract server and method from tool ID
    let server, method;
    
    // Handle different tool ID formats
    if (toolId.includes('_perplexity-server')) {
      server = 'github.com.pashpashpash/perplexity-mcp';
      method = toolId.replace('_perplexity-server', '');
    } else if (toolId.includes('mcp-perplexity-')) {
      server = 'github.com.pashpashpash/perplexity-mcp';
      method = toolId.replace('mcp-perplexity-', '');
    } else if (toolId.includes('mcp-memory-')) {
      server = 'github.com/modelcontextprotocol/servers/tree/main/src/memory';
      method = toolId.replace('mcp-memory-', '').replace(/-/g, '_');
    } else if (toolId.includes('mcp-context7-')) {
      server = 'github.com/upstash/context7-mcp';
      method = toolId.replace('mcp-context7-', '').replace(/-/g, '_');
    } else {
      // Try to call original if not an MCP tool
      if (originalExecute) {
        return originalExecute.call(this, toolId, params, node);
      }
      throw new Error(`Unknown tool format: ${toolId}`);
    }
    
    console.log(`Mapped to server: ${server}, method: ${method}`);
    
    try {
      // Make the API call with server and method
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          server: server,
          method: method,
          params: params,
          autoApprove: true
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'MCP execution failed');
      }
      
      const data = await response.json();
      console.log(`✅ MCP ${toolId} completed:`, data.result);
      return data.result;
      
    } catch (error) {
      console.error(`❌ MCP execution error for ${toolId}:`, error);
      
      // Fallback responses
      if (method === 'search') {
        return `Search for "${params.query}" failed: ${error.message}. The system is unable to perform real-time searches at this moment.`;
      }
      
      throw error;
    }
  };
  
  console.log('✅ Fixed MCPTools.executeTool');
}

// Also ensure AgentTools can execute MCP tools
if (window.AgentTools) {
  const originalAgentExecute = window.AgentTools.executeTool;
  
  window.AgentTools.executeTool = async function(toolId, params, node) {
    console.log(`🔄 AgentTools executing: ${toolId}`);
    
    // If it's an MCP tool, route to MCPTools
    if (toolId.includes('mcp-') || toolId.includes('_perplexity-server') || toolId.includes('_context7')) {
      if (window.MCPTools && window.MCPTools.executeTool) {
        return window.MCPTools.executeTool(toolId, params, node);
      }
    }
    
    // Otherwise use original
    if (originalAgentExecute) {
      return originalAgentExecute.call(this, toolId, params, node);
    }
    
    throw new Error(`Tool ${toolId} not found`);
  };
  
  console.log('✅ Fixed AgentTools.executeTool');
}

console.log('🔧 MCP execution fixes complete');