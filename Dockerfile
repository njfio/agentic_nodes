FROM node:20-alpine

# Install MongoDB client tools for database operations
RUN apk add --no-cache mongodb-tools

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.sh mongo-init/healthcheck.sh

# Create necessary directories
RUN mkdir -p logs backups

# Expose the application port
EXPOSE 8732

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node utils/health-check.js || exit 1

# Command to run the application
CMD ["node", "server.js"]
