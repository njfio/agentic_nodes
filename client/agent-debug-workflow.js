/**
 * Agent Debug Workflow Script
 * Creates a simple workflow to test agent nodes
 */

(function() {
  console.log('=== Agent Debug Workflow ===');
  
  window.createAgentDebugWorkflow = function() {
    if (!window.App) {
      console.error('App not available');
      return;
    }
    
    console.log('Creating debug workflow...');
    
    // Clear existing nodes
    window.App.nodes = [];
    
    // Create an agent node
    console.log('Creating agent node...');
    try {
      const agentNode = window.App.addNode('agent');
      if (agentNode) {
        agentNode.x = 400;
        agentNode.y = 200;
        agentNode.title = 'Test Agent Node';
        agentNode.systemPrompt = 'You are a helpful assistant. Please provide real, accurate responses based on your knowledge.';
        console.log('✓ Agent node created:', agentNode);
      } else {
        console.error('✗ Failed to create agent node');
        return;
      }
    } catch (error) {
      console.error('✗ Error creating agent node:', error);
      return;
    }
    
    // Create input and output nodes
    const inputNode = window.App.addNode();
    inputNode.x = 100;
    inputNode.y = 200;
    inputNode.title = 'Input';
    inputNode.content = 'What is the weather like today in New York?';
    inputNode.isInputNode = true;
    
    const outputNode = window.App.addNode();
    outputNode.x = 700;
    outputNode.y = 200;
    outputNode.title = 'Output';
    outputNode.isOutputNode = true;
    
    // Connect the nodes
    const agentNode = window.App.nodes.find(n => n.nodeType === 'agent' || n.isAgentNode);
    if (agentNode) {
      // Connect input to agent
      window.App.connections.push({
        from: inputNode,
        to: agentNode
      });
      
      // Connect agent to output
      window.App.connections.push({
        from: agentNode,
        to: outputNode
      });
      
      console.log('✓ Nodes connected');
    }
    
    // Redraw the canvas
    window.App.draw();
    
    console.log('Debug workflow created. Run the workflow to test agent node processing.');
    console.log('Nodes:', window.App.nodes.length);
    console.log('Connections:', window.App.connections.length);
    
    // Return a test function
    return async function testAgentNode() {
      console.log('=== Testing Agent Node ===');
      
      // Check API configuration
      if (window.ApiService && window.ApiService.openai) {
        const config = window.ApiService.openai.getConfig();
        if (!config.apiKey) {
          console.error('✗ OpenAI API key not configured!');
          console.error('Please configure your API key in the OpenAI Configuration modal');
          return;
        }
        console.log('✓ API key configured');
      }
      
      // Find the agent node
      const agentNode = window.App.nodes.find(n => n.nodeType === 'agent' || n.isAgentNode);
      if (!agentNode) {
        console.error('✗ Agent node not found');
        return;
      }
      
      console.log('Testing agent node processing...');
      try {
        const result = await agentNode.process('What is the weather like today in New York?');
        console.log('✓ Agent node processed successfully');
        console.log('Result:', result);
        
        // Check if it's a canned response
        if (result && result.includes("don't have access to real-time")) {
          console.warn('⚠️ Received a canned response. This suggests:');
          console.warn('  1. The API key might not be configured correctly');
          console.warn('  2. The API request might be failing');
          console.warn('  3. The node might not be using the agent processor');
        }
      } catch (error) {
        console.error('✗ Error processing agent node:', error);
      }
    };
  };
  
  console.log('Use window.createAgentDebugWorkflow() to create a test workflow');
  console.log('The function returns a test function you can call to test the agent node');
})();