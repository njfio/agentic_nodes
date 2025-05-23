// Help agents understand when they're done to avoid hitting max iterations
console.log('🎯 Improving agent completion detection...');

// Override the agent's completion check logic
if (window.AgentProcessor) {
  // Store original methods if they exist
  const originalFunctions = {};
  
  // Add better prompting for completion detection
  const enhanceSystemPrompt = (originalPrompt) => {
    return originalPrompt + `

IMPORTANT: Task Completion Guidelines
- Once you have gathered sufficient information to answer the user's query, provide a final comprehensive response
- If you've successfully used tools and obtained results, synthesize them into a complete answer
- Do not continue iterating if you have already addressed the user's question
- Be decisive: if you have the information needed, conclude your response
- If a tool fails but you can provide a meaningful answer without it, do so and conclude`;
  };
  
  // Intercept system prompt creation
  if (window.AgentNodes && window.AgentNodes.createSystemPrompt) {
    const originalCreatePrompt = window.AgentNodes.createSystemPrompt;
    
    window.AgentNodes.createSystemPrompt = function(node, role) {
      const prompt = originalCreatePrompt.call(this, node, role);
      return enhanceSystemPrompt(prompt);
    };
    
    console.log('✅ Enhanced system prompt for better completion detection');
  }
  
  // Also add a check to see if the agent is repeating itself
  const checkForRepetition = (messages) => {
    if (messages.length < 4) return false;
    
    // Check if the last few assistant messages are very similar
    const assistantMessages = messages
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content || '');
    
    if (assistantMessages.length < 2) return false;
    
    // Simple similarity check - if messages are very similar, agent might be stuck
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    const previousMessage = assistantMessages[assistantMessages.length - 2];
    
    if (lastMessage && previousMessage) {
      const similarity = (lastMessage.length > 100 && previousMessage.length > 100) &&
                        (lastMessage.substring(0, 100) === previousMessage.substring(0, 100));
      
      if (similarity) {
        console.warn('⚠️ Agent appears to be repeating responses');
        return true;
      }
    }
    
    return false;
  };
  
  // Add repetition detection to the message array
  const originalProcessing = window.AgentProcessor.processAgentNode;
  window.AgentProcessor.processAgentNode = async function(node, input, options = {}) {
    const wrappedOptions = {
      ...options,
      onBeforeIteration: async (messages) => {
        // Check for repetition
        if (checkForRepetition(messages)) {
          console.log('🛑 Detected repetition, suggesting completion');
          // Add a system message to encourage completion
          messages.push({
            role: 'system',
            content: 'You appear to be repeating yourself. Please provide a final, comprehensive answer and conclude.'
          });
        }
        
        if (options.onBeforeIteration) {
          return options.onBeforeIteration(messages);
        }
      }
    };
    
    return originalProcessing.call(this, node, input, wrappedOptions);
  };
  
  console.log('✅ Agent completion detection improvements installed');
}

console.log('✅ Agent completion fixes complete');