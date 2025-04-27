/**
 * Docker Environment Controller
 * Provides special functionality for Docker environments
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Auto-login for Docker environment
exports.autoLogin = async (req, res) => {
  try {
    // Find or create the test user
    let user = await User.findOne({ username: 'testuser' });

    if (!user) {
      // Create the default test user if it doesn't exist
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      user = new User({
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        isVerified: true,
        role: 'user'
      });

      await user.save();
      console.log('Created test user for Docker auto-login');
    }

    // Generate auth token
    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user and token
    res.json({
      user,
      token,
      message: 'Docker auto-login successful'
    });
  } catch (error) {
    console.error('Docker auto-login error:', error);
    res.status(500).json({ message: 'Server error during auto-login' });
  }
};
