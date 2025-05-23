// Fix timeouts for agent API calls
console.log('🔧 Fixing agent API timeouts...');

// Store original fetch if not already stored
if (!window._originalFetch) {
  window._originalFetch = window.fetch;
}

// Override fetch to add proper timeout handling
window.fetch = async function(url, options = {}) {
  // Add timeout header for OpenAI API calls
  if (url.includes('/api/openai/')) {
    options.headers = options.headers || {};
    // Set a 60 second timeout for agent requests
    options.headers['x-openai-timeout'] = '60000';
    console.log('⏱️ Setting 60s timeout for OpenAI request');
  }
  
  // Create AbortController for client-side timeout
  const controller = new AbortController();
  const timeoutMs = 60000; // 60 seconds
  
  const timeoutId = setTimeout(() => {
    console.warn('⏱️ Request timeout after 60s, aborting...');
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await window._originalFetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('❌ Request timed out after 60 seconds');
      // Return a timeout response
      return new Response(JSON.stringify({
        error: {
          message: 'Request timed out. The agent is taking too long to respond. Please try again with a simpler query.'
        }
      }), {
        status: 408,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
};

console.log('✅ Agent timeout fixes applied');