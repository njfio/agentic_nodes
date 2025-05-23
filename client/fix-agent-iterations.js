// Fix excessive agent iterations and tool errors
console.log('🔧 Fixing agent iterations and tool errors...');

// Don't override the iteration limit - let the node's maxIterations setting control it
// Just add better error handling for tool failures
if (window.AgentProcessor) {
  // Override processAgentNode to add better error handling
  const originalProcess = window.AgentProcessor.processAgentNode;
  
  window.AgentProcessor.processAgentNode = async function(node, input, options = {}) {
    // Log the max iterations from the node settings
    const maxIterations = node.maxIterations || 5;
    console.log(`🔧 Processing agent node with max iterations: ${maxIterations} (from node settings)`);
    
    try {
      const result = await originalProcess.call(this, node, input, options);
      return result;
    } catch (error) {
      console.error('❌ Agent processing error:', error);
      
      // If it's a tool error, provide a fallback
      if (error.message && error.message.includes('MCP API request failed')) {
        console.log('🛡️ Using fallback for failed MCP tool');
        return `I attempted to search for information but encountered a technical issue. Based on the query about "${input}", here's what I can tell you:

The system tried to use the search tool but it failed due to missing configuration. To enable real-time search:
1. Add your Perplexity API key in the settings
2. Or ensure the MCP server is properly configured

For now, I can provide general information based on my training data.`;
      }
      
      throw error;
    }
  };
  
  console.log('✅ Agent error handling improved');
}

// Also fix the tool execution to handle missing API keys gracefully
if (window.AgentTools && window.AgentTools.tools) {
  // Find Perplexity tools and add error handling
  window.AgentTools.tools.forEach(tool => {
    if (tool.id && tool.id.includes('perplexity')) {
      const originalExecute = tool.execute;
      
      tool.execute = async function(params, node) {
        try {
          // Check if Perplexity API key exists
          const perplexityKey = localStorage.getItem('perplexity_api_key');
          if (!perplexityKey) {
            console.warn('⚠️ Perplexity API key not configured');
            throw new Error('Perplexity API key not configured. Please add it in settings.');
          }
          
          return await originalExecute.call(this, params, node);
        } catch (error) {
          console.error(`❌ ${tool.id} error:`, error);
          
          // Return a helpful message instead of failing
          if (params.query) {
            return `Unable to search for "${params.query}" - ${error.message}`;
          }
          
          throw error;
        }
      };
    }
  });
  
  console.log('✅ Tool error handling improved');
}

console.log('✅ Agent iteration fixes complete');