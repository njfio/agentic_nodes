const Workflow = require('../models/Workflow');
const VersioningService = require('../services/versioningService');
const { logger } = require('../services/loggingService');

// Get all workflows
exports.getAllWorkflows = async (req, res) => {
  try {
    console.time('getAllWorkflows');

    // Use lean() to get plain JavaScript objects instead of Mongoose documents
    // This is much faster for large result sets
    // Also use projection to only return the fields we need
    const workflows = await Workflow.find(
      { user: req.user?.id || null },
      {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        'nodes.id': 1,
        'nodes.title': 1,
        'nodes.workflowRole': 1
      }
    )
    .sort({ updatedAt: -1 })
    .lean();

    console.timeEnd('getAllWorkflows');
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get workflow by ID
exports.getWorkflowById = async (req, res) => {
  try {
    console.time('getWorkflowById');

    // Use a more efficient query with lean() for better performance
    const workflow = await Workflow.findById(req.params.id).lean();

    if (!workflow) {
      console.timeEnd('getWorkflowById');
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Process nodes to handle image references
    if (workflow.nodes && workflow.nodes.length > 0) {
      // Look for image references in the nodes
      const imageRefs = [];

      workflow.nodes.forEach(node => {
        // Check if this node has image content that was truncated
        if (node.contentType === 'image' &&
            node.content &&
            node.content.includes('[image data truncated]')) {
          // This node has a truncated image, we need to fetch it
          imageRefs.push({
            nodeId: node.id,
            contentType: 'image'
          });
        }
      });

      // If we have image references, try to fetch the images in parallel
      if (imageRefs.length > 0) {
        try {
          console.log(`Loading ${imageRefs.length} images for workflow ${workflow._id}`);

          // Get the Image model
          const Image = require('../models/Image');

          // Fetch all images in parallel for better performance
          const imagePromises = imageRefs.map(ref =>
            Image.findOne({
              workflow: workflow._id,
              node: ref.nodeId
            }).lean()
          );

          const images = await Promise.all(imagePromises);

          // Process the results
          images.forEach((image, index) => {
            if (image) {
              const ref = imageRefs[index];
              const nodeIndex = workflow.nodes.findIndex(n => n.id === ref.nodeId);

              if (nodeIndex !== -1) {
                // Replace the truncated content with the actual image data
                workflow.nodes[nodeIndex].content = image.data;
              }
            }
          });

          console.log(`Loaded ${images.filter(Boolean).length} images for workflow ${workflow._id}`);
        } catch (imageError) {
          console.error('Error fetching workflow images:', imageError);
          // Continue with the workflow even if we couldn't fetch the images
        }
      }
    }

    console.timeEnd('getWorkflowById');
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

    // Store images separately if there are any
    if (nodes) {
      try {
        const Image = require('../models/Image');

        // Check each node for image content
        for (const node of nodes) {
          if (node.contentType === 'image' &&
              node.content &&
              node.content.startsWith('data:image') &&
              node.content.length > 500_000) {

            // Create a new image record
            const image = new Image({
              imageId: `img_${Date.now()}_${node.id}`,
              data: node.content,
              contentType: node.content.split(';')[0].replace('data:', ''),
              size: node.content.length,
              workflow: savedWorkflow._id,
              node: node.id,
              user: req.user?.id || null
            });

            await image.save();
          }
        }
      } catch (imageError) {
        console.warn('Error storing workflow images:', imageError);
        // Continue even if image storage fails
      }
    }

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

    // Store images separately if there are any
    if (nodes) {
      try {
        const Image = require('../models/Image');

        // Check each node for image content
        for (const node of nodes) {
          if (node.contentType === 'image' &&
              node.content &&
              node.content.startsWith('data:image') &&
              node.content.length > 500_000) {

            // Check if an image already exists for this node
            let image = await Image.findOne({
              workflow: updatedWorkflow._id,
              node: node.id
            });

            if (image) {
              // Update existing image
              image.data = node.content;
              image.contentType = node.content.split(';')[0].replace('data:', '');
              image.size = node.content.length;
              image.updatedAt = Date.now();
              await image.save();
            } else {
              // Create a new image record
              image = new Image({
                imageId: `img_${Date.now()}_${node.id}`,
                data: node.content,
                contentType: node.content.split(';')[0].replace('data:', ''),
                size: node.content.length,
                workflow: updatedWorkflow._id,
                node: node.id,
                user: req.user?.id || null
              });

              await image.save();
            }
          }
        }
      } catch (imageError) {
        console.warn('Error storing workflow images:', imageError);
        // Continue even if image storage fails
      }
    }

    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Rollback a workflow to a specific version
exports.rollbackToVersion = async (req, res) => {
  const { id, versionId } = req.params;
  const user = req.user;

  try {
    const restoredWorkflow = await VersioningService.restoreVersion(id, versionId, user);
    res.json({ success: true, workflow: restoredWorkflow });
  } catch (error) {
    logger.error('Error rolling back workflow version', { error });
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Delete associated images
    try {
      const Image = require('../models/Image');
      await Image.deleteMany({ workflow: workflow._id });
    } catch (imageError) {
      console.warn('Error deleting workflow images:', imageError);
      // Continue even if image deletion fails
    }

    await workflow.remove();
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
