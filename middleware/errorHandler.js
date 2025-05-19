const { logger } = require('../services/loggingService');

/**
 * Centralized error handler middleware
 * Catches all errors thrown in routes and provides consistent error responses
 */
function errorHandler(err, req, res, next) {
  // Log the error with details
  logger.error('Application error:', { 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Set default status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Create error response object
  const errorResponse = {
    success: false,
    error: {
      message: message,
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  };

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }
  
  // Add validation errors if they exist
  if (err.validationErrors) {
    errorResponse.error.validationErrors = err.validationErrors;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, code, validationErrors) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.validationErrors = validationErrors;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a bad request error (400)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Array} validationErrors - Validation errors
   * @returns {ApiError} - API error
   */
  static badRequest(message = 'Bad Request', code = 'BAD_REQUEST', validationErrors) {
    return new ApiError(message, 400, code, validationErrors);
  }

  /**
   * Create an unauthorized error (401)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {ApiError} - API error
   */
  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }

  /**
   * Create a forbidden error (403)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {ApiError} - API error
   */
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }

  /**
   * Create a not found error (404)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {ApiError} - API error
   */
  static notFound(message = 'Resource Not Found', code = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }

  /**
   * Create a conflict error (409)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {ApiError} - API error
   */
  static conflict(message = 'Resource Conflict', code = 'CONFLICT') {
    return new ApiError(message, 409, code);
  }

  /**
   * Create a rate limit error (429)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {ApiError} - API error
   */
  static rateLimit(message = 'Too Many Requests', code = 'RATE_LIMIT_EXCEEDED') {
    return new ApiError(message, 429, code);
  }

  /**
   * Create an internal server error (500)
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @returns {ApiError} - API error
   */
  static internal(message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(message, 500, code);
  }
}

module.exports = {
  errorHandler,
  ApiError
};
