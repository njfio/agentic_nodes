// Mock modules since the actual files might not exist yet
const { WorkflowEngine } = require('../../../client/src/modules/workflow-engine');
const EventBus = require('../../../client/src/modules/event-bus');

// Mock EventBus
jest.mock('../../../client/src/modules/event-bus');

describe('WorkflowEngine', () => {
  let engine;
  let mockWorkflow;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create engine instance
    engine = new WorkflowEngine({
      maxConcurrentNodes: 3,
      executionTimeout: 5000,
      enableCaching: true,
      debugMode: false
    });

    // Create mock workflow
    mockWorkflow = {
      id: 'workflow1',
      nodes: [
        { id: 'node1', type: 'input', data: { value: 10 } },
        { id: 'node2', type: 'transform', data: { operation: 'multiply', factor: 2 } },
        { id: 'node3', type: 'output', data: {} }
      ],
      connections: [
        { sourceId: 'node1', targetId: 'node2', sourceSocket: 'output', targetSocket: 'input' },
        { sourceId: 'node2', targetId: 'node3', sourceSocket: 'output', targetSocket: 'input' }
      ]
    };
  });

  describe('Workflow Execution', () => {
    it('should execute simple linear workflow', async () => {
      // Mock node processors
      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          const { node, inputs } = data;
          
          switch (node.type) {
            case 'input':
              return { processed: true, output: node.data.value };
            case 'transform':
              const input = inputs.input || inputs.node1;
              return { processed: true, output: input * node.data.factor };
            case 'output':
              return { processed: true, output: inputs.input || inputs.node2 };
            default:
              return { processed: false };
          }
        }
      });

      const result = await engine.executeWorkflow({
        workflow: mockWorkflow
      });

      expect(result).toBe(20); // 10 * 2
      expect(EventBus.emit).toHaveBeenCalledWith('workflow:started', expect.any(Object));
      expect(EventBus.emit).toHaveBeenCalledWith('workflow:completed', expect.any(Object));
    });

    it('should handle parallel execution', async () => {
      const parallelWorkflow = {
        id: 'parallel1',
        nodes: [
          { id: 'input1', type: 'input', data: { value: 5 } },
          { id: 'input2', type: 'input', data: { value: 10 } },
          { id: 'process1', type: 'transform', data: { operation: 'double' } },
          { id: 'process2', type: 'transform', data: { operation: 'square' } },
          { id: 'combine', type: 'combine', data: { operation: 'sum' } }
        ],
        connections: [
          { sourceId: 'input1', targetId: 'process1' },
          { sourceId: 'input2', targetId: 'process2' },
          { sourceId: 'process1', targetId: 'combine', targetSocket: 'input1' },
          { sourceId: 'process2', targetId: 'combine', targetSocket: 'input2' }
        ]
      };

      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          const { node, inputs } = data;
          
          switch (node.type) {
            case 'input':
              return { processed: true, output: node.data.value };
            case 'transform':
              const input = inputs.input || Object.values(inputs)[0];
              if (node.data.operation === 'double') {
                return { processed: true, output: input * 2 };
              } else if (node.data.operation === 'square') {
                return { processed: true, output: input * input };
              }
              break;
            case 'combine':
              const sum = (inputs.input1 || 0) + (inputs.input2 || 0);
              return { processed: true, output: sum };
          }
        }
      });

      const result = await engine.executeWorkflow({
        workflow: parallelWorkflow
      });

      expect(result).toBe(110); // (5 * 2) + (10 * 10) = 10 + 100
    });

    it('should detect circular dependencies', async () => {
      const circularWorkflow = {
        id: 'circular1',
        nodes: [
          { id: 'node1', type: 'process' },
          { id: 'node2', type: 'process' },
          { id: 'node3', type: 'process' }
        ],
        connections: [
          { sourceId: 'node1', targetId: 'node2' },
          { sourceId: 'node2', targetId: 'node3' },
          { sourceId: 'node3', targetId: 'node1' } // Creates cycle
        ]
      };

      await expect(engine.executeWorkflow({
        workflow: circularWorkflow
      })).rejects.toThrow(/circular dependency/i);
    });

    it('should handle node execution timeout', async () => {
      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          // Simulate long-running node
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ processed: true, output: 'done' });
            }, 10000); // Longer than timeout
          });
        }
      });

      const timeoutEngine = new WorkflowEngine({
        executionTimeout: 100 // 100ms timeout
      });

      await expect(timeoutEngine.executeWorkflow({
        workflow: mockWorkflow
      })).rejects.toThrow(/timeout/i);
    });

    it('should handle node execution errors', async () => {
      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process' && data.node.id === 'node2') {
          throw new Error('Node processing failed');
        }
        return { processed: true, output: 'success' };
      });

      await expect(engine.executeWorkflow({
        workflow: mockWorkflow
      })).rejects.toThrow(/Node node2 failed/);

      expect(EventBus.emit).toHaveBeenCalledWith('workflow:failed', expect.any(Object));
    });

    it('should continue on error when configured', async () => {
      mockWorkflow.nodes[1].continueOnError = true;

      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          if (data.node.id === 'node2') {
            throw new Error('Node processing failed');
          }
          return { processed: true, output: data.inputs };
        }
      });

      const result = await engine.executeWorkflow({
        workflow: mockWorkflow
      });

      expect(result).toEqual({ error: 'Node processing failed' });
    });
  });

  describe('Execution Control', () => {
    it('should pause and resume execution', async () => {
      let pausePoint = false;
      
      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          if (data.node.id === 'node2' && !pausePoint) {
            pausePoint = true;
            engine.pauseExecution();
          }
          return { processed: true, output: 'processed' };
        }
      });

      const executionPromise = engine.executeWorkflow({
        workflow: mockWorkflow
      });

      // Wait for pause
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(engine.isPaused).toBe(true);
      expect(EventBus.emit).toHaveBeenCalledWith('workflow:paused', expect.any(Object));

      // Resume execution
      engine.resumeExecution();
      
      const result = await executionPromise;
      
      expect(result).toBe('processed');
      expect(EventBus.emit).toHaveBeenCalledWith('workflow:resumed', expect.any(Object));
    });

    it('should stop execution', async () => {
      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process' && data.node.id === 'node2') {
          engine.stopExecution();
        }
        return { processed: true, output: 'processed' };
      });

      await expect(engine.executeWorkflow({
        workflow: mockWorkflow
      })).rejects.toThrow(/execution was stopped/i);

      expect(EventBus.emit).toHaveBeenCalledWith('workflow:stopped', expect.any(Object));
    });

    it('should limit concurrent node execution', async () => {
      const concurrentNodes = new Set();
      let maxConcurrent = 0;

      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          concurrentNodes.add(data.node.id);
          maxConcurrent = Math.max(maxConcurrent, concurrentNodes.size);
          
          return new Promise(resolve => {
            setTimeout(() => {
              concurrentNodes.delete(data.node.id);
              resolve({ processed: true, output: 'done' });
            }, 50);
          });
        }
      });

      // Create workflow with many parallel nodes
      const manyNodesWorkflow = {
        id: 'many1',
        nodes: Array.from({ length: 10 }, (_, i) => ({
          id: `node${i}`,
          type: 'process'
        })),
        connections: []
      };

      await engine.executeWorkflow({
        workflow: manyNodesWorkflow
      });

      expect(maxConcurrent).toBeLessThanOrEqual(3); // maxConcurrentNodes setting
    });
  });

  describe('Caching', () => {
    it('should cache node results', async () => {
      const processorMock = jest.fn((node, inputs) => ({
        processed: true,
        output: inputs.value * 2
      }));

      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          return processorMock(data.node, data.inputs);
        }
      });

      // First execution
      await engine.executeNode({
        node: { id: 'test1', type: 'multiply' },
        inputs: { value: 5 }
      });

      // Second execution with same inputs
      await engine.executeNode({
        node: { id: 'test1', type: 'multiply' },
        inputs: { value: 5 }
      });

      // Processor should only be called once due to caching
      expect(processorMock).toHaveBeenCalledTimes(1);
    });

    it('should not cache non-cacheable nodes', async () => {
      const processorMock = jest.fn(() => ({
        processed: true,
        output: Math.random()
      }));

      EventBus.emitSync.mockImplementation((event, data) => {
        if (event === 'node:process') {
          return processorMock();
        }
      });

      await engine.executeNode({
        node: { id: 'random1', type: 'random', disableCache: true },
        inputs: {}
      });

      await engine.executeNode({
        node: { id: 'random1', type: 'random', disableCache: true },
        inputs: {}
      });

      expect(processorMock).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', () => {
      engine.nodeCache.set('key1', 'value1');
      engine.nodeCache.set('key2', 'value2');

      engine.clearCache();

      expect(engine.nodeCache.size).toBe(0);
      expect(EventBus.emit).toHaveBeenCalledWith('workflow:cacheCleared');
    });
  });

  describe('Execution History', () => {
    it('should maintain execution history', async () => {
      EventBus.emitSync.mockReturnValue({ processed: true, output: 'done' });

      await engine.executeWorkflow({ workflow: mockWorkflow });
      await engine.executeWorkflow({ workflow: mockWorkflow });

      const history = engine.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].workflow.id).toBe('workflow1');
      expect(history[0].status).toBe('completed');
    });

    it('should track execution statistics', async () => {
      EventBus.emitSync.mockReturnValue({ processed: true, output: 'done' });

      // Successful execution
      await engine.executeWorkflow({ workflow: mockWorkflow });

      // Failed execution
      EventBus.emitSync.mockImplementation(() => {
        throw new Error('Execution failed');
      });
      
      try {
        await engine.executeWorkflow({ workflow: mockWorkflow });
      } catch (e) {
        // Expected
      }

      const stats = engine.getStats();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successRate).toBe(50);
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.errors).toHaveLength(1);
    });

    it('should limit history size', async () => {
      EventBus.emitSync.mockReturnValue({ processed: true, output: 'done' });

      // Execute more than history limit
      for (let i = 0; i < 150; i++) {
        engine.addToHistory({
          id: `exec${i}`,
          status: 'completed'
        });
      }

      expect(engine.executionHistory.length).toBe(100);
    });
  });

  describe('Graph Building', () => {
    it('should build correct execution graph', () => {
      const graph = engine.buildExecutionGraph(mockWorkflow);

      expect(graph.nodes.size).toBe(3);
      expect(graph.roots).toContain('node1');
      expect(graph.leaves).toContain('node3');

      // Check dependencies
      const node2 = graph.nodes.get('node2');
      expect(node2.dependencies.has('node1')).toBe(true);
      expect(node2.dependents.has('node3')).toBe(true);
    });

    it('should calculate correct execution levels', () => {
      const graph = engine.buildExecutionGraph(mockWorkflow);

      expect(graph.nodes.get('node1').level).toBe(0);
      expect(graph.nodes.get('node2').level).toBe(1);
      expect(graph.nodes.get('node3').level).toBe(2);
    });

    it('should filter graph from start node', () => {
      const fullWorkflow = {
        ...mockWorkflow,
        nodes: [
          ...mockWorkflow.nodes,
          { id: 'node4', type: 'isolated' }
        ]
      };

      const graph = engine.buildExecutionGraph(fullWorkflow, 'node2');

      expect(graph.nodes.size).toBe(2); // node2 and node3
      expect(graph.nodes.has('node1')).toBe(false);
      expect(graph.nodes.has('node4')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should validate workflow before execution', async () => {
      await expect(engine.executeWorkflow({
        workflow: null
      })).rejects.toThrow();

      await expect(engine.executeWorkflow({
        workflow: { nodes: null, connections: [] }
      })).rejects.toThrow();
    });

    it('should handle missing node processor', async () => {
      EventBus.emitSync.mockReturnValue({ processed: false });

      // Mock API call to also fail
      global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

      await expect(engine.executeWorkflow({
        workflow: mockWorkflow
      })).rejects.toThrow();
    });

    it('should provide detailed error information', async () => {
      EventBus.emitSync.mockImplementation((event, data) => {
        if (data.node.id === 'node2') {
          const error = new Error('Detailed error message');
          error.stack = 'Error stack trace';
          throw error;
        }
        return { processed: true, output: 'ok' };
      });

      let execution;
      EventBus.emit.mockImplementation((event, data) => {
        if (event === 'workflow:failed') {
          execution = data.execution;
        }
      });

      try {
        await engine.executeWorkflow({ workflow: mockWorkflow });
      } catch (e) {
        // Expected
      }

      expect(execution.errors).toHaveLength(1);
      expect(execution.errors[0].nodeId).toBe('node2');
      expect(execution.errors[0].message).toBe('Detailed error message');
      expect(execution.errors[0].stack).toBeDefined();
    });
  });
});