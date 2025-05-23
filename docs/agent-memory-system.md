# Agent Memory System: Design and Implementation

## Introduction

An effective memory system is crucial for AI agents to maintain context, learn from past interactions, and make informed decisions. This document outlines the design and implementation of a memory system for agent nodes in our application.

## Memory System Architecture

The agent memory system consists of several components:

### 1. Short-Term Memory (Context)

Short-term memory stores recent interactions and is used to maintain context within a single session:

- **Conversation history**: Recent messages between the user and the agent
- **Tool usage history**: Recent tool calls and their results
- **Intermediate reasoning**: Step-by-step thinking process

### 2. Long-Term Memory (Knowledge)

Long-term memory stores persistent information across sessions:

- **User preferences**: Remembered user choices and settings
- **Previous interactions**: Summaries of past conversations
- **Learned patterns**: Recurring themes or requests

### 3. Working Memory (Active Processing)

Working memory is used for active reasoning and planning:

- **Current task state**: Progress on the current task
- **Partial results**: Intermediate outputs from tools
- **Action plan**: Sequence of steps to achieve the goal

## Implementation Details

### Memory Data Structure

The memory system uses a structured format to organize different types of information:

```javascript
// Memory structure
const memory = {
  // Short-term memory (context)
  context: [
    { timestamp: '2023-06-15T10:30:00Z', content: 'User asked about blockchain news' },
    { timestamp: '2023-06-15T10:30:15Z', content: 'Agent searched for blockchain news' }
  ],
  
  // Long-term memory (knowledge)
  knowledge: {
    userPreferences: {
      preferredTopics: ['blockchain', 'AI'],
      detailLevel: 'detailed'
    },
    pastInteractions: [
      { date: '2023-06-10', summary: 'Discussed blockchain technology basics' }
    ]
  },
  
  // Working memory (active processing)
  working: {
    currentTask: 'Find blockchain news from May 2025',
    planSteps: [
      { step: 1, action: 'Search for blockchain news', status: 'completed' },
      { step: 2, action: 'Filter results for May 2025', status: 'in-progress' }
    ],
    partialResults: {
      searchResults: ['Article 1', 'Article 2']
    }
  },
  
  // History of actions and results
  history: [
    {
      timestamp: '2023-06-15T10:30:15Z',
      action: { tool: 'search', params: { query: 'blockchain news May 2025' } },
      result: 'No specific results for May 2025 as it is in the future'
    }
  ],
  
  // Custom storage for arbitrary data
  storage: {
    'reflection_1': 'I should explain that May 2025 is in the future',
    'search_results': ['Result 1', 'Result 2']
  }
};
```

### Core Memory Operations

The memory system provides several core operations:

#### 1. Initialization

```javascript
// Initialize memory for a node
function initMemory(node) {
  if (!node.memory) {
    node.memory = {
      context: [],
      knowledge: {
        userPreferences: {},
        pastInteractions: []
      },
      working: {
        currentTask: '',
        planSteps: [],
        partialResults: {}
      },
      history: [],
      storage: {}
    };
  }
  return node.memory;
}
```

#### 2. Context Management

```javascript
// Add content to context
function addToContext(node, content) {
  const memory = initMemory(node);
  memory.context.push({
    timestamp: new Date().toISOString(),
    content: content
  });
  
  // Limit context size to prevent overflow
  if (memory.context.length > 50) {
    memory.context = memory.context.slice(-50);
  }
  
  return memory.context;
}

// Get context as a string
function getContextString(node) {
  const memory = initMemory(node);
  return memory.context.map(item => item.content).join('\n');
}
```

#### 3. History Tracking

```javascript
// Add to action history
function addToHistory(node, action, result) {
  const memory = initMemory(node);
  memory.history.push({
    timestamp: new Date().toISOString(),
    action: action,
    result: result
  });
  
  // Limit history size
  if (memory.history.length > 100) {
    memory.history = memory.history.slice(-100);
  }
  
  return memory.history;
}

// Get recent history
function getRecentHistory(node, count = 5) {
  const memory = initMemory(node);
  return memory.history.slice(-count);
}
```

#### 4. Storage Operations

```javascript
// Store arbitrary data
function store(node, key, value) {
  const memory = initMemory(node);
  memory.storage[key] = value;
  return value;
}

// Retrieve stored data
function retrieve(node, key) {
  const memory = initMemory(node);
  return memory.storage[key];
}

// Check if key exists
function has(node, key) {
  const memory = initMemory(node);
  return key in memory.storage;
}
```

### Memory Integration with Agent Processing

The memory system integrates with the agent processing flow:

#### 1. Before Processing

```javascript
// Before processing input
function prepareMemoryForProcessing(node, input) {
  // Initialize memory if needed
  const memory = initMemory(node);
  
  // Add input to context
  addToContext(node, `User: ${input}`);
  
  // Set current task
  memory.working.currentTask = input;
  
  // Clear partial results
  memory.working.partialResults = {};
  
  // Initialize plan steps
  memory.working.planSteps = [];
  
  return memory;
}
```

#### 2. During Tool Execution

```javascript
// During tool execution
function recordToolExecution(node, toolId, params, result) {
  // Add to history
  addToHistory(node, {
    tool: toolId,
    params: params
  }, result);
  
  // Add to context
  addToContext(node, `Tool ${toolId} executed with result: ${typeof result === 'string' ? result : JSON.stringify(result)}`);
  
  // Store in partial results
  const memory = initMemory(node);
  memory.working.partialResults[toolId] = result;
  
  return memory;
}
```

#### 3. After Processing

```javascript
// After processing
function finalizeMemory(node, result) {
  // Add result to context
  addToContext(node, `Agent: ${result}`);
  
  // Store the final result
  store(node, 'last_result', result);
  
  // Update knowledge based on interaction
  const memory = initMemory(node);
  
  // Add to past interactions if significant
  if (node.currentIteration > 1 || memory.history.length > 3) {
    memory.knowledge.pastInteractions.push({
      date: new Date().toISOString().split('T')[0],
      summary: `Processed "${memory.working.currentTask}" with ${memory.history.length} actions`
    });
    
    // Limit past interactions
    if (memory.knowledge.pastInteractions.length > 20) {
      memory.knowledge.pastInteractions = memory.knowledge.pastInteractions.slice(-20);
    }
  }
  
  return memory;
}
```

## Memory Usage in Agent Nodes

### 1. System Prompt Enhancement

The memory system can enhance the system prompt with context:

```javascript
function createEnhancedSystemPrompt(node) {
  const memory = initMemory(node);
  const basePrompt = node.systemPrompt || 'You are a helpful assistant.';
  
  // Add context from memory
  let contextAddition = '';
  if (memory.context.length > 0) {
    contextAddition = '\n\nRecent context:\n' + 
      memory.context.slice(-5).map(item => item.content).join('\n');
  }
  
  // Add user preferences if available
  let preferencesAddition = '';
  if (Object.keys(memory.knowledge.userPreferences).length > 0) {
    preferencesAddition = '\n\nUser preferences:\n' + 
      JSON.stringify(memory.knowledge.userPreferences, null, 2);
  }
  
  return basePrompt + contextAddition + preferencesAddition;
}
```

### 2. Reflection Support

The memory system supports agent reflection:

```javascript
function generateReflectionPrompt(node) {
  const memory = initMemory(node);
  const basePrompt = node.reflectionPrompt || 
    'Reflect on your previous actions and results. What worked well? What could be improved?';
  
  // Add history for reflection
  const historyText = memory.history
    .slice(-10)
    .map(item => 
      `Action: ${JSON.stringify(item.action)}\nResult: ${
        typeof item.result === 'string' ? item.result : JSON.stringify(item.result)
      }`
    )
    .join('\n\n');
  
  return `${basePrompt}\n\nTask: ${memory.working.currentTask}\n\nHistory:\n${historyText}`;
}
```

### 3. Tool Parameter Determination

The memory system helps determine tool parameters:

```javascript
function suggestToolParameters(node, toolId) {
  const memory = initMemory(node);
  
  // Check if we have the current task
  if (!memory.working.currentTask) {
    return null;
  }
  
  // For search tools, suggest the current task as the query
  if (toolId.includes('search')) {
    return {
      query: memory.working.currentTask
    };
  }
  
  // For other tools, check if we have relevant information in partial results
  if (memory.working.partialResults) {
    // Tool-specific logic here
  }
  
  return null;
}
```

## Complete AgentMemory Module

Here's a complete implementation of the `AgentMemory` module:

```javascript
const AgentMemory = {
  // Initialize memory for a node
  initMemory(node) {
    if (!node.memory) {
      node.memory = {
        context: [],
        knowledge: {
          userPreferences: {},
          pastInteractions: []
        },
        working: {
          currentTask: '',
          planSteps: [],
          partialResults: {}
        },
        history: [],
        storage: {}
      };
    }
    return node.memory;
  },
  
  // Add content to context
  addToContext(node, content) {
    const memory = this.initMemory(node);
    memory.context.push({
      timestamp: new Date().toISOString(),
      content: content
    });
    
    // Limit context size to prevent overflow
    if (memory.context.length > 50) {
      memory.context = memory.context.slice(-50);
    }
    
    return memory.context;
  },
  
  // Get context as a string
  getContextString(node) {
    const memory = this.initMemory(node);
    return memory.context.map(item => item.content).join('\n');
  },
  
  // Add to action history
  addToHistory(node, action, result) {
    const memory = this.initMemory(node);
    memory.history.push({
      timestamp: new Date().toISOString(),
      action: action,
      result: result
    });
    
    // Limit history size
    if (memory.history.length > 100) {
      memory.history = memory.history.slice(-100);
    }
    
    return memory.history;
  },
  
  // Get recent history
  getRecentHistory(node, count = 5) {
    const memory = this.initMemory(node);
    return memory.history.slice(-count);
  },
  
  // Store arbitrary data
  store(node, key, value) {
    const memory = this.initMemory(node);
    memory.storage[key] = value;
    return value;
  },
  
  // Retrieve stored data
  retrieve(node, key) {
    const memory = this.initMemory(node);
    return memory.storage[key];
  },
  
  // Check if key exists
  has(node, key) {
    const memory = this.initMemory(node);
    return key in memory.storage;
  },
  
  // Prepare memory for processing
  prepareForProcessing(node, input) {
    // Initialize memory if needed
    const memory = this.initMemory(node);
    
    // Add input to context
    this.addToContext(node, `User: ${input}`);
    
    // Set current task
    memory.working.currentTask = input;
    
    // Clear partial results
    memory.working.partialResults = {};
    
    // Initialize plan steps
    memory.working.planSteps = [];
    
    return memory;
  },
  
  // Record tool execution
  recordToolExecution(node, toolId, params, result) {
    // Add to history
    this.addToHistory(node, {
      tool: toolId,
      params: params
    }, result);
    
    // Add to context
    this.addToContext(node, `Tool ${toolId} executed with result: ${typeof result === 'string' ? result : JSON.stringify(result)}`);
    
    // Store in partial results
    const memory = this.initMemory(node);
    memory.working.partialResults[toolId] = result;
    
    return memory;
  },
  
  // Finalize memory after processing
  finalize(node, result) {
    // Add result to context
    this.addToContext(node, `Agent: ${result}`);
    
    // Store the final result
    this.store(node, 'last_result', result);
    
    // Update knowledge based on interaction
    const memory = this.initMemory(node);
    
    // Add to past interactions if significant
    if (node.currentIteration > 1 || memory.history.length > 3) {
      memory.knowledge.pastInteractions.push({
        date: new Date().toISOString().split('T')[0],
        summary: `Processed "${memory.working.currentTask}" with ${memory.history.length} actions`
      });
      
      // Limit past interactions
      if (memory.knowledge.pastInteractions.length > 20) {
        memory.knowledge.pastInteractions = memory.knowledge.pastInteractions.slice(-20);
      }
    }
    
    return memory;
  },
  
  // Create enhanced system prompt
  createEnhancedSystemPrompt(node) {
    const memory = this.initMemory(node);
    const basePrompt = node.systemPrompt || 'You are a helpful assistant.';
    
    // Add context from memory
    let contextAddition = '';
    if (memory.context.length > 0) {
      contextAddition = '\n\nRecent context:\n' + 
        memory.context.slice(-5).map(item => item.content).join('\n');
    }
    
    // Add user preferences if available
    let preferencesAddition = '';
    if (Object.keys(memory.knowledge.userPreferences).length > 0) {
      preferencesAddition = '\n\nUser preferences:\n' + 
        JSON.stringify(memory.knowledge.userPreferences, null, 2);
    }
    
    return basePrompt + contextAddition + preferencesAddition;
  },
  
  // Generate reflection prompt
  generateReflectionPrompt(node) {
    const memory = this.initMemory(node);
    const basePrompt = node.reflectionPrompt || 
      'Reflect on your previous actions and results. What worked well? What could be improved?';
    
    // Add history for reflection
    const historyText = memory.history
      .slice(-10)
      .map(item => 
        `Action: ${JSON.stringify(item.action)}\nResult: ${
          typeof item.result === 'string' ? item.result : JSON.stringify(item.result)
        }`
      )
      .join('\n\n');
    
    return `${basePrompt}\n\nTask: ${memory.working.currentTask}\n\nHistory:\n${historyText}`;
  }
};

// Export the AgentMemory object
window.AgentMemory = AgentMemory;
```

## Conclusion

An effective memory system is essential for creating truly agentic AI systems. The implementation outlined in this document provides a comprehensive memory architecture that supports context maintenance, history tracking, and knowledge accumulation. By integrating this memory system with agent nodes, we can create agents that maintain coherent conversations, learn from past interactions, and make informed decisions.
