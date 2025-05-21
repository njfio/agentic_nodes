/**
 * Agent Modals Module
 * Handles modal dialogs for agent nodes
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Create the AgentModals object
  const AgentModals = {
    // Initialize the modals
    init: function() {
      console.log('Initializing AgentModals');
      
      // Initialize the agent logs modal
      this.initAgentLogsModal();
      
      // Initialize the API payloads modal
      this.initApiPayloadsModal();
      
      console.log('AgentModals initialized');
    },
    
    // Initialize the agent logs modal
    initAgentLogsModal: function() {
      // Get the agent logs modal elements
      const agentLogsModal = document.getElementById('agentLogsModal');
      const closeAgentLogsBtn = document.getElementById('closeAgentLogs');
      const clearLogsBtn = document.getElementById('clearLogs');
      const copyLogsBtn = document.getElementById('copyLogs');
      const tabButtons = document.querySelectorAll('#agentLogsModal .tab-button');
      
      // Add event listeners for tab buttons
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Remove active class from all tab buttons
          tabButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Hide all tab panes
          document.querySelectorAll('#agentLogsModal .tab-pane').forEach(pane => {
            pane.style.display = 'none';
            pane.classList.remove('active');
          });
          
          // Show the selected tab pane
          const tabId = button.getAttribute('data-tab');
          const tabPane = document.getElementById(tabId);
          if (tabPane) {
            tabPane.style.display = 'block';
            tabPane.classList.add('active');
          }
        });
      });
      
      // Close button
      if (closeAgentLogsBtn) {
        closeAgentLogsBtn.addEventListener('click', () => {
          if (agentLogsModal) {
            agentLogsModal.style.display = 'none';
            // Note: We're not clearing the editingNode reference here
            // This allows the user to view API payloads after closing the logs modal
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog('Agent logs modal closed, editingNode reference preserved', 'info');
            }
          }
        });
      }
      
      // Clear logs button
      if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
          if (window.AgentNodes && window.AgentNodes.editingNode) {
            // Clear the logs
            if (window.AgentLogger && typeof AgentLogger.clearLogs === 'function') {
              AgentLogger.clearLogs(window.AgentNodes.editingNode);
              AgentLogger.clearApiLogs(window.AgentNodes.editingNode);
            }
            
            // Update the log display
            this.updateAgentLogsDisplay();
            
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog('Agent logs cleared', 'success');
            }
          }
        });
      }
      
      // Copy logs button
      if (copyLogsBtn) {
        copyLogsBtn.addEventListener('click', () => {
          // Get the active tab
          const activeTab = document.querySelector('#agentLogsModal .tab-pane.active');
          if (activeTab) {
            // Get the log content
            const logContent = activeTab.querySelector('pre').textContent;
            
            // Copy to clipboard
            navigator.clipboard.writeText(logContent)
              .then(() => {
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('Logs copied to clipboard', 'success');
                }
              })
              .catch(err => {
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Failed to copy logs: ${err}`, 'error');
                }
              });
          }
        });
      }
    },
    
    // Initialize the API payloads modal
    initApiPayloadsModal: function() {
      // Get the API payloads modal elements
      const apiPayloadsModal = document.getElementById('apiPayloadsModal');
      const closeApiPayloadsBtn = document.getElementById('closeApiPayloads');
      const copyPayloadBtn = document.getElementById('copyPayload');
      const tabButtons = document.querySelectorAll('#apiPayloadsModal .tab-button');
      
      // Add event listeners for tab buttons
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Remove active class from all tab buttons
          tabButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Hide all tab panes
          document.querySelectorAll('#apiPayloadsModal .tab-pane').forEach(pane => {
            pane.style.display = 'none';
            pane.classList.remove('active');
          });
          
          // Show the selected tab pane
          const tabId = button.getAttribute('data-tab');
          const tabPane = document.getElementById(tabId);
          if (tabPane) {
            tabPane.style.display = 'block';
            tabPane.classList.add('active');
          }
        });
      });
      
      // Close button
      if (closeApiPayloadsBtn) {
        closeApiPayloadsBtn.addEventListener('click', () => {
          if (apiPayloadsModal) {
            apiPayloadsModal.style.display = 'none';
            // Don't clear the editing node reference when the modal is closed
            // This allows the user to continue editing the node after viewing payloads
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog('API payloads modal closed, editingNode reference preserved', 'info');
            }
          }
        });
      }
      
      // Copy payload button
      if (copyPayloadBtn) {
        copyPayloadBtn.addEventListener('click', () => {
          // Get the active tab
          const activeTab = document.querySelector('#apiPayloadsModal .tab-pane.active');
          if (activeTab) {
            // Get the payload content
            const payloadContent = activeTab.querySelector('pre').textContent;
            
            // Copy to clipboard
            navigator.clipboard.writeText(payloadContent)
              .then(() => {
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog('Payload copied to clipboard', 'success');
                }
              })
              .catch(err => {
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Failed to copy payload: ${err}`, 'error');
                }
              });
          }
        });
      }
    },
    
    // Update the agent logs display
    updateAgentLogsDisplay: function() {
      if (!window.AgentNodes || !window.AgentNodes.editingNode) return;
      
      // Get the log content elements
      const activityLogContent = document.getElementById('activityLogContent');
      const apiLogContent = document.getElementById('apiLogContent');
      
      if (activityLogContent) {
        // Get the formatted logs
        const formattedLogs = window.AgentLogger && typeof AgentLogger.getFormattedLogs === 'function'
          ? AgentLogger.getFormattedLogs(window.AgentNodes.editingNode)
          : 'AgentLogger not available';
        
        // Update the activity log content
        activityLogContent.textContent = formattedLogs || 'No activity logs available.';
      }
      
      if (apiLogContent) {
        // Get the formatted API logs
        const formattedApiLogs = window.AgentLogger && typeof AgentLogger.getFormattedApiLogs === 'function'
          ? AgentLogger.getFormattedApiLogs(window.AgentNodes.editingNode)
          : 'AgentLogger not available';
        
        // Update the API log content
        apiLogContent.textContent = formattedApiLogs || 'No API logs available.';
      }
    },
    
    // Update the API payloads display
    updatePayloadsDisplay: function() {
      // Check if we have an editing node
      if (!window.AgentNodes || !window.AgentNodes.editingNode) {
        console.warn('No editing node available for updatePayloadsDisplay');
        return;
      }
      
      const editingNode = window.AgentNodes.editingNode;
      
      // Get the payload content elements
      const requestPayloadContent = document.getElementById('requestPayloadContent');
      const responsePayloadContent = document.getElementById('responsePayloadContent');
      const apiLogCounter = document.getElementById('apiLogCounter');
      const prevApiLogBtn = document.getElementById('prevApiLog');
      const nextApiLogBtn = document.getElementById('nextApiLog');
      
      // Check if we have API logs
      if (editingNode.apiLogs && editingNode.apiLogs.length > 0) {
        // Initialize the current API log index if not set
        if (typeof this.currentApiLogIndex === 'undefined' || this.currentApiLogIndex < 0) {
          this.currentApiLogIndex = 0;
        }
        
        // Make sure the index is within bounds
        if (this.currentApiLogIndex >= editingNode.apiLogs.length) {
          this.currentApiLogIndex = editingNode.apiLogs.length - 1;
        }
        
        // Get the current API log
        const currentLog = editingNode.apiLogs[this.currentApiLogIndex];
        
        // Update the API log counter
        if (apiLogCounter) {
          apiLogCounter.textContent = `Log ${this.currentApiLogIndex + 1} of ${editingNode.apiLogs.length}`;
        }
        
        // Update the previous and next buttons
        if (prevApiLogBtn) {
          prevApiLogBtn.disabled = this.currentApiLogIndex <= 0;
        }
        
        if (nextApiLogBtn) {
          nextApiLogBtn.disabled = this.currentApiLogIndex >= editingNode.apiLogs.length - 1;
        }
        
        // Format the request payload
        if (requestPayloadContent) {
          requestPayloadContent.style.whiteSpace = 'pre-wrap';
          
          if (currentLog.request && Object.keys(currentLog.request).length > 0) {
            requestPayloadContent.textContent = JSON.stringify(currentLog.request, null, 2);
          } else if (editingNode.lastRequestPayload && Object.keys(editingNode.lastRequestPayload).length > 0) {
            requestPayloadContent.textContent = JSON.stringify(editingNode.lastRequestPayload, null, 2);
          } else {
            requestPayloadContent.textContent = 'No request payload available.';
          }
        }
        
        // Format the response payload
        if (responsePayloadContent) {
          responsePayloadContent.style.whiteSpace = 'pre-wrap';
          
          if (currentLog.response && Object.keys(currentLog.response).length > 0) {
            responsePayloadContent.textContent = JSON.stringify(currentLog.response, null, 2);
          } else if (editingNode.lastResponsePayload && Object.keys(editingNode.lastResponsePayload).length > 0) {
            responsePayloadContent.textContent = JSON.stringify(editingNode.lastResponsePayload, null, 2);
          } else {
            responsePayloadContent.textContent = 'No response payload available.';
          }
        }
      } else {
        // No API logs available
        // Update the API log counter
        if (apiLogCounter) {
          apiLogCounter.textContent = 'No API logs available';
        }
        
        // Disable the previous and next buttons
        if (prevApiLogBtn) {
          prevApiLogBtn.disabled = true;
        }
        
        if (nextApiLogBtn) {
          nextApiLogBtn.disabled = true;
        }
        
        // Format the request payload
        if (requestPayloadContent) {
          requestPayloadContent.style.whiteSpace = 'pre-wrap';
          requestPayloadContent.textContent = "No API logs available. Process the agent node to generate real API logs.";
        }
        
        // Format the response payload
        if (responsePayloadContent) {
          responsePayloadContent.style.whiteSpace = 'pre-wrap';
          responsePayloadContent.textContent = "No API logs available. Process the agent node to generate real API logs.";
        }
      }
    }
  };
  
  // Export the AgentModals object to the global scope
  window.AgentModals = AgentModals;
  
  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentModals');
    AgentModals.init();
  });
})();
