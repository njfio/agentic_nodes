/**
 * Agent Editor Module
 * Handles the agent node editor functionality
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  // Create the AgentEditor object
  const AgentEditor = {
    // Initialize the editor
    init: function() {
      console.log('Initializing AgentEditor');
      
      // Initialize the agent node editor
      this.initAgentNodeEditor();
      
      console.log('AgentEditor initialized');
    },
    
    // Initialize the agent node editor
    initAgentNodeEditor: function() {
      // Get the agent node editor elements
      const agentNodeEditor = document.getElementById('agentNodeEditor');
      const saveAgentNodeBtn = document.getElementById('saveAgentNode');
      const cancelAgentNodeBtn = document.getElementById('cancelAgentNode');
      const agentTypeSelect = document.getElementById('agentType');
      const customCodeSection = document.getElementById('customCodeSection');
      const viewAgentLogsBtn = document.getElementById('viewAgentLogs');
      const viewApiPayloadsBtn = document.getElementById('viewApiPayloads');
      const captureApiPayloadsBtn = document.getElementById('captureApiPayloads');
      
      // Agent type select
      if (agentTypeSelect) {
        agentTypeSelect.addEventListener('change', () => {
          if (customCodeSection) {
            customCodeSection.style.display = agentTypeSelect.value === 'custom' ? 'block' : 'none';
          }
        });
      }
      
      // Save button
      if (saveAgentNodeBtn) {
        saveAgentNodeBtn.addEventListener('click', () => {
          this.saveAgentNodeEditor();
        });
      }
      
      // Cancel button
      if (cancelAgentNodeBtn) {
        cancelAgentNodeBtn.addEventListener('click', () => {
          if (agentNodeEditor) {
            agentNodeEditor.style.display = 'none';
          }
        });
      }
      
      // View agent logs button
      if (viewAgentLogsBtn) {
        viewAgentLogsBtn.addEventListener('click', () => {
          if (window.AgentNodes && typeof window.AgentNodes.openAgentLogsModal === 'function') {
            window.AgentNodes.openAgentLogsModal();
          } else {
            console.error('openAgentLogsModal method not found in AgentNodes');
          }
        });
      }
      
      // View API payloads button
      if (viewApiPayloadsBtn) {
        viewApiPayloadsBtn.addEventListener('click', () => {
          if (window.AgentNodes && typeof window.AgentNodes.openPayloadsModal === 'function') {
            window.AgentNodes.openPayloadsModal();
          } else {
            console.error('openPayloadsModal method not found in AgentNodes');
          }
        });
      }
      
      // Capture API payloads button
      if (captureApiPayloadsBtn) {
        captureApiPayloadsBtn.addEventListener('click', () => {
          if (window.AgentNodes && window.AgentNodes.editingNode) {
            // Generate test API logs
            this.generateTestApiLogs(window.AgentNodes.editingNode);
          }
        });
      }
    },
    
    // Open the agent node editor
    openAgentNodeEditor: function(node) {
      console.log(`Opening agent node editor for node ${node.id}`);
      
      // Set the editing node
      window.AgentNodes.editingNode = node;
      
      // Get the agent node editor modal
      const agentNodeEditor = document.getElementById('agentNodeEditor');
      if (!agentNodeEditor) {
        console.error('Agent node editor modal not found');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Agent node editor modal not found, falling back to regular editor', 'error');
        }
        
        // Fall back to the regular node editor
        if (window.App && typeof window.App.openNodeEditor === 'function') {
          window.App.openNodeEditor(node);
        }
        return;
      }
      
      // Set the values in the form
      const titleInput = document.getElementById('agentNodeTitle');
      if (titleInput) {
        titleInput.value = node.title || '';
      }
      
      const systemPromptInput = document.getElementById('agentSystemPrompt');
      if (systemPromptInput) {
        systemPromptInput.value = node.systemPrompt || '';
      }
      
      const maxIterationsInput = document.getElementById('maxIterations');
      if (maxIterationsInput) {
        maxIterationsInput.value = node.maxIterations || 5;
      }
      
      const autoIterateCheckbox = document.getElementById('autoIterate');
      if (autoIterateCheckbox) {
        autoIterateCheckbox.checked = node.autoIterate !== false;
      }
      
      // Set agent type
      const agentTypeSelect = document.getElementById('agentType');
      if (agentTypeSelect) {
        agentTypeSelect.value = node.agentType || 'default';
        
        // Show/hide custom code section
        const customCodeSection = document.getElementById('customCodeSection');
        if (customCodeSection) {
          customCodeSection.style.display = agentTypeSelect.value === 'custom' ? 'block' : 'none';
        }
      }
      
      // Set custom code
      const customCodeInput = document.getElementById('customCode');
      if (customCodeInput) {
        customCodeInput.value = node.customCode || '';
      }
      
      // Set MCP tools settings
      const useMCPToolsInput = document.getElementById('useMCPTools');
      if (useMCPToolsInput) {
        useMCPToolsInput.checked = node.useMCPTools !== false;
      }
      
      // Update MCP tools list
      if (window.AgentNodes && typeof window.AgentNodes.updateMCPToolsList === 'function') {
        window.AgentNodes.updateMCPToolsList();
      }
      
      // Set reflection settings
      const enableReflectionInput = document.getElementById('enableReflection');
      if (enableReflectionInput) {
        enableReflectionInput.checked = node.enableReflection !== false;
      }
      
      const reflectionFrequencySelect = document.getElementById('reflectionFrequency');
      if (reflectionFrequencySelect) {
        reflectionFrequencySelect.value = node.reflectionFrequency || 2;
      }
      
      const reflectionPromptInput = document.getElementById('reflectionPrompt');
      if (reflectionPromptInput) {
        reflectionPromptInput.value = node.reflectionPrompt || 'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?';
      }
      
      // Set workflow integration settings
      const canBeWorkflowNodeCheckbox = document.getElementById('canBeWorkflowNode');
      if (canBeWorkflowNodeCheckbox) {
        canBeWorkflowNodeCheckbox.checked = node.canBeWorkflowNode !== false;
      }
      
      // Set node role
      const nodeRoleRadios = document.getElementsByName('agentNodeRole');
      if (nodeRoleRadios) {
        const role = node.workflowRole || 'none';
        for (let i = 0; i < nodeRoleRadios.length; i++) {
          if (nodeRoleRadios[i].value === role) {
            nodeRoleRadios[i].checked = true;
            break;
          }
        }
      }
      
      // Show the modal
      agentNodeEditor.style.display = 'block';
      
      // Use ModalManager if available
      if (window.ModalManager && typeof ModalManager.openModal === 'function') {
        ModalManager.openModal('agentNodeEditor');
      }
      
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Editing agent node ${node.id}`, 'info');
      }
    },
    
    // Save the agent node editor
    saveAgentNodeEditor: function() {
      try {
        // Store a reference to the node being edited
        const node = window.AgentNodes.editingNode;
        if (!node) {
          console.error('No node being edited');
          return;
        }
        
        // Get values from the form
        const titleInput = document.getElementById('agentNodeTitle');
        if (titleInput) {
          node.title = titleInput.value || `Agent Node ${node.id}`;
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Set node title to: ${node.title}`, 'info');
          }
        }
        
        const systemPromptInput = document.getElementById('agentSystemPrompt');
        if (systemPromptInput) {
          node.systemPrompt = systemPromptInput.value;
        }
        
        const maxIterationsInput = document.getElementById('maxIterations');
        if (maxIterationsInput) {
          node.maxIterations = parseInt(maxIterationsInput.value, 10) || 5;
        }
        
        const autoIterateCheckbox = document.getElementById('autoIterate');
        if (autoIterateCheckbox) {
          node.autoIterate = autoIterateCheckbox.checked;
        }
        
        // Get agent type
        const agentTypeSelect = document.getElementById('agentType');
        if (agentTypeSelect) {
          node.agentType = agentTypeSelect.value;
        }
        
        // Get custom code
        const customCodeInput = document.getElementById('customCode');
        if (customCodeInput) {
          node.customCode = customCodeInput.value;
        }
        
        // Get MCP tools settings
        const useMCPToolsCheckbox = document.getElementById('useMCPTools');
        if (useMCPToolsCheckbox) {
          node.useMCPTools = useMCPToolsCheckbox.checked;
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`MCP tools ${node.useMCPTools ? 'enabled' : 'disabled'}`, 'info');
          }
        }
        
        // Get reflection settings
        const enableReflectionCheckbox = document.getElementById('enableReflection');
        if (enableReflectionCheckbox) {
          node.enableReflection = enableReflectionCheckbox.checked;
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Reflection ${node.enableReflection ? 'enabled' : 'disabled'}`, 'info');
          }
        }
        
        const reflectionFrequencySelect = document.getElementById('reflectionFrequency');
        if (reflectionFrequencySelect) {
          node.reflectionFrequency = parseInt(reflectionFrequencySelect.value, 10) || 2;
        }
        
        const reflectionPromptInput = document.getElementById('reflectionPrompt');
        if (reflectionPromptInput) {
          node.reflectionPrompt = reflectionPromptInput.value;
        }
        
        // Get workflow integration settings
        const canBeWorkflowNodeCheckbox = document.getElementById('canBeWorkflowNode');
        if (canBeWorkflowNodeCheckbox) {
          node.canBeWorkflowNode = canBeWorkflowNodeCheckbox.checked;
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Can be workflow node: ${node.canBeWorkflowNode ? 'yes' : 'no'}`, 'info');
          }
        }
        
        // Get node role
        const nodeRoleRadios = document.getElementsByName('agentNodeRole');
        if (nodeRoleRadios) {
          for (let i = 0; i < nodeRoleRadios.length; i++) {
            if (nodeRoleRadios[i].checked) {
              node.workflowRole = nodeRoleRadios[i].value;
              break;
            }
          }
        }
        
        // Hide the modal
        const agentNodeEditor = document.getElementById('agentNodeEditor');
        if (agentNodeEditor) {
          agentNodeEditor.style.display = 'none';
        }
        
        // Use ModalManager if available
        if (window.ModalManager && typeof ModalManager.closeModal === 'function') {
          ModalManager.closeModal('agentNodeEditor');
        }
        
        // Force a redraw of the canvas
        if (window.App && typeof window.App.draw === 'function') {
          window.App.draw();
        }
        
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Agent node ${node.id} updated`, 'success');
        }
      } catch (error) {
        console.error('Error saving agent node editor:', error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error saving agent node editor: ${error.message}`, 'error');
        }
      }
    },
    
    // Generate test API logs
    generateTestApiLogs: function(node) {
      if (!node) return;
      
      // Create a test request payload
      const testRequest = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: node.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, can you help me with a task?' }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'search',
              description: 'Search the web for information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query'
                  }
                },
                required: ['query']
              }
            }
          }
        ]
      };
      
      // Create a test response payload
      const testResponse = {
        id: 'chatcmpl-' + Math.random().toString(36).substring(2, 10),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I\'d be happy to help you with your task! What specifically do you need assistance with?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 15,
          total_tokens: 40
        }
      };
      
      // Initialize the API logs array if it doesn't exist
      if (!node.apiLogs) {
        node.apiLogs = [];
      }
      
      // Add the test log
      node.apiLogs.push({
        timestamp: new Date().toISOString(),
        request: testRequest,
        response: testResponse
      });
      
      // Store the last request and response payloads
      node.lastRequestPayload = testRequest;
      node.lastResponsePayload = testResponse;
      node.lastRequestTime = new Date().toISOString();
      node.lastResponseTime = new Date().toISOString();
      
      if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
        DebugManager.addLog(`Generated test API log for node ${node.id}`, 'success');
      }
      
      // Open the API payloads modal
      if (window.AgentNodes && typeof window.AgentNodes.openPayloadsModal === 'function') {
        window.AgentNodes.openPayloadsModal();
      }
    }
  };
  
  // Export the AgentEditor object to the global scope
  window.AgentEditor = AgentEditor;
  
  // Add the openAgentNodeEditor method to the global AgentNodes object
  if (window.AgentNodes) {
    window.AgentNodes.openAgentNodeEditor = AgentEditor.openAgentNodeEditor.bind(AgentEditor);
    console.log('Added openAgentNodeEditor method to AgentNodes');
  }
  
  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentEditor');
    AgentEditor.init();
  });
})();
