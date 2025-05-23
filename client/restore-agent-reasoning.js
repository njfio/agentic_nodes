// Restore full agent reasoning and reflection capabilities
console.log('🧠 Restoring agent reasoning and reflection capabilities...');

// First, add the missing reasoning style UI elements
function addReasoningStyleUI() {
  // Find the agent node editor modal
  const modal = document.getElementById('agentNodeEditor');
  if (!modal) return;
  
  // Find where to insert the reasoning section (after system prompt)
  const systemPromptGroup = modal.querySelector('#agentSystemPrompt')?.closest('.form-group');
  if (!systemPromptGroup) return;
  
  // Check if reasoning section already exists
  if (document.getElementById('reasoningSection')) return;
  
  // Create the reasoning capabilities section
  const reasoningHTML = `
    <!-- Reasoning Capabilities Section -->
    <div class="form-group">
      <h3 style="color: #bb86fc; margin-top: 20px; border-bottom: 1px solid #444; padding-bottom: 5px;">Reasoning Capabilities</h3>
      <div class="checkbox-group">
        <input type="checkbox" id="enableReasoning" checked>
        <label for="enableReasoning">Enable Reasoning</label>
        <div class="tooltip">When checked, the agent will use structured reasoning to solve problems.</div>
      </div>
      
      <div id="reasoningSection" style="margin-top: 10px; padding: 10px; background-color: #2a2a2a; border-radius: 5px;">
        <div class="form-group">
          <label for="reasoningStyle">Reasoning Style:</label>
          <select id="reasoningStyle" class="form-control">
            <option value="cot">Chain of Thought (CoT)</option>
            <option value="react">ReAct (Reasoning + Acting)</option>
            <option value="planner">Goal-Oriented Planner</option>
            <option value="tot">Tree of Thoughts</option>
            <option value="reflexion">Reflexion (Self-Critique)</option>
          </select>
          <div class="tooltip">Choose how the agent should structure its reasoning process.</div>
        </div>
        
        <div class="form-group">
          <label for="reasoningDepth">Reasoning Depth:</label>
          <select id="reasoningDepth" class="form-control">
            <option value="1">Shallow (1 level)</option>
            <option value="2">Moderate (2 levels)</option>
            <option value="3" selected>Deep (3 levels)</option>
            <option value="5">Very Deep (5 levels)</option>
          </select>
          <div class="tooltip">How deeply the agent should explore each reasoning path.</div>
        </div>
        
        <div class="checkbox-group">
          <input type="checkbox" id="showReasoning" checked>
          <label for="showReasoning">Show Reasoning Process</label>
          <div class="tooltip">Display the agent's reasoning steps in the output.</div>
        </div>
      </div>
    </div>
  `;
  
  // Insert after system prompt
  systemPromptGroup.insertAdjacentHTML('afterend', reasoningHTML);
  
  // Add event listeners
  const enableReasoningCheckbox = document.getElementById('enableReasoning');
  const reasoningSection = document.getElementById('reasoningSection');
  
  if (enableReasoningCheckbox && reasoningSection) {
    enableReasoningCheckbox.addEventListener('change', () => {
      reasoningSection.style.display = enableReasoningCheckbox.checked ? 'block' : 'none';
    });
  }
  
  console.log('✅ Added reasoning style UI');
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', addReasoningStyleUI);
// Also try immediately in case DOM is already loaded
addReasoningStyleUI();

// Enhance the agent processing to use reasoning and reflection
function enhanceAgentProcessing() {
  if (!window.AgentProcessor) return;
  
  // Store original processAgentNode if not already stored
  if (!window.AgentProcessor._originalProcessAgentNode) {
    window.AgentProcessor._originalProcessAgentNode = window.AgentProcessor.processAgentNode;
  }
  
  // Override processAgentNode to add reasoning and reflection
  window.AgentProcessor.processAgentNode = async function(node, input, options = {}) {
    console.log('🧠 Processing with reasoning and reflection capabilities');
    
    // Create enhanced system prompt based on reasoning style
    const enhanceSystemPrompt = (node, originalPrompt) => {
      let enhancedPrompt = originalPrompt || '';
      
      if (node.enableReasoning) {
        const reasoningPrompts = {
          'cot': `Use Chain of Thought reasoning. Think step by step through the problem:
1. First, understand what is being asked
2. Break down the problem into smaller parts
3. Solve each part systematically
4. Combine the solutions
Always show your reasoning process.`,
          
          'react': `Use the ReAct framework - combine Reasoning and Acting:
1. Thought: Analyze the current situation
2. Action: Decide what tool or action to use
3. Observation: Examine the results
4. Repeat until the task is complete
Show each Thought -> Action -> Observation cycle.`,
          
          'planner': `Act as a Goal-Oriented Planner:
1. Define the main goal clearly
2. Break it into subgoals
3. Create a step-by-step plan
4. Execute each step and track progress
5. Adjust the plan if needed
Show your planning and execution process.`,
          
          'tot': `Use Tree of Thoughts reasoning:
1. Generate multiple solution paths
2. Evaluate each path's potential
3. Explore the most promising paths deeper
4. Backtrack if a path fails
5. Combine insights from different paths
Show your exploration of different thought branches.`,
          
          'reflexion': `Use Reflexion with self-critique:
1. Attempt to solve the problem
2. Critically evaluate your solution
3. Identify weaknesses or errors
4. Generate an improved solution
5. Repeat until satisfied
Show your self-critique and improvements.`
        };
        
        const reasoningStyle = node.reasoningStyle || 'cot';
        enhancedPrompt = reasoningPrompts[reasoningStyle] + '\n\n' + enhancedPrompt;
        
        if (node.showReasoning) {
          enhancedPrompt += '\n\nIMPORTANT: Show your reasoning process clearly in your responses.';
        }
      }
      
      return enhancedPrompt;
    };
    
    // Add reflection capability
    const performReflection = async (node, currentOutput, iteration) => {
      if (!node.enableReflection) return null;
      
      const reflectionFreq = node.reflectionFrequency || 2;
      if (iteration % reflectionFreq !== 0) return null;
      
      console.log(`🔍 Performing reflection at iteration ${iteration}`);
      
      const reflectionPrompt = node.reflectionPrompt || 
        'Reflect on your previous actions and results. What worked well? What could be improved? How can you better solve the problem?';
      
      // Use the agent's current context for reflection
      const messages = [
        {
          role: 'system',
          content: 'You are reflecting on your problem-solving process. Be critical but constructive.'
        },
        {
          role: 'user',
          content: `${reflectionPrompt}\n\nYour recent output:\n${currentOutput}\n\nProvide insights and improvements.`
        }
      ];
      
      try {
        const config = JSON.parse(localStorage.getItem('openai_config') || '{}');
        const response = await fetch('/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openai-api-key': config.apiKey
          },
          body: JSON.stringify({
            model: config.model || 'gpt-4o',
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const reflection = data.choices[0].message.content;
          console.log('🔍 Reflection:', reflection);
          return reflection;
        }
      } catch (error) {
        console.error('Reflection error:', error);
      }
      
      return null;
    };
    
    // Modify the options to include enhanced system prompt
    const enhancedOptions = {
      ...options,
      onBeforeProcess: async (node) => {
        // Enhance system prompt with reasoning style
        if (node.systemPrompt) {
          node.systemPrompt = enhanceSystemPrompt(node, node.systemPrompt);
        }
        
        if (options.onBeforeProcess) {
          return options.onBeforeProcess(node);
        }
      },
      onIteration: async (iteration, currentOutput) => {
        console.log(`🧠 Reasoning iteration ${iteration}`);
        
        // Perform reflection if enabled
        const reflection = await performReflection(node, currentOutput, iteration);
        if (reflection) {
          // Add reflection to the node's context
          if (node.reflectionHistory) {
            node.reflectionHistory.push(reflection);
          } else {
            node.reflectionHistory = [reflection];
          }
          
          // Optionally show reflection in output
          if (node.showReasoning) {
            node.content = (node.content || '') + `\n\n**Reflection ${iteration}:**\n${reflection}`;
          }
        }
        
        if (options.onIteration) {
          return options.onIteration(iteration, currentOutput);
        }
      }
    };
    
    // Call original with enhanced options
    return window.AgentProcessor._originalProcessAgentNode.call(
      this, 
      node, 
      input, 
      enhancedOptions
    );
  };
  
  console.log('✅ Enhanced agent processing with reasoning and reflection');
}

// Apply enhancements when processor is ready
setTimeout(enhanceAgentProcessing, 1000);

// Also enhance the intercept processing
function enhanceInterceptProcessing() {
  if (!window.App || !window.App.nodes) return;
  
  window.App.nodes.forEach(node => {
    if (node._originalProcessIntercepted && node.title && node.title.toLowerCase().includes('agent')) {
      const prevProcess = node.process;
      
      node.process = async function(input) {
        console.log(`🧠 Agent ${this.id} processing with reasoning style: ${this.reasoningStyle || 'cot'}`);
        
        // Ensure reasoning settings are applied
        if (this.enableReasoning && this.reasoningStyle) {
          console.log(`Using ${this.reasoningStyle} reasoning at depth ${this.reasoningDepth || 3}`);
        }
        
        if (this.enableReflection) {
          console.log(`Reflection enabled every ${this.reflectionFrequency || 2} iterations`);
        }
        
        return prevProcess.call(this, input);
      };
    }
  });
}

setTimeout(enhanceInterceptProcessing, 2000);

console.log('✅ Agent reasoning and reflection restoration complete');