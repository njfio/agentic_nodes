/**
 * Agent Tools
 * Implements tools that can be used by agent nodes
 */

const AgentTools = {
  // Available tool categories
  categories: {
    TEXT_PROCESSING: 'text-processing',
    IMAGE_PROCESSING: 'image-processing',
    OPENAI: 'openai',
    DATA_MANIPULATION: 'data-manipulation',
    EXTERNAL_API: 'external-api',
    WORKFLOW: 'workflow',
    MCP_MEMORY: 'mcp-memory',
    MCP_SEARCH: 'mcp-search',
    MCP_DOCUMENTATION: 'mcp-documentation'
  },

  // Available tools
  tools: [
    {
      id: 'text-summarize',
      name: 'Summarize Text',
      description: 'Summarize the input text to a shorter version',
      category: 'text-processing',
      async execute(params, node) {
        const { text, maxLength } = params;
        if (!text) {
          throw new Error('No text provided for summarization');
        }

        // Use the OpenAI API to summarize the text
        const config = ApiService.openai.getConfig();
        if (!config.apiKey) {
          throw new Error('OpenAI API key not configured');
        }

        try {
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify({
              model: config.model || 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: `Summarize the following text${maxLength ? ` to approximately ${maxLength} words` : ''}. Maintain the key points and main ideas.`
                },
                { role: 'user', content: text }
              ],
              temperature: 0.7,
              max_tokens: config.maxTokens || 2000
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          DebugManager.addLog(`Error summarizing text: ${error.message}`, 'error');
          throw error;
        }
      }
    },
    {
      id: 'text-extract-entities',
      name: 'Extract Entities',
      description: 'Extract named entities (people, places, organizations, etc.) from text',
      category: 'text-processing',
      async execute(params, node) {
        const { text } = params;
        if (!text) {
          throw new Error('No text provided for entity extraction');
        }

        // Use the OpenAI API to extract entities
        const config = ApiService.openai.getConfig();
        if (!config.apiKey) {
          throw new Error('OpenAI API key not configured');
        }

        try {
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify({
              model: config.model || 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'Extract named entities from the following text. Return the results as a JSON object with categories for people, places, organizations, dates, and other notable entities. Format the response as valid JSON only.'
                },
                { role: 'user', content: text }
              ],
              temperature: 0.3,
              max_tokens: config.maxTokens || 2000
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          DebugManager.addLog(`Error extracting entities: ${error.message}`, 'error');
          throw error;
        }
      }
    },
    {
      id: 'image-analyze',
      name: 'Analyze Image',
      description: 'Analyze and describe the content of an image',
      category: 'image-processing',
      async execute(params, node) {
        const { imageUrl } = params;
        if (!imageUrl) {
          throw new Error('No image URL provided for analysis');
        }

        // Use the OpenAI API to analyze the image
        const config = ApiService.openai.getConfig();
        if (!config.apiKey) {
          throw new Error('OpenAI API key not configured');
        }

        try {
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openai-api-key': config.apiKey
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'Describe this image in detail.' },
                    {
                      type: 'image_url',
                      image_url: {
                        url: imageUrl
                      }
                    }
                  ]
                }
              ],
              max_tokens: config.maxTokens || 2000
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          DebugManager.addLog(`Error analyzing image: ${error.message}`, 'error');
          throw error;
        }
      }
    },
    {
      id: 'data-parse-json',
      name: 'Parse JSON',
      description: 'Parse a JSON string into a structured object',
      category: 'data-manipulation',
      async execute(params, node) {
        const { jsonString } = params;
        if (!jsonString) {
          throw new Error('No JSON string provided for parsing');
        }

        try {
          const parsed = JSON.parse(jsonString);
          return JSON.stringify(parsed, null, 2);
        } catch (error) {
          DebugManager.addLog(`Error parsing JSON: ${error.message}`, 'error');
          throw new Error(`Invalid JSON: ${error.message}`);
        }
      }
    },
    {
      id: 'workflow-get-node-content',
      name: 'Get Node Content',
      description: 'Get the content of another node in the workflow',
      category: 'workflow',
      async execute(params, node) {
        const { nodeId } = params;
        if (!nodeId) {
          throw new Error('No node ID provided');
        }

        // Find the node by ID
        const targetNode = App.nodes.find(n => n.id === parseInt(nodeId, 10));
        if (!targetNode) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }

        return targetNode.content || '';
      }
    },
    // MCP Search tool
    {
      id: 'search_perplexity-server',
      name: 'Search with Perplexity',
      description: 'Perform a general search query to get comprehensive information on any topic',
      category: 'mcp-search',
      async execute(params, node) {
        const { query, detail_level } = params;
        if (!query) {
          throw new Error('No search query provided');
        }

        try {
          // Log the search query
          DebugManager.addLog(`Searching for: ${query}`, 'info');

          // Call the MCP API endpoint
          const response = await fetch('/api/mcp/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tool: 'search_perplexity-server',
              params: {
                query,
                detail_level: detail_level || 'normal'
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`MCP API request failed: ${errorData.error || 'Unknown error'}`);
          }

          const data = await response.json();
          return data.result;
        } catch (error) {
          DebugManager.addLog(`Error searching with Perplexity: ${error.message}`, 'error');
          throw error;
        }
      }
    },
    // MCP Documentation tool
    {
      id: 'get_documentation_perplexity-server',
      name: 'Get Documentation',
      description: 'Get documentation and usage examples for a specific technology, library, or API',
      category: 'mcp-documentation',
      async execute(params, node) {
        const { query, context } = params;
        if (!query) {
          throw new Error('No query provided for documentation');
        }

        try {
          // Log the documentation query
          DebugManager.addLog(`Getting documentation for: ${query}`, 'info');

          // Call the MCP API endpoint
          const response = await fetch('/api/mcp/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tool: 'get_documentation_perplexity-server',
              params: {
                query,
                context: context || ''
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`MCP API request failed: ${errorData.error || 'Unknown error'}`);
          }

          const data = await response.json();
          return data.result;
        } catch (error) {
          DebugManager.addLog(`Error getting documentation: ${error.message}`, 'error');
          throw error;
        }
      }
    },
    // MCP Chat tool
    {
      id: 'chat_perplexity_perplexity-server',
      name: 'Chat with Perplexity',
      description: 'Maintains ongoing conversations with Perplexity AI. Creates new chats or continues existing ones with full history context.',
      category: 'mcp-search',
      async execute(params, node) {
        const { message, chat_id } = params;
        if (!message) {
          throw new Error('No message provided for chat');
        }

        try {
          // Log the chat message
          DebugManager.addLog(`Sending chat message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'info');

          // Call the MCP API endpoint
          const response = await fetch('/api/mcp/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tool: 'chat_perplexity_perplexity-server',
              params: {
                message,
                chat_id: chat_id || undefined
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`MCP API request failed: ${errorData.error || 'Unknown error'}`);
          }

          const data = await response.json();

          // Store the chat ID for future use
          if (node && data.chat_id) {
            node.chatId = data.chat_id;
          }

          return data.result;
        } catch (error) {
          DebugManager.addLog(`Error chatting with Perplexity: ${error.message}`, 'error');
          throw error;
        }
      }
    }
    },
    // OpenAI Browser Search tool
    {
      id: 'browser.search',
      name: 'OpenAI Browser Search',
      description: "Use OpenAI's built-in browser tool to search the web",
      category: 'openai',
      async execute(params) {
        const { query } = params;
        if (!query) {
          throw new Error('No search query provided');
        }
        const response = await fetch('/api/openai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: query }],
            tools: [{ type: 'function', function: { name: 'browser.search', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } }],
            tool_choice: { type: 'function', function: { name: 'browser.search' } }
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI search failed: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }
    },
    // OpenAI Computer tool
    {
      id: 'computer.execute',
      name: 'OpenAI Computer',
      description: "Execute commands using OpenAI's computer tool",
      category: 'openai',
      async execute(params) {
        const { command } = params;
        if (!command) {
          throw new Error('No command provided');
        }
        const response = await fetch('/api/openai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: command }],
            tools: [{ type: 'function', function: { name: 'computer.execute', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } }],
            tool_choice: { type: 'function', function: { name: 'computer.execute' } }
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI computer failed: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }
    }
  ],

  // Get all available tools
  getAllTools() {
    return this.tools;
  },

  // Get tools by category
  getToolsByCategory(category) {
    return this.tools.filter(tool => tool.category === category);
  },

  // Get a tool by ID
  getToolById(id) {
    return this.tools.find(tool => tool.id === id);
  },

  // Execute a tool
  async executeTool(toolId, params, node) {
    const tool = this.getToolById(toolId);
    if (!tool) {
      throw new Error(`Tool with ID ${toolId} not found`);
    }

    try {
      DebugManager.addLog(`Executing tool "${tool.name}" (ID: ${tool.id})`, 'info');
      const result = await tool.execute(params, node);
      DebugManager.addLog(`Tool "${tool.name}" executed successfully`, 'success');
      return result;
    } catch (error) {
      DebugManager.addLog(`Error executing tool "${tool.name}": ${error.message}`, 'error');
      throw error;
    }
  }
};

// Export the AgentTools object
window.AgentTools = AgentTools;
