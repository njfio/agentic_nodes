/**
 * Agent Integration Module
 * Handles integration between agent modules and the main application
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Create the AgentIntegration object
  const AgentIntegration = {
    // Track initialization state
    initialized: false,
    
    // Store original methods
    originalMethods: {},
    
    // Store registered node types
    registeredNodeTypes: {},
    
    // Initialize the integration
    init: function() {
      if (this.initialized) {
        console.log('AgentIntegration already initialized, skipping');
        return;
      }
      
      console.log('Initializing AgentIntegration');
      
      // Register node types with the application
      this.registerNodeTypes();
      
      // Mark as initialized
      this.initialized = true;
      
      console.log('AgentIntegration initialized');
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog('Agent Integration initialized successfully', 'success');
      }
    },
    
    // Register node types with the application
    registerNodeTypes: function() {
      // Add the agent node type to the App object if it exists
      if (window.App) {
        console.log('Registering agent node types with App');
        
        // Store the original addNode method if not already stored
        if (!this.originalMethods.addNode) {
          this.originalMethods.addNode = App.addNode;
        }
        
        // Register the agent node type
        this.registerNodeType('agent', function() {
          console.log('Creating agent node via AgentIntegration');
          
          // Use AgentProcessor to create the node
          if (window.AgentProcessor && typeof AgentProcessor.createAgentNode === 'function') {
            try {
              const node = AgentProcessor.createAgentNode();
              console.log('Created agent node via AgentIntegration:', node);
              return node;
            } catch (error) {
              console.error('Error creating agent node via AgentIntegration:', error);
              throw error;
            }
          } else {
            console.error('AgentProcessor not available or createAgentNode method missing');
            throw new Error('AgentProcessor not available or createAgentNode method missing');
          }
        });
        
        // Override the addNode method to handle all registered node types
        App.addNode = function(nodeType) {
          console.log('App.addNode called with nodeType:', nodeType);
          
          // Check if we have a handler for this node type
          if (nodeType && AgentIntegration.registeredNodeTypes[nodeType]) {
            try {
              console.log(`Creating ${nodeType} node via registered handler`);
              return AgentIntegration.registeredNodeTypes[nodeType]();
            } catch (error) {
              console.error(`Error creating ${nodeType} node:`, error);
              throw error;
            }
          }
          
          // Call the original method for other node types
          return AgentIntegration.originalMethods.addNode.call(App, nodeType);
        };
        
        console.log('Node types registered with App');
      } else {
        console.warn('App object not available, cannot register node types');
      }
    },
    
    // Register a node type with a handler function
    registerNodeType: function(nodeType, handlerFn) {
      if (!nodeType || typeof handlerFn !== 'function') {
        console.error('Invalid node type or handler function');
        return false;
      }
      
      console.log(`Registering node type: ${nodeType}`);
      this.registeredNodeTypes[nodeType] = handlerFn;
      return true;
    },
    
    // Create an agent node
    createAgentNode: function() {
      if (window.AgentProcessor && typeof AgentProcessor.createAgentNode === 'function') {
        try {
          console.log('Creating agent node via AgentIntegration.createAgentNode');
          const node = AgentProcessor.createAgentNode();
          console.log('Created agent node:', node);
          return node;
        } catch (error) {
          console.error('Error creating agent node:', error);
          throw error;
        }
      } else {
        console.error('AgentProcessor not available or createAgentNode method missing');
        throw new Error('AgentProcessor not available or createAgentNode method missing');
      }
    }
  };
  
  // Export the AgentIntegration object to the global scope
  window.AgentIntegration = AgentIntegration;
  
  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentIntegration');
    AgentIntegration.init();
  });
  
  // Listen for app initialization complete event
  document.addEventListener('app-initialization-complete', function() {
    console.log('App initialization complete event received by AgentIntegration');
    
    // Initialize again after app initialization
    if (!AgentIntegration.initialized) {
      console.log('Initializing AgentIntegration after app initialization');
      AgentIntegration.init();
    }
  });
})();
