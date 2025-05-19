/**
 * Centralized logging service with different log levels
 */
class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Default log level (can be overridden by environment variable)
    this.currentLevel = this.getLevelFromEnv();
    
    // Add request ID tracking
    this.requestId = null;
  }

  /**
   * Get log level from environment variable
   * @returns {number} - Log level 
   */
  getLevelFromEnv() {
    const envLevel = process.env.LOG_LEVEL || 'info';
    return this.levels[envLevel.toLowerCase()] || this.levels.info;
  }

  /**
   * Set the current log level
   * @param {string} level - Log level (error, warn, info, debug)
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }

  /**
   * Set the request ID for tracking
   * @param {string} id - Request ID
   */
  setRequestId(id) {
    this.requestId = id;
  }

  /**
   * Format a log message with timestamp, level, and request ID
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {Object} - Formatted log object
   */
  formatLog(level, message, data) {
    const logObject = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    // Add request ID if available
    if (this.requestId) {
      logObject.requestId = this.requestId;
    }

    // Add additional data if available
    if (data) {
      logObject.data = data;
    }

    return logObject;
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  error(message, data) {
    if (this.currentLevel >= this.levels.error) {
      const logObject = this.formatLog('error', message, data);
      console.error(JSON.stringify(logObject));
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  warn(message, data) {
    if (this.currentLevel >= this.levels.warn) {
      const logObject = this.formatLog('warn', message, data);
      console.warn(JSON.stringify(logObject));
    }
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  info(message, data) {
    if (this.currentLevel >= this.levels.info) {
      const logObject = this.formatLog('info', message, data);
      console.info(JSON.stringify(logObject));
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  debug(message, data) {
    if (this.currentLevel >= this.levels.debug) {
      const logObject = this.formatLog('debug', message, data);
      console.debug(JSON.stringify(logObject));
    }
  }
}

/**
 * Request ID generator middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestIdMiddleware(req, res, next) {
  const uuid = require('crypto').randomUUID();
  req.requestId = uuid;
  logger.setRequestId(uuid);
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', uuid);
  
  next();
}

const logger = new Logger();

module.exports = {
  logger,
  requestIdMiddleware
};