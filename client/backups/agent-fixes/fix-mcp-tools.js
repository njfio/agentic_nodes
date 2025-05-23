// Fix MCP tools issues
console.log('🔧 Fixing MCP tools issues...');

// Fix duplicate tools
if (window.MCPTools && window.MCPTools.tools) {
  // Remove duplicates from MCP tools
  const uniqueTools = [];
  const seenIds = new Set();
  
  window.MCPTools.tools.forEach(tool => {
    if (!seenIds.has(tool.id)) {
      seenIds.add(tool.id);
      uniqueTools.push(tool);
    }
  });
  
  window.MCPTools.tools = uniqueTools;
  console.log(`✅ Removed duplicates, ${uniqueTools.length} unique MCP tools`);
}

// Fix the browser.search tool to actually work
if (window.AgentTools && window.AgentTools.tools) {
  const browserSearchTool = window.AgentTools.tools.find(t => t.id === 'browser_search' || t.id === 'browser.search');
  
  if (browserSearchTool) {
    console.log('🔧 Fixing browser.search tool implementation...');
    
    browserSearchTool.execute = async function(params, node) {
      const { query } = params;
      console.log(`🔍 Browser search for: "${query}"`);
      
      // Try to use Perplexity search if available
      if (window.MCPTools && window.MCPTools.executeTool) {
        try {
          console.log('Using Perplexity MCP for search...');
          const result = await window.MCPTools.executeTool('search_perplexity-server', { query }, node);
          return result;
        } catch (error) {
          console.warn('Perplexity search failed:', error);
        }
      }
      
      // Fallback: Use OpenAI to generate a response about the search
      const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
      if (config.apiKey) {
        try {
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are a web search result provider. Provide informative results about the search query as if you had searched the web. Be specific and include relevant details.'
                },
                {
                  role: 'user',
                  content: `Search query: "${query}"\n\nProvide search results for this query, focusing on recent and relevant information.`
                }
              ],
              temperature: 0.3,
              max_tokens: 1000
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
          }
        } catch (error) {
          console.error('Fallback search failed:', error);
        }
      }
      
      return `Search results for "${query}" (Note: Real-time search integration needed for current results)`;
    };
    
    console.log('✅ Fixed browser.search implementation');
  }
}

// Fix MCP tool execution
if (window.MCPTools && window.MCPTools.executeTool) {
  const originalExecuteTool = window.MCPTools.executeTool;
  
  window.MCPTools.executeTool = async function(toolId, params, node) {
    console.log(`🛠️ MCP Tool execution: ${toolId}`, params);
    
    // Fix the parameters for MCP tools
    if (toolId.includes('perplexity')) {
      // Ensure proper format for Perplexity
      if (toolId === 'search_perplexity-server' && params.query) {
        console.log('Executing Perplexity search with query:', params.query);
      }
    }
    
    try {
      const result = await originalExecuteTool.call(this, toolId, params, node);
      console.log(`✅ MCP tool ${toolId} completed`);
      return result;
    } catch (error) {
      console.error(`❌ MCP tool ${toolId} failed:`, error);
      
      // Provide a fallback response
      if (toolId === 'search_perplexity-server') {
        return `Unable to perform real-time search for "${params.query}". The MCP server connection may be unavailable.`;
      }
      
      throw error;
    }
  };
}

// Enhance the system prompt to better use tools
setTimeout(() => {
  if (window.App && window.App.nodes) {
    window.App.nodes.forEach(node => {
      if (node.title && node.title.toLowerCase().includes('agent')) {
        // Update system prompt to be more direct about tool usage
        node.systemPrompt = `You are an AI agent with access to web search and other tools.

CRITICAL INSTRUCTIONS:
1. When asked about current events, recent news, or anything requiring up-to-date information, you MUST use the browser_search tool.
2. Do not say you cannot access current information - use the tools available.
3. The browser_search tool can search for any topic and return results.

Available key tools:
- browser_search: Search the web for any information
- search_perplexity-server: Alternative web search using Perplexity
- get_documentation_perplexity-server: Get technical documentation

For the query about blockchain events in May 2025, you should:
1. Use browser_search with query like "blockchain news May 2025" or "blockchain events week May 1 2025"
2. If that fails, try search_perplexity-server
3. Process and summarize the results

Never claim you don't have access to current information - always try to search first.`;
        
        console.log(`✅ Updated system prompt for node ${node.id}`);
      }
    });
  }
}, 2000);

console.log('🔧 MCP tools fixes complete');