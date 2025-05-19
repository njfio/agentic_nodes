/**
 * Agent Logger
 * Implements comprehensive logging for agent nodes
 */

const AgentLogger = {
  // Initialize the logger for a node
  initLogger(node) {
    if (!node) return;

    // Initialize the log array if it doesn't exist
    if (!node.logs) {
      node.logs = [];
    }

    // Initialize the API logs if they don't exist
    if (!node.apiLogs) {
      node.apiLogs = [];
    }

    return {
      logs: node.logs,
      apiLogs: node.apiLogs
    };
  },

  // Add a log entry
  addLog(node, message, level = 'info') {
    if (!node) return;

    // Initialize the logger if needed
    this.initLogger(node);

    // Create the log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      level
    };

    // Add the log entry to the node's logs
    node.logs.push(logEntry);

    // Always output to the browser console for easier debugging
    console.log(`[Agent ${node.id}] [${level.toUpperCase()}] ${message}`);

    // Also add to the debug manager if available
    if (window.DebugManager && typeof DebugManager.addLog === 'function') {
      DebugManager.addLog(`[Agent ${node.id}] ${message}`, level);
    }

    return logEntry;
  },

  // Add an API log entry
  addApiLog(node, request, response, error = null) {
    if (!node) return;

    // Initialize the logger if needed
    this.initLogger(node);

    // Create the API log entry
    const apiLogEntry = {
      timestamp: new Date().toISOString(),
      request: this.sanitizePayload(request),
      response: this.sanitizePayload(response),
      error: error ? error.message || String(error) : null,
      success: !error
    };

    // Add the API log entry to the node's API logs
    node.apiLogs.push(apiLogEntry);

    // Output the API log entry to the console as well
    const consoleMsg = error ?
      `[Agent ${node.id}] API call failed: ${error.message || String(error)}` :
      `[Agent ${node.id}] API call successful`;
    console.log(consoleMsg);

    // Also add to the debug manager if available
    if (window.DebugManager && typeof DebugManager.addLog === 'function') {
      if (error) {
        DebugManager.addLog(consoleMsg, 'error');
      } else {
        DebugManager.addLog(consoleMsg, 'success');
      }
    }

    return apiLogEntry;
  },

  // Sanitize a payload for logging (remove sensitive data, truncate large content)
  sanitizePayload(payload) {
    if (!payload) return null;

    // Create a deep copy to avoid modifying the original
    let sanitized;
    try {
      sanitized = JSON.parse(JSON.stringify(payload));
    } catch (error) {
      // If the payload can't be stringified, return a simple representation
      return {
        _note: 'Payload could not be stringified',
        _type: typeof payload,
        _toString: String(payload).substring(0, 100) + (String(payload).length > 100 ? '...' : '')
      };
    }

    // Helper function to process nested objects
    const processObject = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      for (const key in obj) {
        // Skip if the property doesn't exist or is inherited
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        const value = obj[key];

        // Handle sensitive fields
        if (
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('auth')
        ) {
          if (typeof value === 'string' && value.length > 0) {
            obj[key] = '********';
          }
        }
        // Handle large string values (like base64 images)
        else if (typeof value === 'string' && value.length > 1000) {
          if (value.startsWith('data:image')) {
            obj[key] = '[BASE64_IMAGE]';
          } else {
            obj[key] = value.substring(0, 100) + ` ... [truncated, total length: ${value.length}]`;
          }
        }
        // Handle arrays
        else if (Array.isArray(value)) {
          // Truncate large arrays
          if (value.length > 10) {
            obj[key] = value.slice(0, 10);
            obj[key].push(`... [truncated, total items: ${value.length}]`);
          }

          // Process each item in the array
          for (const item of obj[key]) {
            if (item && typeof item === 'object') {
              processObject(item);
            }
          }
        }
        // Recursively process nested objects
        else if (value && typeof value === 'object') {
          processObject(value);
        }
      }
    };

    // Process the sanitized payload
    processObject(sanitized);

    return sanitized;
  },

  // Get all logs for a node
  getLogs(node) {
    if (!node) return [];

    // Initialize the logger if needed
    this.initLogger(node);

    return node.logs;
  },

  // Get all API logs for a node
  getApiLogs(node) {
    if (!node) return [];

    // Initialize the logger if needed
    this.initLogger(node);

    return node.apiLogs;
  },

  // Clear all logs for a node
  clearLogs(node) {
    if (!node) return;

    // Initialize the logger if needed
    this.initLogger(node);

    // Clear the logs
    node.logs = [];

    return true;
  },

  // Clear all API logs for a node
  clearApiLogs(node) {
    if (!node) return;

    // Initialize the logger if needed
    this.initLogger(node);

    // Clear the API logs
    node.apiLogs = [];

    return true;
  },

  // Get a formatted log string for display
  getFormattedLogs(node) {
    if (!node) return '';

    // Initialize the logger if needed
    this.initLogger(node);

    // Format the logs
    return node.logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const level = log.level.toUpperCase().padEnd(7);
      return `[${timestamp}] [${level}] ${log.message}`;
    }).join('\n');
  },

  // Get a formatted API log string for display
  getFormattedApiLogs(node) {
    if (!node) return '';

    // Initialize the logger if needed
    this.initLogger(node);

    // Format the API logs
    return node.apiLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const status = log.success ? 'SUCCESS' : 'ERROR';

      // Get model information if available
      let modelInfo = '';
      if (log.request && log.request.model) {
        modelInfo = ` [Model: ${log.request.model}]`;
      }

      // Get function call information if available
      let functionCallInfo = '';
      if (log.response && log.response.choices && log.response.choices[0] && log.response.choices[0].message && log.response.choices[0].message.tool_calls) {
        const toolCalls = log.response.choices[0].message.tool_calls;
        functionCallInfo = ` [Tool Calls: ${toolCalls.length}]`;
      }

      // Get token usage information if available
      let tokenInfo = '';
      if (log.response && log.response.usage) {
        const { prompt_tokens, completion_tokens, total_tokens } = log.response.usage;
        tokenInfo = ` [Tokens: ${prompt_tokens}/${completion_tokens}/${total_tokens}]`;
      }

      // Create a more detailed summary
      const requestSummary = log.request ? this.summarizePayload(log.request) : 'No request data';
      const responseSummary = log.response ? this.summarizePayload(log.response) : 'No response data';

      return `[${timestamp}] [${status}]${modelInfo}${functionCallInfo}${tokenInfo}\nRequest: ${requestSummary}\nResponse: ${responseSummary}\n`;
    }).join('\n');
  },

  // Summarize a payload for display
  summarizePayload(payload) {
    if (!payload) return 'No data';

    try {
      // Check if it's a chat completion request
      if (payload.messages) {
        return `Chat with ${payload.messages.length} messages`;
      }

      // Check if it's a chat completion response
      if (payload.choices && payload.choices[0] && payload.choices[0].message) {
        const message = payload.choices[0].message;

        // Check if there are tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCalls = message.tool_calls.map(tc => tc.function.name).join(', ');
          return `Response with tool calls: ${toolCalls}`;
        }

        // Regular message
        if (message.content) {
          return `"${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`;
        }
      }

      // Default case: stringify and truncate
      const str = JSON.stringify(payload);
      return str.substring(0, 100) + (str.length > 100 ? '...' : '');
    } catch (error) {
      return `Error summarizing payload: ${error.message}`;
    }
  }
};

// Export the AgentLogger object
window.AgentLogger = AgentLogger;
