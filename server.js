require('dotenv').config();

// Validate configuration before starting the application
const { validateConfig, isProduction } = require('./utils/config-validation');
validateConfig();

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

// Import routes and middleware
const apiRoutes = require('./routes/api');
const apiImprovedRoutes = require('./routes/api-improved');
const apiV2Routes = require('./routes/api-v2');
const { apiLimiter, authLimiter } = require('./middleware/security/rateLimiter');

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 8732;

// Security middleware
if (process.env.NODE_ENV === 'production') {
  // Use strict security headers in production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-eval for better security
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com", "wss:", "ws:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: ["no-referrer", "strict-origin-when-cross-origin"] }
  }));
} else {
  // In development, use a more permissive configuration but still secure
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval in development
        styleSrc: ["'self'", "'unsafe-inline'"], // Only allow self and inline styles - no CDN
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"]
      }
    },
    hsts: false, // Explicitly disable HSTS in development
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  }));
  console.log('Running in development mode with relaxed security settings (HSTS disabled)');
}

// Performance middleware
app.use(compression());

// Configure CORS with security in mind
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8732'];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

// In development, be more permissive
if (process.env.NODE_ENV === 'development') {
  corsOptions.origin = true; // Allow all origins in development
}

app.use(cors(corsOptions));

// Body parsing middleware with security limits
app.use(express.json({
  limit: '10mb', // Reduced from 50mb for security
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb', // Reduced from 50mb for security
  parameterLimit: 1000 // Limit number of parameters
}));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // More detailed logging in production
} else {
  app.use(morgan('dev'));
}

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Request tracking for monitoring
app.use((req, res, next) => {
  req.requestTime = Date.now();
  res.on('finish', () => {
    monitoringService.recordRequest(req, res, req.requestTime);
  });
  next();
});

// Debug middleware for static files in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
      console.log(`[STATIC] Serving: ${req.url}`);
    }
    next();
  });
}

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));

// Apply rate limiting to API routes
app.use('/api/v1', apiLimiter, apiRoutes);
app.use('/api/v1.5', apiLimiter, apiImprovedRoutes);
app.use('/api/v2', apiLimiter, apiV2Routes);

// Backwards compatibility - redirect /api to latest version
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/v')) {
    // Already versioned, continue
    next();
  } else {
    // Redirect to v2 (latest)
    res.redirect(301, `/api/v2${req.path}`);
  }
});

// Apply stricter rate limiting to auth endpoints
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/v2/auth/login', authLimiter);
app.use('/api/v2/auth/register', authLimiter);

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
