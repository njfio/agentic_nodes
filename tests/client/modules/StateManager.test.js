// Mock the StateManager since the actual file might not exist yet
const { StateManager } = require('../../../client/state-manager');

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Create new instance for each test
    stateManager = new StateManager();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const initialState = {
        user: null,
        workflow: { nodes: [], connections: [] }
      };

      stateManager.init(initialState);

      expect(stateManager.getState()).toEqual(initialState);
    });

    it('should merge with persisted state from localStorage', () => {
      const persistedState = {
        user: { id: '123', name: 'Test User' }
      };
      localStorage.setItem('appState', JSON.stringify(persistedState));

      const initialState = {
        user: null,
        workflow: { nodes: [], connections: [] }
      };

      stateManager = new StateManager();
      stateManager.init(initialState);

      expect(stateManager.getState()).toEqual({
        user: persistedState.user,
        workflow: initialState.workflow
      });
    });
  });

  describe('State Updates', () => {
    beforeEach(() => {
      stateManager.init({
        counter: 0,
        user: null,
        items: []
      });
    });

    it('should update state through dispatch', () => {
      stateManager.dispatch({
        type: 'INCREMENT',
        payload: 5
      });

      const reducer = (state, action) => {
        switch (action.type) {
          case 'INCREMENT':
            return { ...state, counter: state.counter + action.payload };
          default:
            return state;
        }
      };

      stateManager.addReducer('counter', reducer);
      stateManager.dispatch({
        type: 'INCREMENT',
        payload: 5
      });

      expect(stateManager.getState().counter).toBe(5);
    });

    it('should notify subscribers on state change', () => {
      const subscriber = jest.fn();
      stateManager.subscribe(subscriber);

      stateManager.dispatch({
        type: 'SET_USER',
        payload: { id: '123', name: 'Test' }
      });

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          counter: 0,
          user: null,
          items: []
        }),
        expect.objectContaining({
          type: 'SET_USER',
          payload: { id: '123', name: 'Test' }
        })
      );
    });

    it('should allow unsubscribing', () => {
      const subscriber = jest.fn();
      const unsubscribe = stateManager.subscribe(subscriber);

      unsubscribe();

      stateManager.dispatch({ type: 'TEST_ACTION' });

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      stateManager.init({
        users: [
          { id: '1', name: 'Alice', active: true },
          { id: '2', name: 'Bob', active: false },
          { id: '3', name: 'Charlie', active: true }
        ],
        currentUserId: '1'
      });
    });

    it('should select state with selector function', () => {
      const activeUsers = stateManager.select(state =>
        state.users.filter(user => user.active)
      );

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers[0].name).toBe('Alice');
      expect(activeUsers[1].name).toBe('Charlie');
    });

    it('should memoize selector results', () => {
      const selector = jest.fn(state =>
        state.users.filter(user => user.active)
      );

      // Call selector multiple times
      stateManager.select(selector);
      stateManager.select(selector);
      stateManager.select(selector);

      // Selector should only be called once due to memoization
      expect(selector).toHaveBeenCalledTimes(1);
    });

    it('should create computed selectors', () => {
      const getCurrentUser = stateManager.createSelector(
        state => state.users,
        state => state.currentUserId,
        (users, currentId) => users.find(user => user.id === currentId)
      );

      const currentUser = getCurrentUser(stateManager.getState());

      expect(currentUser).toEqual({
        id: '1',
        name: 'Alice',
        active: true
      });
    });
  });

  describe('Time Travel', () => {
    beforeEach(() => {
      stateManager.init({ value: 0 });
      stateManager.addReducer('main', (state, action) => {
        switch (action.type) {
          case 'SET_VALUE':
            return { ...state, value: action.payload };
          default:
            return state;
        }
      });
    });

    it('should maintain action history', () => {
      stateManager.dispatch({ type: 'SET_VALUE', payload: 1 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 2 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 3 });

      const history = stateManager.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].action.payload).toBe(1);
      expect(history[2].action.payload).toBe(3);
    });

    it('should travel to specific point in history', () => {
      stateManager.dispatch({ type: 'SET_VALUE', payload: 1 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 2 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 3 });

      stateManager.timeTravel(1); // Go to second action

      expect(stateManager.getState().value).toBe(2);
    });

    it('should undo last action', () => {
      stateManager.dispatch({ type: 'SET_VALUE', payload: 1 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 2 });

      stateManager.undo();

      expect(stateManager.getState().value).toBe(1);
    });

    it('should redo after undo', () => {
      stateManager.dispatch({ type: 'SET_VALUE', payload: 1 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 2 });

      stateManager.undo();
      stateManager.redo();

      expect(stateManager.getState().value).toBe(2);
    });

    it('should clear future history on new action after undo', () => {
      stateManager.dispatch({ type: 'SET_VALUE', payload: 1 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 2 });
      stateManager.dispatch({ type: 'SET_VALUE', payload: 3 });

      stateManager.undo();
      stateManager.undo();

      stateManager.dispatch({ type: 'SET_VALUE', payload: 4 });

      const history = stateManager.getHistory();
      expect(history).toHaveLength(2);
      expect(stateManager.getState().value).toBe(4);
    });
  });

  describe('Persistence', () => {
    it('should persist state to localStorage on change', () => {
      stateManager.init({ value: 0 });

      stateManager.dispatch({
        type: 'UPDATE',
        payload: { value: 42 }
      });

      // Wait for debounced save
      jest.runAllTimers();

      const saved = JSON.parse(localStorage.getItem('appState'));
      expect(saved).toEqual({ value: 0 }); // State hasn't been modified by reducer
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock localStorage to throw error
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      stateManager.init({ value: 0 });
      stateManager.dispatch({ type: 'TEST' });

      jest.runAllTimers();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist state:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Middleware', () => {
    it('should support middleware', () => {
      const middleware = jest.fn((store) => (next) => (action) => {
        if (action.type === 'ASYNC_ACTION') {
          setTimeout(() => {
            next({ type: 'ASYNC_COMPLETE', payload: action.payload * 2 });
          }, 100);
          return;
        }
        return next(action);
      });

      stateManager.use(middleware);
      stateManager.init({ value: 0 });

      stateManager.addReducer('main', (state, action) => {
        if (action.type === 'ASYNC_COMPLETE') {
          return { ...state, value: action.payload };
        }
        return state;
      });

      stateManager.dispatch({ type: 'ASYNC_ACTION', payload: 21 });

      jest.runAllTimers();

      expect(stateManager.getState().value).toBe(42);
    });

    it('should chain multiple middleware', () => {
      const order = [];

      const middleware1 = (store) => (next) => (action) => {
        order.push('middleware1-before');
        const result = next(action);
        order.push('middleware1-after');
        return result;
      };

      const middleware2 = (store) => (next) => (action) => {
        order.push('middleware2-before');
        const result = next(action);
        order.push('middleware2-after');
        return result;
      };

      stateManager.use(middleware1);
      stateManager.use(middleware2);
      stateManager.init({});

      stateManager.dispatch({ type: 'TEST' });

      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'middleware2-after',
        'middleware1-after'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle reducer errors', () => {
      const errorReducer = (state, action) => {
        if (action.type === 'ERROR_ACTION') {
          throw new Error('Reducer error');
        }
        return state;
      };

      stateManager.init({ value: 0 });
      stateManager.addReducer('error', errorReducer);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        stateManager.dispatch({ type: 'ERROR_ACTION' });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Reducer error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should validate actions', () => {
      stateManager.init({});

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Invalid action
      stateManager.dispatch(null);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid action:', null);

      // Action without type
      stateManager.dispatch({ payload: 'data' });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Action missing type:',
        { payload: 'data' }
      );

      consoleSpy.mockRestore();
    });
  });
});