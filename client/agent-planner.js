/**
 * Agent Planner
 * Implements planning capabilities for agent nodes
 */

const AgentPlanner = {
  // Generate a plan for the agent
  async generatePlan(node, input) {
    DebugManager.addLog(`Generating plan for agent "${node.title}" (ID: ${node.id})`, 'info');

    try {
      // Use the OpenAI API to generate a plan
      const config = ApiService.openai.getConfig();
      if (!config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Get available tools
      const tools = AgentTools.getAllTools();
      const toolDescriptions = tools.map(tool => 
        `${tool.id}: ${tool.name} - ${tool.description}`
      ).join('\n');

      // Get memory context
      const memory = AgentMemory.initMemory(node);
      const contextSummary = memory.context.length > 0 
        ? memory.context.map(item => item.content).join('\n') 
        : 'No context available';

      // Create the system prompt for planning
      const systemPrompt = `You are an agent tasked with planning how to process the following input. 
Your goal is to create a step-by-step plan using the available tools.

Available tools:
${toolDescriptions}

Current context:
${contextSummary}

Create a plan with the following format:
1. [tool_id] - Brief description of what you'll do with this tool
2. [tool_id] - Next step
...

Only include valid tool IDs from the list above. Be specific about what you'll do with each tool.`;

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
            { role: 'user', content: `Input: ${input}` }
          ],
          temperature: 0.7,
          max_tokens: config.maxTokens || 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const planText = data.choices[0].message.content;

      // Parse the plan
      const plan = this.parsePlan(planText);

      // Store the plan in memory
      AgentMemory.store(node, 'currentPlan', plan);
      AgentMemory.store(node, 'currentPlanText', planText);

      DebugManager.addLog(`Plan generated with ${plan.steps.length} steps`, 'success');

      return plan;
    } catch (error) {
      DebugManager.addLog(`Error generating plan: ${error.message}`, 'error');
      throw error;
    }
  },

  // Parse a plan from text
  parsePlan(planText) {
    const steps = [];
    const lines = planText.split('\n');

    for (const line of lines) {
      // Look for lines that start with a number followed by a period
      const match = line.match(/^\s*(\d+)\.\s*\[([a-z0-9-_]+)\]\s*-\s*(.+)$/i);
      if (match) {
        const [, stepNumber, toolId, description] = match;
        steps.push({
          number: parseInt(stepNumber, 10),
          toolId,
          description,
          completed: false,
          result: null
        });
      }
    }

    return {
      text: planText,
      steps,
      currentStep: 0,
      completed: false
    };
  },

  // Execute the next step in the plan
  async executeNextStep(node) {
    // Get the current plan
    const plan = AgentMemory.retrieve(node, 'currentPlan');
    if (!plan || !plan.steps || plan.steps.length === 0) {
      throw new Error('No plan available');
    }

    // Check if the plan is already completed
    if (plan.completed) {
      return { completed: true, message: 'Plan already completed' };
    }

    // Get the current step
    const currentStep = plan.steps[plan.currentStep];
    if (!currentStep) {
      plan.completed = true;
      AgentMemory.store(node, 'currentPlan', plan);
      return { completed: true, message: 'No more steps to execute' };
    }

    try {
      DebugManager.addLog(`Executing step ${currentStep.number}: ${currentStep.description}`, 'info');

      // Get the tool
      const tool = AgentTools.getToolById(currentStep.toolId);
      if (!tool) {
        throw new Error(`Tool with ID ${currentStep.toolId} not found`);
      }

      // Determine the parameters for the tool
      const params = await this.determineToolParams(node, currentStep, tool);

      // Execute the tool
      const result = await AgentTools.executeTool(currentStep.toolId, params, node);

      // Update the step with the result
      currentStep.completed = true;
      currentStep.result = result;

      // Add to history
      AgentMemory.addToHistory(node, {
        step: currentStep.number,
        tool: currentStep.toolId,
        description: currentStep.description,
        params
      }, result);

      // Move to the next step
      plan.currentStep++;

      // Check if the plan is completed
      if (plan.currentStep >= plan.steps.length) {
        plan.completed = true;
        DebugManager.addLog('Plan execution completed', 'success');
      }

      // Update the plan in memory
      AgentMemory.store(node, 'currentPlan', plan);

      return {
        completed: currentStep.completed,
        result,
        nextStep: plan.currentStep < plan.steps.length ? plan.steps[plan.currentStep] : null
      };
    } catch (error) {
      DebugManager.addLog(`Error executing step ${currentStep.number}: ${error.message}`, 'error');
      throw error;
    }
  },

  // Determine the parameters for a tool
  async determineToolParams(node, step, tool) {
    // Get the input content
    const input = node.inputContent;

    // Get memory context
    const memory = AgentMemory.initMemory(node);

    // Use the OpenAI API to determine the parameters
    const config = ApiService.openai.getConfig();
    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an agent tasked with determining the parameters for a tool.
The tool is: ${tool.name} (${tool.id}) - ${tool.description}

You need to extract the necessary parameters from the context and input.
Return ONLY a valid JSON object with the parameters needed for this tool.`;

    const contextText = memory.context.length > 0 
      ? memory.context.map(item => item.content).join('\n') 
      : 'No context available';

    // Add previous step results to the context
    const previousStepsText = step.number > 1 
      ? `Previous steps:\n${memory.history
          .filter(h => h.action && h.action.step < step.number)
          .map(h => `Step ${h.action.step}: ${h.action.description}\nResult: ${h.result}`)
          .join('\n\n')}`
      : 'No previous steps';

    try {
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
            { 
              role: 'user', 
              content: `
Input: ${input}

Context:
${contextText}

${previousStepsText}

Current step: ${step.number}. ${step.description}

Determine the parameters for the tool ${tool.id} based on this information.
Return ONLY a valid JSON object.`
            }
          ],
          temperature: 0.3,
          max_tokens: config.maxTokens || 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const paramsText = data.choices[0].message.content;

      // Extract JSON from the response
      const jsonMatch = paramsText.match(/```json\n([\s\S]*?)\n```/) || 
                        paramsText.match(/```\n([\s\S]*?)\n```/) ||
                        paramsText.match(/\{[\s\S]*\}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : paramsText;
      
      try {
        const params = JSON.parse(jsonString);
        return params;
      } catch (jsonError) {
        DebugManager.addLog(`Error parsing parameters JSON: ${jsonError.message}`, 'error');
        DebugManager.addLog(`Raw parameters text: ${paramsText}`, 'error');
        
        // Fallback: try to extract parameters from the description
        return this.extractParamsFromDescription(step.description, input);
      }
    } catch (error) {
      DebugManager.addLog(`Error determining tool parameters: ${error.message}`, 'error');
      
      // Fallback: try to extract parameters from the description
      return this.extractParamsFromDescription(step.description, input);
    }
  },

  // Extract parameters from a step description (fallback method)
  extractParamsFromDescription(description, input) {
    // This is a simple fallback method that tries to extract parameters from the description
    // In a real implementation, this would be more sophisticated
    const params = {};
    
    // Check for common parameter patterns
    if (description.includes('summarize') || description.includes('summary')) {
      params.text = input;
      
      // Try to extract maxLength if mentioned
      const lengthMatch = description.match(/(\d+)\s*(words|characters)/i);
      if (lengthMatch) {
        params.maxLength = parseInt(lengthMatch[1], 10);
      }
    } else if (description.includes('extract') || description.includes('entities')) {
      params.text = input;
    } else if (description.includes('image') || description.includes('analyze')) {
      // Try to extract an image URL from the input
      const urlMatch = input.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i) ||
                       input.match(/(data:image\/[^;]+;base64,[^\s]+)/i);
      if (urlMatch) {
        params.imageUrl = urlMatch[1];
      } else {
        params.text = input;
      }
    } else if (description.includes('JSON') || description.includes('parse')) {
      params.jsonString = input;
    } else if (description.includes('node') && description.includes('content')) {
      // Try to extract a node ID
      const nodeIdMatch = description.match(/node\s*(\d+)/i) || description.match(/ID\s*(\d+)/i);
      if (nodeIdMatch) {
        params.nodeId = nodeIdMatch[1];
      }
    } else {
      // Default: just pass the input as text
      params.text = input;
    }
    
    return params;
  },

  // Execute an entire plan
  async executePlan(node) {
    // Generate a plan if one doesn't exist
    let plan = AgentMemory.retrieve(node, 'currentPlan');
    if (!plan) {
      plan = await this.generatePlan(node, node.inputContent);
    }

    // Execute all steps in the plan
    const results = [];
    while (!plan.completed) {
      const stepResult = await this.executeNextStep(node);
      results.push(stepResult);
      
      // Get the updated plan
      plan = AgentMemory.retrieve(node, 'currentPlan');
      
      // Break if we've completed the plan
      if (plan.completed) {
        break;
      }
    }

    // Compile the final result
    return this.compilePlanResults(node, results);
  },

  // Compile the results of a plan execution
  async compilePlanResults(node, stepResults) {
    // Get the plan
    const plan = AgentMemory.retrieve(node, 'currentPlan');
    if (!plan) {
      return 'No plan available';
    }

    // Use the OpenAI API to compile the results
    const config = ApiService.openai.getConfig();
    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a summary of the plan execution
    const planSummary = plan.steps.map(step => {
      return `Step ${step.number}: ${step.description}
Result: ${step.result ? (typeof step.result === 'string' ? step.result.substring(0, 100) + (step.result.length > 100 ? '...' : '') : JSON.stringify(step.result)) : 'No result'}`;
    }).join('\n\n');

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-api-key': config.apiKey
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `You are an agent tasked with compiling the results of a plan execution.
Summarize the results and provide a coherent response that addresses the original input.
Focus on the most important information and insights gained from executing the plan.`
            },
            { 
              role: 'user', 
              content: `Original input: ${node.inputContent}

Plan execution summary:
${planSummary}

Compile these results into a coherent response that addresses the original input.`
            }
          ],
          temperature: 0.7,
          max_tokens: config.maxTokens || 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      DebugManager.addLog(`Error compiling plan results: ${error.message}`, 'error');
      
      // Fallback: return the last step result
      if (stepResults.length > 0 && stepResults[stepResults.length - 1].result) {
        return stepResults[stepResults.length - 1].result;
      }
      
      // If all else fails, return a simple message
      return `Plan execution completed with ${plan.steps.length} steps. Check the agent memory for details.`;
    }
  }
};

// Export the AgentPlanner object
window.AgentPlanner = AgentPlanner;
