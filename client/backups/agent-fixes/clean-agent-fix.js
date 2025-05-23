// Clean agent fix - wait for everything and fix once
console.log('🧹 Clean Agent Fix starting...');

// Wrap in a function to allow return
(function() {
  // Only run once
  if (window._agentFixApplied) {
    console.log('Agent fix already applied, skipping');
    return;
  }

// Wait for everything to be ready
let checkCount = 0;
const checkInterval = setInterval(() => {
  checkCount++;
  
  // Check if all components are ready
  const ready = window.App && 
                window.AgentNodes && 
                window.AgentProcessor && 
                window.AgentTools &&
                window.AgentProcessor.processAgentNode;
  
  if (ready) {
    clearInterval(checkInterval);
    console.log('✅ All components ready, applying fix...');
    applyFix();
  } else if (checkCount > 40) { // 10 seconds
    clearInterval(checkInterval);
    console.error('❌ Timeout waiting for components');
    console.log('Status:', {
      App: !!window.App,
      AgentNodes: !!window.AgentNodes,
      AgentProcessor: !!window.AgentProcessor,
      AgentTools: !!window.AgentTools,
      processAgentNode: !!(window.AgentProcessor && window.AgentProcessor.processAgentNode)
    });
  }
}, 250);

function applyFix() {
  // Mark as applied
  window._agentFixApplied = true;
  
  let fixed = 0;
  
  if (window.App && window.App.nodes) {
    window.App.nodes.forEach(node => {
      if (node.title && node.title.toLowerCase().includes('agent')) {
        console.log(`🔧 Fixing agent node ${node.id}`);
        
        // Set agent properties
        node._nodeType = 'agent';
        node.nodeType = 'agent';
        node.isAgentNode = true;
        node.autoIterate = true;
        node.maxIterations = 5;
        node.enableReasoning = true;
        node.useMCPTools = true;
        
        // Better system prompt
        node.systemPrompt = `You are an autonomous AI agent with access to tools including browser.search for real-time web searches.

When asked about current events, news, or real-time information, you MUST use browser.search.
Never say you cannot access current information - use the tools available to you.

Instructions:
1. Break down complex tasks into steps
2. Use tools actively to gather information
3. Iterate and refine your approach based on results`;
        
        // Override process method to use AgentProcessor
        const originalProcess = node.process;
        node.process = async function(input) {
          console.log(`🤖 Agent node ${this.id} processing with AgentProcessor`);
          
          try {
            this.processing = true;
            this.error = null;
            
            // Use AgentProcessor.processAgentNode
            const result = await window.AgentProcessor.processAgentNode(this, input);
            
            this.processing = false;
            this.hasBeenProcessed = true;
            this.content = result;
            
            if (window.App && window.App.draw) {
              window.App.draw();
            }
            
            return result;
          } catch (error) {
            console.error('Agent processing error:', error);
            this.processing = false;
            this.error = error.message;
            
            // Fall back to original if needed
            if (originalProcess && error.message.includes('not available')) {
              return originalProcess.call(this, input);
            }
            
            throw error;
          }
        };
        
        fixed++;
      }
    });
    
    console.log(`✅ Fixed ${fixed} agent nodes to use AgentProcessor`);
    
    if (window.App && window.App.draw) {
      window.App.draw();
    }
  }
})();