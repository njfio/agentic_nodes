// Disable MCP client integration to avoid schema issues
console.log('🔧 Disabling MCP client integration...');

// Prevent MCP client from intercepting nodes
if (window.MCPClient) {
  window.MCPClient = null;
}

// Remove MCP servers
if (window.MCP_SERVERS) {
  window.MCP_SERVERS = null;
}

// Clear any MCP-enhanced nodes
setTimeout(() => {
  if (window.App && window.App.nodes) {
    window.App.nodes.forEach(node => {
      if (node._mcpEnhanced) {
        // Remove MCP enhancement
        delete node._mcpEnhanced;
        delete node._originalProcess;
        console.log(`🧹 Removed MCP enhancement from node ${node.id}`);
      }
    });
  }
  
  console.log('✅ MCP client integration disabled');
  console.log('Agents will use the standard intercept processing with browser_search tool');
}, 100);