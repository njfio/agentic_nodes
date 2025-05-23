/**
 * Agent Diagnostic Script
 * Helps diagnose issues with agent nodes
 */

(function() {
  console.log('=== Agent Diagnostic Script ===');
  
  // Check if all required components are available
  const components = {
    'window.App': window.App,
    'window.AgentNodes': window.AgentNodes,
    'window.AgentProcessor': window.AgentProcessor,
    'window.AgentTools': window.AgentTools,
    'window.AgentMemory': window.AgentMemory,
    'window.AgentLogger': window.AgentLogger,
    'window.MCPTools': window.MCPTools,
    'window.ApiService': window.ApiService,
    'window.DebugManager': window.DebugManager
  };
  
  console.log('Component availability:');
  for (const [name, component] of Object.entries(components)) {
    console.log(`  ${name}: ${component ? '✓ Available' : '✗ Not available'}`);
  }
  
  // Check API configuration
  if (window.ApiService && window.ApiService.openai && window.ApiService.openai.getConfig) {
    const config = window.ApiService.openai.getConfig();
    console.log('OpenAI API configuration:');
    console.log(`  API Key: ${config.apiKey ? '✓ Set (${config.apiKey.substr(0, 10)}...)' : '✗ Not set'}`);
    console.log(`  Model: ${config.model || 'Not configured'}`);
    console.log(`  Temperature: ${config.temperature || 'Not configured'}`);
    console.log(`  Max Tokens: ${config.maxTokens || 'Not configured'}`);
  } else {
    console.log('OpenAI API configuration: ✗ Not available');
  }
  
  // Check if agent nodes can be created
  if (window.AgentProcessor && typeof window.AgentProcessor.createAgentNode === 'function') {
    console.log('Testing agent node creation...');
    try {
      const testNode = window.AgentProcessor.createAgentNode();
      console.log('✓ Agent node created successfully:', testNode);
      console.log(`  Node Type: ${testNode.nodeType}`);
      console.log(`  Is Agent Node: ${testNode.isAgentNode}`);
      console.log(`  Tools: ${testNode.tools ? testNode.tools.length : 0} available`);
      
      // Clean up test node
      if (window.App && Array.isArray(window.App.nodes)) {
        const index = window.App.nodes.findIndex(n => n.id === testNode.id);
        if (index !== -1) {
          window.App.nodes.splice(index, 1);
          console.log('✓ Test node cleaned up');
        }
      }
    } catch (error) {
      console.error('✗ Failed to create agent node:', error);
    }
  } else {
    console.log('✗ AgentProcessor.createAgentNode not available');
  }
  
  // Check available tools
  if (window.AgentTools && typeof window.AgentTools.getAllTools === 'function') {
    const tools = window.AgentTools.getAllTools();
    console.log(`Available tools: ${tools.length}`);
    if (tools.length > 0) {
      console.log('Sample tools:', tools.slice(0, 3).map(t => t.id).join(', '));
    }
  }
  
  if (window.MCPTools && typeof window.MCPTools.getAllTools === 'function') {
    const mcpTools = window.MCPTools.getAllTools();
    console.log(`Available MCP tools: ${mcpTools.length}`);
    if (mcpTools.length > 0) {
      console.log('Sample MCP tools:', mcpTools.slice(0, 3).map(t => t.id).join(', '));
    }
  }
  
  console.log('=== End of Diagnostic ===');
})();