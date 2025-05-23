// Direct fix for agent nodes
console.log('🎯 Direct agent fix starting...');

// Check what we have
console.log('AgentNodes available:', !!window.AgentNodes);
console.log('AgentNodes.processAgentNode:', typeof window.AgentNodes?.processAgentNode);

if (window.AgentNodes && typeof window.AgentNodes.processAgentNode === 'function') {
  console.log('✅ AgentNodes.processAgentNode is available!');
  
  // Fix all agent nodes
  if (window.App && window.App.nodes) {
    let fixed = 0;
    
    window.App.nodes.forEach(node => {
      if (node.title && node.title.toLowerCase().includes('agent')) {
        console.log(`🔧 Fixing node ${node.id} (${node.title})`);
        
        // Set all agent properties
        node._nodeType = 'agent';
        node.nodeType = 'agent';
        node.isAgentNode = true;
        node.autoIterate = true;
        node.maxIterations = 5;
        node.enableReasoning = true;
        node.useMCPTools = true;
        
        // Enhanced system prompt
        node.systemPrompt = `You are an autonomous AI agent with access to various tools including browser.search for web searches.

Your capabilities include:
- browser.search: Search the web for current information
- text processing tools: summarize, extract entities
- MCP tools: Perplexity search, documentation lookup

When asked about current events or anything requiring real-time information, you MUST use browser.search or other search tools.

Instructions:
1. Break down complex tasks into steps
2. Use tools actively - don't just say you can't access information
3. Iterate and refine your approach based on results
4. For questions about events, news, or current topics, ALWAYS use browser.search

Never say you cannot access current information - use the tools available to you.`;
        
        // Override the process method
        const originalProcess = node.process;
        node.process = async function(input) {
          console.log(`🤖 AGENT NODE ${this.id} PROCESSING with tools`);
          console.log('Input:', input);
          
          try {
            this.processing = true;
            this.error = null;
            
            // Ensure we have tools
            if (!this.tools || this.tools.length === 0) {
              console.log('📦 Loading tools for agent node...');
              if (window.AgentTools && window.AgentTools.getAllTools) {
                this.tools = window.AgentTools.getAllTools();
                console.log(`✅ Loaded ${this.tools.length} tools`);
              }
            }
            
            // Call AgentNodes.processAgentNode
            console.log('🚀 Calling AgentNodes.processAgentNode');
            const result = await window.AgentNodes.processAgentNode(this, input);
            
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
            
            // Fall back to original process if needed
            if (originalProcess) {
              console.log('⚠️ Falling back to original process method');
              return originalProcess.call(this, input);
            }
            
            throw error;
          }
        };
        
        fixed++;
      }
    });
    
    console.log(`✅ Fixed ${fixed} agent nodes`);
    
    // Redraw
    if (window.App && window.App.draw) {
      window.App.draw();
    }
  }
} else {
  console.error('❌ AgentNodes.processAgentNode not available');
  console.log('AgentNodes object:', window.AgentNodes);
}

// Export for manual use
window.directFixAgents = function() {
  location.reload();
};