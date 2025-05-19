FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install node-fetch@2.7.0

# Copy application code
COPY . .

# Expose the application port
EXPOSE 8732

# Command to run the application
CMD ["node", "server.js"]
