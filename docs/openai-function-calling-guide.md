# OpenAI Function Calling: Technical Guide

## Introduction

Function calling is a capability that allows language models to generate structured function calls, enabling them to integrate with external tools, APIs, and services. This guide explains how to implement function calling with OpenAI's API in the context of agent nodes.

## How Function Calling Works

1. **Define Functions**: You define functions with their parameters in a structured format.
2. **Send to API**: You send these function definitions along with your prompt to the API.
3. **Model Decides**: The model decides whether to call a function based on the user's input.
4. **Execute Function**: You execute the function call with the parameters provided by the model.
5. **Return Results**: You send the function results back to the model for further processing.

## Function Definition Format

Functions are defined using a JSON schema format:

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get the current weather in a given location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "The city and state, e.g. San Francisco, CA"
        },
        "unit": {
          "type": "string",
          "enum": ["celsius", "fahrenheit"],
          "description": "The temperature unit to use"
        }
      },
      "required": ["location"]
    }
  }
}
```

Key components:
- **name**: A unique identifier for the function
- **description**: Explains what the function does
- **parameters**: Defines the inputs the function expects
  - **type**: The data type of the parameter
  - **properties**: The individual parameters
  - **required**: Which parameters must be provided

## API Request Format

When making a request to the OpenAI API, include the functions in the `tools` parameter:

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What's the weather like in San Francisco?' }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA'
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The temperature unit to use'
              }
            },
            required: ['location']
          }
        }
      }
    ]
  })
});
```

## API Response Format

When the model decides to call a function, the response will include a `tool_calls` array:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "gpt-4o",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "get_weather",
            "arguments": "{\"location\":\"San Francisco, CA\",\"unit\":\"celsius\"}"
          }
        }
      ]
    },
    "finish_reason": "tool_calls"
  }]
}
```

Key components:
- **tool_calls**: An array of function calls the model wants to make
  - **id**: A unique identifier for the function call
  - **type**: The type of tool call (currently only "function")
  - **function**: Contains the function name and arguments
    - **name**: The name of the function to call
    - **arguments**: A JSON string containing the function arguments

## Handling Function Calls

After receiving a function call from the model, you need to:

1. Parse the function arguments
2. Execute the function with those arguments
3. Send the result back to the model

```javascript
// Parse the function call
const toolCalls = response.choices[0].message.tool_calls;
const functionCall = toolCalls[0];
const functionName = functionCall.function.name;
const functionArgs = JSON.parse(functionCall.function.arguments);

// Execute the function
const functionResult = await executeFunctionByName(functionName, functionArgs);

// Send the result back to the model
const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What's the weather like in San Francisco?' },
      { 
        role: 'assistant', 
        content: null,
        tool_calls: [functionCall]
      },
      {
        role: 'tool',
        tool_call_id: functionCall.id,
        content: JSON.stringify(functionResult)
      }
    ],
    tools: [...] // Same tools as before
  })
});
```

## Multiple Function Calls

The model can make multiple function calls in a single response. Handle each one separately:

```javascript
// Process each tool call
for (const toolCall of toolCalls) {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  
  // Execute the function
  const functionResult = await executeFunctionByName(functionName, functionArgs);
  
  // Add the result to the messages
  messages.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content: JSON.stringify(functionResult)
  });
}
```

## Parallel vs. Sequential Function Calls

OpenAI supports both parallel and sequential function calling:

### Parallel Function Calls

When the model needs to call multiple functions that don't depend on each other:

```json
{
  "tool_calls": [
    {
      "id": "call_abc123",
      "function": {
        "name": "get_weather",
        "arguments": "{\"location\":\"San Francisco, CA\"}"
      }
    },
    {
      "id": "call_def456",
      "function": {
        "name": "get_time",
        "arguments": "{\"location\":\"San Francisco, CA\"}"
      }
    }
  ]
}
```

### Sequential Function Calls

When function calls depend on previous results, the model will make them sequentially:

1. First call: Get weather in San Francisco
2. Process result
3. Second call: Based on weather, recommend activities

## Best Practices

### 1. Clear Function Descriptions

Provide detailed descriptions for functions and parameters:

```json
{
  "name": "search_database",
  "description": "Search a database of products by various criteria including name, category, price range, and availability",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query, e.g., 'red shoes', 'coffee maker'"
      },
      "category": {
        "type": "string",
        "description": "Product category to filter by, e.g., 'electronics', 'clothing'"
      },
      "min_price": {
        "type": "number",
        "description": "Minimum price in dollars (inclusive)"
      },
      "max_price": {
        "type": "number",
        "description": "Maximum price in dollars (inclusive)"
      },
      "in_stock_only": {
        "type": "boolean",
        "description": "If true, only return products that are in stock"
      }
    },
    "required": ["query"]
  }
}
```

### 2. Parameter Validation

Always validate parameters before executing functions:

```javascript
function validateParameters(params, schema) {
  // Check required parameters
  for (const required of schema.required || []) {
    if (params[required] === undefined) {
      throw new Error(`Missing required parameter: ${required}`);
    }
  }
  
  // Validate parameter types
  for (const [key, value] of Object.entries(params)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      throw new Error(`Unknown parameter: ${key}`);
    }
    
    // Type checking
    if (propSchema.type === 'string' && typeof value !== 'string') {
      throw new Error(`Parameter ${key} must be a string`);
    }
    if (propSchema.type === 'number' && typeof value !== 'number') {
      throw new Error(`Parameter ${key} must be a number`);
    }
    if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error(`Parameter ${key} must be a boolean`);
    }
    
    // Enum validation
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      throw new Error(`Parameter ${key} must be one of: ${propSchema.enum.join(', ')}`);
    }
  }
  
  return true;
}
```

### 3. Error Handling

Provide informative error messages when functions fail:

```javascript
try {
  const result = await executeFunctionByName(functionName, functionArgs);
  return result;
} catch (error) {
  return {
    error: true,
    message: `Error executing ${functionName}: ${error.message}`,
    suggestion: "Try with different parameters or a different approach."
  };
}
```

### 4. Function Result Formatting

Format function results consistently:

```javascript
// Good: Structured, consistent format
return {
  status: "success",
  data: {
    temperature: 22.5,
    conditions: "Partly cloudy",
    humidity: 65,
    wind: {
      speed: 10,
      direction: "NW"
    }
  },
  units: {
    temperature: "celsius",
    wind_speed: "km/h"
  }
};

// Bad: Inconsistent, unstructured
return "It's 22.5°C and partly cloudy with 65% humidity.";
```

## Implementation in Agent Nodes

To implement function calling in agent nodes:

1. **Collect Available Tools**: Gather all tools from `AgentTools` and `MCPTools`
2. **Convert to Function Format**: Transform tool definitions into OpenAI function format
3. **Make API Request**: Include functions in the API request
4. **Process Function Calls**: Execute the functions and return results
5. **Handle Follow-up**: Send function results back to the model for further processing

Example implementation:

```javascript
// Get available tools
const availableTools = [];
if (window.AgentTools && typeof AgentTools.getAllTools === 'function') {
  availableTools.push(...AgentTools.getAllTools());
}
if (node.useMCPTools && window.MCPTools && typeof MCPTools.getAllTools === 'function') {
  availableTools.push(...MCPTools.getAllTools());
}

// Convert tools to OpenAI format
const toolsForAPI = availableTools.map(tool => ({
  type: 'function',
  function: {
    name: tool.id,
    description: tool.description,
    parameters: getToolParameters(tool)
  }
}));

// Make API request
const response = await fetch('/api/openai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: node.systemPrompt },
      { role: 'user', content: input }
    ],
    tools: toolsForAPI
  })
});

// Process function calls
const data = await response.json();
const message = data.choices[0].message;

if (message.tool_calls && message.tool_calls.length > 0) {
  // Process tool calls and continue the conversation
  // ...
}
```

## Conclusion

Function calling is a powerful capability that enables AI agents to interact with external systems and tools. By properly implementing function calling in agent nodes, you can create truly agentic systems that can reason, plan, and act in the world.
