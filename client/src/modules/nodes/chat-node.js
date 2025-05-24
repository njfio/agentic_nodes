import { BaseNode } from './base-node.js';
import apiService from '../../services/api-service.js';

/**
 * ChatNode - Handles AI chat interactions
 */
export class ChatNode extends BaseNode {
  constructor(data = {}) {
    super({
      type: 'chat',
      name: 'Chat',
      category: 'ai',
      description: 'AI chat conversation node',
      ...data
    });

    // Chat-specific properties
    this.model = data.model || 'gpt-4';
    this.temperature = data.temperature ?? 0.7;
    this.maxTokens = data.maxTokens || 1000;
    this.systemPrompt = data.systemPrompt || '';
    this.messages = data.messages || [];
    this.stream = data.stream || false;
    
    // Input/output sockets
    this.inputs = [
      { id: 'input', name: 'Input', type: 'string' },
      { id: 'context', name: 'Context', type: 'any' },
      { id: 'messages', name: 'Messages', type: 'array' }
    ];
    
    this.outputs = [
      { id: 'response', name: 'Response', type: 'string' },
      { id: 'fullResponse', name: 'Full Response', type: 'object' },
      { id: 'messages', name: 'Messages', type: 'array' }
    ];
  }

  /**
   * Process chat interaction
   */
  async process(input = null) {
    try {
      this.status = 'processing';
      this.error = null;

      // Get input values
      const userInput = input?.input || this.getData('input') || '';
      const context = input?.context || this.getData('context');
      const inputMessages = input?.messages || this.getData('messages') || [];

      // Build messages array
      const messages = [...this.messages, ...inputMessages];
      
      // Add system prompt if configured
      if (this.systemPrompt && !messages.some(m => m.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: this.systemPrompt
        });
      }

      // Add user input if provided
      if (userInput) {
        messages.push({
          role: 'user',
          content: userInput
        });
      }

      // Add context if provided
      if (context) {
        const contextMessage = {
          role: 'system',
          content: `Context: ${JSON.stringify(context)}`
        };
        messages.push(contextMessage);
      }

      // Make API call
      const response = await apiService.chat({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: this.stream
      });

      // Handle streaming response
      if (this.stream && response.body) {
        return await this.handleStreamingResponse(response, messages);
      }

      // Handle regular response
      const result = response.choices?.[0]?.message?.content || '';
      
      // Update messages history
      if (result) {
        messages.push({
          role: 'assistant',
          content: result
        });
      }

      // Update node messages
      this.messages = messages.slice(-10); // Keep last 10 messages

      this.status = 'completed';
      
      return {
        response: result,
        fullResponse: response,
        messages: messages
      };

    } catch (error) {
      this.status = 'error';
      this.error = error.message;
      throw error;
    }
  }

  /**
   * Handle streaming response
   */
  async handleStreamingResponse(response, messages) {
    let fullContent = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              fullContent += content;

              // Emit progress event
              this.emit('stream', {
                content: content,
                fullContent: fullContent
              });
            } catch (e) {
              console.warn('Failed to parse streaming chunk:', e);
            }
          }
        }
      }

      // Add assistant message
      if (fullContent) {
        messages.push({
          role: 'assistant',
          content: fullContent
        });
      }

      this.messages = messages.slice(-10);
      this.status = 'completed';

      return {
        response: fullContent,
        fullResponse: { content: fullContent, stream: true },
        messages: messages
      };

    } catch (error) {
      this.status = 'error';
      this.error = error.message;
      throw error;
    }
  }

  /**
   * Validate node configuration
   */
  validate() {
    const errors = super.validate();

    if (!this.model) {
      errors.push('Model is required');
    }

    if (this.temperature < 0 || this.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (this.maxTokens < 1 || this.maxTokens > 32000) {
      errors.push('Max tokens must be between 1 and 32000');
    }

    return errors;
  }

  /**
   * Get node configuration for UI
   */
  getConfig() {
    return {
      ...super.getConfig(),
      fields: [
        {
          name: 'model',
          type: 'select',
          label: 'Model',
          value: this.model,
          options: [
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
            { value: 'claude-3-opus', label: 'Claude 3 Opus' },
            { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' }
          ]
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
          name: 'maxTokens',
          type: 'number',
          label: 'Max Tokens',
          value: this.maxTokens,
          min: 1,
          max: 32000
        },
        {
          name: 'systemPrompt',
          type: 'textarea',
          label: 'System Prompt',
          value: this.systemPrompt,
          rows: 4
        },
        {
          name: 'stream',
          type: 'checkbox',
          label: 'Stream Response',
          value: this.stream
        }
      ]
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messages = [];
    this.emit('historyCleared');
  }

  /**
   * Export data for serialization
   */
  toJSON() {
    return {
      ...super.toJSON(),
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      systemPrompt: this.systemPrompt,
      messages: this.messages,
      stream: this.stream
    };
  }
}

// Register node type
if (typeof window !== 'undefined' && window.nodeRegistry) {
  window.nodeRegistry.register('chat', ChatNode);
}