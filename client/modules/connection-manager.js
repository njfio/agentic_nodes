/**
 * Connection Manager Module
 * Handles connections between nodes
 */

window.ConnectionManager = class ConnectionManager {
  constructor(nodeManager) {
    this.nodeManager = nodeManager;
    this.connections = [];
    this.connectionRules = new Map();
    this.tempConnection = null;
  }

  /**
   * Register connection rules for node types
   */
  registerConnectionRule(fromType, toType, validator = null) {
    const key = `${fromType}->${toType}`;
    this.connectionRules.set(key, {
      fromType,
      toType,
      validator: validator || (() => true)
    });
  }

  /**
   * Check if connection is allowed
   */
  canConnect(fromNode, toNode) {
    // Can't connect to self
    if (fromNode.id === toNode.id) return false;

    // Check if already connected
    if (this.isConnected(fromNode.id, toNode.id)) return false;

    // Check connection rules
    const key = `${fromNode.type}->${toNode.type}`;
    const rule = this.connectionRules.get(key);

    if (rule) {
      return rule.validator(fromNode, toNode);
    }

    // If no specific rule, check wildcard rules
    const wildcardFromKey = `*->${toNode.type}`;
    const wildcardToKey = `${fromNode.type}->*`;
    const wildcardBothKey = `*->*`;

    for (const wildcardKey of [wildcardFromKey, wildcardToKey, wildcardBothKey]) {
      const wildcardRule = this.connectionRules.get(wildcardKey);
      if (wildcardRule) {
        return wildcardRule.validator(fromNode, toNode);
      }
    }

    // Default: allow all connections
    return true;
  }

  /**
   * Create a connection
   */
  createConnection(fromNodeId, toNodeId, options = {}) {
    const fromNode = this.nodeManager.getNode(fromNodeId);
    const toNode = this.nodeManager.getNode(toNodeId);

    if (!fromNode || !toNode) {
      throw new Error('Invalid node IDs');
    }

    if (!this.canConnect(fromNode, toNode)) {
      throw new Error('Connection not allowed');
    }

    const connection = {
      id: this.generateConnectionId(),
      from: fromNodeId,
      to: toNodeId,
      fromPort: options.fromPort || 'output',
      toPort: options.toPort || 'input',
      type: options.type || 'data',
      label: options.label || '',
      color: options.color || '#4a90e2',
      style: options.style || 'solid',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.connections.push(connection);

    // Update node connection lists
    fromNode.outputs.push(connection.id);
    toNode.inputs.push(connection.id);

    this.emitEvent('connection:created', connection);

    return connection;
  }

  /**
   * Delete a connection
   */
  deleteConnection(id) {
    const index = this.connections.findIndex(c => c.id === id);
    if (index === -1) return false;

    const connection = this.connections[index];
    this.connections.splice(index, 1);

    // Update node connection lists
    const fromNode = this.nodeManager.getNode(connection.from);
    const toNode = this.nodeManager.getNode(connection.to);

    if (fromNode) {
      fromNode.outputs = fromNode.outputs.filter(cId => cId !== id);
    }

    if (toNode) {
      toNode.inputs = toNode.inputs.filter(cId => cId !== id);
    }

    this.emitEvent('connection:deleted', connection);

    return true;
  }

  /**
   * Delete all connections for a node
   */
  deleteNodeConnections(nodeId) {
    const toDelete = this.connections.filter(c =>
      c.from === nodeId || c.to === nodeId
    ).map(c => c.id);

    toDelete.forEach(id => this.deleteConnection(id));

    return toDelete.length;
  }

  /**
   * Get connection by ID
   */
  getConnection(id) {
    return this.connections.find(c => c.id === id);
  }

  /**
   * Get all connections
   */
  getAllConnections() {
    return [...this.connections];
  }

  /**
   * Get connections for a node
   */
  getNodeConnections(nodeId) {
    return this.connections.filter(c =>
      c.from === nodeId || c.to === nodeId
    );
  }

  /**
   * Get input connections for a node
   */
  getInputConnections(nodeId) {
    return this.connections.filter(c => c.to === nodeId);
  }

  /**
   * Get output connections for a node
   */
  getOutputConnections(nodeId) {
    return this.connections.filter(c => c.from === nodeId);
  }

  /**
   * Check if two nodes are connected
   */
  isConnected(fromNodeId, toNodeId) {
    return this.connections.some(c =>
      c.from === fromNodeId && c.to === toNodeId
    );
  }

  /**
   * Get connected nodes (downstream)
   */
  getConnectedNodes(nodeId) {
    const connections = this.getOutputConnections(nodeId);
    return connections.map(c => this.nodeManager.getNode(c.to)).filter(Boolean);
  }

  /**
   * Get source nodes (upstream)
   */
  getSourceNodes(nodeId) {
    const connections = this.getInputConnections(nodeId);
    return connections.map(c => this.nodeManager.getNode(c.from)).filter(Boolean);
  }

  /**
   * Find path between nodes
   */
  findPath(fromNodeId, toNodeId, visited = new Set()) {
    if (fromNodeId === toNodeId) return [fromNodeId];

    if (visited.has(fromNodeId)) return null;
    visited.add(fromNodeId);

    const connections = this.getOutputConnections(fromNodeId);

    for (const connection of connections) {
      const path = this.findPath(connection.to, toNodeId, visited);
      if (path) {
        return [fromNodeId, ...path];
      }
    }

    return null;
  }

  /**
   * Check for cycles
   */
  hasCycle(startNodeId = null) {
    const nodes = startNodeId
      ? [this.nodeManager.getNode(startNodeId)]
      : this.nodeManager.getAllNodes();

    for (const node of nodes) {
      if (this.hasCycleFrom(node.id, new Set(), new Set())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for cycle from specific node
   */
  hasCycleFrom(nodeId, visited, recursionStack) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const connections = this.getOutputConnections(nodeId);

    for (const connection of connections) {
      const nextNodeId = connection.to;

      if (!visited.has(nextNodeId)) {
        if (this.hasCycleFrom(nextNodeId, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(nextNodeId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  /**
   * Get topological sort of nodes
   */
  getTopologicalSort() {
    const nodes = this.nodeManager.getAllNodes();
    const visited = new Set();
    const stack = [];

    const visit = (nodeId) => {
      visited.add(nodeId);

      const connections = this.getOutputConnections(nodeId);
      for (const connection of connections) {
        if (!visited.has(connection.to)) {
          visit(connection.to);
        }
      }

      stack.push(nodeId);
    };

    // Visit all nodes
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return stack.reverse();
  }

  /**
   * Start temporary connection (for UI)
   */
  startTempConnection(fromNodeId, fromX, fromY) {
    this.tempConnection = {
      from: fromNodeId,
      fromX,
      fromY,
      toX: fromX,
      toY: fromY
    };
  }

  /**
   * Update temporary connection
   */
  updateTempConnection(toX, toY) {
    if (this.tempConnection) {
      this.tempConnection.toX = toX;
      this.tempConnection.toY = toY;
    }
  }

  /**
   * Complete temporary connection
   */
  completeTempConnection(toNodeId) {
    if (!this.tempConnection) return null;

    try {
      const connection = this.createConnection(
        this.tempConnection.from,
        toNodeId
      );
      this.tempConnection = null;
      return connection;
    } catch (error) {
      this.cancelTempConnection();
      throw error;
    }
  }

  /**
   * Cancel temporary connection
   */
  cancelTempConnection() {
    this.tempConnection = null;
  }

  /**
   * Get temporary connection
   */
  getTempConnection() {
    return this.tempConnection;
  }

  /**
   * Update connection
   */
  updateConnection(id, updates) {
    const connection = this.getConnection(id);
    if (!connection) return null;

    Object.assign(connection, updates);
    connection.updatedAt = Date.now();

    this.emitEvent('connection:updated', connection);

    return connection;
  }

  /**
   * Serialize connections
   */
  serialize() {
    return this.connections.map(connection => ({
      ...connection
    }));
  }

  /**
   * Deserialize connections
   */
  deserialize(data) {
    this.connections = [];

    data.forEach(connectionData => {
      const connection = {
        ...connectionData,
        updatedAt: Date.now()
      };
      this.connections.push(connection);

      // Update node connection lists
      const fromNode = this.nodeManager.getNode(connection.from);
      const toNode = this.nodeManager.getNode(connection.to);

      if (fromNode && !fromNode.outputs.includes(connection.id)) {
        fromNode.outputs.push(connection.id);
      }

      if (toNode && !toNode.inputs.includes(connection.id)) {
        toNode.inputs.push(connection.id);
      }
    });

    this.emitEvent('connections:loaded', this.connections);
  }

  /**
   * Clear all connections
   */
  clear() {
    // Clear node connection lists
    this.nodeManager.getAllNodes().forEach(node => {
      node.inputs = [];
      node.outputs = [];
    });

    this.connections = [];
    this.tempConnection = null;

    this.emitEvent('connections:cleared');
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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