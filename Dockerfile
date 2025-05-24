FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for Tailwind)
RUN npm install

# Copy Tailwind config files
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Copy application code
COPY . .

# Create dist directory and build Tailwind CSS
RUN mkdir -p client/dist
RUN npm run build:css:prod

# Expose the application port
EXPOSE 8732

# Command to run the application
CMD ["node", "server.js"]
