const { logger } = require('./loggingService');
const os = require('os');
const process = require('process');

/**
 * Service for monitoring application performance and health
 */
class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map()
      },
      response: {
        times: [],
        average: 0
      },
      memory: {
        history: [],
        max: 0
      },
      cpu: {
        history: [],
        average: 0
      },
      openai: {
        requests: 0,
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0
        },
        costs: 0
      },
      errors: {
        count: 0,
        byType: new Map()
      },
      activeUsers: new Set(),
      startTime: Date.now()
    };

    this.lastSnapshot = Date.now();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start the monitoring service
   * @param {number} interval - Monitoring interval in milliseconds
   */
  start(interval = 60000) {
    if (this.isMonitoring) return;

    logger.info('Starting performance monitoring service');
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => this.captureMetrics(), interval);
  }

  /**
   * Stop the monitoring service
   */
  stop() {
    if (!this.isMonitoring) return;

    logger.info('Stopping performance monitoring service');
    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
  }

  /**
   * Capture system and application metrics
   */
  captureMetrics() {
    // Capture memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
    this.metrics.memory.history.push({
      timestamp: Date.now(),
      value: heapUsedMB
    });
    
    // Limit history size
    if (this.metrics.memory.history.length > 60) {
      this.metrics.memory.history.shift();
    }
    
    // Update max memory
    this.metrics.memory.max = Math.max(this.metrics.memory.max, heapUsedMB);

    // Capture CPU usage
    const cpuUsage = process.cpuUsage();
    const totalCPUUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    this.metrics.cpu.history.push({
      timestamp: Date.now(),
      value: totalCPUUsage
    });
    
    // Limit history size
    if (this.metrics.cpu.history.length > 60) {
      this.metrics.cpu.history.shift();
    }
    
    // Calculate average CPU usage
    if (this.metrics.cpu.history.length > 0) {
      const sum = this.metrics.cpu.history.reduce((acc, curr) => acc + curr.value, 0);
      this.metrics.cpu.average = sum / this.metrics.cpu.history.length;
    }

    // Log current metrics
    logger.debug('Performance metrics captured', {
      memory: {
        heapUsedMB,
        max: this.metrics.memory.max
      },
      cpu: {
        current: totalCPUUsage,
        average: this.metrics.cpu.average
      },
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed
      },
      openai: {
        requests: this.metrics.openai.requests,
        tokens: this.metrics.openai.tokens
      },
      errors: this.metrics.errors.count,
      activeUsers: this.metrics.activeUsers.size,
      uptime: Math.floor((Date.now() - this.metrics.startTime) / 1000 / 60) // in minutes
    });

    // Check for memory leaks or high resource usage
    if (heapUsedMB > 1024) { // 1GB
      logger.warn('High memory usage detected', { heapUsedMB });
    }

    this.lastSnapshot = Date.now();
  }

  /**
   * Record an API request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} startTime - Request start time
   */
  recordRequest(req, res, startTime) {
    // Update request counts
    this.metrics.requests.total++;
    
    const statusCode = res.statusCode;
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Record by endpoint
    const endpoint = `${req.method} ${req.route ? req.route.path : req.path}`;
    if (!this.metrics.requests.byEndpoint.has(endpoint)) {
      this.metrics.requests.byEndpoint.set(endpoint, {
        count: 0,
        responseTime: []
      });
    }
    
    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    endpointMetrics.count++;
    
    // Record response time
    const responseTime = Date.now() - startTime;
    endpointMetrics.responseTime.push(responseTime);
    this.metrics.response.times.push(responseTime);
    
    // Keep response time history manageable
    if (endpointMetrics.responseTime.length > 100) {
      endpointMetrics.responseTime.shift();
    }
    if (this.metrics.response.times.length > 1000) {
      this.metrics.response.times.shift();
    }
    
    // Calculate average response time
    const sum = this.metrics.response.times.reduce((acc, time) => acc + time, 0);
    this.metrics.response.average = sum / this.metrics.response.times.length;
    
    // Record user
    if (req.user && req.user.id) {
      this.metrics.activeUsers.add(req.user.id);
    }
  }

  /**
   * Record an OpenAI API request
   * @param {Object} data - Request data
   */
  recordOpenAIRequest(data) {
    this.metrics.openai.requests++;
    
    // Record token usage if available
    if (data.usage) {
      this.metrics.openai.tokens.prompt += data.usage.prompt_tokens || 0;
      this.metrics.openai.tokens.completion += data.usage.completion_tokens || 0;
      this.metrics.openai.tokens.total += data.usage.total_tokens || 0;
      
      // Approximate cost calculation (adjust rates as needed)
      const promptCost = data.usage.prompt_tokens * 0.0000015; // $0.0015 per 1000 tokens
      const completionCost = data.usage.completion_tokens * 0.000002; // $0.002 per 1000 tokens
      this.metrics.openai.costs += promptCost + completionCost;
    }
  }

  /**
   * Record an error
   * @param {Error} error - Error object
   */
  recordError(error) {
    this.metrics.errors.count++;
    
    // Group errors by type
    const errorType = error.name || 'UnknownError';
    if (!this.metrics.errors.byType.has(errorType)) {
      this.metrics.errors.byType.set(errorType, 0);
    }
    
    this.metrics.errors.byType.set(
      errorType, 
      this.metrics.errors.byType.get(errorType) + 1
    );
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} Metrics data
   */
  getMetrics() {
    // Convert Maps to Objects for JSON serialization
    const byEndpoint = {};
    this.metrics.requests.byEndpoint.forEach((value, key) => {
      byEndpoint[key] = value;
    });
    
    const errorsByType = {};
    this.metrics.errors.byType.forEach((value, key) => {
      errorsByType[key] = value;
    });
    
    return {
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        byEndpoint
      },
      response: {
        average: this.metrics.response.average,
        samples: this.metrics.response.times.length
      },
      memory: {
        current: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        max: this.metrics.memory.max,
        history: this.metrics.memory.history
      },
      cpu: {
        average: this.metrics.cpu.average,
        history: this.metrics.cpu.history
      },
      openai: {
        requests: this.metrics.openai.requests,
        tokens: this.metrics.openai.tokens,
        estimatedCost: this.metrics.openai.costs.toFixed(4)
      },
      errors: {
        count: this.metrics.errors.count,
        byType: errorsByType
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100 + 'GB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100 + 'GB'
      },
      activeUsers: Array.from(this.metrics.activeUsers).length,
      uptime: {
        seconds: Math.floor((Date.now() - this.metrics.startTime) / 1000),
        formatted: formatUptime(Date.now() - this.metrics.startTime)
      }
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    logger.info('Resetting performance metrics');
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map()
      },
      response: {
        times: [],
        average: 0
      },
      memory: {
        history: [],
        max: 0
      },
      cpu: {
        history: [],
        average: 0
      },
      openai: {
        requests: 0,
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0
        },
        costs: 0
      },
      errors: {
        count: 0,
        byType: new Map()
      },
      activeUsers: new Set(),
      startTime: Date.now()
    };
    
    this.lastSnapshot = Date.now();
  }
}

/**
 * Format uptime in a human-readable format
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} Formatted uptime
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

module.exports = new MonitoringService();