/**
 * Main Application Entry Point
 * Initializes all modules and starts the application
 */

import { EventBus } from './core/event-bus.js';
import { StateManager } from './stores/state-manager.js';
import { ConfigManager } from './config/config-manager.js';
import { ErrorBoundary } from './core/error-boundary.js';
import { Logger } from './core/logger.js';
import { App } from './app.js';

// Make core modules globally available during migration
window.EventBus = EventBus;
window.StateManager = StateManager;
window.ConfigManager = ConfigManager;
window.ErrorBoundary = ErrorBoundary;
window.Logger = Logger;

// Initialize application
async function initializeApp() {
  try {
    Logger.info('system', 'Starting application initialization...');

    // Initialize core systems
    await ErrorBoundary.init();
    await Logger.init();
    await ConfigManager.init();
    await StateManager.init();
    
    // Initialize event bus
    EventBus.init();

    // Initialize main application
    const app = new App();
    await app.init();

    // Make app globally available during migration
    window.App = app;

    Logger.info('system', 'Application initialized successfully');

    // Dispatch ready event
    EventBus.emit('app:ready');
    
  } catch (error) {
    Logger.error('system', 'Failed to initialize application', error);
    ErrorBoundary.handleError(error);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}