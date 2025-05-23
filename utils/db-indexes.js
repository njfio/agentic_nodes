// const mongoose = require('mongoose');
const User = require('../models/User');
const Workflow = require('../models/Workflow');
const Node = require('../models/Node');
const Image = require('../models/Image');
const { logger } = require('../services/loggingService');

/**
 * Create optimal indexes for all collections
 * @returns {Promise<void>}
 */
async function createIndexes() {
  logger.info('Creating database indexes...');

  try {
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ 'tokens.token': 1 });
    logger.info('User indexes created');

    await Workflow.collection.createIndex({ name: 1 });
    await Workflow.collection.createIndex({ userId: 1 });
    await Workflow.collection.createIndex({ createdAt: -1 });
    await Workflow.collection.createIndex({ userId: 1, isPublic: 1 });
    await Workflow.collection.createIndex({ 'versions.version': 1 });
    logger.info('Workflow indexes created');

    await Node.collection.createIndex({ workflowId: 1 });
    await Node.collection.createIndex({ type: 1 });
    await Node.collection.createIndex({ 'metadata.key': 1 });
    logger.info('Node indexes created');

    await Image.collection.createIndex({ workflowId: 1 });
    await Image.collection.createIndex({ createdAt: -1 });
    logger.info('Image indexes created');

    logger.info('All database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes:', { error });
    throw error;
  }
}

/**
 * Check existing indexes and report any missing ones
 * @returns {Promise<Object>} - Object containing missing indexes by collection
 */
async function checkIndexes() {
  logger.info('Checking database indexes...');
  const missingIndexes = {};

  try {
    const userIndexes = await User.collection.indexes();
    const userIndexNames = userIndexes.map(index => Object.keys(index.key)[0]);
    if (!userIndexNames.includes('username') || !userIndexNames.includes('email')) {
      missingIndexes.User = ['username', 'email'].filter(idx => !userIndexNames.includes(idx));
    }

    const workflowIndexes = await Workflow.collection.indexes();
    const workflowIndexNames = workflowIndexes.map(index => Object.keys(index.key)[0]);
    if (!workflowIndexNames.includes('userId') || !workflowIndexNames.includes('name')) {
      missingIndexes.Workflow = ['userId', 'name'].filter(idx => !workflowIndexNames.includes(idx));
    }

    const nodeIndexes = await Node.collection.indexes();
    const nodeIndexNames = nodeIndexes.map(index => Object.keys(index.key)[0]);
    if (!nodeIndexNames.includes('workflowId') || !nodeIndexNames.includes('type')) {
      missingIndexes.Node = ['workflowId', 'type'].filter(idx => !nodeIndexNames.includes(idx));
    }

    const imageIndexes = await Image.collection.indexes();
    const imageIndexNames = imageIndexes.map(index => Object.keys(index.key)[0]);
    if (!imageIndexNames.includes('workflowId')) {
      missingIndexes.Image = ['workflowId'];
    }

    logger.info('Database index check complete', { missingIndexes });
    return missingIndexes;
  } catch (error) {
    logger.error('Error checking database indexes:', { error });
    throw error;
  }
}

module.exports = {
  createIndexes,
  checkIndexes
};
