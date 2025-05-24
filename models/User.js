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
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(password) {
        // Password must contain at least one uppercase, one lowercase, one number, and one special char
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
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
  // Note: JWT tokens are no longer stored in database for security
  // Session management is now handled externally
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
    },
    apiKeys: {
      openai: {
        type: String,
        default: '',
        select: false // Don't include in queries by default for security
      },
      anthropic: {
        type: String,
        default: '',
        select: false
      },
      google: {
        type: String,
        default: '',
        select: false
      },
      perplexity: {
        type: String,
        default: '',
        select: false
      }
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

// Generate JWT token (no longer stored in database)
userSchema.methods.generateAuthToken = function() {
  const user = this;
  const token = jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Note: Token is no longer stored in database for security
  // Session management should be handled externally (Redis, etc.)
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

// Get API key for a specific service
userSchema.methods.getApiKey = async function(service) {
  // Need to explicitly select the API key field since it's excluded by default
  const user = await User.findById(this._id).select(`+settings.apiKeys.${service}`);
  return user?.settings?.apiKeys?.[service] || null;
};

// Set API key for a specific service
userSchema.methods.setApiKey = async function(service, apiKey) {
  const validServices = ['openai', 'anthropic', 'google', 'perplexity'];
  
  if (!validServices.includes(service)) {
    throw new Error(`Invalid service: ${service}`);
  }

  // Update the specific API key
  this.settings.apiKeys[service] = apiKey;
  await this.save();
  
  return true;
};

// Get all API keys (for settings page)
userSchema.methods.getAllApiKeys = async function() {
  const user = await User.findById(this._id)
    .select('+settings.apiKeys.openai +settings.apiKeys.anthropic +settings.apiKeys.google +settings.apiKeys.perplexity');
  
  return {
    openai: user?.settings?.apiKeys?.openai ? '***' + user.settings.apiKeys.openai.slice(-4) : '',
    anthropic: user?.settings?.apiKeys?.anthropic ? '***' + user.settings.apiKeys.anthropic.slice(-4) : '',
    google: user?.settings?.apiKeys?.google ? '***' + user.settings.apiKeys.google.slice(-4) : '',
    perplexity: user?.settings?.apiKeys?.perplexity ? '***' + user.settings.apiKeys.perplexity.slice(-4) : ''
  };
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;

  // Only hash the password if it's modified and not already hashed
  if (user.isModified('password')) {
    // Check if the password is already hashed (starts with $2a$ or $2b$)
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      user.password = await bcrypt.hash(user.password, 12); // Increased salt rounds for security
    }
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
  delete userObject.verificationToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;

  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
