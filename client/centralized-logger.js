/**
 * Centralized Logging System
 * Provides structured logging with different levels, categories, and persistence
 */

(function() {
  'use strict';

  window.Logger = {
    initialized: false,
    logs: [],
    maxLogs: 1000,
    logLevel: 'debug', // debug, info, warn, error
    categories: new Set(['system', 'agent', 'api', 'ui', 'network', 'tool']),
    filters: new Set(),
    listeners: new Map(),
    persistenceKey: 'app_logs',
    
    // Log levels with numeric values for comparison
    levels: {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    },

    /**
     * Initialize the logging system
     */
    init() {
      if (this.initialized) return;

      console.log('📝 Initializing Centralized Logging System');

      // Load persisted logs
      this.loadPersistedLogs();

      // Set up console interception
      this.interceptConsole();

      // Set up UI if needed
      this.setupLoggingUI();

      // Register with DebugManager if available
      this.integrateWithDebugManager();

      this.initialized = true;
      this.log('system', 'info', 'Centralized Logging System initialized');
    },

    /**
     * Main logging function
     */
    log(category, level, message, data = null) {
      // Validate inputs
      if (!this.categories.has(category)) {
        category = 'system';
      }
      
      if (!this.levels.hasOwnProperty(level)) {
        level = 'info';
      }

      // Check if we should log based on current log level
      if (this.levels[level] < this.levels[this.logLevel]) {
        return;
      }

      // Check filters
      if (this.filters.size > 0 && !this.filters.has(category)) {
        return;
      }

      // Create log entry
      const logEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        category: category,
        level: level,
        message: message,
        data: data,
        stack: this.getCallStack()
      };

      // Add to logs
      this.logs.unshift(logEntry);

      // Maintain max logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
      }

      // Persist important logs
      if (level === 'error' || level === 'warn') {
        this.persistLogs();
      }

      // Notify listeners
      this.notifyListeners(logEntry);

      // Output to console
      this.outputToConsole(logEntry);

      return logEntry;
    },

    /**
     * Convenience methods for different log levels
     */
    debug(category, message, data) {
      return this.log(category, 'debug', message, data);
    },

    info(category, message, data) {
      return this.log(category, 'info', message, data);
    },

    warn(category, message, data) {
      return this.log(category, 'warn', message, data);
    },

    error(category, message, data) {
      return this.log(category, 'error', message, data);
    },

    /**
     * Generate unique ID
     */
    generateId() {
      return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Get call stack
     */
    getCallStack() {
      const stack = new Error().stack;
      if (!stack) return null;

      // Parse and clean up stack
      const lines = stack.split('\n').slice(3, 8); // Skip Logger's own frames
      return lines.map(line => line.trim()).filter(line => line);
    },

    /**
     * Output to console
     */
    outputToConsole(logEntry) {
      const prefix = `[${logEntry.timestamp.split('T')[1].split('.')[0]}] [${logEntry.category.toUpperCase()}]`;
      const style = this.getConsoleStyle(logEntry.level);
      
      switch (logEntry.level) {
        case 'debug':
          console.debug(`%c${prefix}`, style, logEntry.message, logEntry.data || '');
          break;
        case 'info':
          console.log(`%c${prefix}`, style, logEntry.message, logEntry.data || '');
          break;
        case 'warn':
          console.warn(`%c${prefix}`, style, logEntry.message, logEntry.data || '');
          break;
        case 'error':
          console.error(`%c${prefix}`, style, logEntry.message, logEntry.data || '');
          break;
      }
    },

    /**
     * Get console style for level
     */
    getConsoleStyle(level) {
      const styles = {
        debug: 'color: #6c757d',
        info: 'color: #0066cc',
        warn: 'color: #ff9800',
        error: 'color: #dc3545; font-weight: bold'
      };
      return styles[level] || styles.info;
    },

    /**
     * Intercept console methods
     */
    interceptConsole() {
      const methods = ['log', 'debug', 'info', 'warn', 'error'];
      
      methods.forEach(method => {
        const original = console[method];
        console[method] = (...args) => {
          // Call original
          original.apply(console, args);
          
          // Log to our system
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          
          // Determine category from message content
          let category = 'system';
          if (message.includes('agent') || message.includes('Agent')) {
            category = 'agent';
          } else if (message.includes('API') || message.includes('fetch')) {
            category = 'api';
          } else if (message.includes('network') || message.includes('Network')) {
            category = 'network';
          }
          
          // Don't log our own messages
          if (!message.includes('[LOGGER]')) {
            this.log(category, method === 'log' ? 'info' : method, message);
          }
        };
      });
    },

    /**
     * Register a log listener
     */
    addListener(id, callback) {
      this.listeners.set(id, callback);
    },

    /**
     * Remove a log listener
     */
    removeListener(id) {
      this.listeners.delete(id);
    },

    /**
     * Notify all listeners
     */
    notifyListeners(logEntry) {
      this.listeners.forEach(callback => {
        try {
          callback(logEntry);
        } catch (error) {
          console.error('[LOGGER] Listener error:', error);
        }
      });
    },

    /**
     * Set log level
     */
    setLogLevel(level) {
      if (this.levels.hasOwnProperty(level)) {
        this.logLevel = level;
        this.log('system', 'info', `Log level set to: ${level}`);
      }
    },

    /**
     * Add category filter
     */
    addFilter(category) {
      this.filters.add(category);
      this.log('system', 'info', `Added filter for category: ${category}`);
    },

    /**
     * Remove category filter
     */
    removeFilter(category) {
      this.filters.delete(category);
      this.log('system', 'info', `Removed filter for category: ${category}`);
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.filters.clear();
      this.log('system', 'info', 'Cleared all filters');
    },

    /**
     * Get logs by criteria
     */
    getLogs(criteria = {}) {
      let filtered = [...this.logs];

      if (criteria.category) {
        filtered = filtered.filter(log => log.category === criteria.category);
      }

      if (criteria.level) {
        filtered = filtered.filter(log => log.level === criteria.level);
      }

      if (criteria.startTime) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(criteria.startTime));
      }

      if (criteria.endTime) {
        filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(criteria.endTime));
      }

      if (criteria.search) {
        const searchLower = criteria.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
        );
      }

      return filtered;
    },

    /**
     * Export logs
     */
    exportLogs(format = 'json') {
      switch (format) {
        case 'json':
          return JSON.stringify(this.logs, null, 2);
        
        case 'csv':
          const headers = ['Timestamp', 'Category', 'Level', 'Message', 'Data'];
          const rows = this.logs.map(log => [
            log.timestamp,
            log.category,
            log.level,
            log.message,
            log.data ? JSON.stringify(log.data) : ''
          ]);
          return [headers, ...rows].map(row => row.join(',')).join('\n');
        
        case 'text':
          return this.logs.map(log => 
            `[${log.timestamp}] [${log.category}] [${log.level}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
          ).join('\n');
        
        default:
          return this.exportLogs('json');
      }
    },

    /**
     * Clear logs
     */
    clearLogs() {
      this.logs = [];
      this.clearPersistedLogs();
      this.log('system', 'info', 'Logs cleared');
    },

    /**
     * Persist logs to localStorage
     */
    persistLogs() {
      try {
        // Only persist recent important logs
        const importantLogs = this.logs
          .filter(log => log.level === 'error' || log.level === 'warn')
          .slice(0, 100);
        
        localStorage.setItem(this.persistenceKey, JSON.stringify(importantLogs));
      } catch (error) {
        console.error('[LOGGER] Failed to persist logs:', error);
      }
    },

    /**
     * Load persisted logs
     */
    loadPersistedLogs() {
      try {
        const stored = localStorage.getItem(this.persistenceKey);
        if (stored) {
          const logs = JSON.parse(stored);
          // Add persisted flag
          logs.forEach(log => log.persisted = true);
          this.logs = [...logs, ...this.logs];
        }
      } catch (error) {
        console.error('[LOGGER] Failed to load persisted logs:', error);
      }
    },

    /**
     * Clear persisted logs
     */
    clearPersistedLogs() {
      try {
        localStorage.removeItem(this.persistenceKey);
      } catch (error) {
        console.error('[LOGGER] Failed to clear persisted logs:', error);
      }
    },

    /**
     * Set up logging UI
     */
    setupLoggingUI() {
      // Add a floating button to show logs
      const button = document.createElement('button');
      button.id = 'logger-toggle';
      button.innerHTML = '📋';
      button.title = 'Show Logs';
      button.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #007bff;
        color: white;
        border: none;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 9999;
      `;
      
      button.onclick = () => this.toggleLogViewer();
      document.body.appendChild(button);
    },

    /**
     * Toggle log viewer
     */
    toggleLogViewer() {
      let viewer = document.getElementById('logger-viewer');
      
      if (viewer) {
        viewer.remove();
      } else {
        this.createLogViewer();
      }
    },

    /**
     * Create log viewer UI
     */
    createLogViewer() {
      const viewer = document.createElement('div');
      viewer.id = 'logger-viewer';
      viewer.style.cssText = `
        position: fixed;
        bottom: 70px;
        left: 20px;
        width: 600px;
        height: 400px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9998;
        display: flex;
        flex-direction: column;
      `;
      
      viewer.innerHTML = `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">System Logs</h3>
          <div>
            <select id="logger-level-filter" style="margin-right: 10px;">
              <option value="">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <select id="logger-category-filter" style="margin-right: 10px;">
              <option value="">All Categories</option>
              <option value="system">System</option>
              <option value="agent">Agent</option>
              <option value="api">API</option>
              <option value="network">Network</option>
              <option value="tool">Tool</option>
            </select>
            <button onclick="Logger.clearLogs()" style="margin-right: 10px;">Clear</button>
            <button onclick="Logger.toggleLogViewer()">Close</button>
          </div>
        </div>
        <div id="logger-content" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 12px;">
        </div>
      `;
      
      document.body.appendChild(viewer);
      
      // Set up filters
      const levelFilter = viewer.querySelector('#logger-level-filter');
      const categoryFilter = viewer.querySelector('#logger-category-filter');
      
      levelFilter.onchange = () => this.updateLogViewer();
      categoryFilter.onchange = () => this.updateLogViewer();
      
      // Initial render
      this.updateLogViewer();
      
      // Auto-update
      this.addListener('viewer', () => this.updateLogViewer());
    },

    /**
     * Update log viewer content
     */
    updateLogViewer() {
      const content = document.getElementById('logger-content');
      if (!content) return;
      
      const levelFilter = document.getElementById('logger-level-filter')?.value;
      const categoryFilter = document.getElementById('logger-category-filter')?.value;
      
      const logs = this.getLogs({
        level: levelFilter || undefined,
        category: categoryFilter || undefined
      });
      
      const html = logs.map(log => {
        const color = {
          debug: '#6c757d',
          info: '#0066cc',
          warn: '#ff9800',
          error: '#dc3545'
        }[log.level];
        
        return `
          <div style="margin-bottom: 5px; padding: 5px; background: #f5f5f5; border-left: 3px solid ${color};">
            <span style="color: #666;">[${log.timestamp.split('T')[1].split('.')[0]}]</span>
            <span style="color: ${color}; font-weight: bold;">[${log.level.toUpperCase()}]</span>
            <span style="color: #333;">[${log.category}]</span>
            ${log.message}
            ${log.data ? `<pre style="margin: 5px 0 0 0; font-size: 11px;">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
          </div>
        `;
      }).join('');
      
      content.innerHTML = html || '<div style="color: #666;">No logs to display</div>';
    },

    /**
     * Integrate with DebugManager if available
     */
    integrateWithDebugManager() {
      if (window.DebugManager) {
        // Override DebugManager.addLog
        const originalAddLog = window.DebugManager.addLog;
        window.DebugManager.addLog = (message, type = 'info') => {
          // Call original
          if (originalAddLog) {
            originalAddLog.call(window.DebugManager, message, type);
          }
          
          // Map DebugManager types to our levels
          const levelMap = {
            'success': 'info',
            'error': 'error',
            'warning': 'warn',
            'info': 'info'
          };
          
          // Log to our system
          this.log('system', levelMap[type] || 'info', message);
        };
        
        this.log('system', 'info', 'Integrated with DebugManager');
      }
    }
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Logger.init();
    });
  } else {
    setTimeout(() => {
      Logger.init();
    }, 0);
  }

  console.log('✅ Centralized Logger module loaded');
})();