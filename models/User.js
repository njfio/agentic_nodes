const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#3498db'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'editor'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
  lastLogin: {
    type: Date
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a virtual property for workflows
userSchema.virtual('workflows', {
  ref: 'Workflow',
  localField: '_id',
  foreignField: 'user'
});

// Create a virtual property for nodes
userSchema.virtual('nodes', {
  ref: 'Node',
  localField: '_id',
  foreignField: 'user'
});

// Generate JWT token
userSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Add token to user's tokens array
  user.tokens = user.tokens.concat({ token });
  await user.save();

  return token;
};

// Find user by credentials
userSchema.statics.findByCredentials = async (username, password) => {
  // Try to find by username
  const user = await User.findOne({ username });

  if (!user) {
    throw new Error('Invalid login credentials');
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }

  return user;
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;

  // Only hash the password if it's modified
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }

  // Update the updatedAt timestamp
  user.updatedAt = Date.now();

  next();
});

// Generate verification token
userSchema.methods.generateVerificationToken = async function() {
  const user = this;
  const verificationToken = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  user.verificationToken = verificationToken;
  await user.save();

  return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = async function() {
  const user = this;
  const resetToken = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  return resetToken;
};

// Verify user's email
userSchema.methods.verifyEmail = async function() {
  const user = this;
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();
  return user;
};

// Get full name
userSchema.methods.getFullName = function() {
  const user = this;
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  } else if (user.firstName) {
    return user.firstName;
  } else if (user.lastName) {
    return user.lastName;
  }
  return user.username;
};

// Check if user has a specific role
userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

// Check if user is an admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  // Remove sensitive data
  delete userObject.password;
  delete userObject.tokens;
  delete userObject.verificationToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;

  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
