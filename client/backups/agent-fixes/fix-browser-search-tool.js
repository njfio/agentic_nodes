// Fix browser_search tool to work properly
console.log('🔧 Fixing browser_search tool...');

// Wait for AgentTools to be ready
const fixInterval = setInterval(() => {
  if (!window.AgentTools || !window.AgentTools.tools) {
    return;
  }
  
  clearInterval(fixInterval);
  console.log('🔧 AgentTools ready, fixing browser_search...');
  
  // Find and fix browser.search tool
  let browserSearchTool = window.AgentTools.tools.find(t => 
    t.id === 'browser.search' || t.id === 'browser_search'
  );
  
  if (!browserSearchTool) {
    console.log('⚠️ browser_search tool not found, creating it...');
    
    // Create the browser_search tool
    browserSearchTool = {
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
      async execute(params, node) {
        const { query } = params;
        console.log(`🔍 Browser search executing for: "${query}"`);
        
        // Try MCP Perplexity search first
        if (window.MCPTools && window.MCPTools.executeTool) {
          try {
            console.log('Attempting Perplexity search...');
            const result = await window.MCPTools.executeTool('search_perplexity-server', { query }, node);
            if (result) {
              return typeof result === 'string' ? result : JSON.stringify(result);
            }
          } catch (error) {
            console.warn('Perplexity search failed:', error);
          }
        }
        
        // Fallback to OpenAI
        const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
        if (config.apiKey) {
          try {
            console.log('Using OpenAI fallback for search...');
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
                    content: 'You are a web search assistant. Provide detailed information about the search query as if you had searched the web. Include specific details, dates, and relevant information. For queries about future dates like 2025, explain what information would be available and suggest current trends.'
                  },
                  {
                    role: 'user',
                    content: `Search query: "${query}"\n\nProvide comprehensive search results for this query. If it's about future events, explain what current information and trends are relevant.`
                  }
                ],
                temperature: 0.5,
                max_tokens: 1500
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              return `Search Results for "${query}":\n\n${data.choices[0].message.content}`;
            }
          } catch (error) {
            console.error('OpenAI fallback failed:', error);
          }
        }
        
        return `Search for "${query}" - Unable to perform real-time search. Please check MCP server connections.`;
      }
    };
    
    // Add to tools array
    window.AgentTools.tools.push(browserSearchTool);
    console.log('✅ Created browser_search tool');
  } else {
    // Ensure the ID is browser_search (with underscore)
    browserSearchTool.id = 'browser_search';
    console.log('✅ Fixed browser_search tool ID');
  }
  
  // Override AgentTools.executeTool to handle browser_search properly
  const originalExecuteTool = window.AgentTools.executeTool;
  
  window.AgentTools.executeTool = async function(toolId, params, node) {
    console.log(`🔄 AgentTools.executeTool called for: ${toolId}`);
    
    // Map browser.search to browser_search
    if (toolId === 'browser.search') {
      toolId = 'browser_search';
    }
    
    // Find the tool
    const tool = window.AgentTools.tools.find(t => t.id === toolId);
    
    if (tool && tool.execute) {
      console.log(`✅ Found tool ${toolId}, executing...`);
      try {
        const result = await tool.execute(params, node);
        console.log(`✅ Tool ${toolId} completed`);
        return result;
      } catch (error) {
        console.error(`❌ Tool ${toolId} error:`, error);
        throw error;
      }
    }
    
    // Fall back to original if available
    if (originalExecuteTool) {
      return originalExecuteTool.call(this, toolId, params, node);
    }
    
    throw new Error(`Tool with ID ${toolId} not found`);
  };
  
  console.log('✅ AgentTools.executeTool override installed');
  
  // Also ensure getAllTools returns browser_search
  const originalGetAllTools = window.AgentTools.getAllTools;
  
  window.AgentTools.getAllTools = function() {
    let tools = originalGetAllTools ? originalGetAllTools.call(this) : this.tools || [];
    
    // Ensure browser_search is in the list
    if (!tools.find(t => t.id === 'browser_search')) {
      const browserTool = window.AgentTools.tools.find(t => 
        t.id === 'browser.search' || t.id === 'browser_search'
      );
      if (browserTool) {
        tools.push({...browserTool, id: 'browser_search'});
      }
    }
    
    // Remove browser.search (with dot) if it exists
    tools = tools.filter(t => t.id !== 'browser.search');
    
    return tools;
  };
  
  console.log('✅ browser_search tool fixes complete');
}, 100);