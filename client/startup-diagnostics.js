/**
 * Startup Diagnostics
 * Performs comprehensive checks during application startup to identify potential issues
 */

(function() {
  'use strict';

  console.log('[StartupDiagnostics] Initializing startup diagnostics...');

  const StartupDiagnostics = {
    checks: [],
    results: [],
    startTime: Date.now(),

    // Add a diagnostic check
    addCheck(name, checkFunction, critical = false) {
      this.checks.push({
        name,
        checkFunction,
        critical
      });
    },

    // Run all diagnostic checks
    async runDiagnostics() {
      console.log('[StartupDiagnostics] Running startup diagnostics...');
      
      for (const check of this.checks) {
        try {
          const startTime = performance.now();
          const result = await check.checkFunction();
          const duration = performance.now() - startTime;
          
          this.results.push({
            name: check.name,
            status: result.status || 'pass',
            message: result.message || 'OK',
            duration: duration,
            critical: check.critical,
            details: result.details || {}
          });
          
          if (result.status === 'fail' && check.critical) {
            console.error(`[StartupDiagnostics] CRITICAL FAILURE: ${check.name} - ${result.message}`);
          } else if (result.status === 'warn') {
            console.warn(`[StartupDiagnostics] WARNING: ${check.name} - ${result.message}`);
          } else {
            console.log(`[StartupDiagnostics] PASS: ${check.name}`);
          }
          
        } catch (error) {
          console.error(`[StartupDiagnostics] ERROR in check ${check.name}:`, error);
          this.results.push({
            name: check.name,
            status: 'error',
            message: error.message,
            duration: 0,
            critical: check.critical
          });
        }
      }
      
      this.generateReport();
    },

    // Generate diagnostic report
    generateReport() {
      const totalTime = Date.now() - this.startTime;
      const failures = this.results.filter(r => r.status === 'fail');
      const warnings = this.results.filter(r => r.status === 'warn');
      const errors = this.results.filter(r => r.status === 'error');
      
      console.log(`[StartupDiagnostics] Diagnostics complete in ${totalTime}ms`);
      console.log(`[StartupDiagnostics] Results: ${this.results.length} checks, ${failures.length} failures, ${warnings.length} warnings, ${errors.length} errors`);
      
      // Store results for debugging
      window.startupDiagnostics = {
        results: this.results,
        summary: {
          totalChecks: this.results.length,
          failures: failures.length,
          warnings: warnings.length,
          errors: errors.length,
          totalTime: totalTime
        }
      };
      
      // Report to DebugManager if available
      if (typeof DebugManager !== 'undefined') {
        DebugManager.addLog(`Startup diagnostics: ${failures.length} failures, ${warnings.length} warnings`, 
          failures.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success');
      }
    }
  };

  // Add standard diagnostic checks
  StartupDiagnostics.addCheck('DOM Ready', () => {
    return {
      status: document.readyState === 'complete' ? 'pass' : 'warn',
      message: `Document ready state: ${document.readyState}`
    };
  });

  StartupDiagnostics.addCheck('Required Scripts', () => {
    const requiredScripts = ['config.js', 'app.js', 'api-service.js'];
    const loadedScripts = Array.from(document.scripts).map(s => s.src.split('/').pop());
    const missing = requiredScripts.filter(script => !loadedScripts.includes(script));
    
    return {
      status: missing.length === 0 ? 'pass' : 'fail',
      message: missing.length === 0 ? 'All required scripts loaded' : `Missing scripts: ${missing.join(', ')}`,
      details: { missing, loaded: loadedScripts }
    };
  }, true);

  StartupDiagnostics.addCheck('Global Objects', () => {
    const requiredGlobals = ['Config', 'App', 'DebugManager', 'Utils'];
    const missing = requiredGlobals.filter(global => typeof window[global] === 'undefined');
    
    return {
      status: missing.length === 0 ? 'pass' : 'fail',
      message: missing.length === 0 ? 'All global objects available' : `Missing globals: ${missing.join(', ')}`,
      details: { missing }
    };
  }, true);

  StartupDiagnostics.addCheck('Canvas Element', () => {
    const canvas = document.getElementById('canvas');
    const hasContext = canvas && canvas.getContext('2d');
    
    return {
      status: hasContext ? 'pass' : 'fail',
      message: hasContext ? 'Canvas element and context available' : 'Canvas element or context missing',
      details: { 
        canvasExists: !!canvas,
        contextAvailable: !!hasContext,
        canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'N/A'
      }
    };
  }, true);

  StartupDiagnostics.addCheck('Local Storage', () => {
    try {
      const testKey = 'startup_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return {
        status: 'pass',
        message: 'Local storage available'
      };
    } catch (error) {
      return {
        status: 'warn',
        message: `Local storage not available: ${error.message}`
      };
    }
  });

  StartupDiagnostics.addCheck('Performance API', () => {
    const hasPerformance = typeof performance !== 'undefined' && performance.now;
    const hasMemory = performance && performance.memory;
    
    return {
      status: hasPerformance ? 'pass' : 'warn',
      message: hasPerformance ? 'Performance API available' : 'Performance API not available',
      details: {
        performanceAPI: hasPerformance,
        memoryAPI: hasMemory
      }
    };
  });

  StartupDiagnostics.addCheck('WebGL Support', () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return {
        status: gl ? 'pass' : 'warn',
        message: gl ? 'WebGL supported' : 'WebGL not supported',
        details: { webglSupported: !!gl }
      };
    } catch (error) {
      return {
        status: 'warn',
        message: `WebGL check failed: ${error.message}`
      };
    }
  });

  StartupDiagnostics.addCheck('Memory Usage', () => {
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      return {
        status: memoryMB < 50 ? 'pass' : memoryMB < 100 ? 'warn' : 'fail',
        message: `Memory usage: ${memoryMB}MB`,
        details: {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        }
      };
    } else {
      return {
        status: 'warn',
        message: 'Memory API not available'
      };
    }
  });

  StartupDiagnostics.addCheck('Network Connectivity', async () => {
    try {
      const response = await fetch('/health', { 
        method: 'GET',
        timeout: 5000 
      });
      return {
        status: response.ok ? 'pass' : 'warn',
        message: response.ok ? 'Server connectivity OK' : `Server responded with ${response.status}`,
        details: { status: response.status, statusText: response.statusText }
      };
    } catch (error) {
      return {
        status: 'warn',
        message: `Network connectivity issue: ${error.message}`
      };
    }
  });

  // Export to global scope
  window.StartupDiagnostics = StartupDiagnostics;

  // Auto-run diagnostics when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => StartupDiagnostics.runDiagnostics(), 1000);
    });
  } else {
    setTimeout(() => StartupDiagnostics.runDiagnostics(), 1000);
  }

})();
