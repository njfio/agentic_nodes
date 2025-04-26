/**
 * In-memory MongoDB Server
 * Used for development and testing when a local MongoDB instance is not available
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Start the in-memory MongoDB server
 * @returns {Promise<string>} - MongoDB URI
 */
async function startMemoryServer() {
  try {
    console.log('Starting in-memory MongoDB server...');

    // Create a new MongoDB memory server without authentication first
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'multimodal-ai-agent'
      }
    });

    // Get the connection string
    const mongoUri = mongoServer.getUri();

    console.log(`MongoDB Memory Server running at ${mongoUri}`);

    // Connect to the in-memory MongoDB
    const conn = await mongoose.createConnection(mongoUri);

    // Get the database
    const db = conn.db;

    // Create collections
    try {
      await db.createCollection('users');
      await db.createCollection('workflows');
      await db.createCollection('nodes');
      await db.createCollection('images');
      await db.createCollection('logs');
      console.log('Collections created in memory MongoDB');
    } catch (collErr) {
      console.log('Error creating collections (may already exist):', collErr.message);
    }

    // Create a default user directly in the database
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      await db.collection('users').insertOne({
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        isVerified: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created test user in memory MongoDB');
    } catch (userError) {
      console.log('User creation error (may already exist):', userError.message);
    }

    // Close the connection
    await conn.close();

    // Set the MongoDB URI in the environment
    process.env.MONGODB_URI = mongoUri;

    return mongoUri;
  } catch (error) {
    console.error('Failed to start MongoDB Memory Server:', error);
    throw error;
  }
}

/**
 * Stop the in-memory MongoDB server
 */
async function stopMemoryServer() {
  try {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
      console.log('MongoDB Memory Server stopped');
    }
  } catch (error) {
    console.error('Error stopping MongoDB Memory Server:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await stopMemoryServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopMemoryServer();
  process.exit(0);
});

module.exports = {
  startMemoryServer,
  stopMemoryServer
};
