const Node = require('../models/Node');

// Get all nodes
exports.getAllNodes = async (req, res) => {
  try {
    const nodes = await Node.find({ user: req.user?.id || null });
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get node by ID
exports.getNodeById = async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }
    res.json(node);
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new node
exports.createNode = async (req, res) => {
  try {
    const { title, x, y, systemPrompt, aiProcessor, inputType, outputType } = req.body;
    
    const node = new Node({
      title,
      x,
      y,
      systemPrompt,
      aiProcessor,
      inputType,
      outputType,
      user: req.user?.id || null
    });
    
    const savedNode = await node.save();
    res.status(201).json(savedNode);
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a node
exports.updateNode = async (req, res) => {
  try {
    const { title, x, y, content, inputContent, systemPrompt, aiProcessor, inputType, outputType } = req.body;
    
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }
    
    // Update fields
    if (title !== undefined) node.title = title;
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;
    if (content !== undefined) node.content = content;
    if (inputContent !== undefined) node.inputContent = inputContent;
    if (systemPrompt !== undefined) node.systemPrompt = systemPrompt;
    if (aiProcessor !== undefined) node.aiProcessor = aiProcessor;
    if (inputType !== undefined) node.inputType = inputType;
    if (outputType !== undefined) node.outputType = outputType;
    node.updatedAt = Date.now();
    
    const updatedNode = await node.save();
    res.json(updatedNode);
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a node
exports.deleteNode = async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }
    
    await Node.deleteOne({ _id: req.params.id });
    res.json({ message: 'Node deleted' });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
