require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const { startMemoryServer } = require('./db-memory-server');

// Import routes
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 8732;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));

// API routes
app.use('/api', apiRoutes);

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Create a default test user
const createDefaultUser = async () => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');

    // Check if the default user already exists
    const existingUser = await User.findOne({ username: 'testuser' });

    if (!existingUser) {
      console.log('Creating default test user...');

      // Hash the password manually
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Create a new user with pre-hashed password
      const user = new User({
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        isVerified: true,
        role: 'user'
      });

      // Save the user (this will skip password hashing since it's already hashed)
      user.isNew = true; // Ensure it's treated as a new document
      await user.save();
      console.log('Default test user created successfully');
    } else {
      console.log('Default test user already exists');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
};

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
  console.log('Attempting to connect to MongoDB...');

  try {
    // First, try to connect to the Docker MongoDB
    if (process.env.MONGODB_DOCKER_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_DOCKER_URI, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
        console.log('Connected to Docker MongoDB successfully');

        // Create default test user
        await createDefaultUser();
        return;
      } catch (dockerErr) {
        console.error('Docker MongoDB connection error:', dockerErr.message);
      }
    }

    // If Docker connection fails, try local MongoDB
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      console.log('Connected to local MongoDB successfully');

      // Create default test user
      await createDefaultUser();
      return;
    } catch (localErr) {
      console.error('Local MongoDB connection error:', localErr.message);
    }

    // If both Docker and local MongoDB fail, use in-memory MongoDB
    console.log('Starting in-memory MongoDB server...');

    // Start in-memory MongoDB server
    const mongoUri = await startMemoryServer();

    // Connect to in-memory MongoDB
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('Connected to in-memory MongoDB successfully');

    // Create default test user
    await createDefaultUser();

    return;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Start the server after MongoDB connection is established
const startServer = async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectWithRetry();
  }

  console.log(`Attempting to start server on port ${PORT}...`);
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  return server;
};

// Start the server
const server = startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = server; // Export for testing
