#!/bin/bash
# Development Environment Setup Script

# Set script to exit on error
set -e

echo "Setting up development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "Docker Compose is not installed. Please install Docker Compose first."
  exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file from template..."
  cat > .env << EOL
# Server configuration
PORT=8732
NODE_ENV=development

# MongoDB credentials
MONGO_USERNAME=multimodal_admin
MONGO_PASSWORD=multimodal_password_secure123
MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=admin_password_secure123

# MongoDB connection
MONGODB_URI=mongodb://multimodal_admin:multimodal_password_secure123@mongodb:27017/multimodal-ai-agent?authSource=admin

# OpenAI API
# ===================================================================
# IMPORTANT: You must replace the placeholder below with your actual OpenAI API key
# to use the AI features of this application.
#
# 1. Get your API key from https://platform.openai.com/api-keys
# 2. Replace the entire string below with your key (it should start with 'sk-')
# 3. Restart the server
# ===================================================================
OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY

# JWT Authentication
JWT_SECRET=multimodal_ai_agent_jwt_secret_key_2024
EOL
  echo ".env file created. Please update it with your OpenAI API key."
else
  echo ".env file already exists."
fi

# Make sure scripts are executable
echo "Making scripts executable..."
chmod +x scripts/*.sh

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p backups
mkdir -p logs

# Stop any running containers
echo "Stopping any running containers..."
docker-compose down 2>/dev/null || true

# Pull latest Docker images
echo "Pulling latest Docker images..."
docker-compose pull

# Build the application
echo "Building the application..."
docker-compose build

# Start the MongoDB container
echo "Starting MongoDB container..."
docker-compose up -d mongodb

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
for i in {1..30}; do
  if docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
    echo "MongoDB is ready!"
    break
  fi
  echo "Waiting for MongoDB to start... ($i/30)"
  sleep 2
  if [ $i -eq 30 ]; then
    echo "Timed out waiting for MongoDB to start."
    exit 1
  fi
done

# Start the MongoDB Express container
echo "Starting MongoDB Express container..."
docker-compose up -d mongo-express

# Start the application
echo "Starting the application..."
docker-compose up -d app

echo "Development environment setup complete!"
echo ""
echo "You can access the application at: http://localhost:8732"
echo "You can access MongoDB Express at: http://localhost:8081"
echo "  Username: $MONGO_EXPRESS_USERNAME"
echo "  Password: $MONGO_EXPRESS_PASSWORD"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop all containers: docker-compose down"
