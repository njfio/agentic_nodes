const express = require('express');
const router = express.Router();
const axios = require('axios');

// Import controllers
const workflowController = require('../controllers/workflowController');
const nodeController = require('../controllers/nodeController');
const userController = require('../controllers/userController');
const imageController = require('../controllers/imageController');

// Import utilities
const dataMigration = require('../utils/data-migration');

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

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
router.post('/openai/chat', async (req, res) => {
  try {
    // Get API key from request headers or fall back to env variable
    const apiKey = req.headers['x-openai-api-key'] || process.env.OPENAI_API_KEY;

    // Check if OpenAI API key is set
    if (!apiKey || apiKey === 'sk-your-actual-openai-api-key' || apiKey === 'REPLACE_WITH_YOUR_OPENAI_API_KEY') {
      return res.status(401).json({
        error: {
          message: 'OpenAI API key is not configured. Please set your API key in the OpenAI Configuration modal.'
        }
      });
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
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

    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || 'An error occurred with the OpenAI API'
      }
    });
  }
});

router.post('/openai/images', async (req, res) => {
  try {
    // Get API key from request headers or fall back to env variable
    const apiKey = req.headers['x-openai-api-key'] || process.env.OPENAI_API_KEY;

    // Check if OpenAI API key is set
    if (!apiKey || apiKey === 'sk-your-actual-openai-api-key' || apiKey === 'REPLACE_WITH_YOUR_OPENAI_API_KEY') {
      return res.status(401).json({
        error: {
          message: 'OpenAI API key is not configured. Please set your API key in the OpenAI Configuration modal.'
        }
      });
    }

    const response = await axios.post('https://api.openai.com/v1/images/generations', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
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

// Image routes
router.get('/images/workflow/:workflowId', imageController.getWorkflowImages);
router.get('/images/:id', imageController.getImageById);
router.post('/images', optionalAuth, imageController.saveImage);
router.delete('/images/:id', optionalAuth, imageController.deleteImage);

module.exports = router;
