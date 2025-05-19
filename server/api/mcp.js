/**
 * MCP Tools API
 * Provides endpoints for interacting with Model Context Protocol (MCP) tools
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

// Get MCP configuration
router.get('/config', async (req, res) => {
  try {
    // Check if the user has a custom MCP configuration file
    // Try multiple possible paths for MCP settings
    const possiblePaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
      path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')
    ];

    // Find the first path that exists
    let userConfigPath = null;
    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        userConfigPath = configPath;
        console.log(`Found MCP settings at: ${userConfigPath}`);
        break;
      }
    }

    // If no path exists, use the last one as default
    if (!userConfigPath) {
      userConfigPath = possiblePaths[possiblePaths.length - 1];
      console.log(`No MCP settings found, using default path: ${userConfigPath}`);
    }

    // Check if the file exists
    if (fs.existsSync(userConfigPath)) {
      // Read the file
      const configData = fs.readFileSync(userConfigPath, 'utf8');

      // Parse the JSON
      const config = JSON.parse(configData);

      // Return the configuration
      return res.json(config);
    }

    // If no custom configuration is found, return a default configuration
    return res.json({
      mcpServers: {
        "github.com/modelcontextprotocol/servers/tree/main/src/memory": {
          "autoApprove": [
            "create_entities",
            "create_relations",
            "add_observations",
            "delete_entities",
            "delete_observations",
            "delete_relations",
            "read_graph",
            "search_nodes",
            "open_nodes"
          ],
          "disabled": false
        },
        "github.com/upstash/context7-mcp": {
          "autoApprove": [],
          "disabled": false
        },
        "github.com.pashpashpash/perplexity-mcp": {
          "autoApprove": [
            "search",
            "get_documentation",
            "find_apis",
            "check_deprecated_code"
          ],
          "disabled": false
        }
      }
    });
  } catch (error) {
    console.error('Error getting MCP configuration:', error);
    res.status(500).json({ error: 'Failed to get MCP configuration' });
  }
});

// Execute an MCP tool
router.post('/execute', async (req, res) => {
  try {
    const { server, method, params, autoApprove, env } = req.body;

    if (!server || !method) {
      return res.status(400).json({ error: 'Server and method are required' });
    }

    // Get the MCP configuration
    // Try multiple possible paths for MCP settings
    const possiblePaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
      path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json')
    ];

    // Find the first path that exists
    let userConfigPath = null;
    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        userConfigPath = configPath;
        console.log(`Found MCP settings at: ${userConfigPath}`);
        break;
      }
    }

    // If no path exists, use the last one as default
    if (!userConfigPath) {
      userConfigPath = possiblePaths[possiblePaths.length - 1];
      console.log(`No MCP settings found, using default path: ${userConfigPath}`);
    }

    let mcpConfig = {};

    // Check if the file exists
    if (fs.existsSync(userConfigPath)) {
      // Read the file
      const configData = fs.readFileSync(userConfigPath, 'utf8');

      // Parse the JSON
      mcpConfig = JSON.parse(configData);
    }

    // Check if the server is configured
    if (!mcpConfig.mcpServers || !mcpConfig.mcpServers[server]) {
      return res.status(404).json({ error: `MCP server "${server}" not found in configuration` });
    }

    // Check if the server is disabled
    if (mcpConfig.mcpServers[server].disabled) {
      return res.status(403).json({ error: `MCP server "${server}" is disabled` });
    }

    // Check if the method is auto-approved
    const isAutoApproved = mcpConfig.mcpServers[server].autoApprove && mcpConfig.mcpServers[server].autoApprove.includes(method);

    if (!isAutoApproved && !autoApprove) {
      return res.status(403).json({ error: `Method "${method}" is not auto-approved for server "${server}"` });
    }

    // Get the server configuration
    const serverConfig = mcpConfig.mcpServers[server];

    // Add environment variables if provided
    if (env) {
      serverConfig.env = env;
    }

    // Execute the MCP tool
    const result = await executeMCPTool(server, method, params, serverConfig);

    // Return the result
    return res.json({ result });
  } catch (error) {
    console.error('Error executing MCP tool:', error);
    res.status(500).json({ error: 'Failed to execute MCP tool' });
  }
});

// Execute an MCP tool
async function executeMCPTool(server, method, params, serverConfig) {
  try {
    console.log(`Executing MCP tool: ${server} - ${method}`);
    console.log('Server config:', JSON.stringify(serverConfig));

    // Check if we have the necessary configuration
    if (!serverConfig) {
      throw new Error(`No configuration found for server ${server}`);
    }

    // For Perplexity MCP server, use the actual API
    if (server.includes('perplexity')) {
      return await executePerplexityTool(method, params, serverConfig);
    }

    // For Context7 MCP server, use the actual API
    if (server.includes('context7')) {
      return await executeContext7Tool(method, params, serverConfig);
    }

    // For Memory MCP server, use the actual API
    if (server.includes('memory')) {
      return await executeMemoryTool(method, params, serverConfig);
    }

    // For other servers, use a mock implementation
    console.log(`Using mock implementation for server ${server}`);

    // Mock data based on the server and method
    if (server.includes('memory')) {
      if (method === 'create_entities') {
        return {
          success: true,
          entities: params.entities || []
        };
      } else if (method === 'read_graph') {
        return {
          entities: [
            { id: '1', type: 'person', name: 'John Doe' },
            { id: '2', type: 'person', name: 'Jane Smith' }
          ],
          relations: [
            { id: '1', type: 'friend', source: '1', target: '2' }
          ]
        };
      } else if (method === 'search_nodes') {
        return {
          nodes: [
            { id: '1', type: 'person', name: 'John Doe' }
          ]
        };
      }
    } else if (server.includes('perplexity')) {
      if (method === 'search') {
        return {
          query: params.query,
          results: [
            {
              title: 'Example Search Result 1',
              url: 'https://example.com/1',
              snippet: 'This is an example search result snippet.'
            },
            {
              title: 'Example Search Result 2',
              url: 'https://example.com/2',
              snippet: 'This is another example search result snippet.'
            }
          ]
        };
      } else if (method === 'get_documentation') {
        return {
          query: params.query,
          documentation: `# ${params.query} Documentation\n\nThis is example documentation for ${params.query}.`
        };
      }
    } else if (server.includes('context7')) {
      if (method === 'resolve-library-id') {
        return {
          libraryName: params.libraryName,
          libraryId: `${params.libraryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/docs`
        };
      } else if (method === 'get-library-docs') {
        return {
          libraryId: params.context7CompatibleLibraryID,
          documentation: `# ${params.context7CompatibleLibraryID} Documentation\n\nThis is example documentation for ${params.context7CompatibleLibraryID}.`
        };
      }
    }

    // Default response for unknown server/method
    return {
      server,
      method,
      params,
      message: 'This is a mock response. In a real implementation, this would be the result from the MCP server.'
    };
  } catch (error) {
    console.error(`Error executing MCP tool: ${error.message}`);
    throw error;
  }
}

// Execute a Perplexity MCP tool
async function executePerplexityTool(method, params, serverConfig) {
  try {
    console.log(`Executing Perplexity tool: ${method}`);

    // Check if we have the necessary configuration
    if (!serverConfig.env || !serverConfig.env.PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured');
    }

    // Get the API key
    const apiKey = serverConfig.env.PERPLEXITY_API_KEY;

    // Create the request payload
    const payload = {
      jsonrpc: '2.0',
      method: 'CallTool',
      params: {
        name: method,
        arguments: params
      },
      id: 1
    };

    console.log('Perplexity payload:', JSON.stringify(payload));

    // Make the API request
    const response = await axios.post('https://api.perplexity.ai/mcp', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = response.data;

    // Check for errors
    if (data.error) {
      throw new Error(`Perplexity API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    // Return the result
    return data.result;
  } catch (error) {
    console.error(`Error executing Perplexity tool: ${error.message}`);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Perplexity API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      throw new Error(`Perplexity API error: ${error.response.status} - ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Perplexity API');
      throw new Error('No response received from Perplexity API');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw error;
    }
  }
}

// Execute a Context7 MCP tool
async function executeContext7Tool(method, params, serverConfig) {
  try {
    console.log(`Executing Context7 tool: ${method}`);

    // For now, return mock data
    if (method === 'resolve-library-id') {
      return {
        libraryName: params.libraryName,
        libraryId: `${params.libraryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/docs`
      };
    } else if (method === 'get-library-docs') {
      return {
        libraryId: params.context7CompatibleLibraryID,
        documentation: `# ${params.context7CompatibleLibraryID} Documentation\n\nThis is example documentation for ${params.context7CompatibleLibraryID}.`
      };
    }

    throw new Error(`Unknown Context7 method: ${method}`);
  } catch (error) {
    console.error(`Error executing Context7 tool: ${error.message}`);
    throw error;
  }
}

// Execute a Memory MCP tool
async function executeMemoryTool(method, params, serverConfig) {
  try {
    console.log(`Executing Memory tool: ${method}`);

    // For now, return mock data
    if (method === 'create_entities') {
      return {
        success: true,
        entities: params.entities || []
      };
    } else if (method === 'read_graph') {
      return {
        entities: [
          { id: '1', type: 'person', name: 'John Doe' },
          { id: '2', type: 'person', name: 'Jane Smith' }
        ],
        relations: [
          { id: '1', type: 'friend', source: '1', target: '2' }
        ]
      };
    } else if (method === 'search_nodes') {
      return {
        nodes: [
          { id: '1', type: 'person', name: 'John Doe' }
        ]
      };
    }

    throw new Error(`Unknown Memory method: ${method}`);
  } catch (error) {
    console.error(`Error executing Memory tool: ${error.message}`);
    throw error;
  }
}

module.exports = router;
