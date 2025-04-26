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

    // Create a new MongoDB memory server with authentication
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'multimodal-ai-agent',
        auth: true
      }
    });

    // Get the connection string
    const mongoUri = mongoServer.getUri();

    console.log(`MongoDB Memory Server running at ${mongoUri}`);

    // Connect to set up admin user
    const conn = await mongoose.createConnection(mongoUri);

    // Create admin user
    try {
      await conn.db.addUser(
        process.env.MONGO_USERNAME || 'multimodal_admin',
        process.env.MONGO_PASSWORD || 'multimodal_password_secure123',
        {
          roles: [
            { role: 'readWrite', db: 'multimodal-ai-agent' },
            { role: 'dbAdmin', db: 'multimodal-ai-agent' }
          ]
        }
      );
      console.log('Created admin user in memory MongoDB');
    } catch (userError) {
      // User might already exist
      console.log('Admin user setup error (may already exist):', userError.message);
    }

    // Close the connection
    await conn.close();

    // Set the authenticated URI
    const username = process.env.MONGO_USERNAME || 'multimodal_admin';
    const password = process.env.MONGO_PASSWORD || 'multimodal_password_secure123';
    const authUri = mongoUri.replace('mongodb://', `mongodb://${username}:${password}@`);

    console.log(`MongoDB Memory Server configured with authentication`);

    // Set the MongoDB URI in the environment
    process.env.MONGODB_URI = authUri;

    return authUri;
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
