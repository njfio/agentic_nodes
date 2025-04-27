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

    // Process nodes to reduce size
    const processedNodes = nodes.map(node => {
      // Create a copy of the node
      const processedNode = { ...node };

      // Limit content size for large text or images
      if (processedNode.content && processedNode.content.length > 100_000) {
        processedNode.content = processedNode.content.substring(0, 100_000) + '... [content truncated]';
      }

      // Limit input content size
      if (processedNode.inputContent && processedNode.inputContent.length > 100_000) {
        processedNode.inputContent = processedNode.inputContent.substring(0, 100_000) + '... [content truncated]';
      }

      // Limit system prompt size
      if (processedNode.systemPrompt && processedNode.systemPrompt.length > 10_000) {
        processedNode.systemPrompt = processedNode.systemPrompt.substring(0, 10_000) + '... [content truncated]';
      }

      // For image content, store a reference or truncate
      if (processedNode.contentType === 'image' && processedNode.content && processedNode.content.length > 500_000 && processedNode.content.startsWith('data:image')) {
        // Store just the beginning of the data URL to indicate it was an image
        processedNode.content = processedNode.content.substring(0, 100) + '... [image data truncated]';
      }

      return processedNode;
    });

    const workflow = new Workflow({
      name,
      description,
      nodes: processedNodes,
      connections,
      user: req.user?.id || null
    });

    const savedWorkflow = await workflow.save();
    res.status(201).json(savedWorkflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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

    // Process nodes to reduce size if provided
    let processedNodes = workflow.nodes; // Default to existing nodes

    if (nodes) {
      processedNodes = nodes.map(node => {
        // Create a copy of the node
        const processedNode = { ...node };

        // Limit content size for large text or images
        if (processedNode.content && processedNode.content.length > 100_000) {
          processedNode.content = processedNode.content.substring(0, 100_000) + '... [content truncated]';
        }

        // Limit input content size
        if (processedNode.inputContent && processedNode.inputContent.length > 100_000) {
          processedNode.inputContent = processedNode.inputContent.substring(0, 100_000) + '... [content truncated]';
        }

        // Limit system prompt size
        if (processedNode.systemPrompt && processedNode.systemPrompt.length > 10_000) {
          processedNode.systemPrompt = processedNode.systemPrompt.substring(0, 10_000) + '... [content truncated]';
        }

        // For image content, store a reference or truncate
        if (processedNode.contentType === 'image' && processedNode.content && processedNode.content.length > 500_000) {
          // Store just the beginning of the data URL to indicate it was an image
          if (processedNode.content.startsWith('data:image')) {
            processedNode.content = processedNode.content.substring(0, 100) + '... [image data truncated]';
          }
        }

        return processedNode;
      });
    }

    // Update fields
    workflow.name = name || workflow.name;
    workflow.description = description || workflow.description;
    workflow.nodes = processedNodes;
    workflow.connections = connections || workflow.connections;
    workflow.updatedAt = Date.now();

    const updatedWorkflow = await workflow.save();
    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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
