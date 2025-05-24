/**
 * Main Application Class
 * Coordinates all modules and manages the application lifecycle
 */

import { EventBus } from './core/event-bus.js';
import { StateManager } from './stores/state-manager.js';
import { ConfigManager } from './config/config-manager.js';
import { Logger } from './core/logger.js';
import { CanvasManager } from './modules/canvas/canvas-manager.js';
import { NodeManager } from './modules/nodes/node-manager.js';
import { ConnectionManager } from './modules/connections/connection-manager.js';
import { WorkflowEngine } from './modules/workflow/workflow-engine.js';
import { UIManager } from './modules/ui/ui-manager.js';
import { ToolManager } from './modules/tools/tool-manager.js';
import { UnifiedAgentSystem } from './modules/agent/unified-agent-system.js';

export class App {
  constructor() {
    this.initialized = false;
    this.modules = new Map();
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) {
      Logger.warn('system', 'App already initialized');
      return;
    }

    Logger.info('system', 'Initializing application modules...');

    try {
      // Initialize core modules in order
      await this.initializeModules();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load saved state if available
      await this.loadSavedState();
      
      // Mark as initialized
      this.initialized = true;
      
      Logger.info('system', 'Application modules initialized successfully');
      EventBus.emit('app:initialized');
      
    } catch (error) {
      Logger.error('system', 'Failed to initialize application', error);
      throw error;
    }
  }

  /**
   * Initialize all modules
   */
  async initializeModules() {
    // Canvas Manager
    const canvasManager = new CanvasManager('main-canvas');
    await canvasManager.init();
    this.modules.set('canvas', canvasManager);

    // Node Manager
    const nodeManager = new NodeManager();
    await nodeManager.init();
    this.modules.set('nodes', nodeManager);

    // Connection Manager
    const connectionManager = new ConnectionManager(nodeManager);
    await connectionManager.init();
    this.modules.set('connections', connectionManager);

    // Workflow Engine
    const workflowEngine = new WorkflowEngine(nodeManager, connectionManager);
    await workflowEngine.init();
    this.modules.set('workflow', workflowEngine);

    // UI Manager
    const uiManager = new UIManager();
    await uiManager.init();
    this.modules.set('ui', uiManager);

    // Tool Manager
    const toolManager = new ToolManager();
    await toolManager.init();
    this.modules.set('tools', toolManager);

    // Unified Agent System
    const agentSystem = new UnifiedAgentSystem();
    await agentSystem.init();
    this.modules.set('agent', agentSystem);

    Logger.info('system', 'All modules initialized');
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // State synchronization
    EventBus.on('state:changed', (state) => {
      this.handleStateChange(state);
    });

    // Node events
    EventBus.on('node:created', (node) => {
      this.handleNodeCreated(node);
    });

    EventBus.on('node:deleted', (node) => {
      this.handleNodeDeleted(node);
    });

    // Connection events
    EventBus.on('connection:created', (connection) => {
      this.handleConnectionCreated(connection);
    });

    EventBus.on('connection:deleted', (connection) => {
      this.handleConnectionDeleted(connection);
    });

    // Workflow events
    EventBus.on('workflow:process', () => {
      this.processWorkflow();
    });

    // UI events
    EventBus.on('ui:save', () => {
      this.saveState();
    });

    EventBus.on('ui:load', () => {
      this.loadState();
    });

    EventBus.on('ui:export', () => {
      this.exportWorkflow();
    });

    EventBus.on('ui:import', (data) => {
      this.importWorkflow(data);
    });

    // Window events
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
  }

  /**
   * Handle state changes
   */
  handleStateChange(state) {
    // Update canvas if needed
    const canvas = this.modules.get('canvas');
    if (canvas) {
      canvas.requestRender();
    }
  }

  /**
   * Handle node created
   */
  handleNodeCreated(node) {
    // Update state
    StateManager.dispatch(StateManager.actions.ADD_NODE(node));
    
    // Render
    const canvas = this.modules.get('canvas');
    if (canvas) {
      canvas.addDirtyRect(node.x, node.y, node.width, node.height);
    }
  }

  /**
   * Handle node deleted
   */
  handleNodeDeleted(node) {
    // Update state
    StateManager.dispatch(StateManager.actions.DELETE_NODE(node.id));
    
    // Render
    const canvas = this.modules.get('canvas');
    if (canvas) {
      canvas.addDirtyRect(node.x, node.y, node.width, node.height);
    }
  }

  /**
   * Handle connection created
   */
  handleConnectionCreated(connection) {
    // Update state
    StateManager.dispatch(StateManager.actions.ADD_CONNECTION(connection));
    
    // Mark connection dirty for rendering
    const canvas = this.modules.get('canvas');
    const nodes = this.modules.get('nodes');
    if (canvas && nodes) {
      canvas.markConnectionDirty(connection, nodes.getAllNodes());
    }
  }

  /**
   * Handle connection deleted
   */
  handleConnectionDeleted(connection) {
    // Update state
    StateManager.dispatch(StateManager.actions.DELETE_CONNECTION(connection.id));
    
    // Mark connection dirty for rendering
    const canvas = this.modules.get('canvas');
    const nodes = this.modules.get('nodes');
    if (canvas && nodes) {
      canvas.markConnectionDirty(connection, nodes.getAllNodes());
    }
  }

  /**
   * Process the workflow
   */
  async processWorkflow() {
    const workflow = this.modules.get('workflow');
    if (workflow) {
      try {
        await workflow.process();
        Logger.info('workflow', 'Workflow processing completed');
      } catch (error) {
        Logger.error('workflow', 'Workflow processing failed', error);
        EventBus.emit('workflow:error', error);
      }
    }
  }

  /**
   * Save application state
   */
  async saveState() {
    try {
      const state = {
        nodes: this.modules.get('nodes').serialize(),
        connections: this.modules.get('connections').serialize(),
        workflow: StateManager.getState().workflow,
        ui: StateManager.getState().ui,
        version: '2.0.0'
      };

      // Save to localStorage
      localStorage.setItem('app_state', JSON.stringify(state));
      
      // Also save to state manager persistence
      StateManager.persist();
      
      Logger.info('system', 'Application state saved');
      EventBus.emit('app:saved');
      
    } catch (error) {
      Logger.error('system', 'Failed to save state', error);
      throw error;
    }
  }

  /**
   * Load application state
   */
  async loadState() {
    try {
      const saved = localStorage.getItem('app_state');
      if (saved) {
        const state = JSON.parse(saved);
        
        // Load nodes
        if (state.nodes) {
          this.modules.get('nodes').deserialize(state.nodes);
        }
        
        // Load connections
        if (state.connections) {
          this.modules.get('connections').deserialize(state.connections);
        }
        
        // Update state manager
        if (state.workflow) {
          StateManager.dispatch(StateManager.actions.SET_WORKFLOW(state.workflow));
        }
        
        if (state.ui) {
          StateManager.dispatch(StateManager.actions.SET_CANVAS_POSITION(state.ui.canvasPosition));
          StateManager.dispatch(StateManager.actions.SET_ZOOM(state.ui.zoom));
        }
        
        Logger.info('system', 'Application state loaded');
        EventBus.emit('app:loaded');
      }
    } catch (error) {
      Logger.error('system', 'Failed to load state', error);
      throw error;
    }
  }

  /**
   * Load saved state on startup
   */
  async loadSavedState() {
    if (ConfigManager.get('storage.autosave')) {
      await this.loadState();
    }
  }

  /**
   * Export workflow
   */
  exportWorkflow() {
    const state = {
      nodes: this.modules.get('nodes').serialize(),
      connections: this.modules.get('connections').serialize(),
      workflow: StateManager.getState().workflow,
      version: '2.0.0',
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    Logger.info('system', 'Workflow exported');
    EventBus.emit('workflow:exported');
  }

  /**
   * Import workflow
   */
  async importWorkflow(data) {
    try {
      const state = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Clear current state
      this.modules.get('nodes').clear();
      this.modules.get('connections').clear();
      
      // Load imported state
      await this.loadState();
      
      Logger.info('system', 'Workflow imported');
      EventBus.emit('workflow:imported');
      
    } catch (error) {
      Logger.error('system', 'Failed to import workflow', error);
      throw error;
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const canvas = this.modules.get('canvas');
    if (canvas) {
      canvas.resize();
    }
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload(event) {
    if (ConfigManager.get('ui.confirmDeletes')) {
      const hasUnsavedChanges = this.checkUnsavedChanges();
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    }
  }

  /**
   * Check for unsaved changes
   */
  checkUnsavedChanges() {
    // Simple check - can be enhanced
    const nodes = this.modules.get('nodes').getAllNodes();
    return nodes.some(node => node.hasBeenProcessed && !node.saved);
  }

  /**
   * Get a module by name
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Destroy the application
   */
  destroy() {
    // Clean up all modules
    for (const [name, module] of this.modules) {
      if (module.destroy) {
        module.destroy();
      }
    }
    
    this.modules.clear();
    this.initialized = false;
    
    Logger.info('system', 'Application destroyed');
  }
}