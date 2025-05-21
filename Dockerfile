FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --no-optional && npm cache clean --force
RUN npm install helmet compression express cors morgan mongoose dotenv bcryptjs jsonwebtoken node-fetch@2.7.0 ws uuid mongodb-memory-server

# Copy application code
COPY . .

# Expose the application port
EXPOSE 8732

# Command to run the application
CMD ["node", "server.js"]
