/**
 * Agent Nodes Initialization
 * This file is loaded first to ensure the AgentNodes object is available globally
 * before any other scripts try to use it.
 */

// Create a global AgentNodes object with a readiness promise
(function() {
  console.log('Initializing AgentNodes global object');
  
  // Create a promise that will be resolved when AgentNodes is fully initialized
  let agentNodesResolve;
  const agentNodesReadyPromise = new Promise(resolve => {
    agentNodesResolve = resolve;
  });
  
  // Create the AgentNodes object with minimal functionality
  const AgentNodes = {
    // Track initialization state
    _initialized: false,
    
    // Store the promise and resolver
    _readyPromise: agentNodesReadyPromise,
    _readyResolve: agentNodesResolve,
    
    // Available tools
    availableTools: [],
    
    // Mark as ready
    markReady: function() {
      this._initialized = true;
      if (this._readyResolve) {
        this._readyResolve();
        console.log('AgentNodes marked as ready');
      }
    },
    
    // Wait for AgentNodes to be ready
    ready: function() {
      return this._readyPromise;
    },
    
    // Initialize the Agent Nodes (will be overridden by the full implementation)
    init: function() {
      console.log('AgentNodes.init stub called');
      this.markReady();
    },
    
    // Update tools list (will be overridden by the full implementation)
    updateToolsList: function() {
      console.log('AgentNodes.updateToolsList stub called');
      return [];
    }
  };
  
  // Explicitly expose the AgentNodes object to the global scope
  if (typeof window !== 'undefined') {
    window.AgentNodes = AgentNodes;
    console.log('AgentNodes object exposed to global scope');
  }
  
  // Add a global error handler for script loading
  window.addEventListener('error', function(event) {
    if (event.target && event.target.tagName === 'SCRIPT') {
      console.error('Error loading script:', event.target.src);
    }
  }, true);
  
  // Log when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Document ready, AgentNodes object is available');
  });
})();
