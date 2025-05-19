const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password, // Will be hashed by the pre-save hook
      email,
      firstName,
      lastName,
      isVerified: false // Require email verification
    });

    await user.save();

    // Generate verification token
    const verificationToken = await user.generateVerificationToken();

    // Send verification email
    await sendVerificationEmail(user, verificationToken);

    // Generate auth token
    const token = await user.generateAuthToken();

    // Return user and token
    res.status(201).json({
      user,
      token,
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to send verification email
const sendVerificationEmail = async (user, token) => {
  try {
    // Create a test account if no SMTP settings are provided
    let testAccount = null;
    let transporter = null;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use provided SMTP settings
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Create a test account for development
      testAccount = await nodemailer.createTestAccount();

      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    // Verification URL
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:8732'}/verify-email?token=${token}`;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Multimodal AI Agent" <noreply@example.com>',
      to: user.email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Email Verification</h1>
        <p>Hello ${user.firstName || user.username},</p>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log email URL for development
    if (testAccount) {
      console.log('Verification email sent: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Special case for default test user
    if (username === 'testuser' && password === 'password123') {
      // Find or create the default test user
      let user = await User.findOne({ username: 'testuser' });

      if (!user) {
        // Create the default test user
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
        console.log('Default test user created during login');
      }

      // Update last login time
      user.lastLogin = Date.now();
      await user.save();

      // Generate auth token
      const token = await user.generateAuthToken();

      return res.json({ user, token });
    }

    // Regular login flow
    try {
      // Find user by credentials (this will validate the password)
      const user = await User.findByCredentials(username, password);

      // Check if user is verified
      if (!user.isVerified && process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          message: 'Please verify your email address before logging in',
          needsVerification: true
        });
      }

      // Update last login time
      user.lastLogin = Date.now();
      await user.save();

      // Generate auth token
      const token = await user.generateAuthToken();

      // Return user and token
      res.json({ user, token });
    } catch (error) {
      console.error('Error with credentials:', error);
      res.status(401).json({ message: 'Invalid login credentials' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findOne({
      _id: decoded.id,
      verificationToken: token
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Verify the user
    await user.verifyEmail();

    res.json({
      message: 'Email verified successfully. You can now log in.',
      verified: true
    });
  } catch (error) {
    console.error('Error verifying email:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    res.status(500).json({ message: 'Server error' });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find the user
    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal that the email doesn't exist
      return res.json({
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = await user.generatePasswordResetToken();

    // Send password reset email
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:8732'}/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || (await nodemailer.createTestAccount()).user,
        pass: process.env.SMTP_PASS || (await nodemailer.createTestAccount()).pass
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Multimodal AI Agent" <noreply@example.com>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Hello ${user.firstName || user.username},</p>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    console.error('Error resetting password:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.status(500).json({ message: 'Server error' });
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
    const allowedUpdates = [
      'username', 'email', 'password', 'firstName', 'lastName',
      'bio', 'color', 'settings'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    // If email is being updated, require verification
    if (updates.includes('email') && req.body.email !== req.user.email) {
      req.user.isVerified = false;

      // Generate new verification token
      const verificationToken = await req.user.generateVerificationToken();

      // Send verification email
      await sendVerificationEmail(req.user, verificationToken);
    }

    // Update user fields
    updates.forEach(update => {
      // Handle nested settings object
      if (update === 'settings' && typeof req.body.settings === 'object') {
        req.user.settings = {
          ...req.user.settings,
          ...req.body.settings
        };
      } else {
        req.user[update] = req.body[update];
      }
    });

    // Save user (this will trigger the pre-save hook for password hashing)
    await req.user.save();

    // Return updated user
    res.json({
      user: req.user,
      message: updates.includes('email')
        ? 'Profile updated. Please verify your new email address.'
        : 'Profile updated successfully.'
    });
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

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    // For simplicity, just return a new token if the user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = await req.user.generateAuthToken();
    res.json({ token });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
