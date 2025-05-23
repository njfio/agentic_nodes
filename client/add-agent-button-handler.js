// Add event handler for the new Agent Node button
(function() {
    console.log('🎯 Setting up Agent Node button handler');
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        const addAgentNodeBtn = document.getElementById('addAgentNodeBtn');
        
        if (addAgentNodeBtn) {
            addAgentNodeBtn.addEventListener('click', function() {
                console.log('🤖 Agent Node button clicked');
                
                // Check if AgentNodes is available
                if (window.AgentNodes && window.AgentNodes.createAgentNode) {
                    const node = window.AgentNodes.createAgentNode();
                    if (node) {
                        console.log('✅ Agent node created successfully');
                        
                        // Show notification
                        if (window.showNotification) {
                            window.showNotification('Agent Node created! Double-click to configure.', 'success');
                        }
                        
                        // Redraw the canvas
                        if (window.App && window.App.draw) {
                            window.App.draw();
                        }
                    }
                } else if (window.AgentProcessor && window.AgentProcessor.createAgentNode) {
                    // Fallback to AgentProcessor
                    const node = window.AgentProcessor.createAgentNode();
                    if (node) {
                        console.log('✅ Agent node created via AgentProcessor');
                        
                        // Show notification
                        if (window.showNotification) {
                            window.showNotification('Agent Node created! Double-click to configure.', 'success');
                        }
                        
                        // Redraw the canvas
                        if (window.App && window.App.draw) {
                            window.App.draw();
                        }
                    }
                } else {
                    console.error('❌ AgentNodes or AgentProcessor not available');
                    if (window.showNotification) {
                        window.showNotification('Error: Agent system not loaded', 'error');
                    }
                }
            });
            
            console.log('✅ Agent Node button handler attached');
        } else {
            console.error('❌ Agent Node button not found');
        }
    });
})();