/**
 * Force Agent Processing
 * Ensures agent nodes always use agent processing with tools
 */

(function() {
  console.log('🚀 Force Agent Processing loading...');
  
  // Wait for all components to be ready
  const checkReady = setInterval(() => {
    if (window.App && 
        window.Node && 
        window.AgentProcessor && 
        window.AgentTools &&
        window.AgentNodes) {
      clearInterval(checkReady);
      forceAgentProcessing();
    }
  }, 100);
  
  function forceAgentProcessing() {
    console.log('🚀 Forcing agent processing for all agent nodes...');
    
    // Store the original process method
    const originalProcess = window.Node.prototype.process;
    
    // Override the process method
    window.Node.prototype.process = async function(input) {
      // Check if this is an agent node
      const isAgentNode = this.nodeType === 'agent' || 
                         this._nodeType === 'agent' || 
                         this.isAgentNode === true ||
                         (this.title && this.title.toLowerCase().includes('agent'));
      
      if (isAgentNode) {
        console.log(`🤖 FORCE: Processing agent node ${this.id} with full agent capabilities`);
        
        // Ensure all agent properties are set
        this._nodeType = 'agent';
        this.nodeType = 'agent';
        this.isAgentNode = true;
        this.autoIterate = true;
        this.maxIterations = this.maxIterations || 5;
        this.enableReasoning = true;
        this.useMCPTools = true;
        
        // Ensure proper system prompt
        if (!this.systemPrompt || !this.systemPrompt.includes('browser.search')) {
          this.systemPrompt = "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. " +
            "Your goal is to help users by:\n" +
            "1. Breaking down complex tasks into steps\n" +
            "2. Using tools actively - especially browser.search for current information\n" +
            "3. Reasoning through problems step-by-step\n" +
            "4. Iterating and refining your approach based on results\n\n" +
            "When asked about current events, news, or real-time information, you MUST use browser.search. " +
            "Never say you cannot access current information - use the tools available to you.";
        }
        
        // Make sure we have tools
        if (!this.tools || this.tools.length === 0) {
          console.log('🔧 Loading tools for agent node...');
          if (window.AgentTools && window.AgentTools.getAllTools) {
            this.tools = window.AgentTools.getAllTools();
            console.log(`✅ Loaded ${this.tools.length} tools for agent node`);
          }
        }
        
        // Use AgentNodes.processAgentNode instead of AgentProcessor
        if (window.AgentNodes && window.AgentNodes.processAgentNode) {
          try {
            console.log('🎯 Using AgentNodes.processAgentNode');
            this.processing = true;
            this.error = null;
            
            const result = await window.AgentNodes.processAgentNode(this, input);
            
            this.processing = false;
            this.hasBeenProcessed = true;
            this.content = result;
            
            // Update the UI
            if (window.App && window.App.draw) {
              window.App.draw();
            }
            
            return result;
          } catch (error) {
            console.error('❌ Error in agent processing:', error);
            this.processing = false;
            this.error = error.message;
            throw error;
          }
        } else {
          console.error('❌ AgentNodes.processAgentNode not available');
          return originalProcess.call(this, input);
        }
      } else {
        // Not an agent node, use original processing
        return originalProcess.call(this, input);
      }
    };
    
    console.log('✅ Agent processing override installed');
    
    // Fix any existing agent nodes
    fixExistingNodes();
  }
  
  function fixExistingNodes() {
    if (!window.App || !window.App.nodes) return;
    
    let fixedCount = 0;
    window.App.nodes.forEach(node => {
      if (node.title && node.title.toLowerCase().includes('agent')) {
        node._nodeType = 'agent';
        node.nodeType = 'agent';
        node.isAgentNode = true;
        node.autoIterate = true;
        node.maxIterations = 5;
        node.enableReasoning = true;
        node.useMCPTools = true;
        
        // Load tools if not present
        if (!node.tools || node.tools.length === 0) {
          if (window.AgentTools && window.AgentTools.getAllTools) {
            node.tools = window.AgentTools.getAllTools();
            console.log(`✅ Loaded ${node.tools.length} tools for existing agent node ${node.id}`);
          }
        }
        
        fixedCount++;
      }
    });
    
    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} existing agent nodes`);
    }
  }
  
  // Export helper function
  window.forceFixAgentNodes = fixExistingNodes;
})();