/**
 * Agent UI Module
 * Handles UI-related functionality for agent nodes
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Create the AgentUI object
  const AgentUI = {
    // Initialize the UI
    init: function() {
      console.log('Initializing AgentUI');
      
      // Add event listeners
      this.addEventListeners();
      
      // Initialize modals
      this.initAgentLogsModal();
      this.initApiPayloadsModal();
      
      console.log('AgentUI initialized');
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
        
        // Call App.addNode with 'agent' type
        if (window.App && typeof App.addNode === 'function') {
          console.log('Calling App.addNode with agent type');
          try {
            const node = App.addNode('agent');
            console.log('Created agent node:', node);
            
            // Log success message
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Created agent node with ID: ${node.id}`, 'success');
            }
            
            // Force a redraw of the canvas
            if (window.App && typeof App.draw === 'function') {
              App.draw();
            }
          } catch (error) {
            console.error('Error creating agent node:', error);
            if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
              DebugManager.addLog(`Error creating agent node: ${error.message}`, 'error');
            }
          }
        } else {
          console.error('App.addNode not available');
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog('App.addNode not available, cannot create agent node', 'error');
          }
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
          if (window.App && typeof App.addNode === 'function') {
            App.addNode('agent');
          }
          e.preventDefault();
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
        
        // Update the logs display
        window.AgentNodes.updateAgentLogsDisplay();
        
        // Show the modal
        const agentLogsModal = document.getElementById('agentLogsModal');
        if (agentLogsModal) {
          agentLogsModal.style.display = 'block';
        }
      } catch (error) {
        console.error('Error showing agent logs:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error showing agent logs: ${error.message}`, 'error');
        }
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
        
        // Update the payloads display
        window.AgentNodes.updatePayloadsDisplay();
        
        // Show the modal
        const apiPayloadsModal = document.getElementById('apiPayloadsModal');
        if (apiPayloadsModal) {
          apiPayloadsModal.style.display = 'block';
        }
      } catch (error) {
        console.error('Error showing API payloads:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error showing API payloads: ${error.message}`, 'error');
        }
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
})();
