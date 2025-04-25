const User = require('../models/User');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      password, // In a real app, this would be hashed
      email
    });
    
    const savedUser = await user.save();
    
    // Return user without password
    const userResponse = {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      createdAt: savedUser.createdAt
    };
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password (in a real app, would compare hashed passwords)
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Return user without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    };
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // In a real app, this would use authentication middleware
    // For now, we'll just return a mock response
    res.json({
      id: '123456',
      username: 'demo',
      email: 'demo@example.com',
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // In a real app, this would use authentication middleware
    // and update the actual user
    res.json({
      id: '123456',
      username: req.body.username || 'demo',
      email: req.body.email || 'demo@example.com',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
