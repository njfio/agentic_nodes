const express = require('express');
const router = express.Router();

// Import controllers
const workflowController = require('../controllers/workflowController');
const nodeController = require('../controllers/nodeController');
const userController = require('../controllers/userController');
const imageController = require('../controllers/imageController');

// Import services
const openaiService = require('../services/openaiService');
const imageService = require('../services/imageService');
const { logger } = require('../services/loggingService');

// Import middleware
const { auth: authenticate } = require('../middleware/auth');
const {
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
} = require('../middleware/validation');
const { apiLimiter, authLimiter, uploadLimiter, aiLimiter } = require('../middleware/security/rateLimiter');
const { enrichApiKeys, getApiKeys, updateApiKey } = require('../middleware/apiKeyMiddleware');

// API version middleware
router.use((req, res, next) => {
  res.set('API-Version', '2.0.0');
  next();
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication routes
router.post('/auth/register',
  authLimiter,
  validateUserRegistration, handleValidationErrors,
  userController.register
);

router.post('/auth/login',
  authLimiter,
  validateUserLogin, handleValidationErrors,
  userController.login
);

router.post('/auth/logout',
  authenticate,
  userController.logout
);

router.post('/auth/refresh',
  authLimiter,
  userController.refreshToken
);

router.get('/auth/profile',
  authenticate,
  userController.getProfile
);

router.put('/auth/profile',
  authenticate,
  validatePasswordUpdate, handleValidationErrors,
  userController.updateProfile
);

// Workflow routes
router.get('/workflows',
  authenticate,
  validatePagination, handleValidationErrors,
  workflowController.getAllWorkflows
);

router.post('/workflows',
  authenticate,
  apiLimiter,
  validateWorkflow, handleValidationErrors,
  workflowController.createWorkflow
);

router.get('/workflows/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.getWorkflowById
);

router.put('/workflows/:id',
  authenticate,
  validateWorkflow, handleValidationErrors,
  workflowController.updateWorkflow
);

router.delete('/workflows/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.deleteWorkflow
);

router.post('/workflows/:id/duplicate',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.createWorkflow
);

router.post('/workflows/:id/export',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.getWorkflowById
);

router.post('/workflows/import',
  authenticate,
  apiLimiter,
  workflowController.createWorkflow
);

// Workflow execution routes
router.post('/workflows/:id/execute',
  authenticate,
  aiLimiter,
  handleValidationErrors,
  workflowController.createWorkflow
);

router.get('/workflows/:id/executions',
  authenticate,
  validatePagination, handleValidationErrors,
  workflowController.getAllWorkflows
);

router.get('/workflows/:id/executions/:executionId',
  authenticate,
  workflowController.getWorkflowById
);

router.post('/workflows/:id/executions/:executionId/stop',
  authenticate,
  workflowController.updateWorkflow
);

// Node routes
router.get('/nodes/types',
  authenticate,
  nodeController.getAllNodes
);

router.post('/nodes/validate',
  authenticate,
  validateNode, handleValidationErrors,
  nodeController.createNode
);

router.post('/nodes/execute',
  authenticate,
  apiLimiter,
  validateNode, handleValidationErrors,
  nodeController.createNode
);

router.get('/nodes/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  nodeController.getNodeById
);

router.put('/nodes/:id',
  authenticate,
  validateNode, handleValidationErrors,
  nodeController.updateNode
);

router.delete('/nodes/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  nodeController.deleteNode
);

// Image routes
router.post('/images/upload',
  authenticate,
  uploadLimiter,
  imageController.saveImage
);

router.get('/images/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  imageController.getImageById
);

router.delete('/images/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  imageController.deleteImage
);

router.post('/images/:id/analyze',
  authenticate,
  aiLimiter,
  handleValidationErrors,
  imageController.getImageById
);

// AI/Tool routes
router.get('/tools',
  authenticate,
  nodeController.getAllNodes
);

router.post('/tools/discover',
  authenticate,
  apiLimiter,
  nodeController.getAllNodes
);

router.post('/tools/:toolName/execute',
  authenticate,
  apiLimiter,
  handleValidationErrors,
  nodeController.createNode
);

router.get('/models',
  authenticate,
  nodeController.getAllNodes
);

// Chat/Agent routes
router.post('/chat',
  authenticate,
  enrichApiKeys,
  aiLimiter,
  handleValidationErrors,
  nodeController.createNode
);

router.post('/agents/execute',
  authenticate,
  enrichApiKeys,
  aiLimiter,
  handleValidationErrors,
  nodeController.createNode
);

// Collaboration routes
router.get('/workflows/:id/collaborators',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.getAllWorkflows
);

router.post('/workflows/:id/collaborators',
  authenticate,
  handleValidationErrors,
  workflowController.updateWorkflow
);

router.delete('/workflows/:id/collaborators/:userId',
  authenticate,
  workflowController.updateWorkflow
);

router.post('/workflows/:id/share',
  authenticate,
  handleValidationErrors,
  workflowController.updateWorkflow
);

// Template routes
router.get('/templates',
  authenticate,
  validatePagination, handleValidationErrors,
  workflowController.getAllWorkflows
);

router.post('/templates',
  authenticate,
  validateWorkflow, handleValidationErrors,
  workflowController.createWorkflow
);

router.get('/templates/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.getWorkflowById
);

router.post('/templates/:id/use',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.createWorkflow
);

// Analytics routes
router.get('/analytics/usage',
  authenticate,
  userController.getProfile
);

router.get('/analytics/workflows/:id',
  authenticate,
  validateObjectId('id'), handleValidationErrors,
  workflowController.getWorkflowById
);

// Settings routes
router.get('/settings',
  authenticate,
  userController.getProfile
);

router.put('/settings',
  authenticate,
  handleValidationErrors,
  userController.updateProfile
);

// API Key Management routes
router.get('/settings/api-keys',
  authenticate,
  getApiKeys
);

router.put('/settings/api-keys',
  authenticate,
  updateApiKey
);

// OpenAI API proxy routes - with AI-specific rate limiting
router.post('/openai/chat',
  authenticate,
  enrichApiKeys,
  aiLimiter,
  async (req, res) => {
    try {
      // Check if the payload was optimized by the client
      const isOptimizedPayload = req.headers['x-payload-optimized'] === 'true';
      if (isOptimizedPayload) {
        logger.info('Received optimized payload, processing...');
        // Process the optimized payload to restore any image references
        req.body = await imageService.processOptimizedPayload(req.body);
      }

      // Process the chat completion request
      const result = await openaiService.processChatCompletion(req.body, req.headers);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({
        error: {
          message: error.message || 'An error occurred with the OpenAI API'
        }
      });
    }
  }
);

router.post('/openai/images',
  authenticate,
  enrichApiKeys,
  aiLimiter,
  async (req, res) => {
    try {
      // Check if the payload was optimized by the client
      const isOptimizedPayload = req.headers['x-payload-optimized'] === 'true';
      if (isOptimizedPayload) {
        logger.info('Received optimized payload for image generation, processing...');
        // Process the optimized payload to restore any image references
        req.body = await imageService.processOptimizedPayload(req.body);
      }

      // Process the image generation request
      const result = await openaiService.processImageGeneration(req.body, req.headers);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({
        error: {
          message: error.message || 'An error occurred with the OpenAI Image API'
        }
      });
    }
  }
);

// Admin routes (if user is admin)
router.get('/admin/users',
  authenticate,
  userController.login,
  validatePagination, handleValidationErrors,
  userController.getProfile
);

router.get('/admin/system-stats',
  authenticate,
  userController.login,
  userController.getProfile
);

router.post('/admin/maintenance',
  authenticate,
  userController.login,
  userController.updateProfile
);

// Error handling for API routes
router.use((error, req, res, next) => {
  console.error('API Error:', error);

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: error.details || null
    });
  }

  // Authentication errors
  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Permission errors
  if (error.status === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions'
    });
  }

  // Not found errors
  if (error.status === 404) {
    return res.status(404).json({
      error: 'Not Found',
      message: error.message || 'Resource not found'
    });
  }

  // Rate limit errors
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Rate Limited',
      message: 'Too many requests',
      retryAfter: error.retryAfter
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for unmatched API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/v2/health',
      'POST /api/v2/auth/login',
      'GET /api/v2/workflows',
      'POST /api/v2/workflows/:id/execute',
      'GET /api/v2/tools',
      'POST /api/v2/chat',
      'POST /api/v2/openai/chat',
      'POST /api/v2/openai/images'
    ]
  });
});

module.exports = router;