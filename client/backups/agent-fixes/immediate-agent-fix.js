// Immediate agent fix - run as soon as possible
(function() {
  console.log('🚀 IMMEDIATE AGENT FIX STARTING');
  
  // Wait just 2 seconds for everything to load
  setTimeout(() => {
    console.log('🔍 Checking for AgentNodes.processAgentNode...');
    
    if (window.AgentNodes) {
      console.log('AgentNodes exists');
      console.log('AgentNodes.processAgentNode type:', typeof window.AgentNodes.processAgentNode);
      console.log('All AgentNodes properties:', Object.getOwnPropertyNames(window.AgentNodes));
    }
    
    if (window.AgentNodes && window.AgentNodes.processAgentNode) {
      console.log('✅ FOUND AgentNodes.processAgentNode!');
      
      // Fix nodes immediately
      if (window.App && window.App.nodes) {
        window.App.nodes.forEach(node => {
          if (node.title && node.title.includes('Agent')) {
            console.log(`🔧 FIXING AGENT NODE ${node.id}`);
            
            // Store original process
            const originalProcess = node.process;
            
            // Override process method
            node.process = async function(input) {
              console.log(`🤖 AGENT NODE ${this.id} - INTERCEPTED!`);
              console.log('Using AgentNodes.processAgentNode');
              
              // Set agent properties
              this._nodeType = 'agent';
              this.nodeType = 'agent';
              this.isAgentNode = true;
              this.autoIterate = true;
              this.maxIterations = 5;
              this.useMCPTools = true;
              
              try {
                const result = await window.AgentNodes.processAgentNode(this, input);
                this.content = result;
                this.hasBeenProcessed = true;
                return result;
              } catch (error) {
                console.error('Agent process error:', error);
                throw error;
              }
            };
            
            console.log(`✅ Fixed node ${node.id}`);
          }
        });
        
        console.log('🎉 ALL AGENT NODES FIXED!');
      }
    } else {
      console.error('❌ AgentNodes.processAgentNode NOT FOUND');
      
      // Try a different approach - look in agent-nodes.js
      if (window.AgentNodes && window.AgentNodes.processDefaultAgent) {
        console.log('✅ Found processDefaultAgent instead!');
        
        // Fix with processDefaultAgent
        if (window.App && window.App.nodes) {
          window.App.nodes.forEach(node => {
            if (node.title && node.title.includes('Agent')) {
              node.process = async function(input) {
                console.log(`🤖 Using processDefaultAgent for node ${this.id}`);
                this._nodeType = 'agent';
                this.isAgentNode = true;
                const result = await window.AgentNodes.processDefaultAgent(this, input);
                this.content = result;
                return result;
              };
            }
          });
        }
      }
    }
  }, 2000);
})();