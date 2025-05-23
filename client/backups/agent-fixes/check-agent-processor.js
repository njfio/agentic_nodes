// Check what's available in AgentProcessor
console.log('=== Checking AgentProcessor ===');

// Check if AgentProcessor exists
if (window.AgentProcessor) {
  console.log('✓ AgentProcessor exists');
  console.log('AgentProcessor methods:', Object.keys(window.AgentProcessor));
  console.log('Full AgentProcessor:', window.AgentProcessor);
} else {
  console.error('✗ AgentProcessor NOT found');
}

// Check if agent processing is available elsewhere
console.log('\n=== Checking other locations ===');

if (window.AgentNodes) {
  console.log('✓ AgentNodes exists');
  console.log('AgentNodes methods:', Object.keys(window.AgentNodes));
  
  // Check for processAgentNode
  if (window.AgentNodes.processAgentNode) {
    console.log('✓ Found processAgentNode in AgentNodes');
  } else if (window.AgentNodes.processDefaultAgent) {
    console.log('✓ Found processDefaultAgent in AgentNodes');
  }
} else {
  console.error('✗ AgentNodes NOT found');
}

// Check agent folder modules
console.log('\n=== Checking agent modules ===');
const modules = ['AgentEditor', 'AgentModals', 'AgentUI', 'AgentIntegration'];
modules.forEach(mod => {
  if (window[mod]) {
    console.log(`✓ ${mod} exists`);
  } else {
    console.log(`✗ ${mod} NOT found`);
  }
});

// Look for process functions
console.log('\n=== Looking for process functions ===');
for (let key in window) {
  if (key.includes('Agent') && window[key] && typeof window[key] === 'object') {
    for (let method in window[key]) {
      if (method.includes('process')) {
        console.log(`Found: window.${key}.${method}`);
      }
    }
  }
}