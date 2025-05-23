# Agent Nodes in Docker - Complete Instructions

## Quick Start

1. **Rebuild and start Docker:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

2. **Open browser to http://localhost:8732**

3. **Configure OpenAI API Key:**
   - Click the gear icon in the toolbar
   - Enter your OpenAI API key
   - Ensure model is set to `gpt-4o` (default)

4. **Open browser console (F12) and run:**
   ```javascript
   // Fix any existing nodes
   fixExistingAgentNodes()
   
   // Check workflow status
   AgentNodeMonitor.checkWorkflow()
   
   // Run full diagnostic
   AgentWorkflowDebug.runDiagnostic()
   ```

5. **Create or load a workflow with agent nodes**

6. **Test with:** "What's happening in blockchain the week of 5/1/2025?"

## What Should Happen

1. **First Agent Node:**
   - Recognizes it needs current information
   - Calls `perplexity_search` or `web_search` tool
   - Gets mock blockchain news results
   - Processes the results

2. **Second Agent Node:**
   - Takes output from first node
   - May call additional tools
   - Provides comprehensive summary

## Debug Commands

### Check if nodes are configured correctly:
```javascript
AgentNodeMonitor.checkWorkflow()
```

### Fix existing nodes:
```javascript
fixExistingAgentNodes()
```

### Create a proper agent workflow:
```javascript
createProperAgentWorkflow()
```

### Enable verbose monitoring:
```javascript
AgentNodeMonitor.enable()
```

### Run full diagnostic:
```javascript
AgentWorkflowDebug.runDiagnostic()
```

## What to Look For in Logs

### Good Signs:
- "Model gpt-4o supports function calling ✅"
- "Loading X tools for agent"
- "Tool calls requested: perplexity_search"
- "Executing tool: perplexity_search"
- Multiple iterations

### Bad Signs:
- "FALLBACK: Using directProcessNode"
- "No tools available"
- "API key not configured"
- Single iteration only

## Common Issues

### 1. Nodes say "I cannot provide real-time information"
- **Cause:** Not using tools, falling back to direct processing
- **Fix:** Run `fixExistingAgentNodes()` and reprocess

### 2. No tools available
- **Cause:** Scripts not loaded in correct order
- **Fix:** Refresh page, check console for errors

### 3. Single iteration only
- **Cause:** `autoIterate` is false or node not configured as agent
- **Fix:** Run `fixExistingAgentNodes()`

### 4. API errors
- **Cause:** Invalid or missing API key
- **Fix:** Check settings, ensure key is valid

## Expected Output

For the blockchain query, you should see something like:

```
Based on my search for blockchain news during the week of May 1, 2025, here are the major developments:

1. **Ethereum Quantum-Resistant Upgrade**: On May 3, 2025, Ethereum successfully deployed its long-awaited quantum-resistant cryptographic upgrade...

2. **Bitcoin Institutional Adoption**: Bitcoin saw unprecedented institutional adoption during this week, with three major Fortune 500 companies...

3. **CBDC Pilots**: Several countries announced Central Bank Digital Currency pilots...
```

## Files Added for Debugging

1. **agent-workflow-fix.js** - Ensures nodes are properly configured
2. **agent-node-monitor.js** - Real-time monitoring of processing
3. **agent-diagnostic.js** - System diagnostics
4. **agent-debug-workflow.js** - Workflow analysis tools

All are automatically loaded and available in the browser console.