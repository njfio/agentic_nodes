const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./loggingService');

/**
 * WebSocket service for real-time collaboration
 */
class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of client connections with their IDs
    this.rooms = new Map();   // Map of room IDs to sets of client IDs
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP/HTTPS server instance
   */
  initialize(server) {
    logger.info('Initializing WebSocket server');
    
    // Create WebSocket server
    this.wss = new WebSocket.Server({ 
      server,
      // Custom headers verification if needed
      verifyClient: (_info) => {
        // Can verify auth tokens, origin, etc.
        return true; // Allow all connections by default
      }
    });

    // Set up event handlers
    this.setupEventHandlers();
    
    // Set up heartbeat interval to detect disconnected clients
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30000);
    
    logger.info('WebSocket server initialized');
  }

  /**
   * Set up WebSocket event handlers
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      // Generate unique client ID
      const clientId = uuidv4();
      
      // Parse client IP
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      // Store client info
      this.clients.set(clientId, {
        ws,
        ip,
        isAlive: true,
        userId: null,
        roomId: null,
        lastActivity: Date.now()
      });
      
      logger.info(`WebSocket client connected: ${clientId}`, { ip });
      
      // Handle ping/pong for connection health check
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
          client.lastActivity = Date.now();
        }
      });
      
      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          logger.error('Invalid WebSocket message format', { clientId, error });
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected: ${clientId}`);
        this.handleDisconnect(clientId);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client: ${clientId}`, { error });
      });
      
      // Send initial welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId
      }));
    });
  }

  /**
   * Handle incoming WebSocket messages
   * @param {string} clientId - Client ID
   * @param {Object} data - Message data
   */
  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Update last activity timestamp
    client.lastActivity = Date.now();
    
    // Process message based on type
    switch (data.type) {
      case 'auth':
        this.handleAuth(clientId, data);
        break;
        
      case 'join':
        this.handleJoinRoom(clientId, data);
        break;
        
      case 'leave':
        this.handleLeaveRoom(clientId);
        break;
        
      case 'message':
        this.handleRoomMessage(clientId, data);
        break;
        
      case 'cursor':
        this.handleCursorUpdate(clientId, data);
        break;
        
      case 'workflow_update':
        this.handleWorkflowUpdate(clientId, data);
        break;
        
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      default:
        logger.warn(`Unknown WebSocket message type: ${data.type}`, { clientId });
        client.ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  /**
   * Handle client authentication
   * @param {string} clientId - Client ID
   * @param {Object} data - Auth data
   */
  handleAuth(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Validate token here if needed
    const userId = data.userId;
    
    // Update client info
    client.userId = userId;
    client.username = data.username;
    
    logger.info(`WebSocket client authenticated: ${clientId}`, { userId });
    
    // Confirm authentication
    client.ws.send(JSON.stringify({
      type: 'auth_success',
      userId
    }));
  }

  /**
   * Handle client joining a room
   * @param {string} clientId - Client ID
   * @param {Object} data - Room data
   */
  handleJoinRoom(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { roomId } = data;
    
    // Leave current room if in one
    if (client.roomId) {
      this.handleLeaveRoom(clientId);
    }
    
    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    // Add client to room
    this.rooms.get(roomId).add(clientId);
    client.roomId = roomId;
    
    logger.info(`Client ${clientId} joined room ${roomId}`);
    
    // Get list of clients in the room
    const roomClients = [];
    for (const roomClientId of this.rooms.get(roomId)) {
      const roomClient = this.clients.get(roomClientId);
      if (roomClient && roomClient.userId) {
        roomClients.push({
          clientId: roomClientId,
          userId: roomClient.userId,
          username: roomClient.username
        });
      }
    }
    
    // Notify all clients in the room about the new client
    this.broadcastToRoom(roomId, {
      type: 'client_joined',
      clientId,
      userId: client.userId,
      username: client.username,
      clients: roomClients
    });
  }

  /**
   * Handle client leaving a room
   * @param {string} clientId - Client ID
   */
  handleLeaveRoom(clientId) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;
    
    const roomId = client.roomId;
    
    // Remove client from room
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      
      // Delete room if empty
      if (room.size === 0) {
        this.rooms.delete(roomId);
        logger.info(`Room ${roomId} deleted (empty)`);
      } else {
        // Notify others in the room
        this.broadcastToRoom(roomId, {
          type: 'client_left',
          clientId,
          userId: client.userId
        }, [clientId]); // Exclude the leaving client
      }
    }
    
    // Update client
    client.roomId = null;
    
    logger.info(`Client ${clientId} left room ${roomId}`);
  }

  /**
   * Handle room message
   * @param {string} clientId - Client ID
   * @param {Object} data - Message data
   */
  handleRoomMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;
    
    // Broadcast message to room
    this.broadcastToRoom(client.roomId, {
      type: 'message',
      clientId,
      userId: client.userId,
      username: client.username,
      content: data.content,
      timestamp: Date.now()
    });
  }

  /**
   * Handle cursor position update
   * @param {string} clientId - Client ID
   * @param {Object} data - Cursor data
   */
  handleCursorUpdate(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;
    
    // Broadcast cursor position to room
    this.broadcastToRoom(client.roomId, {
      type: 'cursor',
      clientId,
      position: data.position
    }, [clientId]); // Exclude the sender
  }

  /**
   * Handle workflow update
   * @param {string} clientId - Client ID
   * @param {Object} data - Workflow update data
   */
  handleWorkflowUpdate(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;
    
    // Broadcast workflow update to room
    this.broadcastToRoom(client.roomId, {
      type: 'workflow_update',
      clientId,
      userId: client.userId,
      username: client.username,
      workflowId: data.workflowId,
      update: data.update,
      timestamp: Date.now()
    }, [clientId]); // Exclude the sender
  }

  /**
   * Handle client disconnection
   * @param {string} clientId - Client ID
   */
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Leave current room if in one
    if (client.roomId) {
      this.handleLeaveRoom(clientId);
    }
    
    // Remove client
    this.clients.delete(clientId);
    
    logger.info(`Client ${clientId} removed from WebSocket service`);
  }

  /**
   * Check client heartbeats and remove inactive clients
   */
  checkHeartbeats() {
    const now = Date.now();
    
    for (const [clientId, client] of this.clients.entries()) {
      // Check if client is still alive
      if (!client.isAlive) {
        logger.info(`Terminating inactive WebSocket client: ${clientId}`);
        client.ws.terminate();
        this.handleDisconnect(clientId);
        continue;
      }
      
      // Check if client has been inactive for too long (5 minutes)
      if (now - client.lastActivity > 5 * 60 * 1000) {
        logger.info(`Terminating inactive WebSocket client: ${clientId}`);
        client.ws.terminate();
        this.handleDisconnect(clientId);
        continue;
      }
      
      // Mark as not alive until pong is received
      client.isAlive = false;
      client.ws.ping();
    }
  }

  /**
   * Broadcast message to all clients in a room
   * @param {string} roomId - Room ID
   * @param {Object} message - Message to broadcast
   * @param {Array} excludeClientIds - Client IDs to exclude
   */
  broadcastToRoom(roomId, message, excludeClientIds = []) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const messageStr = JSON.stringify(message);
    
    for (const clientId of room) {
      // Skip excluded clients
      if (excludeClientIds.includes(clientId)) continue;
      
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  /**
   * Send message to specific client
   * @param {string} clientId - Client ID
   * @param {Object} message - Message to send
   * @returns {boolean} - Whether message was sent
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      return true;
    }
    
    return false;
  }

  /**
   * Get connected clients count
   * @returns {number} - Number of connected clients
   */
  getClientsCount() {
    return this.clients.size;
  }

  /**
   * Get active rooms count
   * @returns {number} - Number of active rooms
   */
  getRoomsCount() {
    return this.rooms.size;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    logger.info('Shutting down WebSocket server');
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close all connections
    for (const client of this.clients.values()) {
      try {
        client.ws.terminate();
      } catch {
        // Ignore errors during shutdown
      }
    }
    
    // Clear client and room maps
    this.clients.clear();
    this.rooms.clear();
    
    // Close server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    logger.info('WebSocket server shut down');
  }
}

module.exports = new WebSocketService();
