/**
 * Error Boundary System
 * Provides graceful error handling and recovery for the application
 */

(function() {
  'use strict';

  window.ErrorBoundary = {
    initialized: false,
    errorLog: [],
    maxErrors: 100,
    errorHandlers: new Map(),

    /**
     * Initialize the error boundary system
     */
    init() {
      if (this.initialized) return;

      console.log('🛡️ Initializing Error Boundary System');

      // Set up global error handlers
      this.setupGlobalHandlers();

      // Set up unhandled promise rejection handler
      this.setupPromiseHandler();

      // Set up error UI
      this.setupErrorUI();

      // Register default error handlers
      this.registerDefaultHandlers();

      this.initialized = true;
      console.log('✅ Error Boundary System initialized');
    },

    /**
     * Set up global error handlers
     */
    setupGlobalHandlers() {
      const originalOnError = window.onerror;
      
      window.onerror = (message, source, lineno, colno, error) => {
        // Log the error
        this.logError({
          type: 'javascript',
          message: message,
          source: source,
          line: lineno,
          column: colno,
          error: error,
          stack: error?.stack
        });

        // Try to recover
        this.attemptRecovery('javascript', error);

        // Call original handler if exists
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }

        // Prevent default error handling
        return true;
      };

      console.log('Global error handler installed');
    },

    /**
     * Set up unhandled promise rejection handler
     */
    setupPromiseHandler() {
      window.addEventListener('unhandledrejection', (event) => {
        // Log the error
        this.logError({
          type: 'promise',
          message: 'Unhandled promise rejection',
          reason: event.reason,
          promise: event.promise,
          stack: event.reason?.stack
        });

        // Try to recover
        this.attemptRecovery('promise', event.reason);

        // Prevent default handling
        event.preventDefault();
      });

      console.log('Promise rejection handler installed');
    },

    /**
     * Set up error UI
     */
    setupErrorUI() {
      // Create error notification container
      const container = document.createElement('div');
      container.id = 'error-boundary-notifications';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(container);

      // Create error details modal
      const modal = document.createElement('div');
      modal.id = 'error-boundary-modal';
      modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10001;
      `;
      modal.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <h2 style="margin-top: 0;">Error Details</h2>
          <div id="error-boundary-modal-content"></div>
          <button onclick="ErrorBoundary.hideErrorDetails()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Close</button>
        </div>
      `;
      document.body.appendChild(modal);
    },

    /**
     * Register default error handlers
     */
    registerDefaultHandlers() {
      // Agent processing errors
      this.registerErrorHandler('agent-processing', (error) => {
        console.log('Handling agent processing error:', error);
        
        // Try to reset the agent node
        if (error.node) {
          error.node.processing = false;
          error.node.error = error.message;
          
          // Redraw if possible
          if (window.App && window.App.draw) {
            window.App.draw();
          }
        }

        return {
          recovered: true,
          message: 'Agent processing error handled'
        };
      });

      // API errors
      this.registerErrorHandler('api-error', (error) => {
        console.log('Handling API error:', error);
        
        // Check if it's a rate limit error
        if (error.status === 429) {
          this.showNotification('Rate limit exceeded. Please wait before trying again.', 'warning');
          return { recovered: true, message: 'Rate limit handled' };
        }

        // Check if it's an auth error
        if (error.status === 401) {
          this.showNotification('Authentication required. Please check your API keys.', 'error');
          return { recovered: true, message: 'Auth error handled' };
        }

        return { recovered: false };
      });

      // Canvas rendering errors
      this.registerErrorHandler('canvas-error', (error) => {
        console.log('Handling canvas error:', error);
        
        // Try to reset canvas
        if (window.App && window.App.canvas) {
          try {
            const ctx = window.App.canvas.getContext('2d');
            ctx.clearRect(0, 0, window.App.canvas.width, window.App.canvas.height);
            
            // Redraw
            if (window.App.draw) {
              window.App.draw();
            }
            
            return { recovered: true, message: 'Canvas reset' };
          } catch (e) {
            console.error('Failed to reset canvas:', e);
          }
        }

        return { recovered: false };
      });
    },

    /**
     * Register an error handler
     */
    registerErrorHandler(type, handler) {
      this.errorHandlers.set(type, handler);
      console.log(`Registered error handler for: ${type}`);
    },

    /**
     * Log an error
     */
    logError(errorInfo) {
      // Add timestamp
      errorInfo.timestamp = new Date().toISOString();
      
      // Add to log
      this.errorLog.unshift(errorInfo);
      
      // Limit log size
      if (this.errorLog.length > this.maxErrors) {
        this.errorLog.pop();
      }

      // Log to console
      console.error('Error logged:', errorInfo);

      // Show notification for critical errors
      if (this.isCriticalError(errorInfo)) {
        this.showNotification(errorInfo.message, 'error');
      }

      // Update debug manager if available
      if (window.DebugManager && window.DebugManager.addLog) {
        window.DebugManager.addLog(`Error: ${errorInfo.message}`, 'error');
      }
    },

    /**
     * Check if error is critical
     */
    isCriticalError(errorInfo) {
      // Don't show notifications for certain errors
      const ignoredPatterns = [
        /ResizeObserver loop limit exceeded/,
        /Non-Error promise rejection captured/,
        /Script error/
      ];

      return !ignoredPatterns.some(pattern => 
        pattern.test(errorInfo.message || '')
      );
    },

    /**
     * Attempt to recover from an error
     */
    attemptRecovery(type, error) {
      console.log(`Attempting recovery for ${type} error`);

      // Try specific handlers first
      for (const [handlerType, handler] of this.errorHandlers) {
        if (this.errorMatchesType(error, handlerType)) {
          try {
            const result = handler(error);
            if (result.recovered) {
              console.log(`✅ Recovered from error using ${handlerType} handler`);
              return true;
            }
          } catch (e) {
            console.error(`Handler ${handlerType} failed:`, e);
          }
        }
      }

      // Generic recovery attempts
      try {
        switch (type) {
          case 'javascript':
            return this.recoverFromJavaScriptError(error);
          case 'promise':
            return this.recoverFromPromiseError(error);
          default:
            return false;
        }
      } catch (e) {
        console.error('Recovery attempt failed:', e);
        return false;
      }
    },

    /**
     * Check if error matches a type
     */
    errorMatchesType(error, type) {
      const errorStr = error?.toString() || '';
      const message = error?.message || '';
      
      switch (type) {
        case 'agent-processing':
          return message.includes('agent') || message.includes('Agent');
        case 'api-error':
          return error?.status || message.includes('API') || message.includes('fetch');
        case 'canvas-error':
          return message.includes('canvas') || message.includes('draw');
        default:
          return false;
      }
    },

    /**
     * Recover from JavaScript error
     */
    recoverFromJavaScriptError(error) {
      console.log('Attempting JavaScript error recovery');
      
      // If it's a node processing error, reset the node
      if (error?.message?.includes('node') && window.App) {
        const processingNodes = window.App.nodes?.filter(n => n.processing);
        processingNodes?.forEach(node => {
          node.processing = false;
          node.error = 'Processing interrupted';
        });
        
        if (window.App.draw) {
          window.App.draw();
        }
        
        return true;
      }

      return false;
    },

    /**
     * Recover from promise error
     */
    recoverFromPromiseError(error) {
      console.log('Attempting promise error recovery');
      
      // If it's a network error, show retry option
      if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
        this.showNotification('Network error occurred. Please check your connection.', 'warning');
        return true;
      }

      return false;
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
      const container = document.getElementById('error-boundary-notifications');
      if (!container) return;

      const notification = document.createElement('div');
      notification.style.cssText = `
        background: ${type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeeba' : '#bee5eb'};
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 4px;
        position: relative;
        animation: slideIn 0.3s ease-out;
      `;
      
      notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1; margin-right: 10px;">${message}</div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: inherit;
            padding: 0;
            margin: 0;
            line-height: 1;
          ">&times;</button>
        </div>
      `;

      container.appendChild(notification);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        notification.remove();
      }, 10000);
    },

    /**
     * Show error details modal
     */
    showErrorDetails() {
      const modal = document.getElementById('error-boundary-modal');
      const content = document.getElementById('error-boundary-modal-content');
      
      if (!modal || !content) return;

      // Build error log HTML
      let html = '<div style="font-family: monospace; font-size: 12px;">';
      
      this.errorLog.forEach((error, index) => {
        html += `
          <div style="margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              Error #${index + 1} - ${error.timestamp}
            </div>
            <div>Type: ${error.type}</div>
            <div>Message: ${error.message || 'No message'}</div>
            ${error.source ? `<div>Source: ${error.source}</div>` : ''}
            ${error.line ? `<div>Line: ${error.line}, Column: ${error.column || '?'}</div>` : ''}
            ${error.stack ? `<div style="margin-top: 10px; white-space: pre-wrap; overflow-x: auto;">Stack:\n${error.stack}</div>` : ''}
          </div>
        `;
      });
      
      html += '</div>';
      content.innerHTML = html;
      modal.style.display = 'block';
    },

    /**
     * Hide error details modal
     */
    hideErrorDetails() {
      const modal = document.getElementById('error-boundary-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    },

    /**
     * Clear error log
     */
    clearErrorLog() {
      this.errorLog = [];
      console.log('Error log cleared');
    },

    /**
     * Get error statistics
     */
    getErrorStats() {
      const stats = {
        total: this.errorLog.length,
        byType: {},
        recent: this.errorLog.slice(0, 10)
      };

      this.errorLog.forEach(error => {
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      });

      return stats;
    }
  };

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ErrorBoundary.init();
    });
  } else {
    setTimeout(() => {
      ErrorBoundary.init();
    }, 0);
  }

  console.log('✅ ErrorBoundary module loaded');
})();