// Enhance the agent planner with different reasoning styles
console.log('📋 Enhancing agent planner with reasoning styles...');

// Wait for AgentPlanner to be available
setTimeout(() => {
  if (!window.AgentPlanner) {
    console.warn('AgentPlanner not found, cannot enhance');
    return;
  }
  
  // Store original generatePlan
  if (!window.AgentPlanner._originalGeneratePlan) {
    window.AgentPlanner._originalGeneratePlan = window.AgentPlanner.generatePlan;
  }
  
  // Enhanced plan generation based on reasoning style
  window.AgentPlanner.generatePlan = async function(node, input) {
    const reasoningStyle = node.reasoningStyle || 'cot';
    console.log(`📋 Generating ${reasoningStyle} plan for agent ${node.id}`);
    
    // Get available tools
    const tools = window.AgentTools ? window.AgentTools.getAllTools() : [];
    const toolDescriptions = tools.map(tool => 
      `${tool.id}: ${tool.name} - ${tool.description}`
    ).join('\n');
    
    // Create reasoning-specific prompts
    const reasoningPrompts = {
      'cot': `Create a Chain of Thought plan:
1. Break down the problem into logical steps
2. For each step, identify the appropriate tool
3. Show how each step builds on the previous one
4. Ensure the final step produces the desired output`,
      
      'react': `Create a ReAct (Reasoning + Acting) plan:
For each step, structure it as:
- Thought: What needs to be analyzed or understood
- Action: Which tool to use and how
- Expected Observation: What you expect to learn
Continue until the task is complete`,
      
      'planner': `Create a Goal-Oriented plan:
1. Define the main goal clearly
2. Identify subgoals needed to achieve the main goal
3. Map each subgoal to specific tool actions
4. Show dependencies between steps
5. Include checkpoints to verify progress`,
      
      'tot': `Create a Tree of Thoughts plan:
1. Identify multiple possible approaches
2. For each approach, outline the steps and tools needed
3. Evaluate pros/cons of each approach
4. Select the most promising path
5. Include fallback options if the main path fails`,
      
      'reflexion': `Create a Reflexion-based plan:
1. Initial approach with tools
2. Checkpoint for self-evaluation
3. Identify potential improvements
4. Refined approach with better tool usage
5. Final validation step`
    };
    
    const systemPrompt = `You are an AI agent planner using ${reasoningStyle} reasoning.

${reasoningPrompts[reasoningStyle]}

Available tools:
${toolDescriptions}

User request: ${input}

Create a detailed plan using the format:
Step X: [tool_id] - Detailed description of what to do
Expected outcome: What this step will achieve

Be specific and show your reasoning process.`;
    
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create a ${reasoningStyle} plan for: ${input}` }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const planText = data.choices[0].message.content;
        
        // Parse the plan into steps
        const steps = [];
        const lines = planText.split('\n');
        
        for (const line of lines) {
          // Match patterns like "Step 1: [tool_id]" or "1. [tool_id]"
          const match = line.match(/(?:Step\s*\d+:|^\d+\.)\s*\[([^\]]+)\]\s*-?\s*(.+)/i);
          if (match) {
            const toolId = match[1].trim();
            const description = match[2].trim();
            
            // Verify tool exists
            const tool = tools.find(t => t.id === toolId);
            if (tool) {
              steps.push({
                toolId: toolId,
                tool: tool,
                description: description,
                reasoningStyle: reasoningStyle
              });
            }
          }
        }
        
        console.log(`📋 Generated ${reasoningStyle} plan with ${steps.length} steps`);
        
        return {
          input: input,
          steps: steps,
          planText: planText,
          reasoningStyle: reasoningStyle
        };
      }
    } catch (error) {
      console.error('Plan generation error:', error);
    }
    
    // Fall back to original planner
    return this._originalGeneratePlan(node, input);
  };
  
  // Also enhance plan execution to show reasoning
  if (!window.AgentPlanner._originalExecutePlan) {
    window.AgentPlanner._originalExecutePlan = window.AgentPlanner.executePlan;
  }
  
  window.AgentPlanner.executePlan = async function(node, plan) {
    if (!plan) {
      plan = node.currentPlan;
    }
    
    if (plan && plan.reasoningStyle && node.showReasoning) {
      console.log(`📋 Executing ${plan.reasoningStyle} plan`);
      
      // Add reasoning header to output
      const reasoningHeader = `**Using ${plan.reasoningStyle} reasoning:**\n\n`;
      
      // Store original content
      const originalContent = node.content;
      
      // Add reasoning header
      node.content = reasoningHeader + (originalContent || '');
      
      // Update UI if available
      if (window.App && window.App.draw) {
        window.App.draw();
      }
    }
    
    // Execute with original method
    return this._originalExecutePlan(node, plan);
  };
  
  console.log('✅ Agent planner enhanced with reasoning styles');
}, 1000);