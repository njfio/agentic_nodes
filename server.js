require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const { startMemoryServer } = require('./db-memory-server');
const { errorHandler } = require('./middleware/errorHandler');
const websocketService = require('./services/websocketService');
const monitoringService = require('./services/monitoringService');
const { createIndexes } = require('./utils/db-indexes');

// Import routes
const apiRoutes = require('./routes/api');
const apiImprovedRoutes = require('./routes/api-improved');

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 8732;

// Security middleware
if (process.env.NODE_ENV === 'production') {
  // Use strict CSP in production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://api.openai.com"]
      }
    }
  }));
} else {
  // In development, use a more permissive configuration
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP in development
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  }));
  console.log('Running in development mode with relaxed security settings');
}

// Performance middleware
app.use(compression());

// Standard middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use(morgan('dev'));

// Request tracking for monitoring
app.use((req, res, next) => {
  req.requestTime = Date.now();
  res.on('finish', () => {
    monitoringService.recordRequest(req, res, req.requestTime);
  });
  next();
});

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));

// API routes
app.use('/api', apiRoutes);
app.use('/api/v2', apiImprovedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Monitoring dashboard endpoint (protected in production)
if (process.env.NODE_ENV === 'development') {
  app.get('/monitoring', (req, res) => {
    res.json(monitoringService.getMetrics());
  });
} else {
  // In production, require authentication
  const authMiddleware = require('./middleware/auth');
  app.get('/monitoring', authMiddleware, (req, res) => {
    res.json(monitoringService.getMetrics());
  });
}

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Error handling middleware (must be after all other middleware and routes)
app.use(errorHandler);

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
        // Set Docker environment flag
        process.env.DOCKER_ENV = 'true';

        await mongoose.connect(process.env.MONGODB_DOCKER_URI, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
        console.log('Connected to Docker MongoDB successfully');

        // Create indexes for optimal performance
        await createIndexes();

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

      // Create indexes for optimal performance
      await createIndexes();

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

    // Create indexes for optimal performance
    await createIndexes();

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

    // Start the WebSocket server
    websocketService.initialize(server);

    // Start the monitoring service
    monitoringService.start();
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('Received shutdown signal. Shutting down gracefully...');

    // Stop the WebSocket server
    websocketService.shutdown();

    // Stop the monitoring service
    monitoringService.stop();

    // Close the server
    server.close(() => {
      console.log('HTTP server closed.');

      // Close database connection
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      });
    });

    // Force close if graceful shutdown fails
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return server;
};

// Start the server
const server = startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  if (server && typeof server.close === 'function') {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

module.exports = server; // Export for testing
