/**
 * Configuration Validation Utility
 * Ensures all required environment variables are set and valid
 */

const path = require('path');

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  JWT_SECRET: {
    required: true,
    validate: (value) => value && value.length >= 32,
    error: 'JWT_SECRET must be at least 32 characters long'
  },
  MONGODB_URI: {
    required: false, // Optional since we have fallbacks
    validate: (value) => !value || value.startsWith('mongodb'),
    error: 'MONGODB_URI must be a valid MongoDB connection string'
  },
  NODE_ENV: {
    required: false,
    validate: (value) => !value || ['development', 'production', 'test'].includes(value),
    error: 'NODE_ENV must be one of: development, production, test',
    default: 'development'
  },
  PORT: {
    required: false,
    validate: (value) => !value || (!isNaN(value) && parseInt(value) > 0 && parseInt(value) < 65536),
    error: 'PORT must be a valid port number between 1 and 65535',
    default: '8732'
  },
  // Removed OPENAI_API_KEY from here since it should come from user settings,
  // not environment variables
};

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  ALLOWED_ORIGINS: {
    default: 'http://localhost:3000,http://localhost:8732',
    validate: (value) => typeof value === 'string',
    error: 'ALLOWED_ORIGINS must be a comma-separated list of URLs'
  },
  SESSION_SECRET: {
    default: null, // Will be generated if not provided
    validate: (value) => !value || value.length >= 16,
    error: 'SESSION_SECRET must be at least 16 characters long'
  }
};

/**
 * Validate a single environment variable
 */
function validateEnvVar(name, config, value) {
  // Check if required and missing
  if (config.required && !value) {
    throw new Error(`Environment variable ${name} is required but not set. ${config.error || ''}`);
  }

  // Set default if not provided
  if (!value && config.default !== undefined) {
    process.env[name] = config.default;
    value = config.default;
  }

  // Validate if value exists and validator is provided
  if (value && config.validate && !config.validate(value)) {
    throw new Error(`Environment variable ${name} is invalid. ${config.error || ''}`);
  }

  return value;
}

/**
 * Generate a secure random secret
 */
function generateSecret(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate all environment variables
 */
function validateConfig() {
  const errors = [];
  const warnings = [];

  // Check for .env file
  const envPath = path.join(process.cwd(), '.env');
  try {
    require('fs').accessSync(envPath);
  } catch (error) {
    warnings.push('No .env file found. Using environment variables or defaults.');
  }

  // Validate required variables
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    try {
      validateEnvVar(name, config, process.env[name]);
    } catch (error) {
      errors.push(error.message);
    }
  }

  // Validate optional variables
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    try {
      validateEnvVar(name, config, process.env[name]);
    } catch (error) {
      warnings.push(error.message);
    }
  }

  // Generate JWT_SECRET if not provided
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is required in production. Please set this environment variable.');
    } else {
      const secret = generateSecret(64);
      process.env.JWT_SECRET = secret;
      warnings.push('JWT_SECRET not set. Generated a temporary secret for development. Set JWT_SECRET in production!');
    }
  }

  // Generate SESSION_SECRET if not provided
  if (!process.env.SESSION_SECRET) {
    const secret = generateSecret(32);
    process.env.SESSION_SECRET = secret;
    if (process.env.NODE_ENV !== 'production') {
      warnings.push('SESSION_SECRET not set. Generated a temporary secret.');
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('✅ Configuration validation passed');

  // Log current configuration (without sensitive values)
  if (process.env.NODE_ENV !== 'production') {
    console.log('📋 Current configuration:');
    console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  - PORT: ${process.env.PORT}`);
    console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '***set***' : 'not set'}`);
    console.log(`  - MONGODB_URI: ${process.env.MONGODB_URI ? '***set***' : 'not set (will use fallback)'}`);
    console.log(`  - ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);
    console.log('  - API Keys: Stored in user settings (not environment variables)');
  }
}

/**
 * Get a configuration value with validation
 */
function getConfig(name, defaultValue = null) {
  const value = process.env[name] || defaultValue;
  
  if (REQUIRED_ENV_VARS[name] || OPTIONAL_ENV_VARS[name]) {
    const config = REQUIRED_ENV_VARS[name] || OPTIONAL_ENV_VARS[name];
    validateEnvVar(name, config, value);
  }
  
  return value;
}

/**
 * Check if we're in a specific environment
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

function isTest() {
  return process.env.NODE_ENV === 'test';
}

module.exports = {
  validateConfig,
  getConfig,
  isProduction,
  isDevelopment,
  isTest
};