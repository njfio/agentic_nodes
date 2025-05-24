/**
 * Text Node
 * Handles text processing with AI
 */

import { BaseNode } from './base-node.js';
import { ApiService } from '../../services/api-service.js';
import { Logger } from '../../core/logger.js';

export class TextNode extends BaseNode {
  constructor(x, y, id = null) {
    super(x, y, id);
    
    this.type = 'text';
    this.title = 'Text Node';
    this.contentType = 'text';
    this.aiProcessor = 'text-to-text';
    this.systemPrompt = '';
    
    // AI configuration
    this.model = 'gpt-4o';
    this.temperature = 0.7;
    this.maxTokens = 2000;
  }

  /**
   * Perform text processing
   */
  async performProcessing(input) {
    if (!input || !input.trim()) {
      return '';
    }

    Logger.debug('node', `Processing text-to-text for node ${this.id}`);

    try {
      // Build messages for the AI
      const messages = this.buildMessages(input);
      
      // Make API request
      const response = await ApiService.openai.createChatCompletion({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      });

      // Extract and return the response
      const output = response.choices[0].message.content;
      
      Logger.debug('node', `Text processing completed for node ${this.id}`);
      
      return output;
      
    } catch (error) {
      Logger.error('node', `Text processing failed for node ${this.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build messages array for OpenAI
   */
  buildMessages(input) {
    const messages = [];
    
    // Add system prompt if present
    if (this.systemPrompt && this.systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: this.systemPrompt
      });
    }
    
    // Add user input
    messages.push({
      role: 'user',
      content: input
    });
    
    return messages;
  }

  /**
   * Update AI configuration
   */
  updateAIConfig(config) {
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
    if (config.systemPrompt !== undefined) this.systemPrompt = config.systemPrompt;
  }

  /**
   * Serialize node
   */
  serialize() {
    return {
      ...super.serialize(),
      aiProcessor: this.aiProcessor,
      systemPrompt: this.systemPrompt,
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }
}