# Agent Nodes Implementation Plan

## Current Issues

Based on the codebase analysis, the agent nodes are not functioning as true agents because:

1. **Missing Function Calling**: The OpenAI API requests don't include the proper `tools` parameter and don't handle tool calls correctly.

2. **Incomplete Tool Integration**: Tools are defined but not properly passed to the API.

3. **No Tool Execution Loop**: The agent doesn't properly iterate through multiple steps of reasoning and tool use.

4. **Insufficient System Instructions**: The system prompt doesn't provide enough guidance on tool use.

5. **Unused Reflection Capability**: The reflection capability is defined but not properly implemented.

## Implementation Plan

### Phase 1: Fix API Integration

#### 1.1 Update `agent-processor.js` - Direct Processing Method

The `directProcessNode` method needs to be updated to include tools in the API request:

```javascript
directProcessNode: async function(node, input) {
  try {
    console.log(`Direct processing agent node ${node.id} with input:`, input);

    // Get available tools
    const availableTools = [];
    
    // Add built-in tools
    if (window.AgentTools && typeof AgentTools.getAllTools === 'function') {
      availableTools.push(...AgentTools.getAllTools());
    }
    
    // Add MCP tools if enabled
    if (node.useMCPTools && window.MCPTools && typeof MCPTools.getAllTools === 'function') {
      availableTools.push(...MCPTools.getAllTools());
    }
    
    // Convert tools to OpenAI format
    const toolsForAPI = availableTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.id,
        description: tool.description,
        parameters: this.getToolParameters(tool)
      }
    }));

    // Get the API endpoint
    const apiEndpoint = '/api/openai/chat';

    // Prepare the request payload
    const payload = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: node.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: input }
      ],
      tools: toolsForAPI,
      temperature: 0.7,
      max_tokens: 2000
    };

    // Log the request payload
    node.lastRequestPayload = payload;

    // Add to API logs
    if (!node.apiLogs) {
      node.apiLogs = [];
    }

    const apiLog = {
      timestamp: new Date().toISOString(),
      request: payload,
      response: null
    };

    node.apiLogs.push(apiLog);

    // Make the API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Log the response
    node.lastResponsePayload = data;

    // Update the API log
    apiLog.response = data;

    // Process the response
    return await this.processToolCalls(node, data, input, payload.messages);
  } catch (error) {
    console.error(`Error in direct processing of agent node ${node.id}:`, error);
    throw error;
  }
}
```

#### 1.2 Add Tool Parameters Helper Method

Add a method to generate parameter schemas for tools:

```javascript
// Helper method to get tool parameters
getToolParameters: function(tool) {
  // Default parameters structure
  const defaultParams = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Input text for the tool'
      }
    },
    required: []
  };
  
  // Tool-specific parameter schemas
  switch (tool.id) {
    case 'text-summarize':
      return {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to summarize'
          },
          maxLength: {
            type: 'integer',
            description: 'Maximum length of the summary in words'
          }
        },
        required: ['text']
      };
    case 'image-analyze':
      return {
        type: 'object',
        properties: {
          imageUrl: {
            type: 'string',
            description: 'URL of the image to analyze'
          }
        },
        required: ['imageUrl']
      };
    case 'search_perplexity-server':
      return {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          },
          detail_level: {
            type: 'string',
            description: 'Level of detail (brief, normal, detailed)',
            enum: ['brief', 'normal', 'detailed']
          }
        },
        required: ['query']
      };
    // Add more tool-specific schemas as needed
    default:
      return defaultParams;
  }
}
```

#### 1.3 Add Tool Call Processing Method

Add a method to process tool calls from the API response:

```javascript
// Process tool calls from the API response
processToolCalls: async function(node, data, originalInput, messages) {
  try {
    const message = data.choices[0].message;
    
    // If there are no tool calls, return the content directly
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content;
    }
    
    console.log(`Processing ${message.tool_calls.length} tool calls for node ${node.id}`);
    
    // Create a new messages array that includes the assistant's response with tool calls
    const updatedMessages = [...messages, message];
    
    // Process each tool call
    for (const toolCall of message.tool_calls) {
      try {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool ${functionName} with args:`, functionArgs);
        
        // Execute the tool
        let toolResult;
        if (window.AgentTools && typeof AgentTools.getToolById === 'function') {
          const tool = AgentTools.getToolById(functionName);
          if (tool) {
            toolResult = await AgentTools.executeTool(functionName, functionArgs, node);
          } else if (window.MCPTools && typeof MCPTools.getToolById === 'function') {
            const mcpTool = MCPTools.getToolById(functionName);
            if (mcpTool) {
              toolResult = await MCPTools.executeMCPTool(functionName, functionArgs, node);
            } else {
              toolResult = `Error: Tool ${functionName} not found`;
            }
          } else {
            toolResult = `Error: Tool ${functionName} not found`;
          }
        } else {
          toolResult = `Error: AgentTools not available`;
        }
        
        // Add the tool result to the messages
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
        });
        
        // Store the tool execution in memory
        if (node.memory) {
          AgentMemory.addToHistory(node, {
            tool: functionName,
            params: functionArgs
          }, toolResult);
        }
      } catch (error) {
        console.error(`Error executing tool ${toolCall.function.name}:`, error);
        
        // Add the error to the messages
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: ${error.message}`
        });
      }
    }
    
    // Make another API call with the updated messages
    console.log(`Making follow-up API call with ${updatedMessages.length} messages`);
    
    const followUpResponse = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: updatedMessages,
        tools: data.tools, // Reuse the same tools
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!followUpResponse.ok) {
      throw new Error(`Follow-up API request failed with status ${followUpResponse.status}`);
    }
    
    const followUpData = await followUpResponse.json();
    
    // Log the follow-up response
    if (!node.apiLogs) {
      node.apiLogs = [];
    }
    
    node.apiLogs.push({
      timestamp: new Date().toISOString(),
      request: {
        messages: updatedMessages,
        tools: data.tools
      },
      response: followUpData
    });
    
    // Check if there are more tool calls
    const followUpMessage = followUpData.choices[0].message;
    if (followUpMessage.tool_calls && followUpMessage.tool_calls.length > 0) {
      // Recursively process more tool calls
      return await this.processToolCalls(node, followUpData, originalInput, updatedMessages);
    }
    
    // Return the final content
    return followUpMessage.content;
  } catch (error) {
    console.error(`Error processing tool calls for node ${node.id}:`, error);
    return `Error processing tools: ${error.message}. Original response: ${data.choices[0].message.content}`;
  }
}
```

### Phase 2: Enhance System Prompt

#### 2.1 Update the Default System Prompt

Modify the system prompt to provide better guidance on tool use:

```javascript
// In agent-processor.js, createAgentNode method
node.systemPrompt = `You are an autonomous agent that can use tools to help solve problems.

You have access to the following tools:
- Text processing tools: Summarize text, extract entities
- Image processing tools: Analyze images
- Search tools: Search the web for information
- Documentation tools: Get documentation for technologies and APIs

When you need information or need to perform an action:
1. ALWAYS use the appropriate tool rather than making up information
2. Think step-by-step about which tool would be most helpful
3. If you need to search for information, use the search tool
4. If you need documentation, use the documentation tool
5. If you need to analyze an image, use the image analysis tool

After using tools, synthesize the information to provide a complete and accurate response.`;
```

### Phase 3: Implement Reflection

#### 3.1 Add Reflection Method

Add a method to perform reflection between iterations:

```javascript
// In agent-processor.js, add a new method
performReflection: async function(node, input, history) {
  try {
    console.log(`Performing reflection for node ${node.id} at iteration ${node.currentIteration}`);
    
    // Skip reflection if disabled or not time yet
    if (!node.enableReflection || node.currentIteration % node.reflectionFrequency !== 0) {
      return null;
    }
    
    // Get the reflection prompt
    const reflectionPrompt = node.reflectionPrompt || 
      'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?';
    
    // Format the history for reflection
    const historyText = history.map(item => 
      `Action: ${item.action ? JSON.stringify(item.action) : 'N/A'}\nResult: ${
        typeof item.result === 'string' ? item.result : JSON.stringify(item.result)
      }`
    ).join('\n\n');
    
    // Make the API request
    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are reflecting on your previous actions to improve your problem-solving approach.' 
          },
          { 
            role: 'user', 
            content: `${reflectionPrompt}\n\nOriginal input: ${input}\n\nPrevious actions:\n${historyText}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Reflection API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const reflectionResult = data.choices[0].message.content;
    
    // Store the reflection in memory
    if (node.memory) {
      AgentMemory.store(node, `reflection_${node.currentIteration}`, reflectionResult);
    }
    
    console.log(`Reflection completed for node ${node.id}:`, reflectionResult);
    
    return reflectionResult;
  } catch (error) {
    console.error(`Error performing reflection for node ${node.id}:`, error);
    return null;
  }
}
```

### Phase 4: Update the Agent Node Processing Flow

#### 4.1 Modify the Main Processing Method

Update the main processing method to incorporate the new features:

```javascript
// In agent-processor.js, update the processAgentNode method
processAgentNode: async function(node, input, reflectionResult = null) {
  try {
    console.log(`Processing agent node ${node.id} with input:`, input);
    
    // Initialize node properties if not already set
    if (node.currentIteration === undefined) {
      node.currentIteration = 0;
    }
    
    if (node.isIterating === undefined) {
      node.isIterating = true;
    }
    
    // Increment iteration counter
    node.currentIteration++;
    
    // Initialize the node logger if not already initialized
    if (window.AgentLogger && typeof AgentLogger.initNodeLogger === 'function') {
      AgentLogger.initNodeLogger(node);
    }
    
    // Log the input
    if (window.AgentLogger && typeof AgentLogger.logInput === 'function') {
      AgentLogger.logInput(node, input);
    }
    
    // Log reflection if provided
    if (reflectionResult && window.AgentLogger && typeof AgentLogger.addLog === 'function') {
      AgentLogger.addLog(node, `Reflection: ${reflectionResult}`, 'info');
    }
    
    // Process the node using direct processing
    const result = await this.directProcessNode(node, input);
    
    // Log the result
    if (window.AgentLogger && typeof AgentLogger.logOutput === 'function') {
      AgentLogger.logOutput(node, result);
    }
    
    // Check if we need to continue iterating
    if (node.autoIterate && node.isIterating && node.currentIteration < node.maxIterations) {
      // Perform reflection if needed
      const newReflectionResult = await this.performReflection(
        node, 
        input, 
        node.memory ? node.memory.history || [] : []
      );
      
      // Continue to the next iteration
      if (window.AgentLogger && typeof AgentLogger.addLog === 'function') {
        AgentLogger.addLog(node, `Continuing to iteration ${node.currentIteration + 1}`, 'info');
      }
      
      // Process the node again with the current result as input
      return await this.processAgentNode(node, result, newReflectionResult);
    } else {
      // Mark the agent as done iterating
      node.isIterating = false;
      
      if (window.AgentLogger && typeof AgentLogger.addLog === 'function') {
        AgentLogger.addLog(node, 'Agent processing completed', 'success');
      }
      
      return result;
    }
  } catch (error) {
    console.error(`Error processing agent node ${node.id}:`, error);
    
    // Log the error
    if (window.AgentLogger && typeof AgentLogger.logError === 'function') {
      AgentLogger.logError(node, error);
    }
    
    throw error;
  }
}
```

## Implementation Timeline

1. **Phase 1 (Fix API Integration)**: 1-2 days
   - Update the direct processing method
   - Implement tool parameter schemas
   - Add tool call processing

2. **Phase 2 (Enhance System Prompt)**: 0.5 day
   - Update default system prompt
   - Add tool descriptions

3. **Phase 3 (Implement Reflection)**: 1 day
   - Add reflection method
   - Integrate with memory system

4. **Phase 4 (Update Processing Flow)**: 1 day
   - Update main processing method
   - Test and debug

Total estimated time: 3-4.5 days

## Testing Plan

1. **Basic Agent Functionality**:
   - Create an agent node
   - Send a simple query
   - Verify response

2. **Tool Usage**:
   - Send a query that requires tool use
   - Verify tool is called correctly
   - Verify result incorporates tool output

3. **Multi-step Reasoning**:
   - Send a complex query requiring multiple tools
   - Verify agent uses multiple tools in sequence
   - Verify final answer synthesizes all information

4. **Reflection**:
   - Enable reflection
   - Run a multi-iteration process
   - Verify reflection occurs at the specified frequency
   - Verify reflection influences subsequent iterations

5. **Error Handling**:
   - Test with unavailable tools
   - Test with API errors
   - Verify graceful error handling

## Conclusion

This implementation plan addresses the core issues with the current agent node implementation. By properly integrating with the OpenAI API's function calling capabilities, implementing a robust tool execution loop, enhancing the system prompt, and adding reflection, the agent nodes will become truly agentic and capable of solving complex problems through multi-step reasoning and tool use.
