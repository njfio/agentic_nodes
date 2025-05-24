/**
 * Performance Monitor
 * Monitors application performance and detects potential issues
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameRate: 0,
      memoryUsage: 0,
      renderTime: 0,
      imageLoadCount: 0,
      errorCount: 0,
      lastUpdate: Date.now()
    };
    
    this.thresholds = {
      lowFPS: 30,
      highMemory: 100 * 1024 * 1024, // 100MB
      slowRender: 16, // 16ms for 60fps
      maxErrors: 10
    };
    
    this.isMonitoring = false;
    this.warningCallbacks = [];
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.renderTimes = [];
    this.maxRenderTimes = 60; // Keep last 60 render times
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[PerformanceMonitor] Starting performance monitoring');
    
    // Monitor frame rate
    this.startFrameRateMonitoring();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor errors
    this.startErrorMonitoring();
    
    // Periodic health check
    this.startHealthCheck();
  }

  stop() {
    this.isMonitoring = false;
    console.log('[PerformanceMonitor] Stopping performance monitoring');
    
    if (this.frameRateInterval) {
      clearInterval(this.frameRateInterval);
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  startFrameRateMonitoring() {
    const measureFrameRate = () => {
      if (!this.isMonitoring) return;
      
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameCount++;
      
      // Calculate FPS every second
      if (this.frameCount >= 60) {
        this.metrics.frameRate = Math.round(1000 / (delta / this.frameCount));
        this.frameCount = 0;
        
        // Check for low FPS
        if (this.metrics.frameRate < this.thresholds.lowFPS) {
          this.triggerWarning('low_fps', `Low frame rate detected: ${this.metrics.frameRate} FPS`);
        }
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }

  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      if (!this.isMonitoring) return;
      
      if (performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        
        // Check for high memory usage
        if (this.metrics.memoryUsage > this.thresholds.highMemory) {
          this.triggerWarning('high_memory', `High memory usage: ${Math.round(this.metrics.memoryUsage / 1024 / 1024)}MB`);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  startErrorMonitoring() {
    // Override console.error to track errors
    const originalError = console.error;
    console.error = (...args) => {
      this.metrics.errorCount++;
      
      if (this.metrics.errorCount > this.thresholds.maxErrors) {
        this.triggerWarning('high_errors', `High error count: ${this.metrics.errorCount} errors`);
      }
      
      originalError.apply(console, args);
    };
    
    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      this.metrics.errorCount++;
      this.triggerWarning('unhandled_error', `Unhandled error: ${event.message}`);
    });
    
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errorCount++;
      this.triggerWarning('unhandled_rejection', `Unhandled promise rejection: ${event.reason}`);
    });
  }

  startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      if (!this.isMonitoring) return;
      
      this.performHealthCheck();
    }, 10000); // Check every 10 seconds
  }

  performHealthCheck() {
    const issues = [];
    
    // Check for stuck processes
    if (typeof App !== 'undefined' && App.nodes) {
      const processingNodes = App.nodes.filter(node => node.processing);
      if (processingNodes.length > 5) {
        issues.push(`Many nodes processing: ${processingNodes.length}`);
      }
    }
    
    // Check for excessive DOM elements
    const elementCount = document.querySelectorAll('*').length;
    if (elementCount > 10000) {
      issues.push(`High DOM element count: ${elementCount}`);
    }
    
    // Check for memory leaks in image cache
    if (typeof ImageStorage !== 'undefined' && ImageStorage.imageCache) {
      const cacheSize = Object.keys(ImageStorage.imageCache).length;
      if (cacheSize > 200) {
        issues.push(`Large image cache: ${cacheSize} images`);
      }
    }
    
    if (issues.length > 0) {
      this.triggerWarning('health_check', `Health check issues: ${issues.join(', ')}`);
    }
  }

  recordRenderTime(renderTime) {
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > this.maxRenderTimes) {
      this.renderTimes.shift();
    }
    
    this.metrics.renderTime = renderTime;
    
    // Check for slow renders
    if (renderTime > this.thresholds.slowRender) {
      this.triggerWarning('slow_render', `Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }

  recordImageLoad() {
    this.metrics.imageLoadCount++;
  }

  triggerWarning(type, message) {
    const warning = {
      type,
      message,
      timestamp: Date.now(),
      metrics: { ...this.metrics }
    };
    
    console.warn(`[PerformanceMonitor] ${message}`);
    
    // Notify debug manager if available
    if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
      DebugManager.addLog(`Performance warning: ${message}`, 'warning');
    }
    
    // Call registered callbacks
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warning);
      } catch (error) {
        console.error('Error in performance warning callback:', error);
      }
    });
  }

  onWarning(callback) {
    this.warningCallbacks.push(callback);
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageRenderTime: this.renderTimes.length > 0 
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length 
        : 0,
      lastUpdate: Date.now()
    };
  }

  reset() {
    this.metrics.errorCount = 0;
    this.metrics.imageLoadCount = 0;
    this.renderTimes = [];
    console.log('[PerformanceMonitor] Metrics reset');
  }
}

// Create global instance
window.PerformanceMonitor = new PerformanceMonitor();

// Auto-start monitoring when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.PerformanceMonitor.start();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
