// Fix for Docker network issues
console.log('🐳 Applying Docker network fixes...');

// Check if we're connecting to localhost vs Docker
const isDocker = window.location.hostname === 'localhost' && window.location.port === '8732';

if (isDocker) {
  console.log('🐳 Detected Docker environment');
  
  // Add a connection test
  setTimeout(async () => {
    try {
      console.log('🐳 Testing Docker connection...');
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Docker connection OK:', data);
      } else {
        console.error('❌ Docker connection failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Docker connection error:', error);
      console.log('💡 Try restarting Docker or checking Docker logs');
    }
  }, 2000);
}

// Also reduce payload size for agent requests
const originalStringify = JSON.stringify;
JSON.stringify = function(obj, replacer, space) {
  // For API requests with large tool arrays, minimize the payload
  if (obj && obj.tools && obj.tools.length > 10) {
    console.log(`🗜️ Compressing large payload with ${obj.tools.length} tools`);
    // Remove whitespace from the JSON
    return originalStringify.call(this, obj, replacer, 0);
  }
  
  return originalStringify.call(this, obj, replacer, space);
};

console.log('✅ Docker network fixes applied');