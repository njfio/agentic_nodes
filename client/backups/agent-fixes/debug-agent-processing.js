/**
 * Debug Agent Processing
 * Intercepts and logs exactly what's happening
 */

(function() {
  console.log('🔍 Installing debug interceptors...');
  
  // Intercept fetch to see API calls
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    if (url && url.includes('/api/openai')) {
      console.log('\n📡 API CALL:', url);
      if (options && options.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('📋 Request body:', body);
          console.log('🔧 Tools included:', body.tools ? body.tools.length : 0);
          if (body.tools && body.tools.length > 0) {
            console.log('📌 Tool names:', body.tools.map(t => t.function?.name || t.name).join(', '));
          }
        } catch (e) {}
      }
    }
    
    const response = await originalFetch.apply(this, args);
    
    if (url && url.includes('/api/openai')) {
      const clone = response.clone();
      try {
        const data = await clone.json();
        console.log('✅ Response received');
        if (data.choices && data.choices[0]) {
          const msg = data.choices[0].message;
          if (msg.tool_calls) {
            console.log('🔨 Tool calls requested:', msg.tool_calls.map(tc => tc.function.name).join(', '));
          } else {
            console.log('💬 Response type: Text only (no tool calls)');
          }
        }
      } catch (e) {}
    }
    
    return response;
  };
  
  // Check if nodes are actually agent nodes
  window.debugCheckNodes = function() {
    if (!window.App || !window.App.nodes) {
      console.log('No nodes loaded');
      return;
    }
    
    console.log('\n🔍 NODE INSPECTION:');
    window.App.nodes.forEach(node => {
      console.log(`\nNode ${node.id} (${node.title}):`);
      console.log(`  nodeType: ${node.nodeType}`);
      console.log(`  _nodeType: ${node._nodeType}`);
      console.log(`  isAgentNode: ${node.isAgentNode}`);
      console.log(`  Has process method: ${typeof node.process}`);
      
      // Check the actual process method
      if (node.process) {
        const processStr = node.process.toString();
        if (processStr.includes('AgentProcessor')) {
          console.log('  ✅ Uses AgentProcessor');
        } else {
          console.log('  ❌ Does NOT use AgentProcessor');
        }
      }
    });
  };
  
  // Intercept Node creation to ensure they're agent nodes
  if (window.Node) {
    const OriginalNode = window.Node;
    window.Node = function(...args) {
      const node = new OriginalNode(...args);
      
      // Log creation
      console.log(`📦 New node created: ID ${node.id}`);
      
      // If it's supposed to be an agent node, force it
      if (node.title && node.title.toLowerCase().includes('agent')) {
        console.log('🤖 Forcing agent configuration');
        node._nodeType = 'agent';
        node.nodeType = 'agent';
        node.isAgentNode = true;
      }
      
      return node;
    };
    window.Node.prototype = OriginalNode.prototype;
  }
  
  console.log('✅ Debug interceptors installed');
  console.log('Run debugCheckNodes() to inspect current nodes');
})();