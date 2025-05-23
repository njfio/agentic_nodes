// Temporarily disable problematic MCP tools
console.log('🔧 Disabling problematic MCP tools...');

// List of tools to disable due to schema issues
const problematicTools = [
  'mcp_memory_create_entities',
  'mcp_memory_create_relations',
  'mcp-memory-create-entities',
  'mcp-memory-create-relations'
];

// Wait for tools to load
setTimeout(() => {
  // Remove from MCPTools
  if (window.MCPTools && window.MCPTools.tools) {
    window.MCPTools.tools = window.MCPTools.tools.filter(tool => 
      !problematicTools.includes(tool.id)
    );
    console.log('✅ Removed problematic tools from MCPTools');
  }
  
  // Remove from AgentTools
  if (window.AgentTools && window.AgentTools.tools) {
    const before = window.AgentTools.tools.length;
    window.AgentTools.tools = window.AgentTools.tools.filter(tool => 
      !problematicTools.includes(tool.id)
    );
    const after = window.AgentTools.tools.length;
    console.log(`✅ Removed ${before - after} problematic tools from AgentTools`);
  }
  
  // Also remove from MCP_SERVERS
  if (window.MCP_SERVERS) {
    window.MCP_SERVERS.forEach(server => {
      if (server.tools) {
        server.tools = server.tools.filter(tool => 
          !problematicTools.some(p => tool.name.includes(p))
        );
      }
    });
  }
  
  console.log('✅ Problematic tools disabled');
  console.log('The agent can still use mcp_perplexity_search for web searches');
}, 1000);