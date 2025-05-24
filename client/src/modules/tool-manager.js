import EventBus from './event-bus.js';
import apiService from '../services/api-service.js';

/**
 * ToolManager - Manages AI tools and their execution
 */
export class ToolManager {
  constructor(options = {}) {
    this.options = {
      enableToolDiscovery: options.enableToolDiscovery !== false,
      toolTimeout: options.toolTimeout || 30000,
      maxConcurrentTools: options.maxConcurrentTools || 3,
      enableCaching: options.enableCaching !== false,
      debugMode: options.debugMode || false,
      ...options
    };
    
    // State
    this.tools = new Map();
    this.toolCategories = new Map();
    this.executionHistory = [];
    this.runningTools = new Set();
    this.toolCache = new Map();
    
    // Built-in tool categories
    this.builtInCategories = [
      'text',
      'web',
      'code',
      'data',
      'file',
      'ai',
      'utility',
      'integration'
    ];
    
    this.init();
  }

  /**
   * Initialize tool manager
   */
  init() {
    this.setupEventListeners();
    this.registerBuiltInTools();
    
    if (this.options.enableToolDiscovery) {
      this.discoverTools();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    EventBus.on('tool:register', this.registerTool.bind(this));
    EventBus.on('tool:execute', this.executeTool.bind(this));
    EventBus.on('tool:discover', this.discoverTools.bind(this));
    EventBus.on('agent:needsTools', this.suggestTools.bind(this));
  }

  /**
   * Register a tool
   */
  registerTool(toolData) {
    const tool = this.validateTool(toolData);
    
    this.tools.set(tool.name, tool);
    
    // Add to category
    if (!this.toolCategories.has(tool.category)) {
      this.toolCategories.set(tool.category, []);
    }
    this.toolCategories.get(tool.category).push(tool.name);
    
    EventBus.emit('tool:registered', { tool });
    
    if (this.options.debugMode) {
      console.log(`Tool registered: ${tool.name} (${tool.category})`);
    }
  }

  /**
   * Validate tool definition
   */
  validateTool(toolData) {
    const required = ['name', 'description', 'execute'];
    const missing = required.filter(field => !toolData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Tool missing required fields: ${missing.join(', ')}`);
    }

    return {
      name: toolData.name,
      description: toolData.description,
      category: toolData.category || 'utility',
      parameters: toolData.parameters || {
        type: 'object',
        properties: {},
        required: []
      },
      execute: toolData.execute,
      examples: toolData.examples || [],
      tags: toolData.tags || [],
      version: toolData.version || '1.0.0',
      author: toolData.author || 'Unknown',
      cacheable: toolData.cacheable !== false,
      timeout: toolData.timeout || this.options.toolTimeout,
      concurrent: toolData.concurrent !== false,
      metadata: toolData.metadata || {}
    };
  }

  /**
   * Execute a tool
   */
  async executeTool(data) {
    const { toolName, parameters, context, executionId } = data;
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Check concurrent execution limit
    if (this.runningTools.size >= this.options.maxConcurrentTools) {
      await this.waitForSlot();
    }

    const execution = {
      id: executionId || this.generateExecutionId(),
      toolName: toolName,
      parameters: parameters,
      context: context || {},
      startTime: Date.now(),
      status: 'running'
    };

    this.runningTools.add(execution.id);
    
    EventBus.emit('tool:executionStarted', { execution });

    try {
      // Check cache if enabled
      let result;
      const cacheKey = this.getCacheKey(toolName, parameters);
      
      if (this.options.enableCaching && tool.cacheable && this.toolCache.has(cacheKey)) {
        result = this.toolCache.get(cacheKey);
        execution.fromCache = true;
      } else {
        // Execute the tool
        result = await this.executeToolLogic(tool, parameters, context, execution);
        
        // Cache result if cacheable
        if (this.options.enableCaching && tool.cacheable) {
          this.toolCache.set(cacheKey, result);
        }
      }

      // Complete execution
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'completed';
      execution.result = result;

      this.addToHistory(execution);
      
      EventBus.emit('tool:executionCompleted', { execution, result });
      
      return result;

    } catch (error) {
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'failed';
      execution.error = error.message;

      this.addToHistory(execution);
      
      EventBus.emit('tool:executionFailed', { execution, error });
      
      throw error;
    } finally {
      this.runningTools.delete(execution.id);
    }
  }

  /**
   * Execute tool logic with timeout
   */
  async executeToolLogic(tool, parameters, context, execution) {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${tool.timeout}ms`));
      }, tool.timeout);
    });

    // Execute tool
    const executionPromise = tool.execute(parameters, context, execution);
    
    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Register built-in tools
   */
  registerBuiltInTools() {
    // Text tools
    this.registerTool({
      name: 'textTransform',
      description: 'Transform text using various operations',
      category: 'text',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Input text' },
          operation: { 
            type: 'string', 
            enum: ['uppercase', 'lowercase', 'title', 'reverse', 'trim'],
            description: 'Transformation operation'
          }
        },
        required: ['text', 'operation']
      },
      execute: (params) => {
        const { text, operation } = params;
        switch (operation) {
          case 'uppercase': return text.toUpperCase();
          case 'lowercase': return text.toLowerCase();
          case 'title': return text.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          case 'reverse': return text.split('').reverse().join('');
          case 'trim': return text.trim();
          default: return text;
        }
      },
      examples: [
        { params: { text: 'hello world', operation: 'uppercase' }, result: 'HELLO WORLD' }
      ]
    });

    // Web tools
    this.registerTool({
      name: 'httpRequest',
      description: 'Make HTTP requests to external APIs',
      category: 'web',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Request URL' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
          headers: { type: 'object', description: 'Request headers' },
          body: { type: 'string', description: 'Request body' }
        },
        required: ['url']
      },
      execute: async (params) => {
        const { url, method = 'GET', headers = {}, body } = params;
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      }
    });

    // Code tools
    this.registerTool({
      name: 'codeFormat',
      description: 'Format code using various formatters',
      category: 'code',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to format' },
          language: { type: 'string', description: 'Programming language' },
          options: { type: 'object', description: 'Formatting options' }
        },
        required: ['code', 'language']
      },
      execute: async (params) => {
        // This would integrate with actual code formatters
        return `// Formatted ${params.language} code\n${params.code}`;
      }
    });

    // Data tools
    this.registerTool({
      name: 'jsonPath',
      description: 'Extract data from JSON using JSONPath expressions',
      category: 'data',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'JSON data' },
          path: { type: 'string', description: 'JSONPath expression' }
        },
        required: ['data', 'path']
      },
      execute: (params) => {
        // Simple JSONPath implementation
        const { data, path } = params;
        try {
          // This would use a proper JSONPath library
          if (path.startsWith('$.')) {
            const keys = path.slice(2).split('.');
            let result = data;
            for (const key of keys) {
              result = result[key];
            }
            return result;
          }
          return data;
        } catch (error) {
          throw new Error(`JSONPath error: ${error.message}`);
        }
      }
    });

    // Utility tools
    this.registerTool({
      name: 'delay',
      description: 'Add a delay/wait in workflow execution',
      category: 'utility',
      parameters: {
        type: 'object',
        properties: {
          duration: { type: 'number', description: 'Delay duration in milliseconds' },
          passthrough: { type: 'any', description: 'Data to pass through after delay' }
        },
        required: ['duration']
      },
      execute: async (params) => {
        await new Promise(resolve => setTimeout(resolve, params.duration));
        return params.passthrough || { delayed: true, duration: params.duration };
      }
    });

    // AI tools
    this.registerTool({
      name: 'generateText',
      description: 'Generate text using AI models',
      category: 'ai',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text prompt' },
          model: { type: 'string', description: 'AI model to use' },
          maxTokens: { type: 'number', description: 'Maximum tokens to generate' },
          temperature: { type: 'number', description: 'Generation temperature' }
        },
        required: ['prompt']
      },
      execute: async (params) => {
        return await apiService.generateText(params);
      },
      cacheable: false // AI responses shouldn't be cached
    });
  }

  /**
   * Discover available tools
   */
  async discoverTools() {
    try {
      // Discover from API
      const discoveredTools = await apiService.discoverTools();
      
      discoveredTools.forEach(toolData => {
        try {
          this.registerTool(toolData);
        } catch (error) {
          console.warn(`Failed to register discovered tool: ${error.message}`);
        }
      });

      EventBus.emit('tools:discovered', { count: discoveredTools.length });
      
    } catch (error) {
      console.warn('Tool discovery failed:', error.message);
    }
  }

  /**
   * Suggest tools for agent needs
   */
  suggestTools(data) {
    const { query, context, taskType } = data;
    const suggestions = [];

    // Simple keyword-based suggestions
    const keywords = query.toLowerCase().split(/\s+/);
    
    this.tools.forEach(tool => {
      let score = 0;
      
      // Check tool name and description
      const toolText = `${tool.name} ${tool.description} ${tool.tags.join(' ')}`.toLowerCase();
      keywords.forEach(keyword => {
        if (toolText.includes(keyword)) {
          score += 1;
        }
      });

      // Category bonus
      if (taskType && tool.category === taskType) {
        score += 2;
      }

      if (score > 0) {
        suggestions.push({
          tool: tool,
          score: score,
          reason: `Matches keywords: ${keywords.filter(k => toolText.includes(k)).join(', ')}`
        });
      }
    });

    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);

    EventBus.emit('tools:suggested', { 
      query, 
      suggestions: suggestions.slice(0, 5) 
    });

    return suggestions;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category) {
    const toolNames = this.toolCategories.get(category) || [];
    return toolNames.map(name => this.tools.get(name)).filter(Boolean);
  }

  /**
   * Get all tools
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Search tools
   */
  searchTools(query) {
    const results = [];
    const searchTerm = query.toLowerCase();

    this.tools.forEach(tool => {
      const searchableText = `${tool.name} ${tool.description} ${tool.tags.join(' ')}`.toLowerCase();
      if (searchableText.includes(searchTerm)) {
        results.push(tool);
      }
    });

    return results;
  }

  /**
   * Get tool execution statistics
   */
  getToolStats(toolName) {
    const executions = this.executionHistory.filter(e => e.toolName === toolName);
    
    if (executions.length === 0) {
      return null;
    }

    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      totalExecutions: executions.length,
      successful: successful,
      failed: failed,
      successRate: (successful / executions.length) * 100,
      averageDuration: totalDuration / executions.length,
      lastExecution: executions[executions.length - 1]
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalTools = this.tools.size;
    const cacheableTools = Array.from(this.tools.values()).filter(t => t.cacheable).length;
    const cacheSize = this.toolCache.size;
    
    const cacheHits = this.executionHistory.filter(e => e.fromCache).length;
    const totalExecutions = this.executionHistory.length;
    const hitRate = totalExecutions > 0 ? (cacheHits / totalExecutions) * 100 : 0;

    return {
      totalTools,
      cacheableTools,
      cacheSize,
      hitRate,
      cacheHits,
      totalExecutions
    };
  }

  /**
   * Clear tool cache
   */
  clearCache() {
    this.toolCache.clear();
    EventBus.emit('tools:cacheCleared');
  }

  /**
   * Wait for execution slot
   */
  async waitForSlot() {
    return new Promise(resolve => {
      const checkSlot = () => {
        if (this.runningTools.size < this.options.maxConcurrentTools) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * Generate execution ID
   */
  generateExecutionId() {
    return `tool_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cache key
   */
  getCacheKey(toolName, parameters) {
    return `${toolName}_${JSON.stringify(parameters)}`;
  }

  /**
   * Add execution to history
   */
  addToHistory(execution) {
    this.executionHistory.unshift(execution);
    
    // Limit history size
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(0, 1000);
    }
  }

  /**
   * Get execution history
   */
  getHistory(limit = 50) {
    return this.executionHistory.slice(0, limit);
  }

  /**
   * Export tools for external use
   */
  exportTools() {
    const tools = [];
    
    this.tools.forEach(tool => {
      tools.push({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameters: tool.parameters,
        examples: tool.examples,
        tags: tool.tags,
        version: tool.version,
        author: tool.author
      });
    });

    return tools;
  }

  /**
   * Import tools from external source
   */
  importTools(toolsData) {
    let imported = 0;
    let failed = 0;

    toolsData.forEach(toolData => {
      try {
        // Add execute function if missing (would need to be provided elsewhere)
        if (!toolData.execute) {
          toolData.execute = async () => {
            throw new Error('Tool execution not implemented');
          };
        }
        
        this.registerTool(toolData);
        imported++;
      } catch (error) {
        console.warn(`Failed to import tool ${toolData.name}:`, error.message);
        failed++;
      }
    });

    EventBus.emit('tools:imported', { imported, failed });
    return { imported, failed };
  }

  /**
   * Cleanup
   */
  destroy() {
    // Stop all running tools
    this.runningTools.clear();
    
    // Clear caches
    this.clearCache();
    
    // Clear history
    this.executionHistory = [];
    
    // Remove event listeners
    EventBus.off('tool:register', this.registerTool);
    EventBus.off('tool:execute', this.executeTool);
    EventBus.off('tool:discover', this.discoverTools);
    EventBus.off('agent:needsTools', this.suggestTools);
  }
}

export default ToolManager;