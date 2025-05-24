import { BaseNode } from './base-node.js';
import apiService from '../../services/api-service.js';

/**
 * AgentNode - Autonomous AI agent with tool usage and iterative processing
 */
export class AgentNode extends BaseNode {
  constructor(data = {}) {
    super({
      type: 'agent',
      name: 'AI Agent',
      category: 'ai',
      description: 'Autonomous AI agent with tool usage',
      ...data
    });

    // Agent-specific properties
    this.model = data.model || 'gpt-4';
    this.role = data.role || 'assistant';
    this.goal = data.goal || '';
    this.tools = data.tools || [];
    this.maxIterations = data.maxIterations || 5;
    this.temperature = data.temperature ?? 0.7;
    this.reasoning = data.reasoning || [];
    this.iterations = data.iterations || [];
    this.enablePlanning = data.enablePlanning ?? true;
    
    // Input/output sockets
    this.inputs = [
      { id: 'query', name: 'Query', type: 'string' },
      { id: 'context', name: 'Context', type: 'any' },
      { id: 'tools', name: 'Tools', type: 'array' }
    ];
    
    this.outputs = [
      { id: 'result', name: 'Result', type: 'any' },
      { id: 'reasoning', name: 'Reasoning', type: 'array' },
      { id: 'iterations', name: 'Iterations', type: 'array' },
      { id: 'toolCalls', name: 'Tool Calls', type: 'array' }
    ];
  }

  /**
   * Process agent task with iterative reasoning and tool usage
   */
  async process(input = null) {
    try {
      this.status = 'processing';
      this.error = null;
      this.iterations = [];
      this.reasoning = [];

      // Get inputs
      const query = input?.query || this.getData('query') || this.goal;
      const context = input?.context || this.getData('context') || {};
      const additionalTools = input?.tools || this.getData('tools') || [];

      if (!query) {
        throw new Error('Query or goal is required');
      }

      // Combine configured tools with input tools
      const availableTools = [...this.tools, ...additionalTools];

      // Plan the task if enabled
      let plan = null;
      if (this.enablePlanning) {
        plan = await this.planTask(query, context, availableTools);
        this.reasoning.push({
          type: 'plan',
          content: plan,
          timestamp: new Date().toISOString()
        });
      }

      // Execute iterations
      let finalResult = null;
      let allToolCalls = [];

      for (let i = 0; i < this.maxIterations; i++) {
        const iteration = await this.executeIteration({
          query,
          context,
          tools: availableTools,
          plan,
          previousIterations: this.iterations,
          iterationNumber: i + 1
        });

        this.iterations.push(iteration);
        allToolCalls.push(...(iteration.toolCalls || []));

        // Check if task is complete
        if (iteration.isComplete) {
          finalResult = iteration.result;
          break;
        }

        // Update context for next iteration
        context.previousResult = iteration.result;
      }

      // Generate final summary
      if (!finalResult && this.iterations.length > 0) {
        finalResult = await this.summarizeResults(query, this.iterations);
      }

      this.status = 'completed';

      return {
        result: finalResult,
        reasoning: this.reasoning,
        iterations: this.iterations,
        toolCalls: allToolCalls
      };

    } catch (error) {
      this.status = 'error';
      this.error = error.message;
      this.reasoning.push({
        type: 'error',
        content: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Plan the task execution
   */
  async planTask(query, context, tools) {
    const planPrompt = `
You are an AI agent planning how to complete this task: "${query}"

Context: ${JSON.stringify(context)}

Available tools: ${tools.map(t => `${t.name}: ${t.description}`).join('\n')}

Create a step-by-step plan to accomplish this task. Be specific about which tools to use and in what order.
`;

    const response = await apiService.chat({
      model: this.model,
      messages: [
        { role: 'system', content: `You are a ${this.role}. Create clear, actionable plans.` },
        { role: 'user', content: planPrompt }
      ],
      temperature: 0.3
    });

    return response.choices?.[0]?.message?.content || '';
  }

  /**
   * Execute a single iteration
   */
  async executeIteration({ query, context, tools, plan, previousIterations, iterationNumber }) {
    const iteration = {
      number: iterationNumber,
      timestamp: new Date().toISOString(),
      reasoning: '',
      actions: [],
      toolCalls: [],
      result: null,
      isComplete: false
    };

    // Build iteration prompt
    const iterationPrompt = this.buildIterationPrompt({
      query, context, tools, plan, previousIterations, iterationNumber
    });

    // Get agent response
    const response = await apiService.chat({
      model: this.model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: iterationPrompt }
      ],
      temperature: this.temperature,
      tools: this.formatToolsForAPI(tools),
      tool_choice: 'auto'
    });

    const message = response.choices?.[0]?.message;
    iteration.reasoning = message?.content || '';

    // Process tool calls
    if (message?.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const result = await this.executeTool(toolCall, tools);
        iteration.toolCalls.push({
          tool: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
          result: result
        });
      }
    }

    // Check if iteration indicates completion
    if (iteration.reasoning.includes('[COMPLETE]') || 
        iteration.reasoning.includes('[DONE]')) {
      iteration.isComplete = true;
    }

    // Extract result from reasoning
    iteration.result = this.extractResult(iteration);

    this.reasoning.push({
      type: 'iteration',
      number: iterationNumber,
      content: iteration.reasoning,
      timestamp: iteration.timestamp
    });

    return iteration;
  }

  /**
   * Build system prompt for the agent
   */
  buildSystemPrompt() {
    return `You are ${this.role}.

Your goal is to complete tasks through reasoning and tool usage.

Guidelines:
1. Think step by step about how to accomplish the task
2. Use available tools when needed
3. Verify results before proceeding
4. Mark task as [COMPLETE] when done
5. If stuck after multiple attempts, summarize what you've learned

Always explain your reasoning clearly.`;
  }

  /**
   * Build prompt for each iteration
   */
  buildIterationPrompt({ query, context, tools, plan, previousIterations, iterationNumber }) {
    let prompt = `Task: ${query}\n\n`;

    if (context && Object.keys(context).length > 0) {
      prompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    }

    if (plan) {
      prompt += `Plan:\n${plan}\n\n`;
    }

    if (previousIterations.length > 0) {
      prompt += `Previous iterations:\n`;
      previousIterations.forEach(iter => {
        prompt += `\nIteration ${iter.number}:\n`;
        prompt += `Reasoning: ${iter.reasoning}\n`;
        if (iter.toolCalls.length > 0) {
          prompt += `Tools used: ${iter.toolCalls.map(tc => tc.tool).join(', ')}\n`;
        }
      });
      prompt += '\n';
    }

    prompt += `Available tools:\n`;
    tools.forEach(tool => {
      prompt += `- ${tool.name}: ${tool.description}\n`;
    });

    prompt += `\nThis is iteration ${iterationNumber}. What should we do next?`;

    return prompt;
  }

  /**
   * Format tools for API call
   */
  formatToolsForAPI(tools) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }));
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolCall, availableTools) {
    const toolName = toolCall.function.name;
    const tool = availableTools.find(t => t.name === toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      
      // Execute tool based on type
      if (tool.type === 'api') {
        return await apiService.callTool(toolName, args);
      } else if (tool.execute) {
        return await tool.execute(args);
      } else {
        throw new Error(`Tool ${toolName} has no execution method`);
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Extract result from iteration
   */
  extractResult(iteration) {
    // Try to extract structured result from reasoning
    const resultMatch = iteration.reasoning.match(/Result:\s*(.+?)(?:\n|$)/);
    if (resultMatch) {
      try {
        return JSON.parse(resultMatch[1]);
      } catch {
        return resultMatch[1];
      }
    }

    // Use tool results if available
    if (iteration.toolCalls.length > 0) {
      const lastToolResult = iteration.toolCalls[iteration.toolCalls.length - 1].result;
      if (lastToolResult && !lastToolResult.error) {
        return lastToolResult;
      }
    }

    return iteration.reasoning;
  }

  /**
   * Summarize results from all iterations
   */
  async summarizeResults(query, iterations) {
    const summaryPrompt = `
Task: ${query}

Here are the results from ${iterations.length} iterations:
${iterations.map(iter => `
Iteration ${iter.number}:
- Reasoning: ${iter.reasoning}
- Tools used: ${iter.toolCalls.map(tc => tc.tool).join(', ') || 'None'}
- Result: ${JSON.stringify(iter.result)}
`).join('\n')}

Please provide a final summary of what was accomplished.
`;

    const response = await apiService.chat({
      model: this.model,
      messages: [
        { role: 'system', content: 'Summarize the results concisely.' },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.3
    });

    return response.choices?.[0]?.message?.content || 'Task completed';
  }

  /**
   * Get node configuration for UI
   */
  getConfig() {
    return {
      ...super.getConfig(),
      fields: [
        {
          name: 'role',
          type: 'text',
          label: 'Agent Role',
          value: this.role,
          placeholder: 'e.g., Research Assistant, Code Reviewer'
        },
        {
          name: 'goal',
          type: 'textarea',
          label: 'Agent Goal',
          value: this.goal,
          rows: 3,
          placeholder: 'What should this agent accomplish?'
        },
        {
          name: 'model',
          type: 'select',
          label: 'Model',
          value: this.model,
          options: [
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'claude-3-opus', label: 'Claude 3 Opus' }
          ]
        },
        {
          name: 'maxIterations',
          type: 'number',
          label: 'Max Iterations',
          value: this.maxIterations,
          min: 1,
          max: 20
        },
        {
          name: 'temperature',
          type: 'number',
          label: 'Temperature',
          value: this.temperature,
          min: 0,
          max: 2,
          step: 0.1
        },
        {
          name: 'enablePlanning',
          type: 'checkbox',
          label: 'Enable Planning',
          value: this.enablePlanning
        },
        {
          name: 'tools',
          type: 'toolSelector',
          label: 'Available Tools',
          value: this.tools,
          multiple: true
        }
      ]
    };
  }

  /**
   * Validate node configuration
   */
  validate() {
    const errors = super.validate();

    if (!this.role) {
      errors.push('Agent role is required');
    }

    if (this.maxIterations < 1 || this.maxIterations > 20) {
      errors.push('Max iterations must be between 1 and 20');
    }

    return errors;
  }

  /**
   * Export data for serialization
   */
  toJSON() {
    return {
      ...super.toJSON(),
      model: this.model,
      role: this.role,
      goal: this.goal,
      tools: this.tools,
      maxIterations: this.maxIterations,
      temperature: this.temperature,
      reasoning: this.reasoning,
      iterations: this.iterations,
      enablePlanning: this.enablePlanning
    };
  }
}

// Register node type
if (typeof window !== 'undefined' && window.nodeRegistry) {
  window.nodeRegistry.register('agent', AgentNode);
}