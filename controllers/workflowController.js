const Workflow = require('../models/Workflow');

// Get all workflows
exports.getAllWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({ user: req.user?.id || null });
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get workflow by ID
exports.getWorkflowById = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new workflow
exports.createWorkflow = async (req, res) => {
  try {
    const { name, description, nodes, connections } = req.body;
    
    const workflow = new Workflow({
      name,
      description,
      nodes,
      connections,
      user: req.user?.id || null
    });
    
    const savedWorkflow = await workflow.save();
    res.status(201).json(savedWorkflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a workflow
exports.updateWorkflow = async (req, res) => {
  try {
    const { name, description, nodes, connections } = req.body;
    
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    // Update fields
    workflow.name = name || workflow.name;
    workflow.description = description || workflow.description;
    workflow.nodes = nodes || workflow.nodes;
    workflow.connections = connections || workflow.connections;
    workflow.updatedAt = Date.now();
    
    const updatedWorkflow = await workflow.save();
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    await workflow.remove();
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
