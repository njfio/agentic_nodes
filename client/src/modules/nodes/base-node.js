/**
 * Base Node Class
 * Foundation for all node types in the application
 */

import { EventBus } from '../../core/event-bus.js';
import { StateManager } from '../../stores/state-manager.js';
import { ConfigManager } from '../../config/config-manager.js';
import { Logger } from '../../core/logger.js';
import { generateId } from '../../utils/helpers.js';

export class BaseNode {
  constructor(x, y, id = null) {
    // Position and identity
    this.id = id || generateId('node');
    this.x = x;
    this.y = y;
    
    // Basic properties
    this.type = 'base';
    this.title = `Node ${this.id}`;
    this.content = '';
    this.inputContent = '';
    this.contentType = 'text';
    
    // Visual properties
    this.width = ConfigManager.get('nodes.defaultWidth', 200);
    this.height = ConfigManager.get('nodes.defaultHeight', 150);
    this.minWidth = ConfigManager.get('nodes.minWidth', 100);
    this.minHeight = ConfigManager.get('nodes.minHeight', 50);
    this.maxWidth = ConfigManager.get('nodes.maxWidth', 800);
    this.maxHeight = ConfigManager.get('nodes.maxHeight', 600);
    
    // State flags
    this.selected = false;
    this.processing = false;
    this.error = null;
    this.hasBeenProcessed = false;
    this.expanded = false;
    this.autoSize = true;
    
    // UI state
    this.inputCollapsed = false;
    this.outputCollapsed = false;
    
    // Input tracking
    this.inputSources = new Map();
    this.waitForAllInputs = true;
    this.waitingForInputs = true;
    
    // Statistics
    this.stats = {
      inputTokens: 0,
      outputTokens: 0,
      lastProcessingTime: 0,
      totalProcessingTime: 0,
      processCount: 0
    };
    
    // Metadata
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    
    // Connections
    this.inputs = [];
    this.outputs = [];
  }

  /**
   * Get the icon for this node's content type
   */
  getContentTypeIcon() {
    const icons = {
      'text': '📝',
      'image': '🖼️',
      'audio': '🔊',
      'video': '🎥',
      'chat': '💬',
      'code': '💻',
      'data': '📊'
    };
    return icons[this.contentType] || '📄';
  }

  /**
   * Get the display title with icon
   */
  getDisplayTitle() {
    return `${this.getContentTypeIcon()} ${this.title}`;
  }

  /**
   * Reset the node's input state
   */
  reset() {
    this.inputSources.clear();
    this.inputContent = '';
    this.waitingForInputs = true;
    this.error = null;
    
    Logger.debug('node', `Reset input state for node "${this.title}" (ID: ${this.id})`);
    EventBus.emit('node:reset', this);
  }

  /**
   * Add input from a source node
   */
  addInput(sourceNodeId, input) {
    this.inputSources.set(sourceNodeId, input);
    
    Logger.debug('node', `Added input from node ${sourceNodeId} to node ${this.id}`);
    
    // Check if we have all required inputs
    if (this.checkInputsReady()) {
      this.waitingForInputs = false;
      EventBus.emit('node:inputs-ready', this);
    }
  }

  /**
   * Check if all required inputs are ready
   */
  checkInputsReady() {
    if (!this.waitForAllInputs) {
      return this.inputSources.size > 0;
    }
    
    // Check if we have input from all connected source nodes
    const connectedInputCount = this.inputs.length;
    const receivedInputCount = this.inputSources.size;
    
    return receivedInputCount >= connectedInputCount;
  }

  /**
   * Get combined input from all sources
   */
  getCombinedInput() {
    const inputs = Array.from(this.inputSources.values());
    
    if (inputs.length === 0) {
      return '';
    }
    
    if (inputs.length === 1) {
      return inputs[0];
    }
    
    // Combine multiple inputs
    return this.combineInputs(inputs);
  }

  /**
   * Combine multiple inputs (can be overridden by subclasses)
   */
  combineInputs(inputs) {
    // Default: concatenate with newlines
    return inputs.filter(input => input).join('\n\n');
  }

  /**
   * Process the node
   */
  async process(input = null) {
    const startTime = performance.now();
    
    try {
      this.processing = true;
      this.error = null;
      
      Logger.info('node', `Processing node "${this.title}" (ID: ${this.id})`);
      EventBus.emit('node:processing-start', this);
      
      // Use provided input or get combined input from sources
      const processInput = input !== null ? input : this.getCombinedInput();
      this.inputContent = processInput;
      
      // Perform the actual processing
      const output = await this.performProcessing(processInput);
      
      // Update content and stats
      this.content = output;
      this.hasBeenProcessed = true;
      this.updateStats(startTime, processInput, output);
      
      Logger.info('node', `Successfully processed node "${this.title}" (ID: ${this.id})`);
      EventBus.emit('node:processing-complete', this);
      
      return output;
      
    } catch (error) {
      this.error = error.message;
      Logger.error('node', `Error processing node "${this.title}" (ID: ${this.id}): ${error.message}`, error);
      EventBus.emit('node:processing-error', { node: this, error });
      throw error;
      
    } finally {
      this.processing = false;
      this.updatedAt = Date.now();
    }
  }

  /**
   * Perform the actual processing (to be overridden by subclasses)
   */
  async performProcessing(input) {
    // Base implementation just returns the input
    return input;
  }

  /**
   * Update statistics
   */
  updateStats(startTime, input, output) {
    const processingTime = performance.now() - startTime;
    
    this.stats.lastProcessingTime = processingTime;
    this.stats.totalProcessingTime += processingTime;
    this.stats.processCount++;
    
    // Estimate tokens (can be overridden for more accurate counting)
    this.stats.inputTokens = this.estimateTokens(input);
    this.stats.outputTokens = this.estimateTokens(output);
  }

  /**
   * Estimate token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate optimal size based on content
   */
  calculateOptimalSize() {
    if (!this.autoSize) return;
    
    // Base implementation maintains current size
    // Subclasses can override for content-specific sizing
  }

  /**
   * Check if point is inside node
   */
  containsPoint(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * Get node bounds
   */
  getBounds() {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Move node by delta
   */
  move(deltaX, deltaY) {
    this.x += deltaX;
    this.y += deltaY;
    this.updatedAt = Date.now();
    EventBus.emit('node:moved', this);
  }

  /**
   * Resize node
   */
  resize(width, height) {
    this.width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
    this.height = Math.max(this.minHeight, Math.min(this.maxHeight, height));
    this.updatedAt = Date.now();
    EventBus.emit('node:resized', this);
  }

  /**
   * Select/deselect node
   */
  setSelected(selected) {
    if (this.selected !== selected) {
      this.selected = selected;
      EventBus.emit(selected ? 'node:selected' : 'node:deselected', this);
    }
  }

  /**
   * Clone the node
   */
  clone() {
    const cloned = new this.constructor(this.x + 50, this.y + 50);
    
    // Copy properties
    const excludeProps = ['id', 'x', 'y', 'createdAt', 'updatedAt', 'inputs', 'outputs'];
    for (const [key, value] of Object.entries(this)) {
      if (!excludeProps.includes(key)) {
        cloned[key] = this.cloneValue(value);
      }
    }
    
    cloned.title = `${this.title} (Copy)`;
    return cloned;
  }

  /**
   * Deep clone a value
   */
  cloneValue(value) {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value);
    if (value instanceof Array) return value.map(item => this.cloneValue(item));
    if (value instanceof Map) return new Map(value);
    if (value instanceof Set) return new Set(value);
    
    const cloned = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        cloned[key] = this.cloneValue(value[key]);
      }
    }
    return cloned;
  }

  /**
   * Serialize node for storage
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      title: this.title,
      content: this.content,
      contentType: this.contentType,
      hasBeenProcessed: this.hasBeenProcessed,
      stats: this.stats,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Deserialize node from storage
   */
  static deserialize(data) {
    const node = new this(data.x, data.y, data.id);
    Object.assign(node, data);
    return node;
  }
}