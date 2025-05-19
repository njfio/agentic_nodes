const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  // Unique identifier for the image
  imageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // The actual image data (base64 encoded)
  data: {
    type: String,
    required: true
  },
  
  // Content type of the image (e.g., image/png, image/jpeg)
  contentType: {
    type: String,
    required: true,
    default: 'image/png'
  },
  
  // Size of the image in bytes
  size: {
    type: Number
  },
  
  // Width of the image in pixels
  width: {
    type: Number
  },
  
  // Height of the image in pixels
  height: {
    type: Number
  },
  
  // Reference to the user who created/owns the image
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Reference to the workflow this image belongs to (if any)
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  
  // Reference to the node this image belongs to (if any)
  node: {
    type: Number
  },
  
  // Creation and update timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
imageSchema.index({ workflow: 1, node: 1 });
imageSchema.index({ user: 1 });

module.exports = mongoose.model('Image', imageSchema);
