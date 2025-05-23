const express = require('express');
const router = express.Router();
const axios = require('axios');

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
const { enrichApiKeys, getApiKeys, updateApiKey } = require('../middleware/apiKeyMiddleware');

/**
 * Process an optimized payload to restore any image references
 * @param {object} payload - The optimized payload
 * @returns {object} - The processed payload with restored images
 */
async function processOptimizedPayload(payload) {
  if (!payload) return payload;

  try {
    // Create a deep copy of the payload
    const processedPayload = JSON.parse(JSON.stringify(payload));

    // Process the payload recursively
    await processObjectForImageReferences(processedPayload);

    return processedPayload;
  } catch (error) {
    console.error('Error processing optimized payload:', error);
    return payload; // Return original payload if processing fails
  }
}

/**
 * Recursively process an object to restore image references
 * @param {object} obj - The object to process
 */
async function processObjectForImageReferences(obj) {
  if (!obj || typeof obj !== 'object') return;

  // Process arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object') {
        await processObjectForImageReferences(obj[i]);
      } else if (typeof obj[i] === 'string' && isImageReference(obj[i])) {
        // Restore image reference
        obj[i] = await restoreImageReference(obj[i]);
      }
    }
    return;
  }

  // Process objects
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === 'object') {
        await processObjectForImageReferences(obj[key]);
      } else if (typeof obj[key] === 'string' && isImageReference(obj[key])) {
        // Restore image reference
        obj[key] = await restoreImageReference(obj[key]);
      }
    }
  }
}

/**
 * Check if a string is an image reference
 * @param {string} str - The string to check
 * @returns {boolean} - Whether the string is an image reference
 */
function isImageReference(str) {
  return typeof str === 'string' && str.startsWith('[image:') && str.endsWith(']');
}

/**
 * Restore an image reference to its original content
 * @param {string} reference - The image reference
 * @returns {string} - The restored image content
 */
async function restoreImageReference(reference) {
  try {
    // Extract the image ID from the reference
    const imageId = reference.substring(7, reference.length - 1);

    // Get the image from the database
    const imageData = await imageController.getImageDataById(imageId);

    if (!imageData) {
      console.error(`Image with ID ${imageId} not found`);
      return reference; // Return the reference if the image is not found
    }

    return imageData.data; // Return the actual image data
  } catch (error) {
    console.error('Error restoring image reference:', error);
    return reference; // Return the reference if restoration fails
  }
}

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// API Key Management routes
router.get('/settings/api-keys', auth, getApiKeys);
router.put('/settings/api-keys', auth, updateApiKey);

// Data migration route
router.post('/migrate', async (req, res) => {
  try {
    const result = await dataMigration.migrateData(req.body);
    res.json(result);
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// OpenAI API proxy routes
router.post('/openai/chat', auth, enrichApiKeys, async (req, res) => {
  try {
    // Get API key from request headers or fall back to env variable
    const apiKey = req.headers['x-openai-api-key'] || process.env.OPENAI_API_KEY;

    // Get timeout from request headers or use default
    const timeout = parseInt(req.headers['x-openai-timeout']) || 300000; // Default to 5 minutes (300 seconds) if not specified

    // Log the timeout value for debugging
    console.log(`[API] Using timeout of ${timeout}ms for OpenAI chat request`);

    // Check if the payload was optimized by the client
    const isOptimizedPayload = req.headers['x-payload-optimized'] === 'true';
    if (isOptimizedPayload) {
      console.log('[API] Received optimized payload, processing...');

      // Process the optimized payload to restore any image references
      req.body = await processOptimizedPayload(req.body);
    }

    // Log the request payload for debugging
    // Support OpenAI function-calling via 'functions' parameter (legacy format)
    if (Array.isArray(req.body.functions) && req.body.functions.length > 0) {
      console.log(`[API] Converting legacy 'functions' format to 'tools' format (${req.body.functions.length} functions)`);
      // Convert functions to tools format
      req.body.tools = req.body.functions;
      delete req.body.functions;
      
      // Convert function_call to tool_choice
      if (req.body.function_call) {
        req.body.tool_choice = req.body.function_call;
        delete req.body.function_call;
      } else {
        console.log('[API] Setting tool_choice to auto');
        req.body.tool_choice = 'auto';
      }
    }

    // Check if OpenAI API key is set
    if (!apiKey || apiKey === 'sk-your-actual-openai-api-key' || apiKey === 'REPLACE_WITH_YOUR_OPENAI_API_KEY') {
      return res.status(401).json({
        error: {
          message: 'OpenAI API key is not configured. Please set your API key in the OpenAI Configuration modal.'
        }
      });
    }

    // Configure axios with improved SSL settings
    const httpsAgent = new (require('https').Agent)({
      rejectUnauthorized: true,
      secureProtocol: 'TLSv1_2_method'
    });

    const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      httpsAgent,
      timeout: timeout // Use the timeout from the request headers
    });
    res.json(response.data);
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);

    // Check for API key errors
    if (error.response?.data?.error?.message?.includes('API key')) {
      return res.status(401).json({
        error: {
          message: 'Invalid OpenAI API key. Please update your API key in the OpenAI Configuration modal.'
        }
      });
    }

    // Handle SSL errors
    if (error.message && (
        error.message.includes('SSL') ||
        error.message.includes('ssl') ||
        error.message.includes('alert bad record mac') ||
        error.message.includes('ECONNRESET'))) {
      return res.status(500).json({
        error: {
          message: 'SSL connection error with OpenAI API. Please try again or check your network connection.'
        }
      });
    }

    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || 'An error occurred with the OpenAI API'
      }
    });
  }
});

router.post('/openai/images', auth, enrichApiKeys, async (req, res) => {
  try {
    // Get API key from request headers or fall back to env variable
    const apiKey = req.headers['x-openai-api-key'] || process.env.OPENAI_API_KEY;

    // Get timeout from request headers or use default
    // For image generation, we use a longer default timeout (10 minutes)
    const timeout = parseInt(req.headers['x-openai-timeout']) || 600_000; // 10 minutes

    // Log the timeout value for debugging
    console.log(`[API] Using timeout of ${timeout}ms for OpenAI image generation request`);

    // Check if the payload was optimized by the client
    const isOptimizedPayload = req.headers['x-payload-optimized'] === 'true';
    if (isOptimizedPayload) {
      console.log('[API] Received optimized payload for image generation, processing...');

      // Process the optimized payload to restore any image references
      req.body = await processOptimizedPayload(req.body);
    }

    // Check if OpenAI API key is set
    if (!apiKey || apiKey === 'sk-your-actual-openai-api-key' || apiKey === 'REPLACE_WITH_YOUR_OPENAI_API_KEY') {
      return res.status(401).json({
        error: {
          message: 'OpenAI API key is not configured. Please set your API key in the OpenAI Configuration modal.'
        }
      });
    }

    // Configure axios with improved SSL settings
    const httpsAgent = new (require('https').Agent)({
      rejectUnauthorized: true,
      secureProtocol: 'TLSv1_2_method'
    });

    // Use the timeout from the request headers
    const response = await axios.post('https://api.openai.com/v1/images/generations', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      httpsAgent,
      timeout: timeout // Use the timeout from the request headers
    });
    res.json(response.data);
  } catch (error) {
    console.error('OpenAI Image API error:', error.response?.data || error.message);

    // Check for API key errors
    if (error.response?.data?.error?.message?.includes('API key')) {
      return res.status(401).json({
        error: {
          message: 'Invalid OpenAI API key. Please update your API key in the OpenAI Configuration modal.'
        }
      });
    }

    // Handle SSL errors
    if (error.message && (
        error.message.includes('SSL') ||
        error.message.includes('ssl') ||
        error.message.includes('alert bad record mac') ||
        error.message.includes('ECONNRESET'))) {
      return res.status(500).json({
        error: {
          message: 'SSL connection error with OpenAI API. Please try again or check your network connection.'
        }
      });
    }

    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || 'An error occurred with the OpenAI Image API'
      }
    });
  }
});

// Workflow routes
router.get('/workflows', optionalAuth, workflowController.getAllWorkflows);
router.get('/workflows/:id', optionalAuth, workflowController.getWorkflowById);
router.post('/workflows', auth, workflowController.createWorkflow);
router.put('/workflows/:id', auth, workflowController.updateWorkflow);
router.delete('/workflows/:id', auth, workflowController.deleteWorkflow);

// Node routes
router.get('/nodes', optionalAuth, nodeController.getAllNodes);
router.get('/nodes/:id', optionalAuth, nodeController.getNodeById);
router.post('/nodes', auth, nodeController.createNode);
router.put('/nodes/:id', auth, nodeController.updateNode);
router.delete('/nodes/:id', auth, nodeController.deleteNode);

// User routes
router.post('/users/register', userController.register);
router.post('/users/login', userController.login);
router.get('/users/profile', auth, userController.getProfile);
router.put('/users/profile', auth, userController.updateProfile);
router.post('/users/logout', auth, userController.logout);
router.post('/users/logoutAll', auth, userController.logoutAll);

// Email verification and password reset
router.get('/users/verify-email', userController.verifyEmail);
router.post('/users/request-password-reset', userController.requestPasswordReset);
router.post('/users/reset-password', userController.resetPassword);

// Docker environment routes
router.get('/docker/auto-login', dockerController.autoLogin);
router.get('/docker/status', dockerController.checkStatus);

// Image routes
router.get('/images/workflow/:workflowId', imageController.getWorkflowImages);
router.get('/images/:id', imageController.getImageById);
router.post('/images', optionalAuth, imageController.saveImage);
router.delete('/images/:id', optionalAuth, imageController.deleteImage);

// MCP routes
router.use('/mcp', mcpRoutes);

// MCP proxy routes
const mcpProxyRoutes = require('../server/api/mcp-proxy');
router.use('/mcp-proxy', mcpProxyRoutes);

module.exports = router;
