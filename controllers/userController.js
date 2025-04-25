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
      password, // Will be hashed by the pre-save hook
      email
    });

    await user.save();

    // Generate auth token
    const token = await user.generateAuthToken();

    // Return user and token
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by credentials (this will validate the password)
    const user = await User.findByCredentials(username, password);

    // Generate auth token
    const token = await user.generateAuthToken();

    // Return user and token
    res.json({ user, token });
  } catch (error) {
    console.error('Error logging in:', error);

    // Return a generic error message for security
    res.status(401).json({ message: 'Invalid login credentials' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User is attached to request by auth middleware
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username', 'email', 'password', 'color'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    // Update user fields
    updates.forEach(update => {
      req.user[update] = req.body[update];
    });

    // Save user (this will trigger the pre-save hook for password hashing)
    await req.user.save();

    // Return updated user
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // Remove the current token
    req.user.tokens = req.user.tokens.filter(token => token.token !== req.token);
    await req.user.save();

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  try {
    // Remove all tokens
    req.user.tokens = [];
    await req.user.save();

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Error logging out from all devices:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
