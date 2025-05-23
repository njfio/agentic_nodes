// Fix duplicate tools in agent processing
console.log('🔧 Fixing duplicate tools issue...');

// Wait for AgentTools to be ready
setTimeout(() => {
  if (!window.AgentTools || !window.AgentTools.getAllTools) {
    console.warn('AgentTools not ready yet');
    return;
  }
  
  // Override getAllTools to remove duplicates
  const originalGetAllTools = window.AgentTools.getAllTools;
  
  window.AgentTools.getAllTools = function() {
    const tools = originalGetAllTools ? originalGetAllTools.call(this) : [];
    
    // Remove duplicate tools by ID
    const seen = new Set();
    const uniqueTools = [];
    
    for (const tool of tools) {
      if (!seen.has(tool.id)) {
        seen.add(tool.id);
        uniqueTools.push(tool);
      }
    }
    
    console.log(`🧹 Removed ${tools.length - uniqueTools.length} duplicate tools`);
    return uniqueTools;
  };
  
  console.log('✅ Duplicate tools fix installed');
}, 500);