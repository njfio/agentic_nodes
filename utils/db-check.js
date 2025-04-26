/**
 * MongoDB Connection Check Utility
 *
 * This script checks the connection to MongoDB and lists all collections.
 * It can be used to verify that the MongoDB connection is working properly.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set.');
  console.error('Please set the MONGODB_URI environment variable in your .env file.');
  process.exit(1);
}

async function checkConnection() {
  console.log('MongoDB Connection Check');
  console.log('=======================');
  console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  try {
    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Get connection status
    const status = mongoose.connection.readyState;
    const statusText = status === 1 ? 'Connected' : 'Disconnected';
    console.log(`Connection status: ${statusText} (${status})`);

    // Get database information
    const db = mongoose.connection.db;
    const dbStats = await db.stats();
    console.log(`\nDatabase: ${db.databaseName}`);
    console.log(`Storage size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Collections: ${dbStats.collections}`);
    console.log(`Objects: ${dbStats.objects}`);

    // List all collections
    console.log('\nCollections:');
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('No collections found.');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`- ${collection.name} (${count} documents)`);
      }
    }

    console.log('\n✅ Database check completed successfully.');
  } catch (error) {
    console.error('\n❌ Error connecting to MongoDB:');
    console.error(error.message);

    // Provide more helpful error messages
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nPossible causes:');
      console.error('1. MongoDB server is not running');
      console.error('2. MongoDB URI is incorrect');
      console.error('3. Network connectivity issues');
      console.error('\nSuggestions:');
      console.error('- Check if MongoDB is running: docker-compose ps');
      console.error('- Start MongoDB if needed: docker-compose up -d mongodb');
      console.error('- Verify the MONGODB_URI in your .env file');
    } else if (error.name === 'MongoError' && error.code === 18) {
      console.error('\nAuthentication failed. Please check your username and password in the MONGODB_URI.');
    }
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
}

// Run the check
checkConnection().catch(console.error);
