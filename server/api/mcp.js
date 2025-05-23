/**
 * MCP Tools API
 * Provides endpoints for interacting with Model Context Protocol (MCP) tools
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
// const { spawn } = require('child_process');
const axios = require('axios');

// Get MCP configuration
router.get('/config', async (req, res) => {
  try {
    // Check if we're running in Docker
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';

    // If we're in Docker, return empty MCP configuration
    if (isDocker) {
      console.log('Running in Docker environment, MCP servers not available');
      return res.json({
        mcpServers: {}
      });
    }

    // For local development, try to find user's MCP configuration
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

    // Check if we're running in Docker
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';

    let mcpConfig = {};

    // If we're in Docker, use default configuration
    if (isDocker) {
      console.log('Running in Docker environment, using default MCP configuration for execution');
      mcpConfig = {
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
      };
    } else {
      // For local development, try to find user's MCP configuration
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
        mcpConfig = JSON.parse(configData);
      }
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
    const serverConfig = {...mcpConfig.mcpServers[server]};

    // Add environment variables if provided
    if (env) {
      serverConfig.env = {...(serverConfig.env || {}), ...env};
    }
    
    console.log(`Executing MCP tool with config:`, {
      server,
      method,
      hasEnv: !!serverConfig.env,
      hasApiKey: !!(serverConfig.env?.PERPLEXITY_API_KEY)
    });

    // Execute the MCP tool
    const result = await executeMCPTool(server, method, params, serverConfig);

    // Return the result
    return res.json({ result });
  } catch (error) {
    console.error('Error executing MCP tool:', error);
    console.error('Full error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to execute MCP tool',
      details: error.message,
      server: req.body.server,
      method: req.body.method
    });
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

    // No mock implementations - throw error for unconfigured servers
    throw new Error(`MCP server ${server} not configured or method ${method} not available in Docker environment`);
  } catch (error) {
    console.error(`Error executing MCP tool: ${error.message}`);
    throw error;
  }
}

// Execute a Perplexity MCP tool
async function executePerplexityTool(method, params, serverConfig) {
  try {
    console.log(`Executing Perplexity tool: ${method}`);
    console.log('Server config:', JSON.stringify(serverConfig, null, 2));

    // Check if we have the necessary configuration
    let apiKey = serverConfig.env?.PERPLEXITY_API_KEY;
    
    // If not in env, check if it's in the server config directly
    if (!apiKey && serverConfig.PERPLEXITY_API_KEY) {
      apiKey = serverConfig.PERPLEXITY_API_KEY;
    }
    
    // If still no API key, check environment variables
    if (!apiKey) {
      apiKey = process.env.PERPLEXITY_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('Perplexity API key not configured. Please set PERPLEXITY_API_KEY in environment or pass it in the request.');
    }

    // For the search method, use Perplexity's chat completions API
    if (method === 'search') {
      console.log('Using Perplexity chat completions for search...');
      
      const searchQuery = params.query || params.q || params.search;
      if (!searchQuery) {
        throw new Error('No search query provided');
      }
      
      const payload = {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful search assistant. Provide accurate, up-to-date information based on web search results.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      };
      
      console.log('Perplexity search payload:', JSON.stringify(payload));
      
      const response = await axios.post('https://api.perplexity.ai/chat/completions', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.data && response.data.choices && response.data.choices[0]) {
        return {
          result: response.data.choices[0].message.content,
          sources: response.data.citations || []
        };
      }
      
      throw new Error('Invalid response from Perplexity API');
    }
    
    // For other methods, try the standard MCP approach (though it may not work)
    const payload = {
      jsonrpc: '2.0',
      method: 'CallTool',
      params: {
        name: method,
        arguments: params
      },
      id: 1
    };

    console.log('Perplexity MCP payload:', JSON.stringify(payload));

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
      
      // Check for specific error types
      if (error.response.status === 401) {
        throw new Error('Perplexity API key is invalid or not authorized');
      } else if (error.response.status === 429) {
        throw new Error('Perplexity API rate limit exceeded');
      } else {
        throw new Error(`Perplexity API error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      }
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
async function executeContext7Tool(method, params, _serverConfig) {
  // No implementation in Docker - real MCP server required
  throw new Error(`Context7 MCP server not available in Docker environment. Method ${method} cannot be executed.`);
}

// Execute a Memory MCP tool
async function executeMemoryTool(method, params, _serverConfig) {
  // No implementation in Docker - real MCP server required
  throw new Error(`Memory MCP server not available in Docker environment. Method ${method} cannot be executed.`);
}

// Execute a tool endpoint
router.post('/tools/:server/:method', async (req, res) => {
  try {
    const { server, method } = req.params;
    const { params = {} } = req.body;
    
    console.log(`Executing MCP tool: ${server}/${method}`);
    console.log('Parameters:', params);
    
    // Get server configuration
    const serverConfig = await getMCPConfig();
    
    // Handle both server-based and direct tool names
    let actualServer = server;
    let actualMethod = method;
    
    // Check if this is a direct tool name (e.g., web_search, perplexity_search)
    if (server === 'mcp' || server === 'tool') {
      // Direct tool call - find which server provides this tool
      for (const [serverName, serverInfo] of Object.entries(serverConfig.mcpServers)) {
        if (serverInfo.tools) {
          const tool = serverInfo.tools.find(t => t.name === method);
          if (tool) {
            actualServer = serverName;
            actualMethod = method;
            break;
          }
        }
      }
    }
    
    
    const serverInfo = serverConfig.mcpServers[actualServer];
    
    if (!serverInfo || serverInfo.disabled) {
      return res.status(404).json({ error: 'Server not found or disabled' });
    }
    
    // Execute the tool based on the server
    const result = await executeMCPTool(actualServer, actualMethod, params, serverConfig);
    
    res.json(result);
  } catch (error) {
    console.error('Error executing MCP tool:', error);
    res.status(500).json({ error: error.message || 'Tool execution failed' });
  }
});

module.exports = router;
