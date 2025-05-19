const { logger } = require('../../services/loggingService');

/**
 * Middleware to validate request bodies against predefined schemas
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} - Express middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    if (!schema) {
      // If no schema provided, skip validation
      return next();
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true
    });

    if (error) {
      logger.warn('Request validation failed', { 
        path: req.path, 
        errors: error.details.map(d => d.message) 
      });
      
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(detail => ({
          message: detail.message,
          path: detail.path
        }))
      });
    }

    // Replace req.body with validated value
    req.body = value;
    return next();
  };
}

// Common validation schema templates (can be expanded)
const validationSchemas = {
  // Schemas would be defined using Joi, requiring installation
  // Add schemas as needed by importing Joi and defining them here
};

module.exports = {
  validateRequest,
  validationSchemas
};