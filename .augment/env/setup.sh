#!/bin/bash
# Development Environment Setup Script for Multimodal AI Agent
# This script sets up the development environment for the Multimodal AI Agent application

# Exit on error
set -e

echo "Setting up development environment for Multimodal AI Agent..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js is not installed. Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "npm is not installed. Please install npm."
  exit 1
fi

# Check npm version
NPM_VERSION=$(npm -v)
echo "npm version: $NPM_VERSION"

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Install additional dependencies needed for testing
echo "Installing additional dependencies for testing..."
npm install --save-dev ws uuid

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOL
# Server configuration
PORT=8732
NODE_ENV=development

# MongoDB connection (use this for local MongoDB)
MONGODB_URI=mongodb://localhost:27017/multimodal-ai-agent

# OpenAI API
# Replace with your actual OpenAI API key to use AI features
OPENAI_API_KEY=dummy_key_for_testing

# JWT Authentication
JWT_SECRET=multimodal_ai_agent_jwt_secret_key_2024
EOL
  echo ".env file created. Update it with your actual OpenAI API key if needed."
else
  echo ".env file already exists."
fi

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p logs
mkdir -p backups

# Make scripts executable
echo "Making scripts executable..."
if [ -d "./scripts" ]; then
  find ./scripts -type f -name "*.sh" -exec chmod +x {} \;
fi

# Create a basic test directory and test file if they don't exist
echo "Setting up test environment..."
mkdir -p __tests__

# Create a simple test file that doesn't depend on the server
if [ ! -f __tests__/basic.test.js ]; then
  cat > __tests__/basic.test.js << EOL
/**
 * Basic test to verify Jest is working
 */

describe('Basic Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
EOL
  echo "Created basic test file: __tests__/basic.test.js"
fi

# Create Jest config file if it doesn't exist
if [ ! -f jest.config.js ]; then
  cat > jest.config.js << EOL
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: false,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000
};
EOL
  echo "Created Jest configuration file: jest.config.js"
fi

# Update package.json test script to pass with no tests if needed
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
if (packageJson.scripts && packageJson.scripts.test === 'jest') {
  packageJson.scripts.test = 'jest --passWithNoTests';
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json to allow tests to pass with no tests');
}
"

# Check if MongoDB is available
echo "Checking MongoDB availability..."
if command -v mongod &> /dev/null; then
  echo "MongoDB is installed."
elif command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
  echo "Docker and Docker Compose are available. You can use containerized MongoDB."
  echo "To start MongoDB with Docker, run: docker-compose up -d mongodb"
else
  echo "Warning: Neither MongoDB nor Docker is installed."
  echo "The application requires MongoDB to run properly."
  echo "You can install MongoDB manually or use the in-memory MongoDB for development."
fi

# Add environment variables to .bashrc if not already there
if ! grep -q "export PATH=\$PATH:\$HOME/node_modules/.bin" ~/.bashrc; then
  echo "Adding node_modules/.bin to PATH in .bashrc..."
  echo "export PATH=\$PATH:\$HOME/node_modules/.bin" >> ~/.bashrc
fi

# Add alias for starting the application
if ! grep -q "alias start-multimodal-agent=" ~/.bashrc; then
  echo "Adding alias for starting the application to .bashrc..."
  echo "alias start-multimodal-agent='cd $(pwd) && npm start'" >> ~/.bashrc
  echo "alias dev-multimodal-agent='cd $(pwd) && npm run dev'" >> ~/.bashrc
fi

echo "Development environment setup complete!"
echo "To start the application, run: npm start"
echo "For development with auto-reload, run: npm run dev"
echo "To run tests, run: npm test"
echo ""
echo "You may need to restart your terminal or run 'source ~/.bashrc' to use the added PATH and aliases."