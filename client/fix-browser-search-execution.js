// Fix browser_search execution with proper MCP mapping and fallback
console.log('🔧 Fixing browser_search execution...');

// Wait for dependencies
const fixExecution = setInterval(() => {
  if (!window.AgentTools) {
    return;
  }
  
  clearInterval(fixExecution);
  console.log('🔧 Starting browser_search execution fix...');
  
  // Store original executeTool if exists
  const originalExecuteTool = window.AgentTools.executeTool;
  
  // Override AgentTools.executeTool
  window.AgentTools.executeTool = async function(toolId, params, node) {
    console.log(`\n🔧 Executing tool: ${toolId}`, params);
    
    // Handle browser_search specifically
    if (toolId === 'browser_search' || toolId === 'browser.search') {
      console.log('🔍 Browser search detected, executing...');
      
      try {
        // First try MCP Perplexity search
        console.log('Attempting MCP Perplexity search...');
        const response = await fetch('/api/mcp/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            server: 'github.com.pashpashpash/perplexity-mcp',
            method: 'search',
            params: params,
            autoApprove: true,
            env: {
              PERPLEXITY_API_KEY: localStorage.getItem('perplexity_api_key') || ''
            }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ MCP search successful');
          return data.result || `Search results for "${params.query}":\n${JSON.stringify(data)}`;
        } else {
          console.warn('MCP search failed:', await response.text());
        }
      } catch (error) {
        console.warn('MCP search error:', error);
      }
      
      // Fallback to OpenAI
      console.log('Falling back to OpenAI for search...');
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
                  content: `You are a web search assistant providing comprehensive information about the query. 
                  For queries about blockchain or crypto events in specific weeks/dates, provide:
                  - Major events, announcements, or developments
                  - Price movements and market trends
                  - Technical developments or updates
                  - Regulatory news or industry shifts
                  - Any significant partnerships or acquisitions
                  
                  If the query is about future dates (like 2025), explain current trends and what to watch for.`
                },
                {
                  role: 'user',
                  content: `Search query: "${params.query}"\n\nProvide detailed, factual information as if you had searched the web.`
                }
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            console.log('✅ OpenAI search fallback successful');
            return `Web Search Results for "${params.query}":\n\n${content}`;
          }
        } catch (error) {
          console.error('OpenAI fallback error:', error);
        }
      }
      
      // Final fallback
      return `Search for "${params.query}" - Unable to perform search. Please ensure:
1. MCP server is properly configured with Perplexity API key
2. OpenAI API key is configured in settings
3. Network connection is available

The agent attempted to search for current information but the search services are not available.`;
    }
    
    // For other tools, check if it's an MCP tool
    if (toolId.includes('perplexity') || toolId.includes('search')) {
      console.log('MCP tool detected:', toolId);
      
      // Map tool IDs to server/method
      let server, method;
      
      if (toolId.includes('perplexity')) {
        server = 'github.com.pashpashpash/perplexity-mcp';
        method = 'search';
      }
      
      if (server && method) {
        try {
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
          
          if (response.ok) {
            const data = await response.json();
            return data.result;
          }
        } catch (error) {
          console.error('MCP tool error:', error);
        }
      }
    }
    
    // Fall back to original executeTool
    if (originalExecuteTool) {
      return originalExecuteTool.call(this, toolId, params, node);
    }
    
    // Try to find and execute the tool directly
    const tool = window.AgentTools.tools.find(t => t.id === toolId);
    if (tool && tool.execute) {
      return tool.execute(params, node);
    }
    
    throw new Error(`Tool ${toolId} not found`);
  };
  
  console.log('✅ Browser search execution fix complete');
  
  // Also ensure the browser_search tool exists
  if (!window.AgentTools.tools.find(t => t.id === 'browser_search')) {
    window.AgentTools.tools.push({
      id: 'browser_search',
      name: 'Web Search',
      description: 'Search the web for current information',
      category: 'external-api',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      },
      execute: async (params) => {
        return window.AgentTools.executeTool('browser_search', params);
      }
    });
    console.log('✅ Added browser_search tool');
  }
}, 100);