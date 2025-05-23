// Fix Perplexity API key passing to ensure it's sent correctly
console.log('🔧 Fixing Perplexity API key passing...');

// Override the browser_search execution to ensure key is included
setTimeout(() => {
  // Check if key exists
  const savedKey = localStorage.getItem('perplexity_api_key');
  console.log('🔑 Perplexity API key status:', savedKey ? `Found (${savedKey.substring(0, 10)}...)` : 'NOT FOUND');
  
  if (savedKey) {
    console.log('✅ Perplexity API key is saved in localStorage');
    
    // Override fetch to ensure the key is always included for Perplexity requests
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
      // If it's an MCP execute request for Perplexity
      if (url.includes('/api/mcp/execute') && options.body) {
        try {
          const body = JSON.parse(options.body);
          if (body.server && body.server.includes('perplexity')) {
            // Ensure the API key is included
            if (!body.env) {
              body.env = {};
            }
            body.env.PERPLEXITY_API_KEY = savedKey;
            options.body = JSON.stringify(body);
            console.log('🔑 Injected Perplexity API key into request');
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
      
      return originalFetch.call(this, url, options);
    };
    
    console.log('✅ Perplexity API key injection installed');
  } else {
    console.warn('⚠️ No Perplexity API key found in localStorage');
    console.log('Please set it in OpenAI Configuration > Perplexity Configuration');
  }
}, 1000);

// Also fix the fix-browser-search-execution.js to use the latest key
window.getPerplexityKey = function() {
  return localStorage.getItem('perplexity_api_key') || '';
};

console.log('✅ Perplexity key passing fixes complete');