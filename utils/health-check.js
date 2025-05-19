/**
 * Application Health Check Script
 * 
 * This script checks the health of the application by:
 * 1. Verifying that the server is running
 * 2. Checking the MongoDB connection
 * 
 * It returns exit code 0 if everything is healthy, or non-zero otherwise.
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

// Get configuration from environment variables
const PORT = process.env.PORT || 8732;
const MONGODB_URI = process.env.MONGODB_URI;

// Check if MongoDB URI is set
if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Function to check server health
async function checkHealth() {
  try {
    // Check MongoDB connection
    console.log('Checking MongoDB connection...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    console.log('MongoDB connection successful');
    await mongoose.disconnect();
    
    // Check HTTP server
    console.log('Checking HTTP server...');
    await new Promise((resolve, reject) => {
      const req = http.request({
        host: 'localhost',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000 // 5 seconds timeout
      }, (res) => {
        if (res.statusCode === 200) {
          console.log(`HTTP server is running on port ${PORT}`);
          resolve();
        } else {
          console.error(`HTTP server returned status code ${res.statusCode}`);
          reject(new Error(`HTTP server returned status code ${res.statusCode}`));
        }
      });
      
      req.on('error', (err) => {
        console.error(`HTTP server check failed: ${err.message}`);
        reject(err);
      });
      
      req.on('timeout', () => {
        console.error('HTTP server check timed out');
        req.destroy();
        reject(new Error('HTTP server check timed out'));
      });
      
      req.end();
    });
    
    console.log('Health check passed');
    process.exit(0);
  } catch (error) {
    console.error(`Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the health check
checkHealth();
