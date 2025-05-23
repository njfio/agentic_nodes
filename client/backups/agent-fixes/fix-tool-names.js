// Fix tool names to be OpenAI compatible
console.log('🔧 Fixing tool names for OpenAI compatibility...');

// Override AgentTools.getAllTools to sanitize names
if (window.AgentTools && window.AgentTools.getAllTools) {
  const originalGetAllTools = window.AgentTools.getAllTools;
  
  window.AgentTools.getAllTools = function() {
    const tools = originalGetAllTools.call(this);
    
    // Sanitize tool names
    return tools.map(tool => {
      const sanitized = {
        ...tool,
        id: tool.id.replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '_')
      };
      
      // Special handling for browser.search
      if (tool.id === 'browser.search') {
        sanitized.id = 'browser_search';
        console.log('Renamed browser.search to browser_search');
      }
      
      return sanitized;
    });
  };
  
  console.log('✅ Tool name sanitization installed');
}

// Also fix the browser.search tool directly
if (window.AgentTools && window.AgentTools.tools) {
  const browserSearchTool = window.AgentTools.tools.find(t => t.id === 'browser.search');
  if (browserSearchTool) {
    browserSearchTool.id = 'browser_search';
    console.log('✅ Fixed browser.search tool name directly');
  }
}

// Fix executeTool to handle both names
if (window.AgentTools && window.AgentTools.executeTool) {
  const originalExecuteTool = window.AgentTools.executeTool;
  
  window.AgentTools.executeTool = async function(toolName, params, node) {
    // Map sanitized names back to original
    let actualToolName = toolName;
    if (toolName === 'browser_search') {
      actualToolName = 'browser.search';
    }
    
    console.log(`Executing tool: ${actualToolName} (called as ${toolName})`);
    return originalExecuteTool.call(this, actualToolName, params, node);
  };
  
  console.log('✅ Tool execution mapping installed');
}

console.log('🔧 Tool name fixes complete');