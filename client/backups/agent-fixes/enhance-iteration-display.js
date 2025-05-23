// Enhanced iteration display for agent nodes
(function() {
    console.log('🎯 Enhancing iteration display for agent nodes');
    
    // Wait for WorkflowPanel to be available
    const waitForWorkflowPanel = setInterval(() => {
        if (window.WorkflowPanel && window.WorkflowPanel.renderContent) {
            clearInterval(waitForWorkflowPanel);
            
            // Override renderContent to better handle markdown and iterations
            const originalRenderContent = window.WorkflowPanel.renderContent;
            
            window.WorkflowPanel.renderContent = function(content, contentEl, sender, forceImage) {
                // Check if this is agent iteration content
                if (sender === 'assistant' && content && typeof content === 'string' && 
                    (content.includes('**Agent Processing History:**') || 
                     content.includes('🔄 **Iteration') ||
                     content.includes('💭 **Thinking:**') ||
                     content.includes('🔧 **Tool Call:**'))) {
                    
                    console.log('🎯 Rendering agent iteration content with enhanced markdown');
                    
                    // Clear the content element
                    contentEl.innerHTML = '';
                    
                    // Split content by newlines to preserve formatting
                    const lines = content.split('\n');
                    let currentParagraph = document.createElement('div');
                    currentParagraph.style.marginBottom = '0.5em';
                    
                    lines.forEach(line => {
                        if (line.trim() === '') {
                            // Empty line - start a new paragraph
                            if (currentParagraph.innerHTML.trim()) {
                                contentEl.appendChild(currentParagraph);
                                currentParagraph = document.createElement('div');
                                currentParagraph.style.marginBottom = '0.5em';
                            }
                        } else if (line.trim() === '---') {
                            // Horizontal rule
                            if (currentParagraph.innerHTML.trim()) {
                                contentEl.appendChild(currentParagraph);
                                currentParagraph = document.createElement('div');
                                currentParagraph.style.marginBottom = '0.5em';
                            }
                            const hr = document.createElement('hr');
                            hr.style.margin = '1em 0';
                            hr.style.borderColor = '#444';
                            contentEl.appendChild(hr);
                        } else {
                            // Process markdown in the line
                            let processedLine = line;
                            
                            // Handle bold text
                            processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            
                            // Handle emojis and special formatting
                            if (line.includes('🔄') || line.includes('💭') || line.includes('🔧') || line.includes('🤔') || line.includes('💬')) {
                                processedLine = `<span style="font-size: 1.1em; color: #bb86fc;">${processedLine}</span>`;
                            }
                            
                            // Handle code blocks (JSON)
                            if (line.trim().startsWith('{') || line.trim().startsWith('[') || line.includes('Parameters:') || line.includes('Result:')) {
                                processedLine = `<code style="background: #2a2a2a; padding: 2px 4px; border-radius: 3px;">${line}</code>`;
                            }
                            
                            // Add the line to the current paragraph
                            if (currentParagraph.innerHTML) {
                                currentParagraph.innerHTML += '<br>';
                            }
                            currentParagraph.innerHTML += processedLine;
                        }
                    });
                    
                    // Add any remaining paragraph
                    if (currentParagraph.innerHTML.trim()) {
                        contentEl.appendChild(currentParagraph);
                    }
                    
                    // Add some styling to make it more readable
                    contentEl.style.lineHeight = '1.6';
                    contentEl.style.whiteSpace = 'pre-wrap';
                    
                    return;
                }
                
                // For non-iteration content, use the original renderer
                return originalRenderContent.call(this, content, contentEl, sender, forceImage);
            };
            
            console.log('✅ Enhanced iteration display initialized');
        }
    }, 100);
    
    // Also enhance the way agent nodes store their iteration content
    if (window.App && window.App.nodes) {
        // Override the process method for agent nodes to capture all iterations
        const originalProcess = Node.prototype.process;
        
        Node.prototype.process = async function(input) {
            if (this.type === 'agent') {
                console.log(`🎯 Processing agent node ${this.id} with iteration capture`);
                
                // Initialize iteration storage for this node
                if (!this._iterations) {
                    this._iterations = [];
                }
                
                // Store the original content setter
                const originalContentSetter = Object.getOwnPropertyDescriptor(this, 'content') || 
                    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'content');
                
                // Track all content updates
                const iterations = [];
                let iterationCount = 0;
                
                // Override content setter to capture iterations
                Object.defineProperty(this, 'content', {
                    get() {
                        return this._content;
                    },
                    set(value) {
                        console.log(`📝 Agent node ${this.id} content update ${++iterationCount}`);
                        
                        // Store this iteration
                        if (value && typeof value === 'string') {
                            iterations.push({
                                iteration: iterationCount,
                                content: value,
                                timestamp: new Date().toISOString()
                            });
                        }
                        
                        this._content = value;
                        
                        // Update the content element if it exists
                        if (this.contentElement) {
                            this.contentElement.value = value;
                        }
                    }
                });
                
                try {
                    // Call the original process
                    const result = await originalProcess.call(this, input);
                    
                    // If we captured multiple iterations, format them
                    if (iterations.length > 1) {
                        console.log(`🎯 Formatting ${iterations.length} iterations for agent node ${this.id}`);
                        
                        let formattedContent = '**Agent Processing History:**\n\n';
                        
                        iterations.forEach((iter, index) => {
                            formattedContent += `🔄 **Iteration ${index + 1}** (${new Date(iter.timestamp).toLocaleTimeString()})\n\n`;
                            formattedContent += iter.content + '\n\n';
                            formattedContent += '---\n\n';
                        });
                        
                        // Set the final formatted content
                        this._content = formattedContent;
                        
                        if (this.contentElement) {
                            this.contentElement.value = formattedContent;
                        }
                    }
                    
                    return result;
                } catch (error) {
                    console.error(`Error processing agent node ${this.id}:`, error);
                    throw error;
                } finally {
                    // Restore original content setter if needed
                    if (originalContentSetter && originalContentSetter.set) {
                        Object.defineProperty(this, 'content', originalContentSetter);
                    }
                }
            }
            
            // For non-agent nodes, use original process
            return originalProcess.call(this, input);
        };
    }
})();