/**
 * MCP Tools Integration
 * Implements integration with Model Context Protocol (MCP) tools
 */

const MCPTools = {
  // Available MCP servers and tools
  servers: {},
  tools: [],

  // Initialize MCP tools
  async init() {
    try {
      DebugManager.addLog('Initializing MCP tools...', 'info');

      // Load MCP configuration
      await this.loadMCPConfig();

      // Register MCP tools with agent tools
      this.registerWithAgentTools();

      DebugManager.addLog(`MCP tools initialized with ${this.tools.length} tools from ${Object.keys(this.servers).length} servers`, 'success');
    } catch (error) {
      DebugManager.addLog(`Error initializing MCP tools: ${error.message}`, 'error');
      console.error('Error initializing MCP tools:', error);
    }
  },

  // Load MCP configuration
  async loadMCPConfig() {
    try {
      // Fetch MCP configuration from the server
      const response = await fetch('/api/mcp/config');

      if (!response.ok) {
        console.error(`Failed to load MCP configuration: ${response.statusText}`);
        DebugManager.addLog(`Failed to load MCP configuration: ${response.statusText}. Using fallback configuration.`, 'error');
        // Use fallback configuration if the server request fails
        this.useFallbackConfig();
        return;
      }

      const config = await response.json();

      // Store server configurations
      this.servers = config.mcpServers || {};

      // If no servers are configured, use fallback
      if (Object.keys(this.servers).length === 0) {
        console.warn('No MCP servers configured, using fallback configuration');
        DebugManager.addLog('No MCP servers configured, using fallback configuration', 'warning');
        this.useFallbackConfig();
        return;
      }

      // Parse tools from each server
      this.tools = [];

      for (const [serverId, serverConfig] of Object.entries(this.servers)) {
        // Skip disabled servers
        if (serverConfig.disabled) {
          continue;
        }

        // Add tools from this server
        const serverTools = await this.getServerTools(serverId, serverConfig);
        this.tools.push(...serverTools);
      }

      // If no tools were found, use fallback
      if (this.tools.length === 0) {
        console.warn('No MCP tools found, using fallback configuration');
        DebugManager.addLog('No MCP tools found, using fallback configuration', 'warning');
        this.useFallbackConfig();
      }

      DebugManager.addLog(`Loaded ${this.tools.length} MCP tools from ${Object.keys(this.servers).length} servers`, 'info');
    } catch (error) {
      DebugManager.addLog(`Error loading MCP configuration: ${error.message}`, 'error');
      console.error('Error loading MCP configuration:', error);

      // Use fallback configuration for development
      this.useFallbackConfig();
    }
  },

  // Use fallback configuration for development
  useFallbackConfig() {
    DebugManager.addLog('Using fallback MCP configuration', 'warning');

    // Define fallback servers
    this.servers = {
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
    };

    // Define fallback tools
    this.tools = [
      {
        id: 'mcp-memory-create-entities',
        name: 'Create Memory Entities',
        description: 'Create entities in the memory graph',
        category: 'mcp-memory',
        server: 'github.com/modelcontextprotocol/servers/tree/main/src/memory',
        method: 'create_entities',
        autoApprove: true
      },
      {
        id: 'mcp-memory-read-graph',
        name: 'Read Memory Graph',
        description: 'Read the memory graph',
        category: 'mcp-memory',
        server: 'github.com/modelcontextprotocol/servers/tree/main/src/memory',
        method: 'read_graph',
        autoApprove: true
      },
      {
        id: 'mcp-perplexity-search',
        name: 'Perplexity Search',
        description: 'Search the web using Perplexity',
        category: 'mcp-search',
        server: 'github.com.pashpashpash/perplexity-mcp',
        method: 'search',
        autoApprove: true
      },
      {
        id: 'mcp-context7-docs',
        name: 'Context7 Documentation',
        description: 'Get documentation for libraries and frameworks',
        category: 'mcp-documentation',
        server: 'github.com/upstash/context7-mcp',
        method: 'get-library-docs',
        autoApprove: false
      }
    ];
  },

  // Get tools from a server
  async getServerTools(serverId, serverConfig) {
    // In a real implementation, we would query the server for its available tools
    // For now, we'll use a simplified approach based on the server ID

    const autoApprove = serverConfig.autoApprove || [];
    const serverTools = [];

    if (serverId.includes('memory')) {
      // Memory server tools
      serverTools.push(
        {
          id: 'mcp-memory-create-entities',
          name: 'Create Memory Entities',
          description: 'Create entities in the memory graph',
          category: 'mcp-memory',
          server: serverId,
          method: 'create_entities',
          autoApprove: autoApprove.includes('create_entities')
        },
        {
          id: 'mcp-memory-read-graph',
          name: 'Read Memory Graph',
          description: 'Read the memory graph',
          category: 'mcp-memory',
          server: serverId,
          method: 'read_graph',
          autoApprove: autoApprove.includes('read_graph')
        },
        {
          id: 'mcp-memory-search-nodes',
          name: 'Search Memory Nodes',
          description: 'Search for nodes in the memory graph',
          category: 'mcp-memory',
          server: serverId,
          method: 'search_nodes',
          autoApprove: autoApprove.includes('search_nodes')
        }
      );
    } else if (serverId.includes('perplexity')) {
      // Perplexity server tools
      serverTools.push(
        {
          id: 'mcp-perplexity-search',
          name: 'Perplexity Search',
          description: 'Search the web using Perplexity',
          category: 'mcp-search',
          server: serverId,
          method: 'search',
          autoApprove: autoApprove.includes('search')
        },
        {
          id: 'mcp-perplexity-get-documentation',
          name: 'Get Documentation',
          description: 'Get documentation for a specific technology or API',
          category: 'mcp-documentation',
          server: serverId,
          method: 'get_documentation',
          autoApprove: autoApprove.includes('get_documentation')
        }
      );
    } else if (serverId.includes('context7')) {
      // Context7 server tools
      serverTools.push(
        {
          id: 'mcp-context7-resolve-library',
          name: 'Resolve Library ID',
          description: 'Resolve a library name to a Context7-compatible library ID',
          category: 'mcp-documentation',
          server: serverId,
          method: 'resolve-library-id',
          autoApprove: autoApprove.includes('resolve-library-id')
        },
        {
          id: 'mcp-context7-get-docs',
          name: 'Get Library Documentation',
          description: 'Get documentation for a library',
          category: 'mcp-documentation',
          server: serverId,
          method: 'get-library-docs',
          autoApprove: autoApprove.includes('get-library-docs')
        }
      );
    }

    return serverTools;
  },

  // Register MCP tools with agent tools
  registerWithAgentTools() {
    if (!window.AgentTools) {
      DebugManager.addLog('AgentTools not available, cannot register MCP tools', 'error');
      return;
    }

    // Add MCP categories to AgentTools
    AgentTools.categories.MCP_MEMORY = 'mcp-memory';
    AgentTools.categories.MCP_SEARCH = 'mcp-search';
    AgentTools.categories.MCP_DOCUMENTATION = 'mcp-documentation';

    // Add MCP tools to AgentTools
    for (const tool of this.tools) {
      // Create an execute function for this tool
      const executeFn = async (params, node) => {
        return await this.executeMCPTool(tool.id, params, node);
      };

      // Add the tool to AgentTools
      AgentTools.tools.push({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        execute: executeFn,
        mcpTool: true,
        mcpServer: tool.server,
        mcpMethod: tool.method,
        autoApprove: tool.autoApprove
      });
    }

    DebugManager.addLog(`Registered ${this.tools.length} MCP tools with AgentTools`, 'success');
  },

  // Execute an MCP tool
  async executeMCPTool(toolId, params, node) {
    try {
      // Find the tool
      const tool = this.tools.find(t => t.id === toolId);
      if (!tool) {
        throw new Error(`MCP tool with ID ${toolId} not found`);
      }

      // Log the execution if we have a logger
      if (node && window.AgentLogger) {
        AgentLogger.addLog(node, `Executing MCP tool "${tool.name}" (ID: ${tool.id})`, 'info');
      } else {
        DebugManager.addLog(`Executing MCP tool "${tool.name}" (ID: ${tool.id})`, 'info');
      }

      // Get the server configuration
      const serverConfig = this.servers[tool.server];
      if (!serverConfig) {
        throw new Error(`MCP server "${tool.server}" not found in configuration`);
      }

      // Check if we need to add any environment variables
      const env = {};

      // Add Perplexity API key if this is a Perplexity tool
      if (tool.server.includes('perplexity')) {
        // Try to get the Perplexity API key from localStorage
        const perplexityConfig = JSON.parse(localStorage.getItem('perplexity_config') || '{}');
        if (perplexityConfig.apiKey) {
          env.PERPLEXITY_API_KEY = perplexityConfig.apiKey;
        } else {
          // Check if we have a default API key in the .env file
          const defaultKey = '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';
          env.PERPLEXITY_API_KEY = defaultKey;

          // Log a warning
          if (node && window.AgentLogger) {
            AgentLogger.addLog(node, 'Using default Perplexity API key. For better results, configure your own key in the settings.', 'warning');
          } else {
            DebugManager.addLog('Using default Perplexity API key. For better results, configure your own key in the settings.', 'warning');
          }
        }
      }

      // Prepare the request payload
      const requestPayload = {
        server: tool.server,
        method: tool.method,
        params,
        autoApprove: tool.autoApprove,
        env
      };

      // Store the request payload in the node for logging
      if (node) {
        node.lastRequestPayload = JSON.parse(JSON.stringify(requestPayload));
        node.lastRequestTime = new Date().toISOString();
      }

      // Call the MCP API
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`MCP API request failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // Store the response payload in the node for logging
      if (node) {
        node.lastResponsePayload = JSON.parse(JSON.stringify(data));
        node.lastResponseTime = new Date().toISOString();

        // Log the API call if we have a logger
        if (window.AgentLogger) {
          AgentLogger.addApiLog(node, requestPayload, data);
        }
      }

      // Store the result in the node's memory
      if (node && node.memory) {
        AgentMemory.store(node, `mcp_result_${tool.id}`, data.result);
        AgentMemory.addToHistory(node, {
          tool: tool.id,
          params,
          server: tool.server,
          method: tool.method
        }, data.result);
      }

      // Log the success
      if (node && window.AgentLogger) {
        AgentLogger.addLog(node, `MCP tool "${tool.name}" executed successfully`, 'success');
      } else {
        DebugManager.addLog(`MCP tool "${tool.name}" executed successfully`, 'success');
      }

      return data.result;
    } catch (error) {
      // Log the error
      if (node && window.AgentLogger) {
        AgentLogger.addLog(node, `Error executing MCP tool: ${error.message}`, 'error');
      } else {
        DebugManager.addLog(`Error executing MCP tool: ${error.message}`, 'error');
      }

      throw error;
    }
  },

  // Get all available MCP tools
  getAllTools() {
    return this.tools;
  },

  // Get MCP tools by category
  getToolsByCategory(category) {
    return this.tools.filter(tool => tool.category === category);
  },

  // Get an MCP tool by ID
  getToolById(id) {
    return this.tools.find(tool => tool.id === id);
  }
};

// Initialize MCP tools when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize with a slight delay to ensure all other components are loaded
  setTimeout(() => {
    MCPTools.init();

    // Make sure the MCPTools object is available globally
    if (typeof window !== 'undefined') {
      window.MCPTools = MCPTools;
    }
  }, 1000);
});

// Export the MCPTools object
window.MCPTools = MCPTools;
