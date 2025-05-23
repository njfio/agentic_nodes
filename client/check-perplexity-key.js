// Check and diagnose Perplexity API key issues
console.log('🔍 Checking Perplexity API key configuration...');

// Check localStorage
const perplexityKey = localStorage.getItem('perplexity_api_key');
console.log('Perplexity API key in localStorage:', perplexityKey ? `${perplexityKey.substring(0, 10)}...` : 'NOT SET');

// Check if the key is being saved properly
const originalSaveConfig = document.getElementById('saveConfig');
if (originalSaveConfig) {
  console.log('✅ Found save config button');
  
  // Check current value in the input field
  setTimeout(() => {
    const perplexityInput = document.getElementById('perplexityApiKey');
    if (perplexityInput) {
      console.log('Current Perplexity input value:', perplexityInput.value ? 'Has value' : 'Empty');
    }
  }, 1000);
}

// Add a helper function to manually set the key
window.setPerplexityKey = function(key) {
  if (!key) {
    console.error('Please provide a key: setPerplexityKey("pplx-...")');
    return;
  }
  
  localStorage.setItem('perplexity_api_key', key);
  console.log('✅ Perplexity API key saved to localStorage');
  console.log('The key will be used in future agent searches');
};

// Add a helper to test the key
window.testPerplexityKey = async function() {
  const key = localStorage.getItem('perplexity_api_key');
  if (!key) {
    console.error('No Perplexity API key found. Set it first with: setPerplexityKey("pplx-...")');
    return;
  }
  
  console.log('Testing Perplexity API key...');
  
  try {
    const response = await fetch('/api/mcp/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        server: 'github.com.pashpashpash/perplexity-mcp',
        method: 'search',
        params: {
          query: 'test query'
        },
        autoApprove: true,
        env: {
          PERPLEXITY_API_KEY: key
        }
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Perplexity API key is working!', data);
    } else {
      console.error('❌ Perplexity API key test failed:', data);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

console.log(`
🔧 Perplexity API Key Helper:

1. To set your key manually:
   setPerplexityKey("pplx-your-actual-key-here")

2. To test if it's working:
   testPerplexityKey()

3. Or use the UI:
   - Click "OpenAI Configuration"
   - Scroll to "Perplexity Configuration"
   - Enter your key and click "Save Configuration"
`);