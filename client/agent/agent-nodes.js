/**
 * Agent Nodes Module
 * Main entry point for agent nodes functionality
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Verify that the AgentNodes object exists (should be created by agent-nodes-init.js)
  if (!window.AgentNodes) {
    console.error('AgentNodes object not found in global scope');
    // Create a fallback object
    window.AgentNodes = {};
  }
  
  // Create the AgentNodesImpl object
  const AgentNodesImpl = {
    // Track initialization state
    _initialized: false,
    
    // Initialize the Agent Nodes
    init: function() {
      try {
        // Prevent multiple initializations
        if (this._initialized) {
          console.log('AgentNodes already initialized, skipping');
          return;
        }
        
        console.log('AgentNodes.init called');
        
        // Check if MCP tools are available
        if (window.MCPTools) {
          console.log('MCPTools available during AgentNodes initialization');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('MCPTools available during AgentNodes initialization', 'info');
          }
        } else {
          console.warn('MCPTools not available during AgentNodes initialization');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('MCPTools not available during AgentNodes initialization', 'warning');
          }
        }
        
        // Register node types
        this.registerNodeTypes();
        
        // Initialize the UI module
        if (window.AgentUI && typeof AgentUI.init === 'function') {
          AgentUI.init();
        }
        
        // Initialize the processor module
        if (window.AgentProcessor && typeof AgentProcessor.init === 'function') {
          AgentProcessor.init();
        }
        
        // Initialize the modals module
        if (window.AgentModals && typeof AgentModals.init === 'function') {
          AgentModals.init();
        }
        
        // Mark as initialized
        this._initialized = true;
        
        // Notify the initialization system if available
        if (window.AppInitSystem && AppInitSystem.markReady) {
          AppInitSystem.markReady('agentNodes');
        }
        
        // Mark as ready using the readiness promise
        if (typeof this.markReady === 'function') {
          this.markReady();
          console.log('AgentNodes marked as ready');
        }
        
        console.log('Agent Nodes initialized successfully');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Agent Nodes initialized successfully', 'success');
        }
      } catch (error) {
        console.error('Error initializing AgentNodes:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error initializing AgentNodes: ${error.message}`, 'error');
        }
        
        // Mark as ready even if there was an error, to unblock dependent code
        if (typeof this.markReady === 'function') {
          this.markReady();
          console.log('AgentNodes marked as ready despite initialization error');
        }
      }
    },
    
    // Register node types with the application
    registerNodeTypes: function() {
      // Add the agent node type to the App object if it exists
      if (window.App) {
        console.log('Registering agent node type with App');
        
        // Store the original addNode method
        const originalAddNode = App.addNode;
        
        // Override the addNode method to add our custom node types
        App.addNode = function(nodeType) {
          console.log('App.addNode called with nodeType:', nodeType);
          
          if (nodeType === 'agent') {
            console.log('Creating agent node');
            // Check if AgentProcessor is available
            if (!window.AgentProcessor) {
              console.error('AgentProcessor not available');
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog('AgentProcessor not available when trying to create agent node', 'error');
              }
              // Fallback to creating a basic node
              const node = originalAddNode.call(App, 'text');
              if (node) {
                node.nodeType = 'agent';
                node._nodeType = 'agent';
                node.isAgentNode = true;
                node.title = 'Agent Node (Fallback)';
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('Created fallback agent node', 'warning');
                }
              }
              return node;
            }
            const agentNode = window.AgentProcessor.createAgentNode();
            console.log('Created agent node with nodeType:', agentNode.nodeType);
            return agentNode;
          }
          
          // Call the original method for other node types
          return originalAddNode.call(App, nodeType);
        };
        
        // Log the registered node types
        console.log('Agent node type registered with App');
        
        // Add the nodeType property to the Node class if it doesn't exist
        if (!Node.prototype.hasOwnProperty('nodeType')) {
          Object.defineProperty(Node.prototype, 'nodeType', {
            get: function() {
              return this._nodeType || 'default';
            },
            set: function(value) {
              this._nodeType = value;
            }
          });
        }
        
        // Extend the Node's process method to handle agent node processing
        const originalNodeProcess = Node.prototype.process;
        Node.prototype.process = async function(input) {
          // Handle agent node processing
          if (this.nodeType === 'agent' || this._nodeType === 'agent' || this.isAgentNode === true) {
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Processing agent node ${this.id} (${this.title}) with agent capabilities`, 'info');
            }
            try {
              // Mark the node as processing
              this.processing = true;
              
              // Process the node using the agent processor
              if (!window.AgentProcessor) {
                console.error('AgentProcessor not available for processing');
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('AgentProcessor not available for processing agent node', 'error');
                }
                throw new Error('AgentProcessor not available');
              }
              const result = await window.AgentProcessor.processAgentNode(this, input);
              
              // Mark the node as processed
              this.hasBeenProcessed = true;
              this.processing = false;
              
              // Return the result
              return result;
            } catch (error) {
              // Handle errors
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog(`Error processing agent node ${this.id}: ${error.message}`, 'error');
              }
              this.processing = false;
              this.error = error.message;
              throw error;
            }
          }
          
          // Call the original process method for regular nodes
          return originalNodeProcess.call(this, input);
        };
        
        // Extend the Node's draw method to handle agent node styling
        const originalNodeDraw = Node.prototype.draw;
        Node.prototype.draw = function(ctx) {
          // Store the original node type for debugging
          const nodeType = this.nodeType || this._nodeType;
          
          // Force the node type to be set correctly if it's an agent node
          // This is a workaround for cases where the nodeType property might not be set correctly
          if (this.isAgentNode === true && this.nodeType !== 'agent') {
            this.nodeType = 'agent';
            this._nodeType = 'agent';
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Fixed node type for agent node ${this.id}`, 'info');
            }
          }
          
          // Check if this is an agent node and apply styling before calling original draw
          if (this.nodeType === 'agent' || this._nodeType === 'agent' || this.isAgentNode === true) {
            // Override the node background with agent-specific styling
            // Use purple gradient for agent nodes
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#9c27b0');  // Purple top
            gradient.addColorStop(1, '#7b1fa2');  // Darker purple bottom
            
            // Save the original styles
            const originalFill = ctx.fillStyle;
            const originalStroke = ctx.strokeStyle;
            const originalLineWidth = ctx.lineWidth;
            
            // Apply the gradient to the node
            ctx.fillStyle = this.selected ? '#4a90e2' :
                           this.processing ? '#d4af37' :
                           this.error ? '#e74c3c' : gradient;
            
            ctx.strokeStyle = '#ff00ff'; // Bright purple border for agent nodes
            ctx.lineWidth = 2; // Thicker border
            
            // Draw the node background and border
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            ctx.stroke();
            
            // Draw the node title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.title, this.x + this.width / 2, this.y + 20);
            
            // Add agent icon
            // Draw agent badge in the top-right corner
            const badgeX = this.x + this.width - 20;
            const badgeY = this.y + 20;
            const badgeRadius = 12;
            
            // Draw the badge circle
            ctx.fillStyle = '#9c27b0'; // Purple for agent nodes
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw the badge icon (robot emoji)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🤖', badgeX, badgeY);
            
            // Draw iteration count if iterating
            if (this.isIterating) {
              const iterX = this.x + this.width - 20;
              const iterY = this.y + this.height - 20;
              
              // Draw iteration badge
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.beginPath();
              ctx.arc(iterX, iterY, 15, 0, Math.PI * 2);
              ctx.fill();
              
              // Draw iteration text
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`${this.currentIteration}/${this.maxIterations}`, iterX, iterY);
            }
            
            // Draw input and output areas
            this.drawInputOutputAreas(ctx);
            
            // Restore the original styles
            ctx.fillStyle = originalFill;
            ctx.strokeStyle = originalStroke;
            ctx.lineWidth = originalLineWidth;
            
            // Skip the original draw method for agent nodes
            return;
          }
          
          // Call the original draw method for non-agent nodes
          originalNodeDraw.call(this, ctx);
        };
        
        // Helper method to draw input and output areas for agent nodes
        Node.prototype.drawInputOutputAreas = function(ctx) {
          if (this.nodeType !== 'agent' && this._nodeType !== 'agent' && this.isAgentNode !== true) {
            return;
          }
          
          const inputAreaHeight = 30;
          const outputAreaHeight = 30;
          const contentAreaX = this.x + 10;
          const contentAreaWidth = this.width - 20;
          
          // Draw input area
          const inputAreaY = this.y + 40;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);
          
          // Draw input label
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('INPUT', contentAreaX + 5, inputAreaY + 5);
          
          // Draw output area
          const outputAreaY = this.y + this.height - outputAreaHeight - 10;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
          
          // Draw output label
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('OUTPUT', contentAreaX + 5, outputAreaY + 5);
          
          // Draw input connector
          const inputConnectorX = this.x;
          const inputConnectorY = inputAreaY + inputAreaHeight / 2;
          ctx.fillStyle = '#4a90e2';
          ctx.beginPath();
          ctx.arc(inputConnectorX, inputConnectorY, 8, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw output connector
          const outputConnectorX = this.x + this.width;
          const outputConnectorY = outputAreaY + outputAreaHeight / 2;
          ctx.fillStyle = '#4a90e2';
          ctx.beginPath();
          ctx.arc(outputConnectorX, outputConnectorY, 8, 0, Math.PI * 2);
          ctx.fill();
        };
      }
    },
    
    // Update the payloads display (delegate to AgentModals)
    updatePayloadsDisplay: function() {
      if (window.AgentModals && typeof AgentModals.updatePayloadsDisplay === 'function') {
        return AgentModals.updatePayloadsDisplay();
      } else {
        console.warn('AgentModals not available, cannot update payloads display');
      }
    },
    
    // Alias for updatePayloadsDisplay for backward compatibility
    updateApiPayloadsDisplay: function() {
      return this.updatePayloadsDisplay();
    },
    
    // Update the agent logs display (delegate to AgentModals)
    updateAgentLogsDisplay: function() {
      if (window.AgentModals && typeof AgentModals.updateAgentLogsDisplay === 'function') {
        return AgentModals.updateAgentLogsDisplay();
      } else {
        console.warn('AgentModals not available, cannot update agent logs display');
      }
    },
    
    // Initialize the agent logs modal (delegate to AgentModals)
    initAgentLogsModal: function() {
      if (window.AgentModals && typeof AgentModals.initAgentLogsModal === 'function') {
        return AgentModals.initAgentLogsModal();
      } else {
        console.warn('AgentModals not available, cannot initialize agent logs modal');
      }
    },
    
    // Initialize the API payloads modal (delegate to AgentModals)
    initApiPayloadsModal: function() {
      if (window.AgentModals && typeof AgentModals.initApiPayloadsModal === 'function') {
        return AgentModals.initApiPayloadsModal();
      } else {
        console.warn('AgentModals not available, cannot initialize API payloads modal');
      }
    },
    
    // Update the tools list (delegate to AgentProcessor)
    updateToolsList: function() {
      if (window.AgentProcessor && typeof AgentProcessor.updateToolsList === 'function') {
        return AgentProcessor.updateToolsList();
      } else {
        console.warn('AgentProcessor not available, cannot update tools list');
        return [];
      }
    },
    
    // Create an agent node (delegate to AgentProcessor)
    createAgentNode: function() {
      if (window.AgentProcessor && typeof AgentProcessor.createAgentNode === 'function') {
        return AgentProcessor.createAgentNode();
      } else {
        console.error('AgentProcessor not available, cannot create agent node');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('AgentProcessor not available, cannot create agent node', 'error');
        }
        throw new Error('AgentProcessor not available');
      }
    }
  };
  
  // Apply the implementation to the global AgentNodes object
  Object.keys(AgentNodesImpl).forEach(key => {
    window.AgentNodes[key] = AgentNodesImpl[key];
  });
  
  console.log('AgentNodes implementation applied to global object');
  
  // Force initialization of AgentNodes
  setTimeout(() => {
    if (window.AgentNodes && typeof window.AgentNodes.init === 'function' && !window.AgentNodes._initialized) {
      console.log('Forcing AgentNodes initialization');
      window.AgentNodes.init();
    }
  }, 100);
  
  // Set up event listeners after DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up AgentNodes event listeners');
    
    // Force initialization of AgentNodes again after DOM is loaded
    if (window.AgentNodes && typeof window.AgentNodes.init === 'function' && !window.AgentNodes._initialized) {
      console.log('Initializing AgentNodes from DOMContentLoaded event');
      window.AgentNodes.init();
    }
    
    // Listen for app initialization complete event
    document.addEventListener('app-initialization-complete', function() {
      console.log('App initialization complete event received by AgentNodes');
      
      // Update the tools list
      if (window.AgentNodes && typeof window.AgentNodes.updateToolsList === 'function') {
        window.AgentNodes.updateToolsList();
      }
      
      // Force initialization of AgentNodes again after app initialization
      if (window.AgentNodes && typeof window.AgentNodes.init === 'function' && !window.AgentNodes._initialized) {
        console.log('Initializing AgentNodes after app initialization');
        window.AgentNodes.init();
      }
    });
  });
})();
