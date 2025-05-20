/**
 * Agent Node Test Script
 * This script tests the agent node functionality
 */

// Create a test agent node
function createTestAgentNode() {
  console.log('Creating test agent node');
  
  // Create a new agent node
  const node = {
    id: 'test-agent-node',
    type: 'agent',
    name: 'Test Agent Node',
    description: 'A test agent node',
    systemPrompt: "You are an autonomous agent that reasons step by step. " +
      "You can access various tools, including MCP tools for search, memory, and documentation. " +
      "Use these tools whenever they help you fulfill the user's request. " +
      "ALWAYS use tools when they would be helpful rather than making up information. " +
      "Think carefully about which tools to use for each task.",
    inputs: [],
    outputs: [],
    position: { x: 100, y: 100 },
    width: 300,
    height: 200,
    content: '',
    usePlanner: false,
    useMCPTools: true,
    apiLogs: [],
    memory: null,
    // Iteration properties
    maxIterations: 3,
    currentIteration: 0,
    autoIterate: true,
    isIterating: false,
    // Reflection properties
    enableReflection: true,
    reflectionFrequency: 1,
    reflectionPrompt: 'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?'
  };
  
  // Initialize the node memory
  if (window.AgentMemory && typeof AgentMemory.initMemory === 'function') {
    AgentMemory.initMemory(node);
  }
  
  return node;
}

// Process the test agent node
async function processTestAgentNode(node, input) {
  console.log(`Processing test agent node with input: ${input}`);
  
  try {
    // Process the node
    const result = await AgentProcessor.processAgentNode(node, input);
    
    // Log the result
    console.log('Agent node processing result:', result);
    
    // Display the result
    document.getElementById('result').textContent = result;
    
    // Display the API logs
    if (node.apiLogs && node.apiLogs.length > 0) {
      const logsElement = document.getElementById('api-logs');
      logsElement.innerHTML = '';
      
      node.apiLogs.forEach((log, index) => {
        const logElement = document.createElement('div');
        logElement.className = 'api-log';
        
        const timestampElement = document.createElement('div');
        timestampElement.className = 'timestamp';
        timestampElement.textContent = log.timestamp;
        
        const requestElement = document.createElement('pre');
        requestElement.className = 'request';
        requestElement.textContent = JSON.stringify(log.request, null, 2);
        
        const responseElement = document.createElement('pre');
        responseElement.className = 'response';
        responseElement.textContent = JSON.stringify(log.response, null, 2);
        
        logElement.appendChild(timestampElement);
        logElement.appendChild(document.createElement('hr'));
        logElement.appendChild(document.createTextNode('Request:'));
        logElement.appendChild(requestElement);
        logElement.appendChild(document.createElement('hr'));
        logElement.appendChild(document.createTextNode('Response:'));
        logElement.appendChild(responseElement);
        
        logsElement.appendChild(logElement);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error processing test agent node:', error);
    document.getElementById('result').textContent = `Error: ${error.message}`;
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    // Create the test agent node
    const node = createTestAgentNode();
    
    // Get the input
    const input = document.getElementById('input').value;
    
    // Process the node
    await processTestAgentNode(node, input);
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Initialize the test
function initTest() {
  console.log('Initializing agent node test');
  
  // Add event listener to the run button
  document.getElementById('run-button').addEventListener('click', runTest);
}

// Run the test when the page loads
document.addEventListener('DOMContentLoaded', initTest);
