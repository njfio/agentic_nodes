/**
 * Centralized State Management System
 * Provides a Redux-like state management pattern for the application
 */

(function() {
  'use strict';

  class StateManager {
    constructor() {
      this.state = {};
      this.subscribers = new Map();
      this.middlewares = [];
      this.history = [];
      this.maxHistory = 50;
      this.actions = {};
      this.reducers = {};
      this.initialized = false;
    }

    /**
     * Initialize the state manager
     */
    init(initialState = {}) {
      if (this.initialized) {
        console.warn('StateManager already initialized');
        return;
      }

      console.log('🏪 Initializing State Manager');

      // Set initial state
      this.state = this.deepClone(initialState);

      // Register core actions and reducers
      this.registerCoreActions();
      this.registerCoreReducers();

      // Add logging middleware in development
      if (process.env.NODE_ENV !== 'production') {
        this.addMiddleware(this.loggingMiddleware);
      }

      // Save initial state to history
      this.saveToHistory('INIT', this.state, null);

      this.initialized = true;
      console.log('✅ State Manager initialized with state:', this.state);
    }

    /**
     * Register core actions
     */
    registerCoreActions() {
      // Node actions
      this.registerAction('ADD_NODE', (node) => ({
        type: 'ADD_NODE',
        payload: node
      }));

      this.registerAction('UPDATE_NODE', (id, updates) => ({
        type: 'UPDATE_NODE',
        payload: { id, updates }
      }));

      this.registerAction('DELETE_NODE', (id) => ({
        type: 'DELETE_NODE',
        payload: id
      }));

      this.registerAction('SET_NODE_PROCESSING', (id, processing) => ({
        type: 'SET_NODE_PROCESSING',
        payload: { id, processing }
      }));

      // Connection actions
      this.registerAction('ADD_CONNECTION', (connection) => ({
        type: 'ADD_CONNECTION',
        payload: connection
      }));

      this.registerAction('DELETE_CONNECTION', (id) => ({
        type: 'DELETE_CONNECTION',
        payload: id
      }));

      // Workflow actions
      this.registerAction('SET_WORKFLOW', (workflow) => ({
        type: 'SET_WORKFLOW',
        payload: workflow
      }));

      this.registerAction('UPDATE_WORKFLOW', (updates) => ({
        type: 'UPDATE_WORKFLOW',
        payload: updates
      }));

      // UI actions
      this.registerAction('SET_SELECTED_NODE', (nodeId) => ({
        type: 'SET_SELECTED_NODE',
        payload: nodeId
      }));

      this.registerAction('SET_CANVAS_POSITION', (position) => ({
        type: 'SET_CANVAS_POSITION',
        payload: position
      }));

      this.registerAction('SET_ZOOM', (zoom) => ({
        type: 'SET_ZOOM',
        payload: zoom
      }));

      // Config actions
      this.registerAction('UPDATE_CONFIG', (config) => ({
        type: 'UPDATE_CONFIG',
        payload: config
      }));
    }

    /**
     * Register core reducers
     */
    registerCoreReducers() {
      // Nodes reducer
      this.registerReducer('nodes', (state = [], action) => {
        switch (action.type) {
          case 'ADD_NODE':
            return [...state, action.payload];
          
          case 'UPDATE_NODE':
            return state.map(node => 
              node.id === action.payload.id 
                ? { ...node, ...action.payload.updates }
                : node
            );
          
          case 'DELETE_NODE':
            return state.filter(node => node.id !== action.payload);
          
          case 'SET_NODE_PROCESSING':
            return state.map(node =>
              node.id === action.payload.id
                ? { ...node, processing: action.payload.processing }
                : node
            );
          
          default:
            return state;
        }
      });

      // Connections reducer
      this.registerReducer('connections', (state = [], action) => {
        switch (action.type) {
          case 'ADD_CONNECTION':
            return [...state, action.payload];
          
          case 'DELETE_CONNECTION':
            return state.filter(conn => conn.id !== action.payload);
          
          case 'DELETE_NODE':
            // Remove connections when node is deleted
            return state.filter(conn => 
              conn.from !== action.payload && conn.to !== action.payload
            );
          
          default:
            return state;
        }
      });

      // Workflow reducer
      this.registerReducer('workflow', (state = {}, action) => {
        switch (action.type) {
          case 'SET_WORKFLOW':
            return action.payload;
          
          case 'UPDATE_WORKFLOW':
            return { ...state, ...action.payload };
          
          default:
            return state;
        }
      });

      // UI reducer
      this.registerReducer('ui', (state = {
        selectedNodeId: null,
        canvasPosition: { x: 0, y: 0 },
        zoom: 1,
        isDragging: false,
        isConnecting: false
      }, action) => {
        switch (action.type) {
          case 'SET_SELECTED_NODE':
            return { ...state, selectedNodeId: action.payload };
          
          case 'SET_CANVAS_POSITION':
            return { ...state, canvasPosition: action.payload };
          
          case 'SET_ZOOM':
            return { ...state, zoom: action.payload };
          
          default:
            return state;
        }
      });

      // Config reducer
      this.registerReducer('config', (state = {}, action) => {
        switch (action.type) {
          case 'UPDATE_CONFIG':
            return { ...state, ...action.payload };
          
          default:
            return state;
        }
      });
    }

    /**
     * Register an action creator
     */
    registerAction(type, creator) {
      this.actions[type] = creator;
    }

    /**
     * Register a reducer
     */
    registerReducer(key, reducer) {
      this.reducers[key] = reducer;
    }

    /**
     * Get the current state
     */
    getState() {
      return this.deepClone(this.state);
    }

    /**
     * Dispatch an action
     */
    dispatch(action) {
      if (!action || !action.type) {
        console.error('Actions must have a type property');
        return;
      }

      // Run middlewares
      let finalAction = action;
      for (const middleware of this.middlewares) {
        finalAction = middleware(finalAction, this.getState());
        if (!finalAction) return; // Middleware can cancel action
      }

      // Save previous state
      const prevState = this.deepClone(this.state);

      // Run reducers
      const newState = {};
      for (const [key, reducer] of Object.entries(this.reducers)) {
        newState[key] = reducer(this.state[key], finalAction);
      }

      // Update state
      this.state = newState;

      // Save to history
      this.saveToHistory(finalAction.type, newState, prevState);

      // Notify subscribers
      this.notifySubscribers(finalAction, prevState);

      return finalAction;
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback, filter = null) {
      const id = Symbol('subscriber');
      this.subscribers.set(id, { callback, filter });

      // Return unsubscribe function
      return () => {
        this.subscribers.delete(id);
      };
    }

    /**
     * Notify subscribers of state changes
     */
    notifySubscribers(action, prevState) {
      this.subscribers.forEach(({ callback, filter }) => {
        try {
          // Check if subscriber wants this type of update
          if (filter && !this.matchesFilter(action, filter)) {
            return;
          }

          callback(this.getState(), action, prevState);
        } catch (error) {
          console.error('Subscriber error:', error);
        }
      });
    }

    /**
     * Check if action matches filter
     */
    matchesFilter(action, filter) {
      if (typeof filter === 'string') {
        return action.type === filter;
      }
      if (Array.isArray(filter)) {
        return filter.includes(action.type);
      }
      if (typeof filter === 'function') {
        return filter(action);
      }
      return true;
    }

    /**
     * Add middleware
     */
    addMiddleware(middleware) {
      this.middlewares.push(middleware);
    }

    /**
     * Logging middleware
     */
    loggingMiddleware(action, state) {
      console.group(`🔄 ${action.type}`);
      console.log('Previous State:', state);
      console.log('Action:', action);
      console.groupEnd();
      return action;
    }

    /**
     * Save state to history
     */
    saveToHistory(actionType, newState, prevState) {
      this.history.unshift({
        timestamp: Date.now(),
        actionType,
        state: this.deepClone(newState),
        prevState: prevState ? this.deepClone(prevState) : null
      });

      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(0, this.maxHistory);
      }
    }

    /**
     * Get state history
     */
    getHistory() {
      return [...this.history];
    }

    /**
     * Time travel to a previous state
     */
    timeTravel(index) {
      if (index < 0 || index >= this.history.length) {
        console.error('Invalid history index');
        return;
      }

      const historyEntry = this.history[index];
      this.state = this.deepClone(historyEntry.state);
      
      // Notify subscribers
      this.notifySubscribers(
        { type: 'TIME_TRAVEL', payload: index },
        historyEntry.prevState
      );
    }

    /**
     * Create a selector for derived state
     */
    createSelector(selector, equalityFn = null) {
      let lastResult = undefined;
      let lastState = undefined;

      return () => {
        const currentState = this.getState();
        
        // Check if state changed
        if (equalityFn ? equalityFn(currentState, lastState) : currentState === lastState) {
          return lastResult;
        }

        lastState = currentState;
        lastResult = selector(currentState);
        return lastResult;
      };
    }

    /**
     * Batch multiple dispatches
     */
    batch(callback) {
      const dispatches = [];
      const originalDispatch = this.dispatch.bind(this);

      // Temporarily replace dispatch
      this.dispatch = (action) => {
        dispatches.push(action);
        return action;
      };

      // Run callback
      callback();

      // Restore dispatch
      this.dispatch = originalDispatch;

      // Create batch action
      const batchAction = {
        type: 'BATCH',
        payload: dispatches
      };

      // Dispatch batch
      return this.dispatch(batchAction);
    }

    /**
     * Connect a component to the state
     */
    connect(mapStateToProps, mapDispatchToProps = null) {
      return (component) => {
        let unsubscribe = null;
        let lastProps = null;

        const update = () => {
          const state = this.getState();
          const stateProps = mapStateToProps ? mapStateToProps(state) : {};
          const dispatchProps = mapDispatchToProps 
            ? mapDispatchToProps(this.dispatch.bind(this))
            : { dispatch: this.dispatch.bind(this) };

          const newProps = { ...stateProps, ...dispatchProps };

          // Check if props changed
          if (!this.shallowEqual(newProps, lastProps)) {
            lastProps = newProps;
            if (component.onPropsChanged) {
              component.onPropsChanged(newProps);
            }
          }
        };

        // Subscribe to changes
        unsubscribe = this.subscribe(update);

        // Initial update
        update();

        // Return cleanup function
        return () => {
          if (unsubscribe) unsubscribe();
        };
      };
    }

    /**
     * Persist state to localStorage
     */
    persist(key = 'app_state') {
      try {
        const state = this.getState();
        localStorage.setItem(key, JSON.stringify(state));
        return true;
      } catch (error) {
        console.error('Failed to persist state:', error);
        return false;
      }
    }

    /**
     * Load state from localStorage
     */
    loadPersisted(key = 'app_state') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const state = JSON.parse(stored);
          this.state = state;
          this.notifySubscribers({ type: 'LOAD_PERSISTED' }, null);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to load persisted state:', error);
        return false;
      }
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

    /**
     * Shallow equality check
     */
    shallowEqual(obj1, obj2) {
      if (obj1 === obj2) return true;
      if (!obj1 || !obj2) return false;

      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
      }

      return true;
    }
  }

  // Create singleton instance
  window.StateManager = new StateManager();

  // Initialize with default state
  const initialState = {
    nodes: [],
    connections: [],
    workflow: {
      id: null,
      name: 'Untitled Workflow',
      description: '',
      version: 1
    },
    ui: {
      selectedNodeId: null,
      canvasPosition: { x: 0, y: 0 },
      zoom: 1,
      isDragging: false,
      isConnecting: false,
      theme: 'light'
    },
    config: {
      openai: {},
      autosave: true,
      autosaveInterval: 30000,
      maxUndoHistory: 50
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      StateManager.init(initialState);
    });
  } else {
    setTimeout(() => {
      StateManager.init(initialState);
    }, 0);
  }

  console.log('✅ StateManager module loaded');
})();