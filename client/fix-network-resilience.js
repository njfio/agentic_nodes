// Add network resilience and retry logic
console.log('🔧 Adding network resilience...');

// Wrap fetch with retry logic
const originalFetch = window.fetch;

window.fetch = async function(url, options = {}) {
  const maxRetries = 3;
  const retryDelay = 1000; // Start with 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout to all requests if not specified
      const controller = new AbortController();
      const timeoutMs = options.timeout || 30000; // 30 seconds default
      
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      
      const response = await originalFetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If successful, return response
      if (response.ok || attempt === maxRetries - 1) {
        return response;
      }
      
      // If server error, retry
      if (response.status >= 500) {
        console.warn(`Server error ${response.status}, retrying in ${retryDelay * (attempt + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      
      // For client errors, don't retry
      return response;
      
    } catch (error) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, error);
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // If it's a network error, retry
      if (error.name === 'AbortError') {
        console.warn(`Request timed out, retrying in ${retryDelay * (attempt + 1)}ms...`);
      } else if (error.name === 'TypeError' && error.message === 'Load failed') {
        console.warn(`Network error, retrying in ${retryDelay * (attempt + 1)}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
};

console.log('✅ Network resilience added');

// Also add better error messages for network failures
window.addEventListener('unhandledrejection', event => {
  if (event.reason && event.reason.message === 'Load failed') {
    console.error('Network connection lost. Please check your connection and try again.');
    // Show user-friendly error
    if (window.showStatus) {
      window.showStatus('Network connection lost. Please check your connection.', true);
    }
  }
});