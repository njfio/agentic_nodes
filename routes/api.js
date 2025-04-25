const express = require('express');
const router = express.Router();
const axios = require('axios');

// Import controllers
const workflowController = require('../controllers/workflowController');
const nodeController = require('../controllers/nodeController');
const userController = require('../controllers/userController');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
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
router.get('/workflows', workflowController.getAllWorkflows);
router.get('/workflows/:id', workflowController.getWorkflowById);
router.post('/workflows', workflowController.createWorkflow);
router.put('/workflows/:id', workflowController.updateWorkflow);
router.delete('/workflows/:id', workflowController.deleteWorkflow);

// Node routes
router.get('/nodes', nodeController.getAllNodes);
router.get('/nodes/:id', nodeController.getNodeById);
router.post('/nodes', nodeController.createNode);
router.put('/nodes/:id', nodeController.updateNode);
router.delete('/nodes/:id', nodeController.deleteNode);

// User routes
router.post('/users/register', userController.register);
router.post('/users/login', userController.login);
router.get('/users/profile', userController.getProfile);
router.put('/users/profile', userController.updateProfile);

module.exports = router;
