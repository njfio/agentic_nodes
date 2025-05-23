// Capture all agent iterations and display them in the workflow chat
(function() {
    console.log('🎯 Setting up agent iteration capture system');
    
    // Store for all agent iterations
    window.AgentIterationStore = {
        iterations: new Map(),
        
        startNewProcess(nodeId) {
            this.iterations.set(nodeId, []);
        },
        
        addIteration(nodeId, data) {
            if (!this.iterations.has(nodeId)) {
                this.iterations.set(nodeId, []);
            }
            this.iterations.get(nodeId).push({
                timestamp: new Date().toISOString(),
                ...data
            });
        },
        
        getIterations(nodeId) {
            return this.iterations.get(nodeId) || [];
        },
        
        formatIterations(nodeId) {
            const iterations = this.getIterations(nodeId);
            if (!iterations.length) return '';
            
            let output = '';
            
            iterations.forEach((iter, index) => {
                output += `\n🔄 **Iteration ${index + 1}**\n`;
                
                if (iter.thinking) {
                    output += `\n💭 **Thinking:**\n${iter.thinking}\n`;
                }
                
                if (iter.toolCall) {
                    output += `\n🔧 **Tool Call:** ${iter.toolCall.name}\n`;
                    output += `Parameters: ${JSON.stringify(iter.toolCall.parameters, null, 2)}\n`;
                    if (iter.toolCall.result) {
                        output += `Result: ${typeof iter.toolCall.result === 'string' ? 
                            iter.toolCall.result.substring(0, 500) + (iter.toolCall.result.length > 500 ? '...' : '') : 
                            JSON.stringify(iter.toolCall.result, null, 2)}\n`;
                    }
                }
                
                if (iter.reflection) {
                    output += `\n🤔 **Reflection:**\n${iter.reflection}\n`;
                }
                
                if (iter.response) {
                    output += `\n💬 **Response:**\n${iter.response}\n`;
                }
                
                output += '\n---\n';
            });
            
            return output;
        }
    };
    
    // Override the agent processor to capture iterations
    if (window.AgentProcessor && window.AgentProcessor.processAgentNode) {
        const originalProcess = window.AgentProcessor.processAgentNode;
        
        window.AgentProcessor.processAgentNode = async function(node, input) {
            console.log('🎯 Intercepting agent node processing for iteration capture');
            
            // Start new process
            window.AgentIterationStore.startNewProcess(node.id);
            
            // Store the original node.content update method
            const originalSetContent = (content) => {
                node.content = content;
            };
            
            // Track all content updates
            let allIterationContent = '';
            
            // Override node.content setter to capture all updates
            Object.defineProperty(node, 'content', {
                get() {
                    return node._content;
                },
                set(value) {
                    console.log('📝 Capturing agent node content update');
                    node._content = value;
                    
                    // If this is a formatted iteration output, append it
                    if (value && typeof value === 'string') {
                        if (value.includes('Iteration') || value.includes('Tool Call') || value.includes('Thinking')) {
                            allIterationContent += value + '\n\n';
                        }
                    }
                }
            });
            
            try {
                // Call the original process
                const result = await originalProcess.call(this, node, input);
                
                // Format all captured iterations
                const iterationHistory = window.AgentIterationStore.formatIterations(node.id);
                
                if (iterationHistory) {
                    // Combine the iteration history with any final output
                    const finalContent = `**Agent Processing History:**\n${iterationHistory}\n\n**Final Output:**\n${node._content || result || 'No final output'}`;
                    
                    // Set the final content
                    node._content = finalContent;
                    
                    // Also update the content element if it exists
                    if (node.contentElement) {
                        node.contentElement.value = finalContent;
                    }
                }
                
                return result;
            } catch (error) {
                console.error('Error in agent processing:', error);
                throw error;
            }
        };
    }
    
    // Also intercept OpenAI API calls to capture tool usage
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options] = args;
        
        if (url && url.includes('openai.com/v1/chat/completions') && options && options.body) {
            try {
                const body = JSON.parse(options.body);
                
                // Check if this is an agent node request
                if (body.messages && body.messages.some(m => m.content && m.content.includes('You are an AI agent'))) {
                    console.log('🎯 Intercepting OpenAI request for agent node');
                    
                    // Call the original fetch
                    const response = await originalFetch.apply(this, args);
                    const clonedResponse = response.clone();
                    
                    // Parse the response to capture iterations
                    try {
                        const data = await clonedResponse.json();
                        
                        if (data.choices && data.choices[0]) {
                            const choice = data.choices[0];
                            
                            // Capture thinking
                            if (choice.message && choice.message.content) {
                                const nodeId = body.messages[0].nodeId || 'unknown';
                                window.AgentIterationStore.addIteration(nodeId, {
                                    thinking: choice.message.content,
                                    response: choice.message.content
                                });
                            }
                            
                            // Capture tool calls
                            if (choice.message && choice.message.tool_calls) {
                                choice.message.tool_calls.forEach(toolCall => {
                                    const nodeId = body.messages[0].nodeId || 'unknown';
                                    window.AgentIterationStore.addIteration(nodeId, {
                                        toolCall: {
                                            name: toolCall.function.name,
                                            parameters: JSON.parse(toolCall.function.arguments)
                                        }
                                    });
                                });
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing OpenAI response:', e);
                    }
                    
                    return response;
                }
            } catch (e) {
                // Not a JSON body or not an agent request
            }
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Override WorkflowPanel.addMessage to ensure agent iterations are displayed properly
    if (window.WorkflowPanel && window.WorkflowPanel.addMessage) {
        const originalAddMessage = window.WorkflowPanel.addMessage;
        
        window.WorkflowPanel.addMessage = function(content, sender, forceImage) {
            // If this is agent content with iterations, ensure it's displayed as markdown
            if (sender === 'assistant' && content && content.includes('**Agent Processing History:**')) {
                console.log('🎯 Displaying agent iteration history in chat');
                
                // Call the original method with the formatted content
                return originalAddMessage.call(this, content, sender, forceImage);
            }
            
            return originalAddMessage.call(this, content, sender, forceImage);
        };
    }
    
    console.log('✅ Agent iteration capture system initialized');
})();