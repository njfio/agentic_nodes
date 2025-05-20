# Agent Nodes Implementation

## Overview

Agent nodes are a special type of node in the workflow editor that can use tools, reason through complex problems, and provide more valuable responses to users. This document explains how agent nodes are implemented and how they work.

## Key Components

### 1. Agent Processor

The `AgentProcessor` module is responsible for creating and processing agent nodes. It provides the following key methods:

- `createAgentNode`: Creates a new agent node with default properties
- `createStandaloneAgentNode`: Creates a standalone agent node that's not connected to the App
- `processAgentNode`: Processes an agent node with the given input
- `directProcessNode`: Directly processes an agent node using the OpenAI API
- `processToolCalls`: Processes tool calls from the OpenAI API response
- `performReflection`: Performs reflection on the agent's actions and results

### 2. Agent Tools

The `AgentTools` module provides tools that agent nodes can use to interact with the world. Each tool has:

- `id`: A unique identifier
- `name`: A human-readable name
- `description`: A description of what the tool does
- `category`: The category the tool belongs to
- `execute`: A function that executes the tool with the given parameters

### 3. MCP Tools

The `MCPTools` module provides integration with Model Context Protocol (MCP) tools, which are external tools that can be used by agent nodes. These tools are fetched from MCP servers and registered with the `AgentTools` module.

### 4. Agent Memory

The `AgentMemory` module provides memory management for agent nodes. It allows agent nodes to:

- Store and retrieve values in memory
- Add items to context
- Add actions to history
- Export and import memory

### 5. Agent Logger

The `AgentLogger` module provides logging capabilities for agent nodes. It allows agent nodes to:

- Log inputs and outputs
- Log API calls
- Log errors
- Log custom messages

## Agent Node Properties

Agent nodes have the following properties:

- `id`: A unique identifier
- `type`: The type of node (always 'agent')
- `name`: A human-readable name
- `description`: A description of what the node does
- `systemPrompt`: The system prompt to use when processing the node
- `inputs`: An array of input connections
- `outputs`: An array of output connections
- `position`: The position of the node on the canvas
- `width`: The width of the node
- `height`: The height of the node
- `content`: The content of the node
- `usePlanner`: Whether to use the agent planner
- `useMCPTools`: Whether to use MCP tools
- `apiLogs`: An array of API logs
- `memory`: The node's memory
- `maxIterations`: The maximum number of iterations
- `currentIteration`: The current iteration
- `autoIterate`: Whether to automatically iterate
- `isIterating`: Whether the node is currently iterating
- `enableReflection`: Whether to enable reflection
- `reflectionFrequency`: How often to reflect (every N iterations)
- `reflectionPrompt`: The prompt to use for reflection

## Function Calling

Agent nodes use OpenAI's function calling capability to interact with tools. The process works as follows:

1. The agent node sends a request to the OpenAI API with a list of available tools
2. The API returns a response with tool calls if it decides to use tools
3. The agent node executes the tool calls and sends the results back to the API
4. The API generates a final response based on the tool results

Here's an example of how function calling is implemented:

```javascript
// Convert tools to OpenAI format
const toolsForAPI = availableTools.map(tool => ({
  type: 'function',
  function: {
    name: tool.id,
    description: tool.description,
    parameters: this.getToolParameters(tool)
  }
}));

// Prepare the request payload
const payload = {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: this.getEnhancedSystemPrompt(node) },
    { role: 'user', content: input }
  ],
  tools: toolsForAPI,
  temperature: 0.7,
  max_tokens: 2000
};

// Make the API request
const response = await fetch(apiEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

// Process the response
return await this.processToolCalls(node, data, input, payload.messages);
```

## Reflection

Agent nodes can reflect on their actions and results to improve their problem-solving approach. Reflection works as follows:

1. The agent node processes the input and generates a response
2. If reflection is enabled and it's time to reflect, the agent node performs reflection
3. The reflection result is used to guide the next iteration

Here's an example of how reflection is implemented:

```javascript
// Perform reflection
const reflectionResult = await this.performReflection(
  node, 
  input, 
  node.memory ? node.memory.history || [] : []
);

// Continue to the next iteration
return await this.processAgentNode(node, result, reflectionResult);
```

## Iteration

Agent nodes can iterate multiple times to solve complex problems. Iteration works as follows:

1. The agent node processes the input and generates a response
2. If auto-iteration is enabled and the maximum number of iterations hasn't been reached, the agent node continues to the next iteration
3. The result of the current iteration is used as the input for the next iteration

Here's an example of how iteration is implemented:

```javascript
// Check if we need to continue iterating
if (node.autoIterate && node.isIterating && node.currentIteration < node.maxIterations) {
  // Perform reflection if needed
  const newReflectionResult = await this.performReflection(
    node, 
    input, 
    node.memory ? node.memory.history || [] : []
  );
  
  // Continue to the next iteration
  return await this.processAgentNode(node, result, newReflectionResult);
} else {
  // Mark the agent as done iterating
  node.isIterating = false;
  
  return result;
}
```

## Testing

Agent nodes can be tested using the test files in the `test` directory:

- `agent-node-test.html`: A simple HTML page to test agent nodes
- `agent-node-test.js`: A JavaScript file that creates and processes a test agent node
- `test-server.js`: A simple server to serve the test pages

To run the tests:

1. Start the test server: `cd test && node test-server.js`
2. Open the test page in a browser: `http://localhost:8733`
3. Enter an input and click "Run Test"

## Conclusion

Agent nodes are a powerful feature that allows users to create workflows with autonomous agents that can use tools, reason through complex problems, and provide more valuable responses. By implementing function calling, reflection, and iteration, agent nodes can solve a wide range of problems and provide a more interactive and dynamic experience for users.
