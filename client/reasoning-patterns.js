const ReasoningPatterns = {
  applyPattern(node, messages) {
    if (!node || !Array.isArray(messages) || messages.length === 0) return messages;
    const instructionMap = {
      'chain-of-thought': 'Please reason step by step before you answer.',
      'tree-of-thought': 'Explore multiple possible reasoning branches before deciding on an answer.',
      'react': 'Use the ReAct approach: alternate reasoning with tool use when needed.',
      'reflection': 'Reflect on prior steps and consider improvements before answering.',
      'planning': 'Begin by writing a short plan of action before executing any steps.',
      'reflective': 'After reasoning, briefly reflect on your answer before responding.'
    };
    const extra = instructionMap[node.reasoningPattern];
    if (extra && messages[0].role === 'system') {
      messages[0].content = messages[0].content + ' ' + extra;
    }
    return messages;
  }
};
