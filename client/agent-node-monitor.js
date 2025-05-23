/**
 * Agent Node Monitor
 * Real-time monitoring of agent node processing
 */

window.AgentNodeMonitor = {
  // Enable monitoring
  enable: function() {
    console.log('🔍 Enabling agent node monitoring...');
    
    // Store original functions
    this._originalProcess = window.AgentProcessor ? window.AgentProcessor.processAgentNode : null;
    this._originalDirectProcess = window.AgentProcessor ? window.AgentProcessor.directProcessNode : null;
    
    if (!window.AgentProcessor) {
      console.error('❌ AgentProcessor not available');
      return;
    }
    
    // Monitor processAgentNode
    window.AgentProcessor.processAgentNode = async function(node, input) {
      console.log('\n📊 AGENT NODE PROCESSING MONITOR');
      console.log('================================');
      console.log(`Node ID: ${node.id}`);
      console.log(`Node Title: ${node.title || 'Untitled'}`);
      console.log(`Node Type: ${node.nodeType} / ${node._nodeType}`);
      console.log(`Is Agent Node: ${node.isAgentNode}`);
      console.log(`Input: ${input ? input.substring(0, 100) + '...' : 'No input'}`);
      console.log('\nNode Configuration:');
      console.log(`  Auto Iterate: ${node.autoIterate}`);
      console.log(`  Max Iterations: ${node.maxIterations}`);
      console.log(`  Enable Reasoning: ${node.enableReasoning}`);
      console.log(`  Use MCP Tools: ${node.useMCPTools}`);
      console.log(`  System Prompt: ${node.systemPrompt ? node.systemPrompt.substring(0, 100) + '...' : 'None'}`);
      
      // Check API configuration
      const config = window.ApiService && window.ApiService.openai ? window.ApiService.openai.getConfig() : null;
      console.log('\nAPI Configuration:');
      console.log(`  API Key: ${config && config.apiKey ? '✅ Set' : '❌ Not set'}`);
      console.log(`  Model: ${config ? config.model : 'Unknown'}`);
      
      // Check tools
      const tools = window.AgentTools ? window.AgentTools.getAllTools() : [];
      const mcpTools = window.MCPTools ? window.MCPTools.getAllTools() : [];
      console.log('\nTools Available:');
      console.log(`  Built-in Tools: ${tools.length}`);
      console.log(`  MCP Tools: ${mcpTools.length}`);
      console.log(`  Total: ${tools.length + mcpTools.length}`);
      
      // Check function calling support
      const supportsFunctionCalling = config && /^gpt-[34][\w.-]*/i.test(config.model || '');
      console.log(`\nFunction Calling Support: ${supportsFunctionCalling ? '✅ Yes' : '❌ No'}`);
      
      console.log('\n🚀 Starting processing...');
      console.log('================================\n');
      
      try {
        const result = await window.AgentNodeMonitor._originalProcess.call(this, node, input);
        console.log('\n✅ Processing completed successfully');
        console.log(`Result preview: ${result ? result.substring(0, 100) + '...' : 'No result'}`);
        return result;
      } catch (error) {
        console.error('\n❌ Processing failed:', error);
        throw error;
      }
    };
    
    // Monitor directProcessNode
    window.AgentProcessor.directProcessNode = async function(node, input) {
      console.log('\n⚠️  FALLBACK: Using directProcessNode (no function calling)');
      console.log(`This means the agent won't use tools!`);
      
      try {
        const result = await window.AgentNodeMonitor._originalDirectProcess.call(this, node, input);
        return result;
      } catch (error) {
        console.error('Direct processing failed:', error);
        throw error;
      }
    };
    
    console.log('✅ Agent node monitoring enabled');
  },
  
  // Disable monitoring
  disable: function() {
    if (this._originalProcess && window.AgentProcessor) {
      window.AgentProcessor.processAgentNode = this._originalProcess;
    }
    if (this._originalDirectProcess && window.AgentProcessor) {
      window.AgentProcessor.directProcessNode = this._originalDirectProcess;
    }
    console.log('Agent node monitoring disabled');
  },
  
  // Quick check of current workflow
  checkWorkflow: function() {
    if (!window.App || !window.App.nodes) {
      console.log('No workflow loaded');
      return;
    }
    
    console.log('\n📋 WORKFLOW ANALYSIS');
    console.log('===================');
    console.log(`Total nodes: ${window.App.nodes.length}`);
    
    const agentNodes = [];
    window.App.nodes.forEach((node, index) => {
      const isAgent = node.nodeType === 'agent' || node._nodeType === 'agent' || node.isAgentNode === true;
      
      console.log(`\nNode ${node.id}:`);
      console.log(`  Title: ${node.title}`);
      console.log(`  Type: ${node.nodeType} / ${node._nodeType}`);
      console.log(`  Is Agent: ${isAgent ? '✅' : '❌'}`);
      
      if (isAgent) {
        agentNodes.push(node);
        console.log(`  Auto Iterate: ${node.autoIterate}`);
        console.log(`  Max Iterations: ${node.maxIterations}`);
        console.log(`  Workflow Role: ${node.workflowRole || 'none'}`);
      }
    });
    
    console.log(`\n✅ Found ${agentNodes.length} agent nodes`);
    
    // Check connections
    if (window.App.connections && window.App.connections.length > 0) {
      console.log(`\nConnections: ${window.App.connections.length}`);
    }
    
    return agentNodes;
  }
};

// Auto-enable on load
setTimeout(() => {
  window.AgentNodeMonitor.enable();
  console.log('🔍 Agent Node Monitor auto-enabled. Use AgentNodeMonitor.checkWorkflow() to analyze.');
}, 1000);