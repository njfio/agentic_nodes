// Capture and display the full agent processing history
(function() {
    console.log('🎯 Setting up comprehensive agent history capture');
    
    // Wait for AgentProcessor to be available
    const waitForProcessor = setInterval(() => {
        if (window.AgentProcessor && window.AgentProcessor.processAgentNode) {
            clearInterval(waitForProcessor);
            
            // Override processAgentNode to capture ALL iterations
            const originalProcessAgentNode = window.AgentProcessor.processAgentNode;
            
            window.AgentProcessor.processAgentNode = async function(node, input) {
                console.log(`🎯 Intercepting agent node ${node.id} for full history capture`);
                
                // Create a custom node that captures all intermediate outputs
                const capturedOutputs = [];
                const originalMessages = [];
                
                // Store original console methods to capture logs
                const originalConsoleLog = console.log;
                const originalDebugLog = window.DebugManager ? window.DebugManager.addLog : null;
                
                // Capture all debug logs during processing
                const capturedLogs = [];
                if (window.DebugManager) {
                    window.DebugManager.addLog = function(message, level) {
                        capturedLogs.push({ message, level, timestamp: new Date().toISOString() });
                        if (originalDebugLog) {
                            originalDebugLog.call(this, message, level);
                        }
                    };
                }
                
                // Override the fetch function to capture API interactions
                const originalFetch = window.fetch;
                window.fetch = async function(...args) {
                    const [url, options] = args;
                    
                    if (url && url.includes('/api/openai/chat')) {
                        try {
                            const requestBody = JSON.parse(options.body);
                            
                            // Capture the messages being sent
                            if (requestBody.messages) {
                                originalMessages.push(...requestBody.messages);
                                
                                // Log each message in the conversation
                                requestBody.messages.forEach((msg, idx) => {
                                    if (msg.role === 'user' && idx > 0) {
                                        capturedOutputs.push({
                                            type: 'user',
                                            content: msg.content,
                                            iteration: Math.floor(idx / 2)
                                        });
                                    }
                                });
                            }
                            
                            // Call the original fetch
                            const response = await originalFetch.apply(this, args);
                            const clonedResponse = response.clone();
                            
                            // Capture the response
                            try {
                                const responseData = await clonedResponse.json();
                                
                                if (responseData.choices && responseData.choices[0]) {
                                    const choice = responseData.choices[0];
                                    const message = choice.message;
                                    
                                    // Capture assistant responses
                                    if (message.content) {
                                        capturedOutputs.push({
                                            type: 'assistant',
                                            content: message.content,
                                            iteration: capturedOutputs.filter(o => o.type === 'assistant').length + 1
                                        });
                                    }
                                    
                                    // Capture tool calls
                                    if (message.tool_calls) {
                                        message.tool_calls.forEach(toolCall => {
                                            capturedOutputs.push({
                                                type: 'tool_call',
                                                name: toolCall.function.name,
                                                arguments: JSON.parse(toolCall.function.arguments),
                                                iteration: capturedOutputs.filter(o => o.type === 'assistant').length
                                            });
                                        });
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing response:', e);
                            }
                            
                            return response;
                        } catch (e) {
                            // Not our request
                        }
                    }
                    
                    return originalFetch.apply(this, args);
                };
                
                // Override AgentTools.executeTool to capture tool results
                let originalExecuteTool = null;
                if (window.AgentTools && window.AgentTools.executeTool) {
                    originalExecuteTool = window.AgentTools.executeTool;
                    window.AgentTools.executeTool = async function(toolName, args, node) {
                        console.log(`🔧 Capturing tool execution: ${toolName}`);
                        
                        try {
                            const result = await originalExecuteTool.call(this, toolName, args, node);
                            
                            // Capture tool result
                            capturedOutputs.push({
                                type: 'tool_result',
                                name: toolName,
                                result: result,
                                iteration: capturedOutputs.filter(o => o.type === 'assistant').length
                            });
                            
                            return result;
                        } catch (error) {
                            capturedOutputs.push({
                                type: 'tool_error',
                                name: toolName,
                                error: error.message,
                                iteration: capturedOutputs.filter(o => o.type === 'assistant').length
                            });
                            throw error;
                        }
                    };
                }
                
                try {
                    // Call the original process
                    const finalOutput = await originalProcessAgentNode.call(this, node, input);
                    
                    // Restore original methods
                    window.fetch = originalFetch;
                    if (window.DebugManager) {
                        window.DebugManager.addLog = originalDebugLog;
                    }
                    if (window.AgentTools && window.AgentTools.executeTool && originalExecuteTool) {
                        window.AgentTools.executeTool = originalExecuteTool;
                    }
                    
                    // Format the complete history
                    let formattedHistory = '## 🤖 Agent Processing Complete History\n\n';
                    formattedHistory += `**Input:** ${input}\n\n`;
                    formattedHistory += '---\n\n';
                    
                    // Group outputs by iteration
                    const iterations = {};
                    capturedOutputs.forEach(output => {
                        const iter = output.iteration || 0;
                        if (!iterations[iter]) {
                            iterations[iter] = [];
                        }
                        iterations[iter].push(output);
                    });
                    
                    // Format each iteration
                    Object.keys(iterations).sort((a, b) => parseInt(a) - parseInt(b)).forEach(iterNum => {
                        const iterOutputs = iterations[iterNum];
                        
                        formattedHistory += `### 🔄 Iteration ${parseInt(iterNum) + 1}\n\n`;
                        
                        iterOutputs.forEach(output => {
                            switch (output.type) {
                                case 'user':
                                    formattedHistory += `**User Query:**\n${output.content}\n\n`;
                                    break;
                                    
                                case 'assistant':
                                    formattedHistory += `**🤔 Agent Thinking:**\n${output.content}\n\n`;
                                    break;
                                    
                                case 'tool_call':
                                    formattedHistory += `**🔧 Tool Call:** \`${output.name}\`\n`;
                                    formattedHistory += `**Parameters:**\n\`\`\`json\n${JSON.stringify(output.arguments, null, 2)}\n\`\`\`\n\n`;
                                    break;
                                    
                                case 'tool_result':
                                    const resultStr = typeof output.result === 'string' ? 
                                        output.result : JSON.stringify(output.result, null, 2);
                                    const preview = resultStr.length > 1000 ? 
                                        resultStr.substring(0, 1000) + '...\n[Truncated]' : resultStr;
                                    formattedHistory += `**📊 Tool Result** (\`${output.name}\`):\n\`\`\`\n${preview}\n\`\`\`\n\n`;
                                    break;
                                    
                                case 'tool_error':
                                    formattedHistory += `**❌ Tool Error** (\`${output.name}\`):\n${output.error}\n\n`;
                                    break;
                            }
                        });
                        
                        formattedHistory += '---\n\n';
                    });
                    
                    // Add final output
                    formattedHistory += `### ✅ Final Output\n\n${finalOutput || 'No final output generated'}\n\n`;
                    
                    // Add debug information if available
                    if (capturedLogs.length > 0) {
                        formattedHistory += `### 📋 Processing Logs\n\n`;
                        formattedHistory += '<details>\n<summary>Click to expand logs</summary>\n\n';
                        capturedLogs.forEach(log => {
                            const icon = log.level === 'error' ? '❌' : 
                                       log.level === 'warning' ? '⚠️' : 
                                       log.level === 'success' ? '✅' : 'ℹ️';
                            formattedHistory += `${icon} ${log.message}\n`;
                        });
                        formattedHistory += '\n</details>\n\n';
                    }
                    
                    // Override the node's content with the complete history
                    node.content = formattedHistory;
                    
                    // Also update the content element if it exists
                    if (node.contentElement) {
                        node.contentElement.value = formattedHistory;
                    }
                    
                    console.log('✅ Agent history captured successfully');
                    
                    return formattedHistory;
                } catch (error) {
                    // Restore original methods
                    window.fetch = originalFetch;
                    if (window.DebugManager) {
                        window.DebugManager.addLog = originalDebugLog;
                    }
                    if (window.AgentTools && window.AgentTools.executeTool && originalExecuteTool) {
                        window.AgentTools.executeTool = originalExecuteTool;
                    }
                    
                    console.error('Error in agent processing:', error);
                    throw error;
                }
            };
            
            console.log('✅ Full agent history capture system initialized');
        }
    }, 100);
    
    // Also enhance the WorkflowPanel to properly render markdown with code blocks
    const waitForPanel = setInterval(() => {
        if (window.WorkflowPanel && window.WorkflowPanel.renderContent) {
            clearInterval(waitForPanel);
            
            const originalRenderContent = window.WorkflowPanel.renderContent;
            
            window.WorkflowPanel.renderContent = function(content, contentEl, sender, forceImage) {
                // Check if this is our formatted agent history
                if (sender === 'assistant' && content && typeof content === 'string' && 
                    content.includes('## 🤖 Agent Processing Complete History')) {
                    
                    console.log('🎯 Rendering formatted agent history');
                    
                    // Use a simple markdown renderer
                    let html = content
                        // Headers
                        .replace(/^### (.*?)$/gm, '<h4 style="color: #bb86fc; margin: 1em 0 0.5em 0;">$1</h4>')
                        .replace(/^## (.*?)$/gm, '<h3 style="color: #9c27b0; margin: 1em 0 0.5em 0;">$1</h3>')
                        // Bold text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        // Code blocks
                        .replace(/```json\n([\s\S]*?)```/g, '<pre style="background: #1a1a1a; padding: 10px; border-radius: 5px; overflow-x: auto;"><code>$1</code></pre>')
                        .replace(/```\n([\s\S]*?)```/g, '<pre style="background: #1a1a1a; padding: 10px; border-radius: 5px; overflow-x: auto;"><code>$1</code></pre>')
                        // Inline code
                        .replace(/`([^`]+)`/g, '<code style="background: #2a2a2a; padding: 2px 4px; border-radius: 3px;">$1</code>')
                        // Horizontal rules
                        .replace(/^---$/gm, '<hr style="border-color: #444; margin: 1em 0;">')
                        // Details/Summary
                        .replace(/<details>/g, '<details style="margin: 1em 0;">')
                        .replace(/<summary>(.*?)<\/summary>/g, '<summary style="cursor: pointer; color: #bb86fc;">$1</summary>')
                        // Line breaks
                        .replace(/\n/g, '<br>');
                    
                    contentEl.innerHTML = html;
                    contentEl.style.lineHeight = '1.6';
                    
                    return;
                }
                
                // For other content, use the original renderer
                return originalRenderContent.call(this, content, contentEl, sender, forceImage);
            };
        }
    }, 100);
})();