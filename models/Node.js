const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    default: 240
  },
  height: {
    type: Number,
    default: 200
  },
  content: {
    type: String,
    default: ''
  },
  inputContent: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    default: 'text',
    enum: ['text', 'image', 'audio', 'video']
  },
  systemPrompt: {
    type: String,
    default: ''
  },
  aiProcessor: {
    type: String,
    default: 'text-to-text',
    enum: ['text-to-text', 'text-to-image', 'image-to-text', 'audio-to-text', 'video-to-text']
  },
  inputType: {
    type: String,
    default: 'text',
    enum: ['text', 'image', 'audio', 'video']
  },
  outputType: {
    type: String,
    default: 'text',
    enum: ['text', 'image', 'audio', 'video']
  },
  hasBeenProcessed: {
    type: Boolean,
    default: false
  },
  autoSize: {
    type: Boolean,
    default: true
  },
  expanded: {
    type: Boolean,
    default: true
  },
  workflowRole: {
    type: String,
    default: 'none',
    enum: ['none', 'input', 'output']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Node', nodeSchema);
