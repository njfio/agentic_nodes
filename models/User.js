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
  color: {
    type: String,
    default: '#3498db'
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
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

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  // Remove sensitive data
  delete userObject.password;
  delete userObject.tokens;

  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
