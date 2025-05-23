// Fix agent iterations to show in UI
console.log('🔧 Fixing agent iterations UI...');

// Override the intercept processing to show iterations
setTimeout(() => {
  // Find all intercepted nodes
  if (window.App && window.App.nodes) {
    window.App.nodes.forEach(node => {
      if (node._originalProcessIntercepted) {
        const prevProcess = node.process;
        
        // Store iteration history
        node.iterationHistory = [];
        
        node.process = async function(input) {
          // Clear iteration history for new processing
          this.iterationHistory = [];
          
          // Call the previous process function
          const result = await prevProcess.call(this, input);
          
          // Combine all iterations into the final content
          if (this.iterationHistory.length > 1) {
            console.log(`📝 Combining ${this.iterationHistory.length} iterations for display`);
            
            // Format the iterations for display
            let combinedContent = '';
            this.iterationHistory.forEach((iteration, index) => {
              if (iteration.type === 'tool_call') {
                combinedContent += `**🔧 Tool Call ${index + 1}: ${iteration.tool}**\n`;
                combinedContent += `Parameters: ${JSON.stringify(iteration.params)}\n`;
                combinedContent += `Result: ${iteration.result}\n\n`;
              } else if (iteration.type === 'response') {
                combinedContent += `**💭 Agent Response ${index + 1}:**\n`;
                combinedContent += `${iteration.content}\n\n`;
              }
            });
            
            // Add final response
            combinedContent += `**📋 Final Answer:**\n${result}`;
            
            // Update node content to show all iterations
            this.content = combinedContent;
          }
          
          return result;
        };
      }
    });
  }
  
  // Also intercept the tool execution to capture iterations
  if (window.AgentTools && window.AgentTools.executeTool) {
    const originalExecuteTool = window.AgentTools.executeTool;
    
    window.AgentTools.executeTool = async function(toolId, params, node) {
      const result = await originalExecuteTool.call(this, toolId, params, node);
      
      // Store tool call in iteration history
      if (node && !node.iterationHistory) {
        node.iterationHistory = [];
      }
      
      if (node) {
        node.iterationHistory.push({
          type: 'tool_call',
          tool: toolId,
          params: params,
          result: typeof result === 'string' ? result.substring(0, 200) + '...' : result
        });
      }
      
      return result;
    };
  }
  
  // Intercept message additions to capture agent responses
  const originalAddMessage = (messages, newMessage) => {
    messages.push(newMessage);
    
    // Try to find the current node being processed
    if (window.App && window.App.nodes) {
      const processingNode = window.App.nodes.find(n => n.processing);
      if (processingNode && newMessage.role === 'assistant') {
        if (!processingNode.iterationHistory) {
          processingNode.iterationHistory = [];
        }
        
        processingNode.iterationHistory.push({
          type: 'response',
          content: newMessage.content || newMessage.function_call || 'Tool call response'
        });
      }
    }
  };
  
  // Override the console.log to capture iteration info
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    // Capture iteration messages
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('🛠️ AI requested') || args[0].includes('📤 Sending follow-up')) {
        // Find processing node
        if (window.App && window.App.nodes) {
          const processingNode = window.App.nodes.find(n => n.processing);
          if (processingNode) {
            if (!processingNode.iterationHistory) {
              processingNode.iterationHistory = [];
            }
            
            // Log iteration info
            console.info(`📝 Captured iteration info for node ${processingNode.id}`);
          }
        }
      }
    }
    
    return originalConsoleLog.apply(console, args);
  };
  
  console.log('✅ Agent iterations UI fix installed');
}, 1000);