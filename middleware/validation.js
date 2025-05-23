/**
 * Input Validation Middleware
 * Provides validation rules for API endpoints using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .trim()
    .escape(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters')
    .trim()
    .escape(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters')
    .trim()
    .escape(),
  
  handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim()
    .escape(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Workflow validation
 */
const validateWorkflow = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Workflow name must be between 1 and 100 characters')
    .trim()
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim()
    .escape(),
  
  body('nodes')
    .optional()
    .isArray()
    .withMessage('Nodes must be an array'),
  
  body('connections')
    .optional()
    .isArray()
    .withMessage('Connections must be an array'),
  
  handleValidationErrors
];

/**
 * Node validation
 */
const validateNode = [
  body('type')
    .isIn(['text', 'image', 'audio', 'video', 'chat', 'agent', 'split', 'collect', 'conditional', 'programmatic'])
    .withMessage('Invalid node type'),
  
  body('x')
    .isNumeric()
    .withMessage('X coordinate must be a number'),
  
  body('y')
    .isNumeric()
    .withMessage('Y coordinate must be a number'),
  
  body('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content must be less than 10,000 characters'),
  
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

/**
 * Password reset validation
 */
const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  handleValidationErrors
];

/**
 * Password update validation
 */
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  handleValidationErrors
];

/**
 * Query parameter validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a number between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Search validation
 */
const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim()
    .escape(),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateWorkflow,
  validateNode,
  validateObjectId,
  validatePasswordReset,
  validatePasswordUpdate,
  validatePagination,
  validateSearch,
  handleValidationErrors
};