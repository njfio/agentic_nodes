/**
 * Node Manager Module
 * Handles node creation, management, and operations
 */

window.NodeManager = class NodeManager {
  constructor() {
    this.nodes = [];
    this.nodeTypes = new Map();
    this.nodeDefaults = {
      width: 200,
      height: 150,
      backgroundColor: '#ffffff',
      borderColor: '#333333',
      borderWidth: 2,
      borderRadius: 8,
      titleHeight: 30,
      padding: 10
    };
  }

  /**
   * Register a node type
   */
  registerNodeType(type, config) {
    this.nodeTypes.set(type, {
      ...this.nodeDefaults,
      ...config
    });
  }

  /**
   * Create a new node
   */
  createNode(type, x, y, options = {}) {
    const nodeConfig = this.nodeTypes.get(type) || this.nodeDefaults;
    const id = this.generateNodeId();

    const node = {
      id,
      type,
      x,
      y,
      width: nodeConfig.width,
      height: nodeConfig.height,
      title: options.title || `${type} Node ${id}`,
      content: options.content || '',
      ...nodeConfig,
      ...options,
      // State
      selected: false,
      processing: false,
      error: null,
      hasBeenProcessed: false,
      // Connections
      inputs: [],
      outputs: [],
      // Metadata
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.nodes.push(node);
    this.emitEvent('node:created', node);

    return node;
  }

  /**
   * Update a node
   */
  updateNode(id, updates) {
    const node = this.getNode(id);
    if (!node) return null;

    // Store old values for event
    const oldValues = { ...node };

    // Apply updates
    Object.assign(node, updates);
    node.updatedAt = Date.now();

    this.emitEvent('node:updated', { node, oldValues, updates });

    return node;
  }

  /**
   * Delete a node
   */
  deleteNode(id) {
    const index = this.nodes.findIndex(n => n.id === id);
    if (index === -1) return false;

    const node = this.nodes[index];
    this.nodes.splice(index, 1);

    this.emitEvent('node:deleted', node);

    return true;
  }

  /**
   * Get a node by ID
   */
  getNode(id) {
    return this.nodes.find(n => n.id === id);
  }

  /**
   * Get all nodes
   */
  getAllNodes() {
    return [...this.nodes];
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type) {
    return this.nodes.filter(n => n.type === type);
  }

  /**
   * Select a node
   */
  selectNode(id, exclusive = true) {
    if (exclusive) {
      this.nodes.forEach(n => n.selected = false);
    }

    const node = this.getNode(id);
    if (node) {
      node.selected = true;
      this.emitEvent('node:selected', node);
    }
  }

  /**
   * Deselect all nodes
   */
  deselectAll() {
    this.nodes.forEach(n => n.selected = false);
    this.emitEvent('node:deselected');
  }

  /**
   * Get selected nodes
   */
  getSelectedNodes() {
    return this.nodes.filter(n => n.selected);
  }

  /**
   * Move nodes
   */
  moveNodes(nodeIds, deltaX, deltaY) {
    const movedNodes = [];

    nodeIds.forEach(id => {
      const node = this.getNode(id);
      if (node) {
        node.x += deltaX;
        node.y += deltaY;
        node.updatedAt = Date.now();
        movedNodes.push(node);
      }
    });

    if (movedNodes.length > 0) {
      this.emitEvent('nodes:moved', movedNodes);
    }

    return movedNodes;
  }

  /**
   * Resize a node
   */
  resizeNode(id, width, height) {
    const node = this.getNode(id);
    if (!node) return null;

    const oldSize = { width: node.width, height: node.height };

    // Apply constraints
    node.width = Math.max(100, Math.min(800, width));
    node.height = Math.max(50, Math.min(600, height));
    node.updatedAt = Date.now();

    this.emitEvent('node:resized', { node, oldSize });

    return node;
  }

  /**
   * Clone a node
   */
  cloneNode(id, offsetX = 50, offsetY = 50) {
    const original = this.getNode(id);
    if (!original) return null;

    const clone = this.createNode(
      original.type,
      original.x + offsetX,
      original.y + offsetY,
      {
        ...original,
        id: undefined, // Let createNode generate new ID
        selected: false,
        processing: false,
        error: null,
        hasBeenProcessed: false,
        inputs: [],
        outputs: [],
        title: `${original.title} (Copy)`
      }
    );

    return clone;
  }

  /**
   * Find node at position
   */
  getNodeAt(x, y) {
    // Search in reverse order (top to bottom)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (x >= node.x && x <= node.x + node.width &&
          y >= node.y && y <= node.y + node.height) {
        return node;
      }
    }
    return null;
  }

  /**
   * Get nodes in rectangle
   */
  getNodesInRect(x, y, width, height) {
    return this.nodes.filter(node => {
      return !(node.x + node.width < x ||
               node.y + node.height < y ||
               node.x > x + width ||
               node.y > y + height);
    });
  }

  /**
   * Bring node to front
   */
  bringToFront(id) {
    const index = this.nodes.findIndex(n => n.id === id);
    if (index === -1 || index === this.nodes.length - 1) return;

    const node = this.nodes.splice(index, 1)[0];
    this.nodes.push(node);

    this.emitEvent('node:reordered', node);
  }

  /**
   * Send node to back
   */
  sendToBack(id) {
    const index = this.nodes.findIndex(n => n.id === id);
    if (index === -1 || index === 0) return;

    const node = this.nodes.splice(index, 1)[0];
    this.nodes.unshift(node);

    this.emitEvent('node:reordered', node);
  }

  /**
   * Align nodes
   */
  alignNodes(nodeIds, alignment) {
    const nodes = nodeIds.map(id => this.getNode(id)).filter(Boolean);
    if (nodes.length < 2) return;

    let targetValue;

    switch (alignment) {
      case 'left':
        targetValue = Math.min(...nodes.map(n => n.x));
        nodes.forEach(n => {
          n.x = targetValue;
          n.updatedAt = Date.now();
        });
        break;

      case 'right':
        targetValue = Math.max(...nodes.map(n => n.x + n.width));
        nodes.forEach(n => {
          n.x = targetValue - n.width;
          n.updatedAt = Date.now();
        });
        break;

      case 'top':
        targetValue = Math.min(...nodes.map(n => n.y));
        nodes.forEach(n => {
          n.y = targetValue;
          n.updatedAt = Date.now();
        });
        break;

      case 'bottom':
        targetValue = Math.max(...nodes.map(n => n.y + n.height));
        nodes.forEach(n => {
          n.y = targetValue - n.height;
          n.updatedAt = Date.now();
        });
        break;

      case 'center-h':
        targetValue = nodes.reduce((sum, n) => sum + n.x + n.width/2, 0) / nodes.length;
        nodes.forEach(n => {
          n.x = targetValue - n.width/2;
          n.updatedAt = Date.now();
        });
        break;

      case 'center-v':
        targetValue = nodes.reduce((sum, n) => sum + n.y + n.height/2, 0) / nodes.length;
        nodes.forEach(n => {
          n.y = targetValue - n.height/2;
          n.updatedAt = Date.now();
        });
        break;
    }

    this.emitEvent('nodes:aligned', { nodes, alignment });
  }

  /**
   * Distribute nodes
   */
  distributeNodes(nodeIds, direction, spacing = 50) {
    const nodes = nodeIds.map(id => this.getNode(id)).filter(Boolean);
    if (nodes.length < 3) return;

    if (direction === 'horizontal') {
      nodes.sort((a, b) => a.x - b.x);
      const startX = nodes[0].x;
      let currentX = startX;

      nodes.forEach((node, index) => {
        if (index > 0) {
          currentX += nodes[index - 1].width + spacing;
        }
        node.x = currentX;
        node.updatedAt = Date.now();
      });
    } else if (direction === 'vertical') {
      nodes.sort((a, b) => a.y - b.y);
      const startY = nodes[0].y;
      let currentY = startY;

      nodes.forEach((node, index) => {
        if (index > 0) {
          currentY += nodes[index - 1].height + spacing;
        }
        node.y = currentY;
        node.updatedAt = Date.now();
      });
    }

    this.emitEvent('nodes:distributed', { nodes, direction });
  }

  /**
   * Serialize nodes
   */
  serialize() {
    return this.nodes.map(node => ({
      ...node,
      // Exclude runtime state
      selected: undefined,
      processing: undefined,
      error: undefined
    }));
  }

  /**
   * Deserialize nodes
   */
  deserialize(data) {
    this.nodes = [];

    data.forEach(nodeData => {
      const node = {
        ...nodeData,
        selected: false,
        processing: false,
        error: null,
        updatedAt: Date.now()
      };
      this.nodes.push(node);
    });

    this.emitEvent('nodes:loaded', this.nodes);
  }

  /**
   * Clear all nodes
   */
  clear() {
    this.nodes = [];
    this.emitEvent('nodes:cleared');
  }

  /**
   * Generate unique node ID
   */
  generateNodeId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event emitter (to be connected to main event system)
   */
  emitEvent(event, data) {
    if (window.EventBus) {
      window.EventBus.emit(event, data);
    }
  }
}