// Debug script to monitor agent tools loading
console.log('=== Agent Tools Debug Script Loaded ===');

// Override AgentTools.getAllTools to log when it's called
if (window.AgentTools && window.AgentTools.getAllTools) {
  const originalGetAllTools = window.AgentTools.getAllTools;
  window.AgentTools.getAllTools = function() {
    console.log('🔧 AgentTools.getAllTools() called');
    const tools = originalGetAllTools.call(this);
    console.log(`🔧 Returning ${tools.length} tools:`, tools.map(t => t.id));
    return tools;
  };
}

// Override the node process method to see what's happening
if (window.Node && window.Node.prototype.process) {
  const originalProcess = window.Node.prototype.process;
  window.Node.prototype.process = async function(input) {
    if (this.nodeType === 'agent' || this._nodeType === 'agent' || this.isAgentNode) {
      console.log(`🤖 Processing agent node ${this.id}:`, {
        nodeType: this.nodeType,
        _nodeType: this._nodeType,
        isAgentNode: this.isAgentNode,
        hasTools: !!(this.tools && this.tools.length > 0),
        toolCount: this.tools ? this.tools.length : 0
      });
    }
    return originalProcess.call(this, input);
  };
}

// Monitor when agent nodes are created
if (window.App && window.App.addAgentNode) {
  const originalAddAgentNode = window.App.addAgentNode;
  window.App.addAgentNode = function() {
    console.log('🤖 Creating new agent node via App.addAgentNode');
    const node = originalAddAgentNode.call(this);
    console.log('🤖 Created agent node:', {
      id: node.id,
      nodeType: node.nodeType,
      _nodeType: node._nodeType,
      isAgentNode: node.isAgentNode,
      hasTools: !!(node.tools && node.tools.length > 0),
      toolCount: node.tools ? node.tools.length : 0
    });
    return node;
  };
}

// Check if AgentNodes is using the right processor
setTimeout(() => {
  if (window.AgentNodes) {
    console.log('✓ AgentNodes available:', {
      hasProcessAgentNode: typeof window.AgentNodes.processAgentNode === 'function',
      hasGetAllTools: typeof window.AgentTools?.getAllTools === 'function',
      toolsCount: window.AgentTools?.tools?.length || 0
    });
  }
}, 2000);