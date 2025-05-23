const express = require('express');
const router = express.Router();

// Import services
const openaiService = require('../services/openaiService');
const imageService = require('../services/imageService');
const { logger } = require('../services/loggingService');

// Import controllers
const workflowController = require('../controllers/workflowController');
const nodeController = require('../controllers/nodeController');
const userController = require('../controllers/userController');
const imageController = require('../controllers/imageController');
const dockerController = require('../controllers/dockerController');

// Import MCP API routes
const mcpRoutes = require('../server/api/mcp');

// Import utilities
const dataMigration = require('../utils/data-migration');

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');
const { authLimiter, apiLimiter, passwordResetLimiter, aiLimiter } = require('../middleware/security/rateLimiter');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateWorkflow, 
  validateNode,
  validateObjectId,
  validatePasswordReset
} = require('../middleware/validation');
const { requestIdMiddleware } = require('../services/loggingService');

// Apply request ID middleware to all routes
router.use(requestIdMiddleware);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Data migration route
router.post('/migrate', auth, async (req, res) => {
  try {
    const result = await dataMigration.migrateData(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Migration error:', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// OpenAI API proxy routes - with AI-specific rate limiting
router.post('/openai/chat', aiLimiter, async (req, res) => {
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
});

router.post('/openai/images', aiLimiter, async (req, res) => {
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
});

// Workflow routes - apply rate limiting to write operations
router.get('/workflows', optionalAuth, workflowController.getAllWorkflows);
router.get('/workflows/:id', optionalAuth, validateObjectId('id'), workflowController.getWorkflowById);
router.post('/workflows', auth, apiLimiter, validateWorkflow, workflowController.createWorkflow);
router.put('/workflows/:id', auth, apiLimiter, validateObjectId('id'), validateWorkflow, workflowController.updateWorkflow);
router.delete('/workflows/:id', auth, apiLimiter, validateObjectId('id'), workflowController.deleteWorkflow);

// New workflow versioning routes
router.get('/workflows/:id/versions', optionalAuth, workflowController.getWorkflowVersions || (async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
}));
router.get('/workflows/:id/versions/:versionId', optionalAuth, workflowController.getWorkflowVersion || (async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
}));
router.post('/workflows/:id/versions', auth, apiRateLimiter, workflowController.createWorkflowVersion || (async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
}));
router.post('/workflows/:id/rollback/:versionId', auth, apiRateLimiter, workflowController.rollbackToVersion);

// Node routes
router.get('/nodes', optionalAuth, nodeController.getAllNodes);
router.get('/nodes/:id', optionalAuth, validateObjectId('id'), nodeController.getNodeById);
router.post('/nodes', auth, apiLimiter, validateNode, nodeController.createNode);
router.put('/nodes/:id', auth, apiLimiter, validateObjectId('id'), validateNode, nodeController.updateNode);
router.delete('/nodes/:id', auth, apiLimiter, validateObjectId('id'), nodeController.deleteNode);

// User routes - apply strict rate limiting and validation to auth endpoints
router.post('/users/register', authLimiter, validateUserRegistration, userController.register);
router.post('/users/login', authLimiter, validateUserLogin, userController.login);
router.get('/users/profile', auth, userController.getProfile);
router.put('/users/profile', auth, apiLimiter, userController.updateProfile);
router.post('/users/logout', auth, userController.logout);
router.post('/users/logoutAll', auth, userController.logoutAll);

// Email verification and password reset - with rate limiting
router.get('/users/verify-email', authLimiter, userController.verifyEmail);
router.post('/users/request-password-reset', passwordResetLimiter, validatePasswordReset, userController.requestPasswordReset);
router.post('/users/reset-password', passwordResetLimiter, userController.resetPassword);

// Add refresh token endpoint
router.post('/users/refresh-token', authRateLimiter, userController.refreshToken);

// Docker environment routes
router.get('/docker/auto-login', dockerController.autoLogin);
router.get('/docker/status', dockerController.checkStatus);

// Image routes
router.get('/images/workflow/:workflowId', imageController.getWorkflowImages);
router.get('/images/:id', imageController.getImageById);
router.post('/images', optionalAuth, apiRateLimiter, imageController.saveImage);
router.delete('/images/:id', optionalAuth, apiRateLimiter, imageController.deleteImage);

// MCP routes
router.use('/mcp', mcpRoutes);

module.exports = router;
