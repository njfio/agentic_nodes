// Fix agent nodes to use original user query instead of previous node output
console.log('🔧 Fixing agent nodes to use original query...');

// Store the original user query
let originalUserQuery = null;

// Intercept workflow processing to capture original query
if (window.WorkflowIO) {
  const originalProcessWorkflow = window.WorkflowIO.processWorkflow;
  
  window.WorkflowIO.processWorkflow = async function(workflow, initialInput) {
    console.log('📝 Capturing original user query:', initialInput);
    originalUserQuery = initialInput;
    
    // Call original method
    return originalProcessWorkflow.call(this, workflow, initialInput);
  };
}

// Also intercept the node processing to use original query for agent nodes
setTimeout(() => {
  if (!window.App || !window.App.nodes) {
    console.warn('App.nodes not ready yet, will retry...');
    return;
  }
  
  // Find all nodes and update their processing
  window.App.nodes.forEach(node => {
    if (node._originalProcessIntercepted) {
      // Already intercepted, update it
      const prevProcess = node.process;
      
      node.process = async function(input) {
        // Check if this is an agent node
        const isAgent = this.title && this.title.toLowerCase().includes('agent');
        
        if (isAgent && originalUserQuery) {
          console.log(`🎯 Agent node ${this.id} using original query instead of input`);
          console.log('Original query:', originalUserQuery);
          console.log('(Ignoring previous node output:', input, ')');
          
          // Use original query instead of input from previous node
          return prevProcess.call(this, originalUserQuery);
        }
        
        // For non-agent nodes, use normal input
        return prevProcess.call(this, input);
      };
    }
  });
  
  console.log('✅ Agent nodes will now use original user query');
}, 1000);

// Also update WorkflowIO.sendMessage to capture user queries
if (window.WorkflowIO && window.WorkflowIO.sendMessage) {
  const originalSendMessage = window.WorkflowIO.sendMessage;
  
  window.WorkflowIO.sendMessage = async function(message) {
    console.log('📝 User message sent:', message);
    originalUserQuery = message;
    
    return originalSendMessage.call(this, message);
  };
}

console.log('✅ Agent original query fix installed');