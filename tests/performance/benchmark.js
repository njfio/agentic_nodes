const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Workflow = require('../../models/Workflow');
const { WorkflowEngine } = require('../../client/src/modules/workflow-engine');

/**
 * Performance Benchmark Suite
 */
class BenchmarkSuite {
  constructor() {
    this.results = [];
    this.iterations = 100;
  }

  /**
   * Run a benchmark
   */
  async benchmark(name, fn, iterations = this.iterations) {
    console.log(`\n📊 Running benchmark: ${name}`);
    
    const times = [];
    let errors = 0;

    // Warmup
    for (let i = 0; i < 5; i++) {
      try {
        await fn();
      } catch (e) {
        // Ignore warmup errors
      }
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await fn();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        errors++;
      }
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write('.');
      }
    }
    
    console.log(' Done!');

    // Calculate statistics
    const stats = this.calculateStats(times);
    stats.errors = errors;
    stats.name = name;
    stats.iterations = iterations;

    this.results.push(stats);
    this.printStats(stats);

    return stats;
  }

  /**
   * Calculate statistics
   */
  calculateStats(times) {
    if (times.length === 0) {
      return { error: 'No successful runs' };
    }

    times.sort((a, b) => a - b);

    return {
      min: times[0],
      max: times[times.length - 1],
      mean: times.reduce((a, b) => a + b, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      stdDev: this.standardDeviation(times)
    };
  }

  /**
   * Calculate standard deviation
   */
  standardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Print statistics
   */
  printStats(stats) {
    console.log(`
  ⏱️  Min: ${stats.min?.toFixed(2)}ms
  ⏱️  Max: ${stats.max?.toFixed(2)}ms
  ⏱️  Mean: ${stats.mean?.toFixed(2)}ms
  ⏱️  Median: ${stats.median?.toFixed(2)}ms
  ⏱️  P95: ${stats.p95?.toFixed(2)}ms
  ⏱️  P99: ${stats.p99?.toFixed(2)}ms
  ⏱️  Std Dev: ${stats.stdDev?.toFixed(2)}ms
  ❌ Errors: ${stats.errors}/${stats.iterations}
    `);
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('='.repeat(60));

    const table = this.results.map(r => ({
      'Benchmark': r.name,
      'Mean (ms)': r.mean?.toFixed(2) || 'N/A',
      'P95 (ms)': r.p95?.toFixed(2) || 'N/A',
      'Errors': r.errors
    }));

    console.table(table);
  }
}

/**
 * Database Benchmarks
 */
async function runDatabaseBenchmarks(suite) {
  console.log('\n🗄️  DATABASE BENCHMARKS');
  console.log('='.repeat(40));

  // User creation
  await suite.benchmark('User Creation', async () => {
    const user = await User.create({
      username: `bench_${Date.now()}_${Math.random()}`,
      email: `bench_${Date.now()}@example.com`,
      password: 'Test123!@#'
    });
    await User.deleteOne({ _id: user._id });
  });

  // User query
  const testUser = await User.create({
    username: 'benchmark_user',
    email: 'benchmark@example.com',
    password: 'Test123!@#'
  });

  await suite.benchmark('User Query by Username', async () => {
    await User.findOne({ username: 'benchmark_user' });
  });

  await suite.benchmark('User Query by ID', async () => {
    await User.findById(testUser._id);
  });

  // Workflow operations
  const workflow = await Workflow.create({
    name: 'Benchmark Workflow',
    user: testUser._id,
    nodes: Array.from({ length: 50 }, (_, i) => ({
      id: `node${i}`,
      type: 'process',
      position: { x: i * 100, y: 100 },
      data: { value: i }
    })),
    connections: Array.from({ length: 49 }, (_, i) => ({
      sourceId: `node${i}`,
      targetId: `node${i + 1}`
    }))
  });

  await suite.benchmark('Workflow Query', async () => {
    await Workflow.findById(workflow._id);
  });

  await suite.benchmark('Workflow Update', async () => {
    await Workflow.findByIdAndUpdate(workflow._id, {
      $set: { lastModified: new Date() }
    });
  });

  await suite.benchmark('Workflow List Query', async () => {
    await Workflow.find({ user: testUser._id })
      .limit(10)
      .sort('-createdAt');
  });

  // Cleanup
  await User.deleteOne({ _id: testUser._id });
  await Workflow.deleteOne({ _id: workflow._id });
}

/**
 * Workflow Engine Benchmarks
 */
async function runWorkflowEngineBenchmarks(suite) {
  console.log('\n⚙️  WORKFLOW ENGINE BENCHMARKS');
  console.log('='.repeat(40));

  const engine = new WorkflowEngine({
    enableCaching: false
  });

  // Simple workflow
  const simpleWorkflow = {
    id: 'simple',
    nodes: [
      { id: 'input', type: 'input', data: { value: 10 } },
      { id: 'output', type: 'output', data: {} }
    ],
    connections: [
      { sourceId: 'input', targetId: 'output' }
    ]
  };

  await suite.benchmark('Simple Workflow Execution', async () => {
    await engine.executeWorkflow({ workflow: simpleWorkflow });
  }, 50);

  // Complex workflow
  const complexWorkflow = {
    id: 'complex',
    nodes: Array.from({ length: 20 }, (_, i) => ({
      id: `node${i}`,
      type: i === 0 ? 'input' : i === 19 ? 'output' : 'transform',
      data: { value: i }
    })),
    connections: Array.from({ length: 19 }, (_, i) => ({
      sourceId: `node${i}`,
      targetId: `node${i + 1}`
    }))
  };

  await suite.benchmark('Complex Workflow Execution', async () => {
    await engine.executeWorkflow({ workflow: complexWorkflow });
  }, 20);

  // Parallel workflow
  const parallelWorkflow = {
    id: 'parallel',
    nodes: [
      { id: 'input', type: 'input', data: { value: 5 } },
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `parallel${i}`,
        type: 'transform',
        data: { operation: 'multiply', factor: i + 1 }
      })),
      { id: 'combine', type: 'combine', data: {} }
    ],
    connections: [
      ...Array.from({ length: 5 }, (_, i) => ({
        sourceId: 'input',
        targetId: `parallel${i}`
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        sourceId: `parallel${i}`,
        targetId: 'combine'
      }))
    ]
  };

  await suite.benchmark('Parallel Workflow Execution', async () => {
    await engine.executeWorkflow({ workflow: parallelWorkflow });
  }, 20);
}

/**
 * Node Processing Benchmarks
 */
async function runNodeProcessingBenchmarks(suite) {
  console.log('\n🔧 NODE PROCESSING BENCHMARKS');
  console.log('='.repeat(40));

  // Mock node processors
  const processors = {
    textTransform: async (input) => {
      return input.toUpperCase().split('').reverse().join('');
    },
    
    mathOperation: async (input) => {
      let result = input;
      for (let i = 0; i < 100; i++) {
        result = Math.sqrt(result * result + i);
      }
      return result;
    },
    
    jsonParsing: async (input) => {
      const data = JSON.stringify({ 
        nested: { 
          deep: { 
            value: input,
            array: Array.from({ length: 100 }, (_, i) => ({ id: i, value: input * i }))
          }
        }
      });
      return JSON.parse(data);
    }
  };

  await suite.benchmark('Text Transform Node', async () => {
    await processors.textTransform('The quick brown fox jumps over the lazy dog');
  }, 1000);

  await suite.benchmark('Math Operation Node', async () => {
    await processors.mathOperation(42);
  }, 1000);

  await suite.benchmark('JSON Processing Node', async () => {
    await processors.jsonParsing(100);
  }, 1000);
}

/**
 * Memory Benchmarks
 */
async function runMemoryBenchmarks(suite) {
  console.log('\n💾 MEMORY BENCHMARKS');
  console.log('='.repeat(40));

  const initialMemory = process.memoryUsage();

  // Large workflow creation
  await suite.benchmark('Large Workflow Memory', async () => {
    const nodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `node${i}`,
      type: 'process',
      position: { x: (i % 100) * 100, y: Math.floor(i / 100) * 100 },
      data: {
        value: i,
        metadata: {
          created: new Date(),
          tags: ['benchmark', 'test', `node-${i}`],
          properties: Object.fromEntries(
            Array.from({ length: 10 }, (_, j) => [`prop${j}`, `value${j}`])
          )
        }
      }
    }));

    const connections = Array.from({ length: 999 }, (_, i) => ({
      sourceId: `node${i}`,
      targetId: `node${i + 1}`,
      data: { weight: Math.random() }
    }));

    const workflow = { nodes, connections };
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    return workflow;
  }, 10);

  const finalMemory = process.memoryUsage();
  
  console.log(`
  💾 Memory Usage:
     Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
     Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
     Delta: ${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB
  `);
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('🚀 Starting Performance Benchmarks...\n');

  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/multimodal-benchmark', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to benchmark database\n');

    const suite = new BenchmarkSuite();

    // Run all benchmarks
    await runDatabaseBenchmarks(suite);
    await runWorkflowEngineBenchmarks(suite);
    await runNodeProcessingBenchmarks(suite);
    await runMemoryBenchmarks(suite);

    // Print summary
    suite.printSummary();

    // Cleanup
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    
    console.log('\n✅ Benchmarks completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Benchmark error:', error);
    process.exit(1);
  }
}

// Run benchmarks if called directly
if (require.main === module) {
  main();
}

module.exports = { BenchmarkSuite };