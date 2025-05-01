/**
 * Agent Memory
 * Implements memory management for agent nodes
 */

const AgentMemory = {
  // Initialize memory for a node
  initMemory(node) {
    if (!node.memory) {
      node.memory = {
        shortTerm: {},  // For current session data
        longTerm: {},   // For persistent data
        context: [],    // For conversation context
        variables: {},  // For user-defined variables
        history: []     // For action history
      };
    }
    return node.memory;
  },

  // Store a value in memory
  store(node, key, value, memoryType = 'shortTerm') {
    const memory = this.initMemory(node);
    
    if (!memory[memoryType]) {
      throw new Error(`Invalid memory type: ${memoryType}`);
    }
    
    memory[memoryType][key] = value;
    
    // Log the memory update
    DebugManager.addLog(`Agent memory updated: ${key} = ${typeof value === 'object' ? JSON.stringify(value) : value} (${memoryType})`, 'info');
    
    return value;
  },

  // Retrieve a value from memory
  retrieve(node, key, memoryType = 'shortTerm') {
    const memory = this.initMemory(node);
    
    if (!memory[memoryType]) {
      throw new Error(`Invalid memory type: ${memoryType}`);
    }
    
    return memory[memoryType][key];
  },

  // Add an item to context
  addToContext(node, item) {
    const memory = this.initMemory(node);
    memory.context.push({
      timestamp: Date.now(),
      content: item
    });
    
    // Limit context size to prevent memory issues
    if (memory.context.length > 50) {
      memory.context.shift();
    }
    
    return memory.context;
  },

  // Get the current context
  getContext(node) {
    const memory = this.initMemory(node);
    return memory.context;
  },

  // Add an action to history
  addToHistory(node, action, result) {
    const memory = this.initMemory(node);
    memory.history.push({
      timestamp: Date.now(),
      action,
      result
    });
    
    // Limit history size to prevent memory issues
    if (memory.history.length > 100) {
      memory.history.shift();
    }
    
    return memory.history;
  },

  // Get the action history
  getHistory(node) {
    const memory = this.initMemory(node);
    return memory.history;
  },

  // Clear memory
  clear(node, memoryType = 'all') {
    const memory = this.initMemory(node);
    
    if (memoryType === 'all') {
      node.memory = {
        shortTerm: {},
        longTerm: {},
        context: [],
        variables: {},
        history: []
      };
    } else if (memory[memoryType]) {
      if (Array.isArray(memory[memoryType])) {
        memory[memoryType] = [];
      } else {
        memory[memoryType] = {};
      }
    } else {
      throw new Error(`Invalid memory type: ${memoryType}`);
    }
    
    DebugManager.addLog(`Agent memory cleared: ${memoryType}`, 'info');
    
    return memory;
  },

  // Export memory to JSON
  exportMemory(node) {
    const memory = this.initMemory(node);
    return JSON.stringify(memory, null, 2);
  },

  // Import memory from JSON
  importMemory(node, json) {
    try {
      const importedMemory = JSON.parse(json);
      node.memory = importedMemory;
      DebugManager.addLog('Agent memory imported successfully', 'success');
      return node.memory;
    } catch (error) {
      DebugManager.addLog(`Error importing memory: ${error.message}`, 'error');
      throw error;
    }
  }
};

// Export the AgentMemory object
window.AgentMemory = AgentMemory;
