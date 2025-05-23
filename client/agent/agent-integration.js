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

      // Ensure App and AgentProcessor are available before proceeding
      if (!window.App) {
        console.log('AgentIntegration.init: App not available, deferring initialization');
        return; // Defer initialization until App is available
      }
      if (!window.AgentProcessor || typeof AgentProcessor.createAgentNode !== 'function') {
        console.log('AgentIntegration.init: AgentProcessor not available, deferring initialization');
        return; // Defer initialization until AgentProcessor is available
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
              const node = AgentIntegration.registeredNodeTypes[nodeType]();

              // Make sure the node is added to App.nodes if it's not already there
              if (node && Array.isArray(this.nodes)) {
                // Check if the node is already in the array
                const nodeExists = this.nodes.some(n => n.id === node.id);

                if (!nodeExists) {
                  console.log(`Adding ${nodeType} node ${node.id} to App.nodes array`);
                  this.nodes.push(node);

                  // Clear selection on all nodes and select the new one
                  this.nodes.forEach(n => n.selected = false);
                  node.selected = true;
                  this.selectedNode = node;

                  // Force a redraw of the canvas
                  if (typeof this.draw === 'function') {
                    console.log('Forcing canvas redraw');
                    this.draw();
                  }
                } else {
                  console.log(`Node ${node.id} already exists in App.nodes array`);
                }
              } else {
                console.warn('App.nodes array not available or node is undefined');
              }

              return node;
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

          // Make sure the node is added to App.nodes if it's not already there
          if (window.App && Array.isArray(window.App.nodes)) {
            // Check if the node is already in the array
            const nodeExists = window.App.nodes.some(n => n.id === node.id);

            if (!nodeExists) {
              console.log(`Adding node ${node.id} to App.nodes array`);
              window.App.nodes.push(node);

              // Clear selection on all nodes and select the new one
              window.App.nodes.forEach(n => n.selected = false);
              node.selected = true;
              window.App.selectedNode = node;

              // Force a redraw of the canvas
              if (typeof window.App.draw === 'function') {
                console.log('Forcing canvas redraw');
                window.App.draw();
              }
            } else {
              console.log(`Node ${node.id} already exists in App.nodes array`);
            }
          } else {
            console.warn('App.nodes array not available, node will not be rendered on canvas');
          }

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

  // Listen for AgentProcessor readiness to initialize integration
  document.addEventListener('agent-processor-ready', function() {
    console.log('AgentIntegration: agent-processor-ready event received, initializing');
    AgentIntegration.init();
  });
})();
