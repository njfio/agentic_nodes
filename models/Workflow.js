const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  nodes: [{
    id: Number,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    title: String,
    content: String,
    inputContent: String,
    contentType: String,
    systemPrompt: String,
    aiProcessor: String,
    inputType: String,
    outputType: String,
    hasBeenProcessed: Boolean,
    autoSize: Boolean,
    expanded: Boolean,
    inputCollapsed: Boolean,
    outputCollapsed: Boolean,
    workflowRole: {
      type: String,
      default: 'none',
      enum: ['none', 'input', 'output']
    }
  }],
  connections: [{
    fromNodeId: Number,
    toNodeId: Number
  }],
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

// Add indexes to improve query performance
workflowSchema.index({ user: 1 });
workflowSchema.index({ createdAt: -1 });
workflowSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Workflow', workflowSchema);
