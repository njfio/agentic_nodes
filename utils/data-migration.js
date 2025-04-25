/**
 * Data Migration Utility
 * Helps migrate data from localStorage to MongoDB
 */

const Workflow = require('../models/Workflow');
const Node = require('../models/Node');
const User = require('../models/User');

/**
 * Migrate data from localStorage to MongoDB
 * @param {Object} data - Data from localStorage
 * @returns {Promise} - Promise that resolves when migration is complete
 */
async function migrateData(data) {
  try {
    console.log('Starting data migration...');
    
    // Create default user if not exists
    const defaultUser = await ensureDefaultUser();
    
    if (data.canvasState) {
      await migrateCanvasState(data.canvasState, defaultUser._id);
    }
    
    console.log('Data migration completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error during data migration:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensure default user exists
 * @returns {Promise<Object>} - Promise that resolves with the default user
 */
async function ensureDefaultUser() {
  try {
    // Check if admin user exists
    let adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      // Create admin user
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password', // In a real app, this would be hashed
        color: '#3498db',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await adminUser.save();
      console.log('Created default admin user');
    }
    
    return adminUser;
  } catch (error) {
    console.error('Error ensuring default user:', error);
    throw error;
  }
}

/**
 * Migrate canvas state to MongoDB
 * @param {Object} canvasState - Canvas state from localStorage
 * @param {string} userId - User ID to associate with the data
 * @returns {Promise} - Promise that resolves when migration is complete
 */
async function migrateCanvasState(canvasState, userId) {
  try {
    if (!canvasState) return;
    
    const parsedState = typeof canvasState === 'string' ? JSON.parse(canvasState) : canvasState;
    
    if (!parsedState.nodes || !Array.isArray(parsedState.nodes)) {
      console.warn('Invalid canvas state format, skipping migration');
      return;
    }
    
    // Create a new workflow
    const workflow = new Workflow({
      name: 'Imported Workflow',
      description: 'Workflow imported from localStorage',
      nodes: parsedState.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width || 240,
        height: node.height || 200,
        title: node.title || 'Untitled Node',
        content: node.content || '',
        inputContent: node.inputContent || '',
        contentType: node.contentType || 'text',
        systemPrompt: node.systemPrompt || '',
        aiProcessor: node.aiProcessor || 'text-to-text',
        inputType: node.inputType || 'text',
        outputType: node.outputType || 'text',
        hasBeenProcessed: node.hasBeenProcessed || false,
        autoSize: node.autoSize !== undefined ? node.autoSize : true,
        expanded: node.expanded !== undefined ? node.expanded : true
      })),
      connections: parsedState.connections || [],
      user: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await workflow.save();
    console.log(`Migrated workflow with ${workflow.nodes.length} nodes and ${workflow.connections.length} connections`);
    
    return workflow;
  } catch (error) {
    console.error('Error migrating canvas state:', error);
    throw error;
  }
}

module.exports = {
  migrateData,
  ensureDefaultUser,
  migrateCanvasState
};
