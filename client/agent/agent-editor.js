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

      // Check if the agent node editor modal exists in the DOM
      const agentNodeEditor = document.getElementById('agentNodeEditor');
      if (agentNodeEditor) {
        console.log('Agent node editor modal found during initialization');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Agent node editor modal found during initialization', 'info');
        }
      } else {
        console.warn('Agent node editor modal not found during initialization');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Agent node editor modal not found during initialization', 'warning');
        }
      }

      // Initialize the agent node editor
      this.initAgentNodeEditor();

      console.log('AgentEditor initialized');
    },

    // Initialize the agent node editor
    initAgentNodeEditor: function() {
      console.log('AgentEditor.initAgentNodeEditor called');

      // Get the agent node editor elements
      const agentNodeEditor = document.getElementById('agentNodeEditor');
      if (!agentNodeEditor) {
        console.error('Agent node editor modal not found in the DOM');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Agent node editor modal not found in the DOM', 'error');
        }
        return;
      }

      console.log('Agent node editor modal found in the DOM');

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
          console.log('Cancel agent node button clicked');

          if (agentNodeEditor) {
            // Hide the modal
            agentNodeEditor.style.display = 'none';
            console.log('Set agentNodeEditor.style.display to none');

            // Remove the active class
            agentNodeEditor.classList.remove('active');
            console.log('Removed active class from agentNodeEditor');

            // Remove any inline styles
            agentNodeEditor.removeAttribute('style');
            console.log('Removed inline styles from agentNodeEditor');

            // Use ModalManager if available
            if (window.ModalManager && typeof ModalManager.closeModal === 'function') {
              console.log('Using ModalManager.closeModal to close agentNodeEditor');
              ModalManager.closeModal('agentNodeEditor');
            } else {
              console.warn('ModalManager not available or closeModal method missing');
            }
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

      // Set the editing node in both places to ensure consistency
      window.AgentNodes.editingNode = node;
      if (window.App) {
        App.editingNode = node;
        App.selectedNode = node;
      }

      // Get the agent node editor modal
      const agentNodeEditor = document.getElementById('agentNodeEditor');
      if (!agentNodeEditor) {
        console.error('Agent node editor modal not found');
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Agent node editor modal not found, falling back to regular editor', 'error');
        }

        // Fall back to the regular node editor
        if (window.App && typeof window.App.openNodeEditor === 'function') {
          const originalOpenNodeEditor = window.App.openNodeEditor;
          window.App.openNodeEditor(node);
        }
        return;
      }

      // Ensure the node has the agent type set
      if (node.nodeType !== 'agent' && node._nodeType !== 'agent' && !node.isAgentNode) {
        node.nodeType = 'agent';
        node._nodeType = 'agent';
        Object.defineProperty(node, 'isAgentNode', {
          value: true,
          writable: false,
          enumerable: true,
          configurable: false
        });
        console.log(`Set node ${node.id} type to agent`);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Set node ${node.id} type to agent`, 'info');
        }
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

      // Set reasoning settings
      const enableReasoningInput = document.getElementById('enableReasoning');
      if (enableReasoningInput) {
        enableReasoningInput.checked = node.enableReasoning !== false;

        // Update the visibility of the reasoning section
        const reasoningSection = document.getElementById('reasoningSection');
        if (reasoningSection) {
          reasoningSection.style.display = enableReasoningInput.checked ? 'block' : 'none';
        }
      }

      const reasoningStyleSelect = document.getElementById('reasoningStyle');
      if (reasoningStyleSelect) {
        reasoningStyleSelect.value = node.reasoningStyle || 'cot';
      }

      const reasoningDepthSelect = document.getElementById('reasoningDepth');
      if (reasoningDepthSelect) {
        reasoningDepthSelect.value = node.reasoningDepth || '3';
      }

      const showReasoningInput = document.getElementById('showReasoning');
      if (showReasoningInput) {
        showReasoningInput.checked = node.showReasoning !== false;
      }

      // Set reflection settings
      const enableReflectionInput = document.getElementById('enableReflection');
      if (enableReflectionInput) {
        enableReflectionInput.checked = node.enableReflection !== false;

        // Update the visibility of the reflection section
        const reflectionSection = document.getElementById('reflectionSection');
        if (reflectionSection) {
          reflectionSection.style.display = enableReflectionInput.checked ? 'block' : 'none';
        }
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
      console.log('Set agentNodeEditor.style.display to block');

      // Add a class to make it visible
      agentNodeEditor.classList.add('active');
      console.log('Added active class to agentNodeEditor');

      // Use ModalManager if available
      if (window.ModalManager && typeof ModalManager.openModal === 'function') {
        console.log('Using ModalManager.openModal to open agentNodeEditor');
        ModalManager.openModal('agentNodeEditor');
      } else {
        console.warn('ModalManager not available or openModal method missing');
      }

      // Force the modal to be visible with !important style
      agentNodeEditor.setAttribute('style', 'display: block !important; z-index: 1000 !important;');
      console.log('Set !important style on agentNodeEditor');

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

        // Get reasoning settings
        const enableReasoningCheckbox = document.getElementById('enableReasoning');
        if (enableReasoningCheckbox) {
          node.enableReasoning = enableReasoningCheckbox.checked;
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Reasoning ${node.enableReasoning ? 'enabled' : 'disabled'}`, 'info');
          }
        }

        const reasoningStyleSelect = document.getElementById('reasoningStyle');
        if (reasoningStyleSelect) {
          node.reasoningStyle = reasoningStyleSelect.value;
          if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
            DebugManager.addLog(`Reasoning style set to: ${node.reasoningStyle}`, 'info');
          }
        }

        const reasoningDepthSelect = document.getElementById('reasoningDepth');
        if (reasoningDepthSelect) {
          node.reasoningDepth = reasoningDepthSelect.value;
        }

        const showReasoningCheckbox = document.getElementById('showReasoning');
        if (showReasoningCheckbox) {
          node.showReasoning = showReasoningCheckbox.checked;
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
              const newRole = nodeRoleRadios[i].value;

              // Use the WorkflowIO object to set the role if available
              if (window.WorkflowIO && typeof WorkflowIO.setNodeRole === 'function') {
                WorkflowIO.setNodeRole(node, newRole);
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Set node ${node.id} role to: ${newRole} using WorkflowIO`, 'info');
                }
              } else {
                // Fallback if WorkflowIO is not available
                node.workflowRole = newRole;
                node._workflowRole = newRole; // Set both properties to ensure compatibility
                if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
                  DebugManager.addLog(`Set node ${node.id} role to: ${newRole} (fallback method)`, 'warning');
                }
              }
              break;
            }
          }
        }

        // Hide the modal
        const agentNodeEditor = document.getElementById('agentNodeEditor');
        if (agentNodeEditor) {
          agentNodeEditor.style.display = 'none';
          console.log('Set agentNodeEditor.style.display to none');

          // Remove the active class
          agentNodeEditor.classList.remove('active');
          console.log('Removed active class from agentNodeEditor');

          // Remove any inline styles
          agentNodeEditor.removeAttribute('style');
          console.log('Removed inline styles from agentNodeEditor');
        }

        // Use ModalManager if available
        if (window.ModalManager && typeof ModalManager.closeModal === 'function') {
          console.log('Using ModalManager.closeModal to close agentNodeEditor');
          ModalManager.closeModal('agentNodeEditor');
        } else {
          console.warn('ModalManager not available or closeModal method missing');
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
  function addMethodToAgentNodes() {
    if (window.AgentNodes) {
      // Check if the method already exists to avoid overriding it
      if (typeof window.AgentNodes.openAgentNodeEditor !== 'function') {
        window.AgentNodes.openAgentNodeEditor = AgentEditor.openAgentNodeEditor.bind(AgentEditor);
        console.log('Added openAgentNodeEditor method to AgentNodes');

        // Log to debug panel if available
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Added openAgentNodeEditor method to AgentNodes', 'success');
        }
      } else {
        // If the method already exists, replace it to ensure we're using the correct implementation
        const originalMethod = window.AgentNodes.openAgentNodeEditor;
        window.AgentNodes.openAgentNodeEditor = function(node) {
          console.log('Using agent-editor.js implementation of openAgentNodeEditor');
          return AgentEditor.openAgentNodeEditor.call(AgentEditor, node);
        };
        console.log('Replaced existing openAgentNodeEditor method with AgentEditor implementation');

        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog('Replaced existing openAgentNodeEditor method with AgentEditor implementation', 'info');
        }
      }
    } else {
      console.warn('AgentNodes object not available, will retry in 500ms');
      setTimeout(addMethodToAgentNodes, 500);
    }
  }

  // Try to add the method immediately
  addMethodToAgentNodes();

  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing AgentEditor');
    AgentEditor.init();

    // Add the method to AgentNodes again to ensure it's available
    addMethodToAgentNodes();

    // Also add a handler for app initialization complete
    document.addEventListener('app-initialization-complete', function() {
      console.log('App initialization complete event received by AgentEditor');

      // Add the method to AgentNodes one more time to be absolutely sure
      addMethodToAgentNodes();

      // Force initialization of the agent node editor
      if (typeof AgentNodes.initAgentNodeEditor === 'function') {
        console.log('Initializing agent node editor after app initialization');
        AgentNodes.initAgentNodeEditor();
      }
    });
  });
})();
