/**
 * Centralized Configuration Management
 * Handles all application configuration with validation and persistence
 */

(function() {
  'use strict';

  class ConfigManager {
    constructor() {
      this.config = {};
      this.defaults = {};
      this.validators = {};
      this.listeners = new Map();
      this.persistKey = 'app_config';
      this.initialized = false;
    }

    /**
     * Initialize the configuration manager
     */
    init() {
      if (this.initialized) {
        console.warn('ConfigManager already initialized');
        return;
      }

      console.log('⚙️ Initializing Configuration Manager');

      // Define default configuration
      this.defineDefaults();

      // Load configuration
      this.loadConfig();

      // Validate configuration
      this.validateAll();

      // Set up auto-save
      this.setupAutoSave();

      this.initialized = true;
      console.log('✅ Configuration Manager initialized');
    }

    /**
     * Define default configuration values
     */
    defineDefaults() {
      this.defaults = {
        // API Configuration
        api: {
          baseUrl: window.location.origin,
          timeout: 60000,
          retryAttempts: 3,
          retryDelay: 1000
        },

        // OpenAI Configuration
        openai: {
          apiKey: '',
          model: 'gpt-4o',
          maxTokens: 4000,
          temperature: 0.7,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0
        },

        // Perplexity Configuration
        perplexity: {
          apiKey: '',
          model: 'sonar-medium-online',
          maxTokens: 2000
        },

        // Canvas Configuration
        canvas: {
          gridSize: 20,
          snapToGrid: false,
          showGrid: true,
          backgroundColor: '#f5f5f5',
          connectionColor: '#666',
          selectionColor: '#4ECDC4',
          minZoom: 0.1,
          maxZoom: 5,
          zoomStep: 0.1,
          panSpeed: 1.5
        },

        // Node Configuration
        nodes: {
          defaultWidth: 200,
          defaultHeight: 150,
          minWidth: 100,
          minHeight: 50,
          maxWidth: 800,
          maxHeight: 600,
          borderRadius: 8,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.1)'
        },

        // Agent Configuration
        agent: {
          maxIterations: 5,
          iterationTimeout: 30000,
          enableReasoning: true,
          enableTools: true,
          autoIterate: true,
          debugMode: false,
          defaultSystemPrompt: 'You are a helpful AI assistant.'
        },

        // UI Configuration
        ui: {
          theme: 'light',
          animations: true,
          animationDuration: 200,
          showTooltips: true,
          tooltipDelay: 500,
          confirmDeletes: true,
          autoLayout: false,
          sidebarWidth: 300,
          toolbarPosition: 'top'
        },

        // Collaboration Configuration
        collaboration: {
          enabled: false,
          userName: 'Anonymous',
          userColor: '#' + Math.floor(Math.random()*16777215).toString(16),
          showCursors: true,
          showNames: true,
          syncDelay: 100
        },

        // Performance Configuration
        performance: {
          throttleCanvas: true,
          throttleDelay: 16, // ~60fps
          lazyLoadImages: true,
          maxCachedImages: 100,
          enableWebGL: false,
          batchUpdates: true,
          virtualizeNodes: true,
          virtualizeThreshold: 100
        },

        // Storage Configuration
        storage: {
          autosave: true,
          autosaveInterval: 30000,
          compressData: true,
          maxLocalStorage: 5242880, // 5MB
          cloudSync: false,
          cloudProvider: null
        },

        // Debug Configuration
        debug: {
          enabled: false,
          logLevel: 'info',
          showPerformanceMetrics: false,
          showMemoryUsage: false,
          logAPIRequests: false,
          logStateChanges: false
        }
      };

      // Define validators
      this.defineValidators();
    }

    /**
     * Define configuration validators
     */
    defineValidators() {
      // API validators
      this.validators['api.baseUrl'] = (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error('Invalid URL format');
        }
      };

      this.validators['api.timeout'] = (value) => {
        if (value < 1000 || value > 300000) {
          throw new Error('Timeout must be between 1 and 300 seconds');
        }
        return true;
      };

      // OpenAI validators
      this.validators['openai.apiKey'] = (value) => {
        if (value && !value.startsWith('sk-')) {
          console.warn('OpenAI API key should start with "sk-"');
        }
        return true;
      };

      this.validators['openai.temperature'] = (value) => {
        if (value < 0 || value > 2) {
          throw new Error('Temperature must be between 0 and 2');
        }
        return true;
      };

      // Canvas validators
      this.validators['canvas.gridSize'] = (value) => {
        if (value < 5 || value > 100) {
          throw new Error('Grid size must be between 5 and 100');
        }
        return true;
      };

      this.validators['canvas.minZoom'] = (value) => {
        if (value < 0.01 || value > 1) {
          throw new Error('Min zoom must be between 0.01 and 1');
        }
        return true;
      };

      // Node validators
      this.validators['nodes.defaultWidth'] = (value) => {
        if (value < 50 || value > 1000) {
          throw new Error('Default width must be between 50 and 1000');
        }
        return true;
      };

      // Agent validators
      this.validators['agent.maxIterations'] = (value) => {
        if (value < 1 || value > 20) {
          throw new Error('Max iterations must be between 1 and 20');
        }
        return true;
      };
    }

    /**
     * Get a configuration value
     */
    get(path, defaultValue = undefined) {
      const keys = path.split('.');
      let value = this.config;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue !== undefined ? defaultValue : this.getDefault(path);
        }
      }

      return value;
    }

    /**
     * Set a configuration value
     */
    set(path, value, options = {}) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = this.config;

      // Navigate to the target object
      for (const key of keys) {
        if (!(key in target) || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }

      // Validate if validator exists
      if (this.validators[path] && !options.skipValidation) {
        try {
          this.validators[path](value);
        } catch (error) {
          console.error(`Configuration validation failed for ${path}:`, error.message);
          if (!options.force) {
            throw error;
          }
        }
      }

      // Store old value
      const oldValue = target[lastKey];

      // Set new value
      target[lastKey] = value;

      // Notify listeners
      this.notifyListeners(path, value, oldValue);

      // Persist if needed
      if (!options.skipPersist) {
        this.saveConfig();
      }

      return value;
    }

    /**
     * Set multiple configuration values
     */
    setMultiple(updates, options = {}) {
      const changes = [];

      for (const [path, value] of Object.entries(updates)) {
        try {
          this.set(path, value, { ...options, skipPersist: true });
          changes.push({ path, value, success: true });
        } catch (error) {
          changes.push({ path, value, success: false, error: error.message });
        }
      }

      // Persist once after all changes
      if (!options.skipPersist) {
        this.saveConfig();
      }

      return changes;
    }

    /**
     * Reset configuration to defaults
     */
    reset(path = null) {
      if (path) {
        const defaultValue = this.getDefault(path);
        if (defaultValue !== undefined) {
          this.set(path, defaultValue);
        }
      } else {
        // Reset all
        this.config = this.deepClone(this.defaults);
        this.notifyListeners('*', this.config, {});
        this.saveConfig();
      }
    }

    /**
     * Get default value
     */
    getDefault(path) {
      const keys = path.split('.');
      let value = this.defaults;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return undefined;
        }
      }

      return value;
    }

    /**
     * Subscribe to configuration changes
     */
    subscribe(path, callback) {
      const id = Symbol('listener');
      
      if (!this.listeners.has(path)) {
        this.listeners.set(path, new Map());
      }
      
      this.listeners.get(path).set(id, callback);

      // Return unsubscribe function
      return () => {
        const pathListeners = this.listeners.get(path);
        if (pathListeners) {
          pathListeners.delete(id);
          if (pathListeners.size === 0) {
            this.listeners.delete(path);
          }
        }
      };
    }

    /**
     * Notify listeners of changes
     */
    notifyListeners(path, newValue, oldValue) {
      // Notify exact path listeners
      const exactListeners = this.listeners.get(path);
      if (exactListeners) {
        exactListeners.forEach(callback => {
          try {
            callback(newValue, oldValue, path);
          } catch (error) {
            console.error('Config listener error:', error);
          }
        });
      }

      // Notify wildcard listeners
      const wildcardListeners = this.listeners.get('*');
      if (wildcardListeners) {
        wildcardListeners.forEach(callback => {
          try {
            callback(this.config, { [path]: oldValue }, path);
          } catch (error) {
            console.error('Config wildcard listener error:', error);
          }
        });
      }

      // Notify parent path listeners
      const pathParts = path.split('.');
      for (let i = pathParts.length - 1; i > 0; i--) {
        const parentPath = pathParts.slice(0, i).join('.');
        const parentListeners = this.listeners.get(parentPath + '.*');
        if (parentListeners) {
          parentListeners.forEach(callback => {
            try {
              callback(this.get(parentPath), oldValue, path);
            } catch (error) {
              console.error('Config parent listener error:', error);
            }
          });
        }
      }
    }

    /**
     * Validate all configuration
     */
    validateAll() {
      const errors = [];

      for (const [path, validator] of Object.entries(this.validators)) {
        try {
          const value = this.get(path);
          validator(value);
        } catch (error) {
          errors.push({ path, error: error.message });
        }
      }

      if (errors.length > 0) {
        console.warn('Configuration validation errors:', errors);
      }

      return errors;
    }

    /**
     * Load configuration from storage
     */
    loadConfig() {
      try {
        // Start with defaults
        this.config = this.deepClone(this.defaults);

        // Load from localStorage
        const stored = localStorage.getItem(this.persistKey);
        if (stored) {
          const loaded = JSON.parse(stored);
          this.mergeConfig(loaded);
          console.log('Configuration loaded from storage');
        }

        // Load from URL parameters
        this.loadFromURL();

      } catch (error) {
        console.error('Failed to load configuration:', error);
        this.config = this.deepClone(this.defaults);
      }
    }

    /**
     * Save configuration to storage
     */
    saveConfig() {
      try {
        const toSave = this.getSerializable();
        localStorage.setItem(this.persistKey, JSON.stringify(toSave));
      } catch (error) {
        console.error('Failed to save configuration:', error);
      }
    }

    /**
     * Get serializable configuration
     */
    getSerializable() {
      const serializable = {};

      const serialize = (source, target, path = '') => {
        for (const [key, value] of Object.entries(source)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Skip functions and undefined values
          if (typeof value === 'function' || value === undefined) {
            continue;
          }

          // Skip default values to save space
          if (JSON.stringify(value) === JSON.stringify(this.getDefault(currentPath))) {
            continue;
          }

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            target[key] = {};
            serialize(value, target[key], currentPath);
            
            // Remove empty objects
            if (Object.keys(target[key]).length === 0) {
              delete target[key];
            }
          } else {
            target[key] = value;
          }
        }
      };

      serialize(this.config, serializable);
      return serializable;
    }

    /**
     * Merge configuration objects
     */
    mergeConfig(source, target = this.config) {
      for (const [key, value] of Object.entries(source)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          this.mergeConfig(value, target[key]);
        } else {
          target[key] = value;
        }
      }
    }

    /**
     * Load configuration from URL parameters
     */
    loadFromURL() {
      const params = new URLSearchParams(window.location.search);
      
      // Check for config parameters
      for (const [key, value] of params.entries()) {
        if (key.startsWith('config.')) {
          const path = key.substring(7); // Remove 'config.' prefix
          try {
            // Try to parse as JSON first
            let parsedValue;
            try {
              parsedValue = JSON.parse(value);
            } catch {
              // If not JSON, use as string
              parsedValue = value;
            }
            
            this.set(path, parsedValue, { skipPersist: true });
            console.log(`Loaded config from URL: ${path} = ${parsedValue}`);
          } catch (error) {
            console.error(`Failed to set config from URL: ${key}`, error);
          }
        }
      }
    }

    /**
     * Export configuration
     */
    export(format = 'json') {
      const config = this.getSerializable();

      switch (format) {
        case 'json':
          return JSON.stringify(config, null, 2);
        
        case 'url':
          const params = new URLSearchParams();
          const addParams = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
              const path = prefix ? `${prefix}.${key}` : key;
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                addParams(value, path);
              } else {
                params.set(`config.${path}`, JSON.stringify(value));
              }
            }
          };
          addParams(config);
          return params.toString();
        
        default:
          return this.export('json');
      }
    }

    /**
     * Import configuration
     */
    import(data, format = 'json') {
      try {
        let config;
        
        switch (format) {
          case 'json':
            config = typeof data === 'string' ? JSON.parse(data) : data;
            break;
          
          case 'url':
            const params = new URLSearchParams(data);
            config = {};
            for (const [key, value] of params.entries()) {
              if (key.startsWith('config.')) {
                const path = key.substring(7);
                const keys = path.split('.');
                let target = config;
                for (let i = 0; i < keys.length - 1; i++) {
                  if (!(keys[i] in target)) {
                    target[keys[i]] = {};
                  }
                  target = target[keys[i]];
                }
                target[keys[keys.length - 1]] = JSON.parse(value);
              }
            }
            break;
          
          default:
            throw new Error(`Unknown format: ${format}`);
        }

        // Merge with current config
        this.mergeConfig(config);
        this.validateAll();
        this.saveConfig();
        
        return true;
      } catch (error) {
        console.error('Failed to import configuration:', error);
        return false;
      }
    }

    /**
     * Set up auto-save
     */
    setupAutoSave() {
      // Debounced save function
      let saveTimeout;
      const debouncedSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          this.saveConfig();
        }, 1000);
      };

      // Listen to all changes
      this.subscribe('*', debouncedSave);
    }

    /**
     * Deep clone helper
     */
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj);
      if (obj instanceof Array) return obj.map(item => this.deepClone(item));
      if (obj instanceof Object) {
        const cloned = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            cloned[key] = this.deepClone(obj[key]);
          }
        }
        return cloned;
      }
    }
  }

  // Create singleton instance
  window.ConfigManager = new ConfigManager();

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ConfigManager.init();
    });
  } else {
    setTimeout(() => {
      ConfigManager.init();
    }, 0);
  }

  console.log('✅ ConfigManager module loaded');
})();