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
    
    // Create a new MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    
    // Get the connection string
    const mongoUri = mongoServer.getUri();
    
    console.log(`MongoDB Memory Server running at ${mongoUri}`);
    
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
