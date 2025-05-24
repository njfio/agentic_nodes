import EventBus from './event-bus.js';
import apiService from '../services/api-service.js';

/**
 * WorkflowEngine - Executes workflows and manages node processing
 */
export class WorkflowEngine {
  constructor(options = {}) {
    this.options = {
      maxConcurrentNodes: options.maxConcurrentNodes || 5,
      executionTimeout: options.executionTimeout || 30000,
      enableCaching: options.enableCaching !== false,
      debugMode: options.debugMode || false,
      ...options
    };
    
    // State
    this.isRunning = false;
    this.isPaused = false;
    this.currentExecution = null;
    this.executionHistory = [];
    this.nodeStates = new Map();
    this.nodeCache = new Map();
    this.executionQueue = [];
    this.runningNodes = new Set();
    
    // Statistics
    this.stats = {
      totalExecutions: 0,
      totalNodes: 0,
      totalTime: 0,
      successRate: 0,
      errors: []
    };
    
    this.init();
  }

  /**
   * Initialize workflow engine
   */
  init() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    EventBus.on('workflow:execute', this.executeWorkflow.bind(this));
    EventBus.on('workflow:pause', this.pauseExecution.bind(this));
    EventBus.on('workflow:resume', this.resumeExecution.bind(this));
    EventBus.on('workflow:stop', this.stopExecution.bind(this));
    EventBus.on('node:execute', this.executeNode.bind(this));
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(data) {
    const { workflow, startNode, inputs } = data;
    
    if (this.isRunning && !this.options.allowConcurrent) {
      throw new Error('Workflow execution already in progress');
    }

    // Create execution context
    const execution = {
      id: this.generateExecutionId(),
      workflow: workflow,
      startNode: startNode,
      inputs: inputs || {},
      startTime: Date.now(),
      status: 'running',
      results: new Map(),
      errors: [],
      nodeOrder: [],
      metadata: {
        totalNodes: 0,
        completedNodes: 0,
        failedNodes: 0
      }
    };

    this.currentExecution = execution;
    this.isRunning = true;
    this.isPaused = false;

    EventBus.emit('workflow:started', { execution });

    try {
      // Build execution graph
      const executionGraph = this.buildExecutionGraph(workflow, startNode);
      
      // Execute nodes in topological order
      const result = await this.executeGraph(executionGraph, inputs, execution);
      
      // Complete execution
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.result = result;
      
      this.addToHistory(execution);
      this.updateStats(execution);
      
      EventBus.emit('workflow:completed', { execution, result });
      
      return result;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error.message;
      execution.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
      
      this.addToHistory(execution);
      this.updateStats(execution);
      
      EventBus.emit('workflow:failed', { execution, error });
      
      throw error;
    } finally {
      this.isRunning = false;
      this.currentExecution = null;
      this.runningNodes.clear();
    }
  }

  /**
   * Build execution graph from workflow
   */
  buildExecutionGraph(workflow, startNode) {
    const graph = {
      nodes: new Map(),
      edges: new Map(),
      roots: [],
      leaves: []
    };

    // Add all nodes
    workflow.nodes.forEach(node => {
      graph.nodes.set(node.id, {
        ...node,
        dependencies: new Set(),
        dependents: new Set(),
        status: 'pending',
        level: 0
      });
    });

    // Add edges and build dependency graph
    workflow.connections.forEach(conn => {
      const sourceNode = graph.nodes.get(conn.sourceId);
      const targetNode = graph.nodes.get(conn.targetId);
      
      if (sourceNode && targetNode) {
        targetNode.dependencies.add(sourceNode.id);
        sourceNode.dependents.add(targetNode.id);
        
        if (!graph.edges.has(sourceNode.id)) {
          graph.edges.set(sourceNode.id, []);
        }
        graph.edges.get(sourceNode.id).push({
          target: targetNode.id,
          sourceSocket: conn.sourceSocket,
          targetSocket: conn.targetSocket
        });
      }
    });

    // Calculate execution levels (topological sort)
    this.calculateExecutionLevels(graph);

    // Find roots and leaves
    graph.nodes.forEach(node => {
      if (node.dependencies.size === 0) {
        graph.roots.push(node.id);
      }
      if (node.dependents.size === 0) {
        graph.leaves.push(node.id);
      }
    });

    // If startNode specified, filter to only include connected nodes
    if (startNode) {
      return this.filterGraphFromStartNode(graph, startNode);
    }

    return graph;
  }

  /**
   * Calculate execution levels for topological ordering
   */
  calculateExecutionLevels(graph) {
    const visited = new Set();
    const calculating = new Set();

    const calculateLevel = (nodeId) => {
      if (calculating.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node ${nodeId}`);
      }
      
      if (visited.has(nodeId)) {
        return graph.nodes.get(nodeId).level;
      }

      calculating.add(nodeId);
      const node = graph.nodes.get(nodeId);
      
      let maxLevel = 0;
      for (const depId of node.dependencies) {
        const depLevel = calculateLevel(depId);
        maxLevel = Math.max(maxLevel, depLevel + 1);
      }
      
      node.level = maxLevel;
      calculating.delete(nodeId);
      visited.add(nodeId);
      
      return maxLevel;
    };

    graph.nodes.forEach((node, nodeId) => {
      if (!visited.has(nodeId)) {
        calculateLevel(nodeId);
      }
    });
  }

  /**
   * Execute the graph
   */
  async executeGraph(graph, inputs, execution) {
    const nodesByLevel = this.groupNodesByLevel(graph);
    const results = new Map();
    const globalContext = { ...inputs };

    execution.metadata.totalNodes = graph.nodes.size;

    // Execute nodes level by level
    for (const [level, nodeIds] of nodesByLevel) {
      if (this.isPaused) {
        await this.waitForResume();
      }

      if (!this.isRunning) {
        throw new Error('Execution was stopped');
      }

      // Execute nodes in this level concurrently
      const levelPromises = nodeIds.map(nodeId => 
        this.executeNodeInGraph(graph, nodeId, results, globalContext, execution)
      );

      await Promise.all(levelPromises);
    }

    // Return final results
    if (graph.leaves.length === 1) {
      return results.get(graph.leaves[0]);
    } else {
      const finalResults = {};
      graph.leaves.forEach(leafId => {
        finalResults[leafId] = results.get(leafId);
      });
      return finalResults;
    }
  }

  /**
   * Execute a single node in the graph
   */
  async executeNodeInGraph(graph, nodeId, results, globalContext, execution) {
    const node = graph.nodes.get(nodeId);
    
    if (this.runningNodes.size >= this.options.maxConcurrentNodes) {
      // Wait for a slot to become available
      while (this.runningNodes.size >= this.options.maxConcurrentNodes) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    this.runningNodes.add(nodeId);
    node.status = 'running';
    node.startTime = Date.now();

    EventBus.emit('node:executionStarted', { 
      nodeId, 
      node, 
      execution: execution.id 
    });

    try {
      // Gather inputs from dependencies
      const nodeInputs = this.gatherNodeInputs(graph, nodeId, results, globalContext);
      
      // Check cache if enabled
      let result;
      const cacheKey = this.getCacheKey(node, nodeInputs);
      
      if (this.options.enableCaching && this.nodeCache.has(cacheKey)) {
        result = this.nodeCache.get(cacheKey);
        node.fromCache = true;
      } else {
        // Execute the node
        result = await this.executeNodeLogic(node, nodeInputs, execution);
        
        // Cache result if cacheable
        if (this.options.enableCaching && this.isNodeCacheable(node)) {
          this.nodeCache.set(cacheKey, result);
        }
      }

      // Store result
      results.set(nodeId, result);
      node.status = 'completed';
      node.endTime = Date.now();
      node.duration = node.endTime - node.startTime;
      node.result = result;

      execution.metadata.completedNodes++;
      execution.nodeOrder.push(nodeId);

      EventBus.emit('node:executionCompleted', { 
        nodeId, 
        node, 
        result, 
        execution: execution.id 
      });

    } catch (error) {
      node.status = 'failed';
      node.endTime = Date.now();
      node.duration = node.endTime - node.startTime;
      node.error = error.message;

      execution.metadata.failedNodes++;
      execution.errors.push({
        nodeId,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });

      EventBus.emit('node:executionFailed', { 
        nodeId, 
        node, 
        error, 
        execution: execution.id 
      });

      // Decide whether to continue or fail
      if (node.continueOnError) {
        results.set(nodeId, { error: error.message });
      } else {
        throw new Error(`Node ${nodeId} failed: ${error.message}`);
      }
    } finally {
      this.runningNodes.delete(nodeId);
    }
  }

  /**
   * Execute node logic
   */
  async executeNodeLogic(node, inputs, execution) {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Node execution timeout after ${this.options.executionTimeout}ms`));
      }, this.options.executionTimeout);
    });

    // Execute node with timeout
    const executionPromise = this.callNodeProcessor(node, inputs, execution);
    
    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Call the appropriate node processor
   */
  async callNodeProcessor(node, inputs, execution) {
    // This would delegate to the specific node type implementation
    const result = EventBus.emitSync('node:process', { 
      node, 
      inputs, 
      execution: execution.id 
    });
    
    if (result?.processed) {
      return result.output;
    }

    // Fallback to API call for legacy nodes
    return await apiService.processNode({
      nodeId: node.id,
      nodeType: node.type,
      nodeData: node.data,
      inputs: inputs,
      executionId: execution.id
    });
  }

  /**
   * Gather inputs for a node from its dependencies
   */
  gatherNodeInputs(graph, nodeId, results, globalContext) {
    const node = graph.nodes.get(nodeId);
    const inputs = { ...globalContext };

    // Get inputs from connected nodes
    graph.nodes.forEach((sourceNode, sourceId) => {
      const edges = graph.edges.get(sourceId) || [];
      edges.forEach(edge => {
        if (edge.target === nodeId) {
          const sourceResult = results.get(sourceId);
          if (sourceResult !== undefined) {
            // Map source output to target input
            if (edge.sourceSocket && edge.targetSocket) {
              inputs[edge.targetSocket] = sourceResult[edge.sourceSocket] || sourceResult;
            } else {
              inputs[sourceId] = sourceResult;
            }
          }
        }
      });
    });

    return inputs;
  }

  /**
   * Group nodes by execution level
   */
  groupNodesByLevel(graph) {
    const levelMap = new Map();
    
    graph.nodes.forEach((node, nodeId) => {
      if (!levelMap.has(node.level)) {
        levelMap.set(node.level, []);
      }
      levelMap.get(node.level).push(nodeId);
    });

    return new Map([...levelMap.entries()].sort(([a], [b]) => a - b));
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cache key for node
   */
  getCacheKey(node, inputs) {
    return `${node.type}_${node.id}_${JSON.stringify(inputs)}`;
  }

  /**
   * Check if node result is cacheable
   */
  isNodeCacheable(node) {
    // Don't cache nodes that have side effects or time-dependent results
    const nonCacheableTypes = ['http', 'database', 'file', 'random', 'timestamp'];
    return !nonCacheableTypes.includes(node.type) && !node.disableCache;
  }

  /**
   * Pause execution
   */
  pauseExecution() {
    this.isPaused = true;
    EventBus.emit('workflow:paused', { execution: this.currentExecution });
  }

  /**
   * Resume execution
   */
  resumeExecution() {
    this.isPaused = false;
    EventBus.emit('workflow:resumed', { execution: this.currentExecution });
  }

  /**
   * Stop execution
   */
  stopExecution() {
    this.isRunning = false;
    this.isPaused = false;
    EventBus.emit('workflow:stopped', { execution: this.currentExecution });
  }

  /**
   * Wait for resume when paused
   */
  async waitForResume() {
    return new Promise(resolve => {
      const checkResume = () => {
        if (!this.isPaused) {
          resolve();
        } else {
          setTimeout(checkResume, 100);
        }
      };
      checkResume();
    });
  }

  /**
   * Execute a single node
   */
  async executeNode(data) {
    const { node, inputs } = data;
    
    const mockExecution = {
      id: this.generateExecutionId(),
      status: 'running'
    };

    try {
      const result = await this.executeNodeLogic(node, inputs, mockExecution);
      
      EventBus.emit('node:executed', { node, inputs, result });
      return result;
      
    } catch (error) {
      EventBus.emit('node:executionError', { node, inputs, error });
      throw error;
    }
  }

  /**
   * Add execution to history
   */
  addToHistory(execution) {
    this.executionHistory.unshift(execution);
    
    // Limit history size
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }
  }

  /**
   * Update statistics
   */
  updateStats(execution) {
    this.stats.totalExecutions++;
    this.stats.totalNodes += execution.metadata.totalNodes;
    this.stats.totalTime += execution.duration || 0;
    
    const successCount = this.executionHistory.filter(e => e.status === 'completed').length;
    this.stats.successRate = (successCount / this.executionHistory.length) * 100;
    
    if (execution.status === 'failed') {
      this.stats.errors.push({
        executionId: execution.id,
        error: execution.error,
        timestamp: execution.endTime
      });
      
      // Limit error history
      if (this.stats.errors.length > 50) {
        this.stats.errors = this.stats.errors.slice(0, 50);
      }
    }
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageExecutionTime: this.stats.totalExecutions > 0 
        ? this.stats.totalTime / this.stats.totalExecutions 
        : 0,
      averageNodesPerExecution: this.stats.totalExecutions > 0
        ? this.stats.totalNodes / this.stats.totalExecutions
        : 0
    };
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = [];
    this.stats.errors = [];
  }

  /**
   * Clear node cache
   */
  clearCache() {
    this.nodeCache.clear();
    EventBus.emit('workflow:cacheCleared');
  }

  /**
   * Get execution history
   */
  getHistory(limit = 20) {
    return this.executionHistory.slice(0, limit);
  }

  /**
   * Get current execution status
   */
  getExecutionStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentExecution: this.currentExecution,
      runningNodes: Array.from(this.runningNodes),
      queueSize: this.executionQueue.length
    };
  }

  /**
   * Filter graph to only include nodes reachable from start node
   */
  filterGraphFromStartNode(graph, startNodeId) {
    const reachableNodes = new Set();
    const queue = [startNodeId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (reachableNodes.has(nodeId)) continue;
      
      reachableNodes.add(nodeId);
      const node = graph.nodes.get(nodeId);
      
      if (node) {
        node.dependents.forEach(depId => {
          if (!reachableNodes.has(depId)) {
            queue.push(depId);
          }
        });
      }
    }

    // Create filtered graph
    const filteredGraph = {
      nodes: new Map(),
      edges: new Map(),
      roots: [],
      leaves: []
    };

    // Copy reachable nodes
    reachableNodes.forEach(nodeId => {
      filteredGraph.nodes.set(nodeId, graph.nodes.get(nodeId));
      if (graph.edges.has(nodeId)) {
        const filteredEdges = graph.edges.get(nodeId).filter(edge => 
          reachableNodes.has(edge.target)
        );
        if (filteredEdges.length > 0) {
          filteredGraph.edges.set(nodeId, filteredEdges);
        }
      }
    });

    // Recalculate roots and leaves
    filteredGraph.nodes.forEach((node, nodeId) => {
      const hasIncomingEdges = Array.from(filteredGraph.edges.values())
        .some(edges => edges.some(edge => edge.target === nodeId));
      
      if (!hasIncomingEdges) {
        filteredGraph.roots.push(nodeId);
      }
      
      if (node.dependents.size === 0 || !filteredGraph.edges.has(nodeId)) {
        filteredGraph.leaves.push(nodeId);
      }
    });

    return filteredGraph;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopExecution();
    this.clearCache();
    this.clearHistory();
    
    EventBus.off('workflow:execute', this.executeWorkflow);
    EventBus.off('workflow:pause', this.pauseExecution);
    EventBus.off('workflow:resume', this.resumeExecution);
    EventBus.off('workflow:stop', this.stopExecution);
    EventBus.off('node:execute', this.executeNode);
  }
}

export default WorkflowEngine;