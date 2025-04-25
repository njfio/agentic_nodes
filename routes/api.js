const express = require('express');
const router = express.Router();
const axios = require('axios');

// Import controllers
const workflowController = require('../controllers/workflowController');
const nodeController = require('../controllers/nodeController');
const userController = require('../controllers/userController');

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
    const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || 'An error occurred with the OpenAI API'
      }
    });
  }
});

router.post('/openai/images', async (req, res) => {
  try {
    const response = await axios.post('https://api.openai.com/v1/images/generations', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('OpenAI Image API error:', error.response?.data || error.message);
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

module.exports = router;
