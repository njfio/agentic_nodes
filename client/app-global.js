/**
 * App Global Module
 * Ensures the App object is properly exposed to the global scope
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Wait for the DOM to be loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Set up a retry mechanism to wait for the App object
    let retryCount = 0;
    const maxRetries = 20;
    const retryInterval = 100; // ms
    
    const checkApp = () => {
      // Check if App is defined but not exposed to window
      if (typeof App !== 'undefined' && typeof window.App === 'undefined') {
        console.log('App object found but not exposed to window, exposing now');
        
        // Expose App to the global scope
        window.App = App;
        
        // Log success
        console.log('App object successfully exposed to global scope');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('App object successfully exposed to global scope', 'success');
        }
        
        // Dispatch a custom event to notify that App is available
        const event = new CustomEvent('app-available');
        document.dispatchEvent(event);
        console.log('app-available event dispatched');
      } else if (typeof App !== 'undefined' && typeof window.App !== 'undefined') {
        // App is already exposed to window
        console.log('App object is already exposed to global scope');
      } else if (retryCount < maxRetries) {
        // App is not defined yet, retry
        retryCount++;
        console.log(`Retry ${retryCount}/${maxRetries} waiting for App object in app-global.js`);
        setTimeout(checkApp, retryInterval);
      } else {
        // Failed to find App after multiple retries
        console.error('Failed to find App object after multiple retries in app-global.js');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Failed to find App object after multiple retries in app-global.js', 'error');
        }
      }
    };
    
    // Start the retry process
    setTimeout(checkApp, retryInterval);
  });
  
  // Listen for app initialization complete event
  document.addEventListener('app-initialization-complete', function() {
    console.log('App initialization complete event received by app-global.js');
    
    // Check if App is defined but not exposed to window
    if (typeof App !== 'undefined' && typeof window.App === 'undefined') {
      console.log('App object found but not exposed to window after initialization, exposing now');
      
      // Expose App to the global scope
      window.App = App;
      
      // Log success
      console.log('App object successfully exposed to global scope after initialization');
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog('App object successfully exposed to global scope after initialization', 'success');
      }
      
      // Dispatch a custom event to notify that App is available
      const event = new CustomEvent('app-available');
      document.dispatchEvent(event);
      console.log('app-available event dispatched after initialization');
    }
  });
})();
