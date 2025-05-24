# Multimodal AI Agent

A node-based workflow editor for creating AI-powered workflows with multimodal capabilities.

## Version Status

### Current Version: v1.0.0-stable

This is a known good commit with:

- Working MongoDB integration (Docker, local, and in-memory fallback)
- Fully functional canvas with panning and zooming
- Working authentication system
- All multimodal features operational

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

2. Create a `.env` file with your OpenAI API key:
   ```bash
   # Server configuration
   PORT=8732
   NODE_ENV=development

   # MongoDB connection
   MONGODB_URI=mongodb://mongodb:27017/multimodal-ai-agent

   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Start the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Access the application at [http://localhost:8732](http://localhost:8732)

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
6. Build CSS and start the application:
   ```bash
   npm run dev
   ```

## Development

### CSS Development

This project uses Tailwind CSS v3 with a proper build process to eliminate browser build warnings and improve performance:

- **Development**: `npm run dev` (builds CSS and starts server)
- **CSS Watch**: `npm run dev:css` (watches for CSS changes in separate terminal)
- **Production Build**: `npm run build:css:prod`

See [TAILWIND_SETUP.md](TAILWIND_SETUP.md) for detailed information about the CSS setup and custom classes.

### Project Structure

- `client/`: Frontend code
- `controllers/`: API controllers
- `models/`: Database models
- `routes/`: API routes
- `server.js`: Main server file
- `docker-compose.yml`: Docker Compose configuration
- `Dockerfile`: Docker configuration for the application

### Available Scripts

- `npm start`: Start the server (production)
- `npm run dev`: Build CSS and start server with nodemon for development
- `npm run dev:css`: Watch CSS changes (run in separate terminal)
- `npm run build:css:prod`: Build minified CSS for production
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run docker:up`: Start with Docker Compose

## License

This project is licensed under the [MIT License](LICENSE).
