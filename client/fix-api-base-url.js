// Fix API base URL to ensure correct server connection
console.log('🔧 Fixing API base URL...');

// Store the original fetch
const originalFetch = window.fetch;

// Override fetch to ensure correct base URL
window.fetch = async function(url, options = {}) {
  // If it's a relative URL starting with /api, prepend the correct base URL
  if (url.startsWith('/api/')) {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${url}`;
    console.log(`📡 API call: ${url} → ${fullUrl}`);
    
    // Call the original fetch with the full URL
    return originalFetch.call(this, fullUrl, options);
  }
  
  // For all other URLs, use the original fetch
  return originalFetch.call(this, url, options);
};

// Also ensure XMLHttpRequest uses correct base URL
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  if (url.startsWith('/api/')) {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${url}`;
    console.log(`📡 XHR API call: ${url} → ${fullUrl}`);
    return originalXHROpen.call(this, method, fullUrl, ...args);
  }
  return originalXHROpen.call(this, method, url, ...args);
};

console.log('✅ API base URL fix applied');

// Also add a health check
setTimeout(async () => {
  try {
    console.log('🏥 Running health check...');
    const response = await fetch('/api/health');
    if (response.ok) {
      console.log('✅ Server is healthy');
    } else {
      console.error('❌ Server health check failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Server health check error:', error);
  }
}, 1000);