require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Start in-memory MongoDB server
const startMemoryServer = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`MongoDB Memory Server running at ${mongoUri}`);
  process.env.MONGODB_URI = mongoUri;
  return mongoServer;
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Start in-memory MongoDB server
    const mongoServer = await startMemoryServer();

    // Connect to in-memory MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Import User model
    const User = require('./models/User');

    // Check if user exists
    const existingUser = await User.findOne({ username: 'testuser' });

    if (existingUser) {
      console.log('User already exists, deleting...');
      await User.deleteOne({ username: 'testuser' });
    }

    // Create hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create new user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      isVerified: true,
      role: 'user'
    });

    // Save user
    await user.save();
    console.log('User created successfully');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

connectDB();
