// Wait for AgentProcessor and then fix agent nodes
console.log('⏳ Waiting for AgentProcessor...');

function checkAndFix() {
  // Check what methods are available in AgentNodes
  if (window.AgentNodes) {
    const methods = Object.keys(window.AgentNodes);
    console.log('AgentNodes methods:', methods);
    
    // Check if processAgentNode exists
    if (window.AgentNodes.processAgentNode) {
      console.log('✅ Found processAgentNode in AgentNodes!');
      fixAgentNodesWithMethod('processAgentNode');
      return;
    }
    
    // Also check processDefaultAgent
    if (window.AgentNodes.processDefaultAgent) {
      console.log('✅ Found processDefaultAgent in AgentNodes!');
      fixAgentNodesWithMethod('processDefaultAgent');
      return;
    }
  }
  
  // Check if AgentProcessor is available
  if (window.AgentProcessor && window.AgentProcessor.processAgentNode) {
    console.log('✅ AgentProcessor.processAgentNode is available!');
    fixAgentNodes();
    return;
  }
  
  // If nothing found, stop trying after 10 seconds
  if (!checkAndFix.attempts) checkAndFix.attempts = 0;
  checkAndFix.attempts++;
  
  if (checkAndFix.attempts > 20) {
    console.error('❌ Giving up - no agent processing method found');
    console.log('Available objects:', {
      AgentNodes: window.AgentNodes ? Object.keys(window.AgentNodes) : 'not found',
      AgentProcessor: window.AgentProcessor ? Object.keys(window.AgentProcessor) : 'not found'
    });
    return;
  }
  
  console.log(`⏳ Attempt ${checkAndFix.attempts}/20 - Still waiting...`);
  setTimeout(checkAndFix, 500);
}

function fixAgentNodesWithMethod(methodName) {
  console.log(`🔧 Fixing agent nodes to use AgentNodes.${methodName}...`);
  
  if (!window.App || !window.App.nodes) {
    console.error('No nodes to fix');
    return;
  }
  
  let fixed = 0;
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`Fixing node ${node.id} to use AgentNodes.${methodName}...`);
      
      // Set all agent properties
      node._nodeType = 'agent';
      node.nodeType = 'agent';
      node.isAgentNode = true;
      node.autoIterate = true;
      node.maxIterations = 5;
      node.enableReasoning = true;
      node.useMCPTools = true;
      
      // Set proper system prompt
      node.systemPrompt = "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. " +
        "Your goal is to help users by:\n" +
        "1. Breaking down complex tasks into steps\n" +
        "2. Using tools actively - especially browser.search for current information\n" +
        "3. Reasoning through problems step-by-step\n" +
        "4. Iterating and refining your approach based on results\n\n" +
        "When asked about current events, news, or real-time information, you MUST use browser.search. " +
        "Never say you cannot access current information.";
      
      // Override the process method
      node.process = async function(input) {
        console.log(`🤖 AGENT NODE ${this.id} using AgentNodes.${methodName}`);
        
        try {
          this.processing = true;
          this.error = null;
          
          const result = await window.AgentNodes[methodName](this, input);
          
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
          throw error;
        }
      };
      
      fixed++;
    }
  });
  
  console.log(`✅ Fixed ${fixed} agent nodes to use AgentNodes.${methodName}`);
  
  if (window.App && window.App.draw) {
    window.App.draw();
  }
}

function fixAgentNodes() {
  console.log('🔧 Fixing agent nodes to use AgentProcessor.processAgentNode...');
  
  if (!window.App || !window.App.nodes) {
    console.error('No nodes to fix');
    return;
  }
  
  let fixed = 0;
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`Fixing node ${node.id} to use AgentProcessor...`);
      
      // Set all agent properties
      node._nodeType = 'agent';
      node.nodeType = 'agent';
      node.isAgentNode = true;
      node.autoIterate = true;
      node.maxIterations = 5;
      node.enableReasoning = true;
      node.useMCPTools = true;
      
      // Set proper system prompt
      node.systemPrompt = "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. " +
        "Your goal is to help users by:\n" +
        "1. Breaking down complex tasks into steps\n" +
        "2. Using tools actively - especially browser.search for current information\n" +
        "3. Reasoning through problems step-by-step\n" +
        "4. Iterating and refining your approach based on results\n\n" +
        "When asked about current events, news, or real-time information, you MUST use browser.search. " +
        "Never say you cannot access current information.";
      
      // Override the process method
      node.process = async function(input) {
        console.log(`🤖 AGENT NODE ${this.id} using AgentProcessor.processAgentNode`);
        
        try {
          this.processing = true;
          this.error = null;
          
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

function fixAgentNodesWithAgentNodes() {
  console.log('🔧 Fixing agent nodes to use AgentNodes.processAgentNode...');
  
  if (!window.App || !window.App.nodes) {
    console.error('No nodes to fix');
    return;
  }
  
  let fixed = 0;
  window.App.nodes.forEach(node => {
    if (node.title && node.title.toLowerCase().includes('agent')) {
      console.log(`Fixing node ${node.id} to use AgentNodes...`);
      
      // Set all agent properties
      node._nodeType = 'agent';
      node.nodeType = 'agent';
      node.isAgentNode = true;
      node.autoIterate = true;
      node.maxIterations = 5;
      node.enableReasoning = true;
      node.useMCPTools = true;
      
      // Set proper system prompt
      node.systemPrompt = "You are an autonomous AI agent with access to tools including browser.search for real-time web searches. " +
        "Your goal is to help users by:\n" +
        "1. Breaking down complex tasks into steps\n" +
        "2. Using tools actively - especially browser.search for current information\n" +
        "3. Reasoning through problems step-by-step\n" +
        "4. Iterating and refining your approach based on results\n\n" +
        "When asked about current events, news, or real-time information, you MUST use browser.search. " +
        "Never say you cannot access current information.";
      
      // Override the process method
      node.process = async function(input) {
        console.log(`🤖 AGENT NODE ${this.id} using AgentNodes.processAgentNode`);
        
        try {
          this.processing = true;
          this.error = null;
          
          const result = await window.AgentNodes.processAgentNode(this, input);
          
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
          throw error;
        }
      };
      
      fixed++;
    }
  });
  
  console.log(`✅ Fixed ${fixed} agent nodes to use AgentNodes`);
  
  if (window.App && window.App.draw) {
    window.App.draw();
  }
}

// Start checking
setTimeout(checkAndFix, 1000);

// Export for manual use
window.waitAndFixAgents = checkAndFix;