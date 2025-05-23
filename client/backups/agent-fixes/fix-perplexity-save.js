// Fix Perplexity API key saving
console.log('🔧 Fixing Perplexity API key saving...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const saveConfigBtn = document.getElementById('saveConfig');
  const perplexityApiKeyInput = document.getElementById('perplexityApiKey');
  
  if (saveConfigBtn && perplexityApiKeyInput) {
    console.log('✅ Found Perplexity API key input');
    
    // Load saved key on page load
    const savedKey = localStorage.getItem('perplexity_api_key');
    if (savedKey) {
      perplexityApiKeyInput.value = savedKey;
      console.log('✅ Loaded saved Perplexity API key');
    }
    
    // Add event listener to save Perplexity key when save button is clicked
    saveConfigBtn.addEventListener('click', () => {
      // Save Perplexity API key
      const perplexityKey = perplexityApiKeyInput.value.trim();
      if (perplexityKey) {
        localStorage.setItem('perplexity_api_key', perplexityKey);
        console.log('✅ Saved Perplexity API key to localStorage:', perplexityKey.substring(0, 10) + '...');
        
        // Show success message
        if (window.showStatus) {
          window.showStatus('Perplexity API key saved successfully');
        }
      } else {
        localStorage.removeItem('perplexity_api_key');
        console.log('⚠️ Removed Perplexity API key (empty value)');
      }
    });
    
    // Also add event listener to save on Enter key
    perplexityApiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveConfigBtn.click();
      }
    });
    
    console.log('✅ Perplexity API key saving fixed');
  } else {
    console.warn('⚠️ Could not find Perplexity API key input or save button');
  }
});

// Also ensure the key is loaded when the modal opens
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'configBtn') {
    setTimeout(() => {
      const perplexityApiKeyInput = document.getElementById('perplexityApiKey');
      if (perplexityApiKeyInput) {
        const savedKey = localStorage.getItem('perplexity_api_key');
        if (savedKey) {
          perplexityApiKeyInput.value = savedKey;
          console.log('✅ Loaded Perplexity API key when modal opened');
        }
      }
    }, 100);
  }
});