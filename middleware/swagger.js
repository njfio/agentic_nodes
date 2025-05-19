const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { logger } = require('../services/loggingService');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Blackbox API Documentation',
    version: '1.0.0',
    description: 'API documentation for the Blackbox application',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'Blackbox Support',
      url: 'https://blackbox.com/support',
      email: 'support@blackbox.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Main API server',
    },
    {
      url: '/api/v2',
      description: 'Improved API server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          _id: {
            type: 'string',
            description: 'User ID',
          },
          username: {
            type: 'string',
            description: 'User username',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          password: {
            type: 'string',
            format: 'password',
            description: 'User password',
          },
          isVerified: {
            type: 'boolean',
            description: 'Has the user verified their email',
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            description: 'User role',
          },
          tokens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Authentication token',
                },
              },
            },
          },
        },
      },
      Workflow: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Workflow ID',
          },
          name: {
            type: 'string',
            description: 'Workflow name',
          },
          description: {
            type: 'string',
            description: 'Workflow description',
          },
          userId: {
            type: 'string',
            description: 'ID of the user who created the workflow',
          },
          nodes: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Node',
            },
          },
          connections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Source node ID',
                },
                target: {
                  type: 'string',
                  description: 'Target node ID',
                },
              },
            },
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether the workflow is public',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
          lastModified: {
            type: 'string',
            format: 'date-time',
            description: 'Last modified timestamp',
          },
          versions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  description: 'Version number',
                },
                versionId: {
                  type: 'string',
                  description: 'Version ID',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Version creation timestamp',
                },
                createdBy: {
                  type: 'object',
                  properties: {
                    userId: {
                      type: 'string',
                      description: 'User ID',
                    },
                    username: {
                      type: 'string',
                      description: 'Username',
                    },
                  },
                },
                commitMessage: {
                  type: 'string',
                  description: 'Version commit message',
                },
              },
            },
          },
        },
      },
      Node: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Node ID',
          },
          id: {
            type: 'string',
            description: 'Node ID within workflow',
          },
          type: {
            type: 'string',
            description: 'Node type',
          },
          workflowId: {
            type: 'string',
            description: 'ID of the parent workflow',
          },
          position: {
            type: 'object',
            properties: {
              x: {
                type: 'number',
                description: 'X coordinate',
              },
              y: {
                type: 'number',
                description: 'Y coordinate',
              },
            },
          },
          data: {
            type: 'object',
            description: 'Node data',
          },
          metadata: {
            type: 'object',
            description: 'Node metadata',
          },
        },
      },
      Image: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Image ID',
          },
          name: {
            type: 'string',
            description: 'Image name',
          },
          workflowId: {
            type: 'string',
            description: 'ID of the parent workflow',
          },
          userId: {
            type: 'string',
            description: 'ID of the user who created the image',
          },
          imageData: {
            type: 'string',
            format: 'byte',
            description: 'Image data in base64 encoding',
          },
          metadata: {
            type: 'object',
            description: 'Image metadata',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the request was successful',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message',
              },
              code: {
                type: 'string',
                description: 'Error code',
              },
              validationErrors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string',
                      description: 'Field with error',
                    },
                    message: {
                      type: 'string',
                      description: 'Error message for field',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Path to the API docs
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js',
    './middleware/*.js',
    './services/*.js',
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

/**
 * Setup Swagger middleware
 * @param {Express} app - Express application
 */
function setupSwagger(app) {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info('Swagger documentation initialized at /api-docs');
}

module.exports = {
  setupSwagger,
};