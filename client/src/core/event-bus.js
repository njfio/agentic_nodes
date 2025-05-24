/**
 * Event Bus
 * Central event system for the application
 */

import { EventEmitter } from 'eventemitter3';

class EventBusClass extends EventEmitter {
  constructor() {
    super();
    this.debug = false;
  }

  init() {
    this.debug = window.ConfigManager?.get('debug.logEvents', false) || false;
    console.log('🚌 EventBus initialized');
  }

  emit(event, ...args) {
    if (this.debug) {
      console.log(`🚌 Event: ${event}`, ...args);
    }
    return super.emit(event, ...args);
  }

  /**
   * Emit an event and wait for all handlers to complete
   */
  async emitAsync(event, ...args) {
    const handlers = this.listeners(event);
    const results = [];

    for (const handler of handlers) {
      try {
        const result = await handler(...args);
        results.push(result);
      } catch (error) {
        console.error(`Error in async event handler for ${event}:`, error);
        if (window.ErrorBoundary) {
          window.ErrorBoundary.handleError(error);
        }
      }
    }

    return results;
  }

  /**
   * Subscribe to multiple events
   */
  onMany(events, handler) {
    events.forEach(event => this.on(event, handler));
    
    // Return unsubscribe function
    return () => {
      events.forEach(event => this.off(event, handler));
    };
  }

  /**
   * Subscribe to an event pattern
   */
  onPattern(pattern, handler) {
    const regex = new RegExp(pattern);
    
    // Override emit to check pattern
    const originalEmit = this.emit.bind(this);
    this.emit = (event, ...args) => {
      if (regex.test(event)) {
        handler(event, ...args);
      }
      return originalEmit(event, ...args);
    };
  }

  /**
   * Wait for an event to occur
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const handler = (...args) => {
        clearTimeout(timer);
        resolve(args);
      };

      this.once(event, handler);
    });
  }

  /**
   * Create a namespaced event emitter
   */
  namespace(ns) {
    const self = this;
    return {
      emit: (event, ...args) => self.emit(`${ns}:${event}`, ...args),
      on: (event, handler) => self.on(`${ns}:${event}`, handler),
      once: (event, handler) => self.once(`${ns}:${event}`, handler),
      off: (event, handler) => self.off(`${ns}:${event}`, handler),
      removeAllListeners: (event) => self.removeAllListeners(event ? `${ns}:${event}` : undefined)
    };
  }
}

// Create singleton instance
export const EventBus = new EventBusClass();