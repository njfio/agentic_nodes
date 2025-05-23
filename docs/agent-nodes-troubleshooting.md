# Agent Nodes Troubleshooting Guide

## Common Issues and Solutions

### 1. Agent Node Not Using Tools

**Symptoms:**
- Agent provides direct answers without using available tools
- No tool calls in the response despite relevant tools being available

**Solutions:**
- Ensure you're using a model that supports function calling (gpt-3.5-turbo, gpt-4, gpt-4-turbo, gpt-4o)
- Check that tools are properly loaded by looking in the browser console for "Found X available tools"
- Verify the system prompt encourages tool usage
- Make sure the OpenAI API key is properly configured

### 2. Agent Node Stops After First Response

**Symptoms:**
- Agent makes only one API call and stops
- No iteration despite `maxIterations` being set higher

**Solutions:**
- Check that `autoIterate` is set to `true` on the node
- Verify the conversation history is being maintained (check browser console logs)
- Ensure the agent isn't detecting completion phrases too early

### 3. Tools Not Available

**Symptoms:**
- "Found 0 available tools" in console
- MCP tools not showing up

**Solutions:**
- Wait for full app initialization before creating agent nodes
- Check that MCP server configuration is correct in `/api/mcp/config`
- Verify MCPTools.init() completes successfully
- Try refreshing the page to reload tools

### 4. API Errors

**Symptoms:**
- "API request failed" errors
- 400 or 500 errors from OpenAI

**Solutions:**
- Check OpenAI API key is valid and has credits
- Verify the request format in browser Network tab
- Look for validation errors in server logs
- Ensure tools have proper parameter definitions

### 5. Tool Execution Failures

**Symptoms:**
- "Error executing tool" messages
- Tool results not being processed

**Solutions:**
- Check tool implementation for errors
- Verify tool parameters match what's being sent
- Look for JavaScript errors in browser console
- Ensure tool returns a valid response

## Debugging Steps

1. **Enable Debug Logging:**
   ```javascript
   // In browser console
   localStorage.setItem('debug', 'true');
   ```

2. **Check Tool Registration:**
   ```javascript
   // In browser console
   AgentTools.getAllTools()
   MCPTools.getAllTools()
   ```

3. **Inspect Agent Node State:**
   ```javascript
   // Select a node first, then:
   App.selectedNode
   ```

4. **Monitor API Requests:**
   - Open browser Developer Tools
   - Go to Network tab
   - Filter by "api/openai"
   - Inspect request and response payloads

5. **Check Server Logs:**
   ```bash
   # In terminal where server is running
   # Look for OpenAI API errors or tool validation issues
   ```

## Best Practices

1. **System Prompts:**
   - Be explicit about tool usage expectations
   - Mention specific tools if targeting certain capabilities
   - Encourage step-by-step reasoning

2. **Iteration Settings:**
   - Start with `maxIterations: 5` for complex tasks
   - Use `enableReflection: true` for better reasoning
   - Set `reflectionFrequency: 2` for periodic self-assessment

3. **Tool Design:**
   - Keep tool descriptions clear and specific
   - Ensure parameter descriptions are detailed
   - Return structured data when possible

4. **Memory Management:**
   - Agent memory persists across iterations
   - Clear memory between unrelated tasks
   - Use context window efficiently

## Example Working Configuration

```javascript
const agentNode = {
  nodeType: 'agent',
  systemPrompt: 'You are an AI assistant with access to tools. Always use tools when they would improve your answer.',
  maxIterations: 5,
  autoIterate: true,
  enableReasoning: true,
  reasoningStyle: 'cot',
  enableReflection: true,
  reflectionFrequency: 2,
  useMCPTools: true,
  tools: ['search', 'calculate', 'memory_store', 'memory_retrieve']
};
```