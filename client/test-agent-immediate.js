// Test agent processing immediately
console.log('🧪 Test Agent Immediate - Starting...');

// Check what's available right away
setTimeout(() => {
  console.log('=== Component Check ===');
  console.log('App:', !!window.App);
  console.log('AgentProcessor:', !!window.AgentProcessor);
  console.log('AgentProcessor.processAgentNode:', typeof window.AgentProcessor?.processAgentNode);
  console.log('AgentNodes:', !!window.AgentNodes);
  console.log('AgentNodes.processAgentNode:', typeof window.AgentNodes?.processAgentNode);
  console.log('AgentNodes.processDefaultAgent:', typeof window.AgentNodes?.processDefaultAgent);
  console.log('AgentTools:', !!window.AgentTools);
  console.log('AgentTools.getAllTools:', typeof window.AgentTools?.getAllTools);
  
  if (window.AgentTools && window.AgentTools.getAllTools) {
    const tools = window.AgentTools.getAllTools();
    console.log(`Available tools: ${tools.length}`);
    console.log('Tool names:', tools.slice(0, 5).map(t => t.id));
  }
  
  // Check nodes
  if (window.App && window.App.nodes) {
    console.log(`\n=== Node Inspection (${window.App.nodes.length} nodes) ===`);
    window.App.nodes.forEach(node => {
      if (node.title && node.title.toLowerCase().includes('agent')) {
        console.log(`Node ${node.id} (${node.title}):`, {
          nodeType: node.nodeType,
          _nodeType: node._nodeType,
          isAgentNode: node.isAgentNode,
          hasCustomProcess: node.process && node.process.toString().includes('AgentProcessor')
        });
      }
    });
  }
}, 3000);

// Create a manual test function
window.testAgentProcessing = async function() {
  console.log('\n🧪 MANUAL TEST STARTED');
  
  // Find an agent node
  const agentNode = window.App?.nodes?.find(n => n.title && n.title.toLowerCase().includes('agent'));
  if (!agentNode) {
    console.error('No agent node found');
    return;
  }
  
  console.log('Testing with node:', agentNode.id);
  
  // Check if we have the processor
  if (!window.AgentProcessor || !window.AgentProcessor.processAgentNode) {
    console.error('AgentProcessor.processAgentNode not available');
    
    // Try AgentNodes methods
    if (window.AgentNodes && window.AgentNodes.processDefaultAgent) {
      console.log('Using AgentNodes.processDefaultAgent instead');
      try {
        const result = await window.AgentNodes.processDefaultAgent(agentNode, "test query about blockchain");
        console.log('✅ Process successful:', result);
        return;
      } catch (error) {
        console.error('Process failed:', error);
        return;
      }
    }
    
    return;
  }
  
  // Test the processor directly
  try {
    console.log('Calling AgentProcessor.processAgentNode...');
    const result = await window.AgentProcessor.processAgentNode(agentNode, "test query about blockchain");
    console.log('✅ Process successful:', result);
  } catch (error) {
    console.error('❌ Process failed:', error);
  }
};

console.log('💡 Run testAgentProcessing() to test agent processing directly');