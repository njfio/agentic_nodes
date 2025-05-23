// Manual fix to ensure agent nodes use proper processing
console.log('🔨 Running manual agent fix...');

// First, check the current state
if (window.App && window.App.nodes) {
  console.log(`Found ${window.App.nodes.length} nodes`);
  
  window.App.nodes.forEach((node, index) => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`Node ${node.id} (${node.title}):`, {
        nodeType: node.nodeType,
        _nodeType: node._nodeType,
        isAgentNode: node.isAgentNode,
        hasProcess: typeof node.process === 'function',
        systemPrompt: node.systemPrompt ? node.systemPrompt.substring(0, 50) + '...' : 'none'
      });
    }
  });
}

// Force fix all agent nodes
window.fixAgentNodesNow = function() {
  console.log('🔧 Fixing agent nodes NOW...');
  
  if (!window.App || !window.App.nodes) {
    console.error('No nodes to fix');
    return;
  }
  
  let fixed = 0;
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`Fixing node ${node.id}...`);
      
      // Set all agent properties
      node._nodeType = 'agent';
      node.nodeType = 'agent';
      node.isAgentNode = true;
      node.autoIterate = true;
      node.maxIterations = 5;
      node.enableReasoning = true;
      node.useMCPTools = true;
      node.contentType = 'text';
      node.aiProcessor = 'text-to-text';
      
      // Set proper system prompt
      node.systemPrompt = "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. " +
        "Your goal is to help users by:\n" +
        "1. Breaking down complex tasks into steps\n" +
        "2. Using tools actively - especially browser.search for current information\n" +
        "3. Reasoning through problems step-by-step\n" +
        "4. Iterating and refining your approach based on results\n\n" +
        "When asked about current events, news, or real-time information, you MUST use browser.search. " +
        "Never say you cannot access current information.";
      
      // Override the process method for this specific node
      node.process = async function(input) {
        console.log(`🤖 AGENT NODE ${this.id} PROCESSING with agent capabilities`);
        
        if (!window.AgentProcessor || !window.AgentProcessor.processAgentNode) {
          console.error('AgentProcessor.processAgentNode not available!');
          throw new Error('Agent processing not available');
        }
        
        try {
          this.processing = true;
          this.error = null;
          
          // Call the agent processor
          const result = await window.AgentProcessor.processAgentNode(this, input);
          
          this.processing = false;
          this.hasBeenProcessed = true;
          this.content = result;
          
          // Force UI update
          if (window.App && window.App.draw) {
            window.App.draw();
          }
          
          return result;
        } catch (error) {
          console.error('Agent processing error:', error);
          this.processing = false;
          this.error = error.message;
          throw error;
        }
      };
      
      fixed++;
    }
  });
  
  console.log(`✅ Fixed ${fixed} agent nodes`);
  
  // Force redraw
  if (window.App && window.App.draw) {
    window.App.draw();
  }
  
  return fixed;
};

// Auto-run the fix after a short delay
setTimeout(() => {
  console.log('🔨 Auto-running agent fix...');
  window.fixAgentNodesNow();
}, 1000);

console.log('💡 Run fixAgentNodesNow() to manually fix agent nodes');