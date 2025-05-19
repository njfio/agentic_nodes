const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const auth = require('../middleware/auth');

// Get an image by ID
router.get('/:id', imageController.getImageById);

// Save a new image
router.post('/', auth.optional, imageController.saveImage);

// Get all images for a workflow
router.get('/workflow/:workflowId', imageController.getWorkflowImages);

// Delete an image
router.delete('/:id', auth.optional, imageController.deleteImage);

module.exports = router;
