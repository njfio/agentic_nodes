// Final fix - use the correct method name
console.log('🎯 FINAL AGENT FIX - Using processDefaultAgent');

// Run after a short delay
setTimeout(() => {
  if (!window.AgentNodes) {
    console.error('❌ AgentNodes not available');
    return;
  }
  
  // Check for processDefaultAgent
  if (typeof window.AgentNodes.processDefaultAgent !== 'function') {
    console.error('❌ AgentNodes.processDefaultAgent not found');
    console.log('Available methods:', Object.keys(window.AgentNodes));
    return;
  }
  
  console.log('✅ Found AgentNodes.processDefaultAgent!');
  
  // Fix all agent nodes
  if (!window.App || !window.App.nodes) {
    console.error('❌ No nodes to fix');
    return;
  }
  
  let fixed = 0;
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`🔧 Fixing agent node ${node.id} (${node.title})`);
      
      // Set agent properties
      node._nodeType = 'agent';
      node.nodeType = 'agent';
      node.isAgentNode = true;
      node.autoIterate = true;
      node.maxIterations = 5;
      node.enableReasoning = true;
      node.useMCPTools = true;
      node.contentType = 'text';
      node.aiProcessor = 'text-to-text';
      
      // Enhanced system prompt
      node.systemPrompt = `You are an autonomous AI agent with access to tools including browser.search for real-time web searches.

Your goal is to help users by:
1. Breaking down complex tasks into steps
2. Using tools actively - especially browser.search for current information
3. Reasoning through problems step-by-step
4. Iterating and refining your approach based on results

When asked about current events, news, or real-time information, you MUST use browser.search.
Never say you cannot access current information - use the tools available to you.`;
      
      // Override process method
      node.process = async function(input) {
        console.log(`🤖 AGENT NODE ${this.id} PROCESSING`);
        console.log('Input:', input);
        
        try {
          this.processing = true;
          this.error = null;
          
          // Ensure we have tools
          if (!this.tools || this.tools.length === 0) {
            console.log('📦 Loading tools...');
            if (window.AgentTools && window.AgentTools.getAllTools) {
              this.tools = window.AgentTools.getAllTools();
              console.log(`✅ Loaded ${this.tools.length} tools`);
            }
          }
          
          // Call processDefaultAgent
          console.log('🚀 Calling AgentNodes.processDefaultAgent');
          const result = await window.AgentNodes.processDefaultAgent(this, input);
          
          this.processing = false;
          this.hasBeenProcessed = true;
          this.content = result;
          
          // Update UI
          if (window.App && window.App.draw) {
            window.App.draw();
          }
          
          console.log('✅ Agent processing completed');
          return result;
        } catch (error) {
          console.error('❌ Agent processing error:', error);
          this.processing = false;
          this.error = error.message;
          throw error;
        }
      };
      
      fixed++;
    }
  });
  
  console.log(`✅ FIXED ${fixed} AGENT NODES!`);
  
  // Force redraw
  if (window.App && window.App.draw) {
    window.App.draw();
  }
}, 3000);

// Also create a manual function
window.fixAgentNodesNow = function() {
  console.log('🔧 Manual fix triggered');
  location.reload();
};