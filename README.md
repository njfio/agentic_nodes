# Multimodal AI Agent

A node-based workflow editor for creating AI-powered workflows with multimodal capabilities.

## Features

- Node-based canvas interface for creating AI workflows
- Support for text, image, audio, and video content
- Integration with OpenAI APIs (GPT-4o, GPT-4.1, GPT-Image)
- Workflow testing and execution
- Document view for consolidated outputs
- Collaboration features

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- OpenAI API Key

## Getting Started

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/multimodal-ai-agent.git
   cd multimodal-ai-agent
   ```

2. Create a `.env` file with your configuration:
   ```bash
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
   OPENAI_API_KEY=your_openai_api_key_here

   # JWT Authentication
   JWT_SECRET=your_jwt_secret_key_here
   ```

   > **Note:** For production use, replace the default passwords with strong, unique passwords.

3. Start the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Access the application at [http://localhost:8732](http://localhost:8732)

5. Access MongoDB Express admin interface at [http://localhost:8081](http://localhost:8081)
   - Username: admin
   - Password: admin_password_secure123

### Without Docker (Local Development)

1. Install MongoDB locally
2. Install Node.js and npm
3. Clone the repository
4. Install dependencies:
   ```bash
   npm install
   ```
5. Update the `.env` file to use your local MongoDB:
   ```
   MONGODB_URI=mongodb://localhost:27017/multimodal-ai-agent
   ```
6. Start the application:
   ```bash
   npm start
   ```

## Development

### MongoDB Docker Setup

The application uses MongoDB in a Docker container with the following features:

- **Authentication**: MongoDB is configured with username/password authentication
- **Persistence**: Data is persisted in a Docker volume
- **Admin Interface**: MongoDB Express is included for database management
- **Initialization**: Sample data is loaded on first startup
- **Health Checks**: Container health is monitored to ensure proper startup sequence
- **Backup & Restore**: Scripts for backing up and restoring the database
- **Monitoring**: Scripts for monitoring the database status

#### MongoDB Management

The following npm scripts are available for managing MongoDB:

```bash
# Check MongoDB connection and list collections
npm run db:check

# Backup the MongoDB database
npm run db:backup

# Restore the MongoDB database from a backup
npm run db:restore <backup_filename>

# Monitor MongoDB status
npm run db:monitor status    # Show server status
npm run db:monitor dbstats   # Show database statistics
npm run db:monitor collections  # Show collection statistics
```

#### Development Setup

To set up the development environment with MongoDB:

```bash
# Run the setup script
npm run setup:dev
```

This script will:
1. Create a `.env` file if it doesn't exist
2. Make all scripts executable
3. Create necessary directories
4. Start the MongoDB and MongoDB Express containers
5. Start the application

### Project Structure

- `client/`: Frontend code
- `controllers/`: API controllers
- `models/`: Database models
- `routes/`: API routes
- `server.js`: Main server file
- `docker-compose.yml`: Docker Compose configuration
- `Dockerfile`: Docker configuration for the application
- `mongo-init/`: MongoDB initialization scripts and configuration

### Available Scripts

- `npm start`: Start the server
- `npm run dev`: Start the server with nodemon for development
- `npm test`: Run tests

## License

MIT
