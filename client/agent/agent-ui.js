/**
 * Agent UI Module
 * Handles UI-related functionality for agent nodes
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Create the AgentUI object
  const AgentUI = {
    // Track initialization state
    initialized: false,

    // Initialize the UI
    init: function() {
      console.log('Initializing AgentUI');

      // Check if App object is available
      if (!window.App) {
        console.warn('App object not available during AgentUI initialization, will retry');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('App object not available during AgentUI initialization, will retry', 'warning');
        }

        // Set up a retry mechanism
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 200; // ms

        const retryInit = () => {
          // Check if App object is available now
          if (window.App && typeof window.App === 'object') {
            console.log('App object now available, continuing AgentUI initialization');
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog('App object now available, continuing AgentUI initialization', 'success');
            }

            // Continue initialization
            this.completeInitialization();
          } else if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retry ${retryCount}/${maxRetries} waiting for App object`);

            // Try to find the App object in different ways
            if (typeof window.App === 'undefined') {
              console.log('App object is completely undefined');
            } else if (window.App === null) {
              console.log('App object is null');
            } else if (typeof window.App !== 'object') {
              console.log(`App object is not an object, it's a ${typeof window.App}`);
            } else {
              console.log('App object exists but may not be fully initialized');

              // Check if it has the required methods
              if (typeof window.App.addNode !== 'function') {
                console.log('App.addNode is not a function');
              }

              if (typeof window.App.draw !== 'function') {
                console.log('App.draw is not a function');
              }

              if (!Array.isArray(window.App.nodes)) {
                console.log('App.nodes is not an array');
              }
            }

            // Schedule another retry
            setTimeout(retryInit, retryInterval);
          } else {
            console.error('Failed to find App object after multiple retries');
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog('Failed to find App object after multiple retries, UI may not function correctly', 'error');
            }

            // Create a fallback App object if it doesn't exist
            if (typeof window.App === 'undefined' || window.App === null) {
              console.log('Creating fallback App object');
              window.App = {
                nodes: [],
                addNode: function(type) {
                  console.warn('Using fallback App.addNode method');
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog('Using fallback App.addNode method', 'warning');
                  }

                  // Try to use AgentProcessor directly
                  if (window.AgentProcessor && typeof AgentProcessor.createAgentNode === 'function') {
                    try {
                      const node = AgentProcessor.createAgentNode();

                      // Check if the node was created successfully
                      if (node) {
                        console.log('Successfully created node using AgentProcessor:', node);

                        // Add the node to our nodes array
                        if (Array.isArray(this.nodes)) {
                          this.nodes.push(node);
                        }

                        // Set as selected node
                        this.selectedNode = node;

                        return node;
                      } else {
                        console.error('AgentProcessor.createAgentNode() returned undefined');
                        throw new Error('Failed to create node: AgentProcessor returned undefined');
                      }
                    } catch (error) {
                      console.error('Error in AgentProcessor.createAgentNode():', error);
                      throw error;
                    }
                  }

                  throw new Error('Cannot create node: App object not properly initialized');
                },
                draw: function() {
                  console.warn('Using fallback App.draw method');
                }
              };

              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog('Created fallback App object', 'warning');
              }
            }

            // Continue with initialization anyway
            this.completeInitialization();
          }
        };

        // Start the retry process
        setTimeout(retryInit, retryInterval);
      } else {
        // App object is available, proceed with initialization
        this.completeInitialization();
      }
    },

    // Complete the initialization process
    completeInitialization: function() {
      // Add event listeners
      this.addEventListeners();

      // Initialize modals - use AgentModals if available
      if (window.AgentModals) {
        console.log('Using AgentModals for modal initialization');
        // No need to initialize modals here, they're already initialized by AgentModals
      } else {
        console.warn('AgentModals not available, some features may not work correctly');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('AgentModals not available, some features may not work correctly', 'warning');
        }
      }

      // Mark as initialized
      this.initialized = true;

      console.log('AgentUI initialized');
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog('AgentUI initialized successfully', 'success');
      }
    },

    // Add event listeners
    addEventListeners: function() {
      console.log('Adding event listeners for AgentUI');

      // Add buttons to the toolbar
      this.addAgentNodeButton();

      // Add keyboard shortcuts
      this.addKeyboardShortcuts();

      // Add global click handlers for agent node buttons
      this.addGlobalClickHandlers();
    },

    // Add the agent node button to the toolbar
    addAgentNodeButton: function() {
      console.log('Adding agent node button to toolbar');

      const toolbar = document.getElementById('toolbar');
      if (!toolbar) {
        console.error('Toolbar not found, cannot add agent node button');
        return;
      }

      // Check if the button already exists
      const existingButton = document.getElementById('addAgentNodeBtn');
      if (existingButton) {
        // Remove the existing button to avoid duplicates
        existingButton.remove();
        console.log('Removed existing Agent Node button to avoid duplicates');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Removed existing Agent Node button to avoid duplicates', 'info');
        }
      }

      // Add Agent Node button
      const agentBtn = document.createElement('button');
      agentBtn.id = 'addAgentNodeBtn';
      agentBtn.type = 'button';
      agentBtn.textContent = 'Add Agent Node';
      agentBtn.title = 'Add a node with agentic capabilities';

      // Add a distinctive style to make it stand out
      agentBtn.style.backgroundColor = '#9c27b0';
      agentBtn.style.color = 'white';
      agentBtn.style.fontWeight = 'bold';
      agentBtn.style.border = '2px solid #ff00ff';
      agentBtn.style.boxShadow = '0 0 5px #9c27b0';
      agentBtn.style.position = 'relative';

      // Add robot emoji to the button
      const robotSpan = document.createElement('span');
      robotSpan.textContent = ' 🤖';
      robotSpan.style.fontSize = '16px';
      agentBtn.appendChild(robotSpan);

      // Add click event listener
      agentBtn.addEventListener('click', () => {
        console.log('Add Agent Node button clicked');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Add Agent Node button clicked', 'info');
        }

        // Function to create an agent node
        const createAgentNode = () => {
          // Try using AgentIntegration first if available
          if (window.AgentIntegration && typeof AgentIntegration.createAgentNode === 'function') {
            console.log('Creating agent node via AgentIntegration');
            try {
              const node = AgentIntegration.createAgentNode();
              console.log('Created agent node via AgentIntegration:', node);

              // Check if the node was created successfully
              if (node) {
                // Log success message
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Created agent node with ID: ${node.id || 'unknown'}`, 'success');
                }

                // Force a redraw of the canvas
                if (window.App && typeof App.draw === 'function') {
                  App.draw();
                }

                return true;
              } else {
                console.error('AgentIntegration.createAgentNode returned undefined');
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('AgentIntegration.createAgentNode returned undefined', 'error');
                }
                // Fall through to try App.addNode
              }
            } catch (error) {
              console.error('Error creating agent node via AgentIntegration:', error);
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog(`Error creating agent node via AgentIntegration: ${error.message}`, 'error');
              }
              // Fall through to try App.addNode
            }
          }

          // Fall back to App.addNode
          if (window.App && typeof App.addNode === 'function') {
            console.log('Calling App.addNode with agent type');
            try {
              const node = App.addNode('agent');
              console.log('Created agent node:', node);

              // Check if the node was created successfully
              if (node) {
                // Log success message
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Created agent node with ID: ${node.id || 'unknown'}`, 'success');
                }

                // Force a redraw of the canvas
                if (window.App && typeof App.draw === 'function') {
                  App.draw();
                }

                return true;
              } else {
                console.error('App.addNode returned undefined');
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('App.addNode returned undefined', 'error');
                }
                return false;
              }
            } catch (error) {
              console.error('Error creating agent node:', error);
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog(`Error creating agent node: ${error.message}`, 'error');
              }
              return false;
            }
          } else {
            console.warn('App.addNode not available, will retry');
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog('App.addNode not available, will retry', 'warning');
            }
            return false;
          }
        };

        // Try to create the agent node
        if (!createAgentNode()) {
          // If failed, set up a retry mechanism
          console.log('Setting up retry for agent node creation');

          // Retry a few times with increasing delays
          let retryCount = 0;
          const maxRetries = 5;
          const retryInterval = 300; // ms

          const retryCreateAgentNode = () => {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retry ${retryCount}/${maxRetries} for agent node creation`);
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog(`Retry ${retryCount}/${maxRetries} for agent node creation`, 'info');
              }

              // Try to create the agent node again
              if (createAgentNode()) {
                console.log('Agent node created successfully on retry');
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('Agent node created successfully on retry', 'success');
                }
              } else {
                // Schedule another retry with increasing delay
                setTimeout(retryCreateAgentNode, retryInterval * retryCount);
              }
            } else {
              console.error('Failed to create agent node after multiple retries');
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog('Failed to create agent node after multiple retries. Please try again later.', 'error');
              }

              // Try to use the fallback methods
              // First try AgentIntegration
              if (window.AgentIntegration && typeof AgentIntegration.createAgentNode === 'function') {
                console.log('Attempting to create agent node via AgentIntegration (fallback)');
                try {
                  const node = AgentIntegration.createAgentNode();

                  // Check if the node was created successfully
                  if (node) {
                    console.log('Created agent node via AgentIntegration (fallback):', node);

                    // Log success message with safe access to node.id
                    if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                      DebugManager.addLog(`Created agent node via AgentIntegration with ID: ${node.id || 'unknown'} (fallback)`, 'success');
                    }

                    // Add the node to App.nodes if possible
                    if (window.App && Array.isArray(window.App.nodes)) {
                      window.App.nodes.push(node);

                      // Set as selected node
                      window.App.selectedNode = node;
                    }

                    // Force a redraw of the canvas
                    if (window.App && typeof App.draw === 'function') {
                      App.draw();
                    }

                    // Success, no need to try other methods
                    return;
                  } else {
                    console.error('AgentIntegration.createAgentNode() returned undefined (fallback)');
                    if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                      DebugManager.addLog('AgentIntegration.createAgentNode() returned undefined (fallback)', 'error');
                    }
                    // Fall through to try AgentProcessor
                  }
                } catch (error) {
                  console.error('Error creating agent node via AgentIntegration (fallback):', error);
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog(`Error creating agent node via AgentIntegration (fallback): ${error.message}`, 'error');
                  }
                  // Fall through to try AgentProcessor
                }
              }

              // Then try AgentProcessor directly
              if (window.AgentProcessor && typeof AgentProcessor.createAgentNode === 'function') {
                console.log('Attempting to create agent node directly via AgentProcessor');
                try {
                  const node = AgentProcessor.createAgentNode();

                  // Check if the node was created successfully
                  if (node) {
                    console.log('Created agent node directly:', node);

                    // Log success message with safe access to node.id
                    if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                      DebugManager.addLog(`Created agent node directly with ID: ${node.id || 'unknown'}`, 'success');
                    }

                    // Add the node to App.nodes if possible
                    if (window.App && Array.isArray(window.App.nodes)) {
                      window.App.nodes.push(node);

                      // Set as selected node
                      window.App.selectedNode = node;
                    }

                    // Force a redraw of the canvas
                    if (window.App && typeof App.draw === 'function') {
                      App.draw();
                    }
                  } else {
                    console.error('AgentProcessor.createAgentNode() returned undefined');
                    if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                      DebugManager.addLog('AgentProcessor.createAgentNode() returned undefined', 'error');
                    }
                  }
                } catch (error) {
                  console.error('Error creating agent node directly:', error);
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog(`Error creating agent node directly: ${error.message}`, 'error');
                  }
                }
              }
            }
          };

          // Start the retry process
          setTimeout(retryCreateAgentNode, retryInterval);
        }
      });

      // Insert the button after the Add Node button
      const addNodeBtn = document.getElementById('addNodeBtn');
      if (addNodeBtn && addNodeBtn.parentNode) {
        console.log('Inserting agent node button after Add Node button');
        addNodeBtn.parentNode.insertBefore(agentBtn, addNodeBtn.nextSibling);
      } else {
        console.log('Add Node button not found, appending agent node button to toolbar');
        toolbar.appendChild(agentBtn);
      }

      console.log('Agent node button added to toolbar');

      // Log success message to debug panel
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog('Agent Node button added to toolbar', 'success');
      }
    },

    // Add keyboard shortcuts
    addKeyboardShortcuts: function() {
      document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }

        // Add Agent Node: Shift + A
        if (e.key === 'A' && e.shiftKey) {
          e.preventDefault();

          // Function to create an agent node
          const createAgentNode = () => {
            // Try using AgentIntegration first if available
            if (window.AgentIntegration && typeof AgentIntegration.createAgentNode === 'function') {
              console.log('Creating agent node via AgentIntegration (keyboard shortcut)');
              try {
                const node = AgentIntegration.createAgentNode();
                console.log('Created agent node via AgentIntegration (keyboard shortcut):', node);

                // Check if the node was created successfully
                if (node) {
                  // Log success message
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog(`Created agent node with ID: ${node.id || 'unknown'} via keyboard shortcut`, 'success');
                  }

                  // Force a redraw of the canvas
                  if (window.App && typeof App.draw === 'function') {
                    App.draw();
                  }

                  return true;
                } else {
                  console.error('AgentIntegration.createAgentNode returned undefined (keyboard shortcut)');
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog('AgentIntegration.createAgentNode returned undefined (keyboard shortcut)', 'error');
                  }
                  // Fall through to try App.addNode
                }
              } catch (error) {
                console.error('Error creating agent node via AgentIntegration (keyboard shortcut):', error);
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Error creating agent node via AgentIntegration (keyboard shortcut): ${error.message}`, 'error');
                }
                // Fall through to try App.addNode
              }
            }

            // Fall back to App.addNode
            if (window.App && typeof App.addNode === 'function') {
              console.log('Creating agent node via keyboard shortcut');
              try {
                const node = App.addNode('agent');
                console.log('Created agent node via keyboard shortcut:', node);

                // Check if the node was created successfully
                if (node) {
                  // Log success message with safe access to node.id
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog(`Created agent node with ID: ${node.id || 'unknown'} via keyboard shortcut`, 'success');
                  }

                  // Force a redraw of the canvas
                  if (window.App && typeof App.draw === 'function') {
                    App.draw();
                  }

                  return true;
                } else {
                  console.error('App.addNode returned undefined for keyboard shortcut');
                  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                    DebugManager.addLog('App.addNode returned undefined for keyboard shortcut', 'error');
                  }
                  return false;
                }
              } catch (error) {
                console.error('Error creating agent node via keyboard shortcut:', error);
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Error creating agent node via keyboard shortcut: ${error.message}`, 'error');
                }
                return false;
              }
            } else {
              console.warn('App.addNode not available for keyboard shortcut, will retry');
              if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                DebugManager.addLog('App.addNode not available for keyboard shortcut, will retry', 'warning');
              }
              return false;
            }
          };

          // Try to create the agent node
          if (!createAgentNode()) {
            // If failed, set up a retry mechanism
            console.log('Setting up retry for agent node creation via keyboard shortcut');

            // Retry a few times with increasing delays
            let retryCount = 0;
            const maxRetries = 5;
            const retryInterval = 300; // ms

            const retryCreateAgentNode = () => {
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retry ${retryCount}/${maxRetries} for agent node creation via keyboard shortcut`);

                // Try to create the agent node again
                if (createAgentNode()) {
                  console.log('Agent node created successfully on retry via keyboard shortcut');
                } else {
                  // Schedule another retry with increasing delay
                  setTimeout(retryCreateAgentNode, retryInterval * retryCount);
                }
              } else {
                console.error('Failed to create agent node via keyboard shortcut after multiple retries');
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('Failed to create agent node via keyboard shortcut after multiple retries', 'error');
                }
              }
            };

            // Start the retry process
            setTimeout(retryCreateAgentNode, retryInterval);
          }
        }
      });
    },

    // Add global click handlers for agent node buttons
    addGlobalClickHandlers: function() {
      document.addEventListener('click', (e) => {
        // Check if we're in the agent node editor
        const isInAgentNodeEditor = document.getElementById('agentNodeEditor') &&
                                   document.getElementById('agentNodeEditor').style.display === 'block';

        // If we're in the agent node editor, we need to handle the buttons differently
        if (isInAgentNodeEditor) {
          // Check if the click is on one of our buttons
          const isAgentButton = e.target &&
            (e.target.id === 'viewAgentLogs' ||
             e.target.id === 'viewApiPayloads' ||
             e.target.parentElement.id === 'cancelAgentNode');

          // If it's one of our buttons, handle it directly
          if (isAgentButton) {
            e.preventDefault();
            e.stopPropagation();

            // Handle the button click based on the button ID
            const buttonId = e.target.id || (e.target.parentElement && e.target.parentElement.id);

            if (buttonId === 'viewAgentLogs') {
              this.showAgentLogs();
            } else if (buttonId === 'viewApiPayloads') {
              this.showApiPayloads();
            } else if (buttonId === 'cancelAgentNode') {
              this.cancelAgentNode();
            }
          }
        }
      });
    },

    // Show agent logs
    showAgentLogs: function() {
      console.log('View Agent Logs button clicked');

      try {
        // Make sure we have an editing node
        if (!window.AgentNodes.editingNode && window.App && App.selectedNode) {
          window.AgentNodes.editingNode = App.selectedNode;
        }

        // Check if we have a node to work with
        if (!window.AgentNodes.editingNode) {
          alert('Please select an agent node first.');
          return;
        }

        // Use AgentModals if available
        if (window.AgentModals && typeof AgentModals.updateAgentLogsDisplay === 'function') {
          // Update the logs display using AgentModals
          AgentModals.updateAgentLogsDisplay();
        } else if (window.AgentNodes && typeof AgentNodes.updateAgentLogsDisplay === 'function') {
          // Fallback to AgentNodes
          window.AgentNodes.updateAgentLogsDisplay();
        } else {
          console.warn('Neither AgentModals nor AgentNodes has updateAgentLogsDisplay method');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('Cannot update agent logs display - missing required methods', 'warning');
          }
        }

        // Show the modal
        const agentLogsModal = document.getElementById('agentLogsModal');
        if (agentLogsModal) {
          agentLogsModal.style.display = 'block';
        } else {
          console.error('Agent logs modal element not found in the DOM');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('Agent logs modal element not found in the DOM', 'error');
          }

          // Try to create the modal if it doesn't exist
          this.createAgentLogsModal();
        }
      } catch (error) {
        console.error('Error showing agent logs:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error showing agent logs: ${error.message}`, 'error');
        }
      }
    },

    // Create agent logs modal if it doesn't exist
    createAgentLogsModal: function() {
      if (document.getElementById('agentLogsModal')) return;

      console.log('Creating agent logs modal');

      // Create the modal container
      const modal = document.createElement('div');
      modal.id = 'agentLogsModal';
      modal.className = 'modal';
      modal.style.display = 'none';

      // Create the modal content
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Agent Logs</h2>
            <button id="closeAgentLogs" class="close-button">&times;</button>
          </div>
          <div class="modal-body">
            <div class="tab-container">
              <div class="tab-buttons">
                <button class="tab-button active" data-tab="activityLogTab">Activity Log</button>
                <button class="tab-button" data-tab="apiLogTab">API Log</button>
              </div>
              <div class="tab-content">
                <div id="activityLogTab" class="tab-pane active">
                  <pre id="activityLogContent">No activity logs available.</pre>
                </div>
                <div id="apiLogTab" class="tab-pane" style="display: none;">
                  <pre id="apiLogContent">No API logs available.</pre>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="clearLogs" class="button">Clear Logs</button>
            <button id="copyLogs" class="button">Copy Logs</button>
          </div>
        </div>
      `;

      // Add the modal to the document
      document.body.appendChild(modal);

      // Initialize the modal
      if (window.AgentModals && typeof AgentModals.initAgentLogsModal === 'function') {
        AgentModals.initAgentLogsModal();
      }

      console.log('Agent logs modal created');
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog('Agent logs modal created', 'success');
      }
    },

    // Show API payloads
    showApiPayloads: function() {
      console.log('View API Payloads button clicked');

      try {
        // Make sure we have an editing node
        if (!window.AgentNodes.editingNode && window.App && App.selectedNode) {
          window.AgentNodes.editingNode = App.selectedNode;
        }

        // Check if we have a node to work with
        if (!window.AgentNodes.editingNode) {
          alert('Please select an agent node first.');
          return;
        }

        // Use AgentModals if available
        if (window.AgentModals && typeof AgentModals.updatePayloadsDisplay === 'function') {
          // Update the payloads display using AgentModals
          AgentModals.updatePayloadsDisplay();
        } else if (window.AgentNodes && typeof AgentNodes.updatePayloadsDisplay === 'function') {
          // Fallback to AgentNodes
          window.AgentNodes.updatePayloadsDisplay();
        } else {
          console.warn('Neither AgentModals nor AgentNodes has updatePayloadsDisplay method');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('Cannot update API payloads display - missing required methods', 'warning');
          }
        }

        // Show the modal
        const apiPayloadsModal = document.getElementById('apiPayloadsModal');
        if (apiPayloadsModal) {
          apiPayloadsModal.style.display = 'block';
        } else {
          console.error('API payloads modal element not found in the DOM');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('API payloads modal element not found in the DOM', 'error');
          }

          // Try to create the modal if it doesn't exist
          this.createApiPayloadsModal();
        }
      } catch (error) {
        console.error('Error showing API payloads:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error showing API payloads: ${error.message}`, 'error');
        }
      }
    },

    // Create API payloads modal if it doesn't exist
    createApiPayloadsModal: function() {
      if (document.getElementById('apiPayloadsModal')) return;

      console.log('Creating API payloads modal');

      // Create the modal container
      const modal = document.createElement('div');
      modal.id = 'apiPayloadsModal';
      modal.className = 'modal';
      modal.style.display = 'none';

      // Create the modal content
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>API Payloads</h2>
            <button id="closeApiPayloads" class="close-button">&times;</button>
          </div>
          <div class="modal-body">
            <div class="tab-container">
              <div class="tab-buttons">
                <button class="tab-button active" data-tab="requestPayloadTab">Request</button>
                <button class="tab-button" data-tab="responsePayloadTab">Response</button>
              </div>
              <div class="tab-content">
                <div id="requestPayloadTab" class="tab-pane active">
                  <pre id="requestPayloadContent">No request payload available.</pre>
                </div>
                <div id="responsePayloadTab" class="tab-pane" style="display: none;">
                  <pre id="responsePayloadContent">No response payload available.</pre>
                </div>
              </div>
            </div>
            <div class="api-log-navigation">
              <button id="prevApiLog" class="button" disabled>&lt; Previous</button>
              <span id="apiLogCounter">No API logs available</span>
              <button id="nextApiLog" class="button" disabled>Next &gt;</button>
            </div>
          </div>
          <div class="modal-footer">
            <button id="copyPayload" class="button">Copy Payload</button>
          </div>
        </div>
      `;

      // Add the modal to the document
      document.body.appendChild(modal);

      // Initialize the modal
      if (window.AgentModals && typeof AgentModals.initApiPayloadsModal === 'function') {
        AgentModals.initApiPayloadsModal();
      }

      console.log('API payloads modal created');
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog('API payloads modal created', 'success');
      }
    },

    // Cancel agent node
    cancelAgentNode: function() {
      console.log('Cancel Agent Node button clicked');

      try {
        // Hide the agent node editor
        const agentNodeEditor = document.getElementById('agentNodeEditor');
        if (agentNodeEditor) {
          agentNodeEditor.style.display = 'none';
        }

        // Clear the editing node reference
        window.AgentNodes.editingNode = null;
      } catch (error) {
        console.error('Error canceling agent node:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error canceling agent node: ${error.message}`, 'error');
        }
      }
    }
  };

  // Export the AgentUI object to the global scope
  window.AgentUI = AgentUI;

  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentUI');
    AgentUI.init();
  });

  // Listen for app-available event
  document.addEventListener('app-available', function() {
    console.log('app-available event received by AgentUI');

    // Check if App is now available
    if (window.App && typeof window.App === 'object') {
      console.log('App object is now available in AgentUI');

      // Initialize or continue initialization
      if (!AgentUI.initialized) {
        console.log('Initializing AgentUI after App became available');
        AgentUI.init();
      } else {
        console.log('AgentUI already initialized, continuing initialization after App became available');
        AgentUI.completeInitialization();
      }
    }
  });
})();
