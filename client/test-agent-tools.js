// Test script to verify agent tools are working
console.log('=== Testing Agent Tools ===');

// Wait for everything to load
setTimeout(() => {
  // Check if AgentTools is available
  if (window.AgentTools) {
    console.log('✓ AgentTools is available');
    
    // Get all tools
    const allTools = AgentTools.getAllTools();
    console.log(`✓ Found ${allTools.length} tools`);
    
    // Look for browser.search
    const browserSearch = allTools.find(t => t.id === 'browser.search');
    if (browserSearch) {
      console.log('✓ browser.search tool found:', browserSearch);
      
      // Check parameters
      if (window.AgentNodes && window.AgentNodes.getToolParameters) {
        const params = window.AgentNodes.getToolParameters(browserSearch);
        console.log('✓ browser.search parameters:', params);
        
        const required = window.AgentNodes.getToolRequiredParameters(browserSearch);
        console.log('✓ browser.search required parameters:', required);
      }
    } else {
      console.error('✗ browser.search tool NOT found');
    }
    
    // List all available tools
    console.log('\nAll available tools:');
    allTools.forEach(tool => {
      console.log(`- ${tool.id} (${tool.category}): ${tool.description}`);
    });
  } else {
    console.error('✗ AgentTools not available');
  }
  
  // Check if MCPTools is available
  if (window.MCPTools) {
    console.log('\n✓ MCPTools is available');
    console.log(`✓ MCP has ${MCPTools.tools.length} tools`);
  } else {
    console.error('✗ MCPTools not available');
  }
  
  // Test creating an agent node
  console.log('\n=== Testing Agent Node Creation ===');
  if (window.App && window.App.addAgentNode) {
    try {
      const testNode = window.App.addAgentNode();
      console.log('✓ Created test agent node:', testNode);
      
      // Check if it has tools
      if (testNode.tools && testNode.tools.length > 0) {
        console.log(`✓ Agent node has ${testNode.tools.length} tools`);
      } else {
        console.error('✗ Agent node has no tools');
      }
    } catch (error) {
      console.error('✗ Error creating agent node:', error);
    }
  } else {
    console.error('✗ App.addAgentNode not available');
  }
  
}, 2000);