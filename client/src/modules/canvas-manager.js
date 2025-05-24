import EventBus from './event-bus.js';
import { CanvasRenderer } from './canvas-renderer.js';

/**
 * CanvasManager - Handles canvas operations and interactions
 */
export class CanvasManager {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.renderer = new CanvasRenderer(canvasElement, options.renderer);
    
    // State
    this.scale = options.scale || 1;
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;
    this.isDragging = false;
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionRect = null;
    
    // Grid settings
    this.gridSize = options.gridSize || 20;
    this.snapToGrid = options.snapToGrid || false;
    this.showGrid = options.showGrid || true;
    
    // Performance settings
    this.maxScale = options.maxScale || 5;
    this.minScale = options.minScale || 0.1;
    this.enableDirtyTracking = options.enableDirtyTracking !== false;
    
    this.init();
  }

  /**
   * Initialize canvas manager
   */
  init() {
    this.setupEventListeners();
    this.resize();
    this.render();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Window events
    window.addEventListener('resize', this.resize.bind(this));
    
    // Global events
    EventBus.on('node:moved', this.handleNodeMoved.bind(this));
    EventBus.on('node:added', this.handleNodeAdded.bind(this));
    EventBus.on('node:removed', this.handleNodeRemoved.bind(this));
    EventBus.on('connection:added', this.invalidateRegion.bind(this));
    EventBus.on('connection:removed', this.invalidateRegion.bind(this));
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(event) {
    event.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldPos = this.screenToWorld(x, y);
    
    // Check if clicking on a node
    const clickedNode = this.getNodeAt(worldPos.x, worldPos.y);
    
    if (event.button === 0) { // Left click
      if (clickedNode) {
        EventBus.emit('canvas:nodeClicked', { node: clickedNode, event, position: worldPos });
      } else {
        // Start canvas panning or selection
        if (event.shiftKey) {
          this.startSelection(worldPos);
        } else {
          this.startPanning(x, y);
        }
      }
    } else if (event.button === 2) { // Right click
      EventBus.emit('canvas:contextMenu', { position: worldPos, event });
    }
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldPos = this.screenToWorld(x, y);
    
    if (this.isDragging) {
      this.updatePanning(x, y);
    } else if (this.isSelecting) {
      this.updateSelection(worldPos);
    } else {
      // Hover detection
      const hoveredNode = this.getNodeAt(worldPos.x, worldPos.y);
      EventBus.emit('canvas:hover', { node: hoveredNode, position: worldPos });
    }
    
    // Update cursor
    this.updateCursor(worldPos);
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(event) {
    if (this.isDragging) {
      this.stopPanning();
    } else if (this.isSelecting) {
      this.finishSelection();
    }
  }

  /**
   * Handle wheel for zooming
   */
  handleWheel(event) {
    event.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomAt(x, y, delta);
  }

  /**
   * Start canvas panning
   */
  startPanning(x, y) {
    this.isDragging = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Update canvas panning
   */
  updatePanning(x, y) {
    if (!this.isDragging) return;
    
    const deltaX = x - this.lastMouseX;
    const deltaY = y - this.lastMouseY;
    
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    
    this.lastMouseX = x;
    this.lastMouseY = y;
    
    this.invalidateAll();
    EventBus.emit('canvas:panned', { offsetX: this.offsetX, offsetY: this.offsetY });
  }

  /**
   * Stop canvas panning
   */
  stopPanning() {
    this.isDragging = false;
    this.canvas.style.cursor = 'default';
  }

  /**
   * Start selection
   */
  startSelection(worldPos) {
    this.isSelecting = true;
    this.selectionStart = { x: worldPos.x, y: worldPos.y };
    this.selectionRect = { x: worldPos.x, y: worldPos.y, width: 0, height: 0 };
  }

  /**
   * Update selection
   */
  updateSelection(worldPos) {
    if (!this.isSelecting || !this.selectionStart) return;
    
    this.selectionRect = {
      x: Math.min(this.selectionStart.x, worldPos.x),
      y: Math.min(this.selectionStart.y, worldPos.y),
      width: Math.abs(worldPos.x - this.selectionStart.x),
      height: Math.abs(worldPos.y - this.selectionStart.y)
    };
    
    this.invalidateAll();
  }

  /**
   * Finish selection
   */
  finishSelection() {
    if (this.selectionRect && (this.selectionRect.width > 5 || this.selectionRect.height > 5)) {
      const selectedNodes = this.getNodesInRect(this.selectionRect);
      EventBus.emit('canvas:nodesSelected', { nodes: selectedNodes, rect: this.selectionRect });
    }
    
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionRect = null;
    this.invalidateAll();
  }

  /**
   * Zoom at specific point
   */
  zoomAt(screenX, screenY, factor) {
    const oldScale = this.scale;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    
    if (newScale === oldScale) return;
    
    // Calculate zoom point in world coordinates
    const worldX = (screenX - this.offsetX) / oldScale;
    const worldY = (screenY - this.offsetY) / oldScale;
    
    // Update scale
    this.scale = newScale;
    
    // Adjust offset to keep zoom point stationary
    this.offsetX = screenX - worldX * newScale;
    this.offsetY = screenY - worldY * newScale;
    
    this.invalidateAll();
    EventBus.emit('canvas:zoomed', { 
      scale: this.scale, 
      offsetX: this.offsetX, 
      offsetY: this.offsetY 
    });
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.scale + this.offsetX,
      y: worldY * this.scale + this.offsetY
    };
  }

  /**
   * Snap coordinates to grid
   */
  snapToGridCoords(x, y) {
    if (!this.snapToGrid) return { x, y };
    
    return {
      x: Math.round(x / this.gridSize) * this.gridSize,
      y: Math.round(y / this.gridSize) * this.gridSize
    };
  }

  /**
   * Get node at position
   */
  getNodeAt(worldX, worldY) {
    // This would be implemented by the node manager
    // For now, emit event to let other systems handle it
    const result = EventBus.emitSync('canvas:getNodeAt', { x: worldX, y: worldY });
    return result?.node || null;
  }

  /**
   * Get nodes in rectangle
   */
  getNodesInRect(rect) {
    const result = EventBus.emitSync('canvas:getNodesInRect', rect);
    return result?.nodes || [];
  }

  /**
   * Handle node moved
   */
  handleNodeMoved(data) {
    if (data.oldBounds && data.newBounds) {
      this.invalidateRegion(data.oldBounds);
      this.invalidateRegion(data.newBounds);
    } else {
      this.invalidateAll();
    }
  }

  /**
   * Handle node added
   */
  handleNodeAdded(data) {
    if (data.bounds) {
      this.invalidateRegion(data.bounds);
    } else {
      this.invalidateAll();
    }
  }

  /**
   * Handle node removed
   */
  handleNodeRemoved(data) {
    if (data.bounds) {
      this.invalidateRegion(data.bounds);
    } else {
      this.invalidateAll();
    }
  }

  /**
   * Invalidate specific region for redraw
   */
  invalidateRegion(rect) {
    if (this.enableDirtyTracking) {
      this.renderer.invalidateRegion(rect);
    } else {
      this.invalidateAll();
    }
  }

  /**
   * Invalidate entire canvas
   */
  invalidateAll() {
    this.renderer.invalidateAll();
  }

  /**
   * Resize canvas
   */
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas size
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Scale context for crisp rendering
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Update renderer
    this.renderer.resize(rect.width, rect.height);
    
    this.invalidateAll();
    EventBus.emit('canvas:resized', { width: rect.width, height: rect.height });
  }

  /**
   * Render canvas
   */
  render() {
    this.renderer.render({
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      gridSize: this.gridSize,
      showGrid: this.showGrid,
      selectionRect: this.selectionRect
    });
  }

  /**
   * Update cursor based on context
   */
  updateCursor(worldPos) {
    let cursor = 'default';
    
    if (this.isDragging) {
      cursor = 'grabbing';
    } else if (this.isSelecting) {
      cursor = 'crosshair';
    } else {
      const node = this.getNodeAt(worldPos.x, worldPos.y);
      if (node) {
        cursor = 'pointer';
      }
    }
    
    this.canvas.style.cursor = cursor;
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    // Zoom shortcuts
    if (event.ctrlKey || event.metaKey) {
      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 1.1);
      } else if (event.key === '-') {
        event.preventDefault();
        this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 0.9);
      } else if (event.key === '0') {
        event.preventDefault();
        this.resetView();
      }
    }
    
    // Grid toggle
    if (event.key === 'g' && !event.ctrlKey && !event.metaKey) {
      this.toggleGrid();
    }
  }

  handleKeyUp(event) {
    // Handle key release events if needed
  }

  /**
   * Reset view to default
   */
  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.invalidateAll();
    EventBus.emit('canvas:viewReset');
  }

  /**
   * Toggle grid visibility
   */
  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.invalidateAll();
    EventBus.emit('canvas:gridToggled', { showGrid: this.showGrid });
  }

  /**
   * Fit content to view
   */
  fitToContent() {
    const result = EventBus.emitSync('canvas:getBounds');
    const bounds = result?.bounds;
    
    if (!bounds) return;
    
    const padding = 50;
    const canvasRect = this.canvas.getBoundingClientRect();
    
    const scaleX = (canvasRect.width - padding * 2) / bounds.width;
    const scaleY = (canvasRect.height - padding * 2) / bounds.height;
    const newScale = Math.min(scaleX, scaleY, this.maxScale);
    
    this.scale = Math.max(this.minScale, newScale);
    this.offsetX = (canvasRect.width - bounds.width * this.scale) / 2 - bounds.x * this.scale;
    this.offsetY = (canvasRect.height - bounds.height * this.scale) / 2 - bounds.y * this.scale;
    
    this.invalidateAll();
    EventBus.emit('canvas:fittedToContent');
  }

  /**
   * Handle touch events
   */
  handleTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.startPanning(x, y);
    }
  }

  handleTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1 && this.isDragging) {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.updatePanning(x, y);
    }
  }

  handleTouchEnd(event) {
    event.preventDefault();
    this.stopPanning();
  }

  handleContextMenu(event) {
    event.preventDefault();
  }

  /**
   * Get current view state
   */
  getViewState() {
    return {
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      gridSize: this.gridSize,
      showGrid: this.showGrid,
      snapToGrid: this.snapToGrid
    };
  }

  /**
   * Set view state
   */
  setViewState(state) {
    this.scale = state.scale || this.scale;
    this.offsetX = state.offsetX || this.offsetX;
    this.offsetY = state.offsetY || this.offsetY;
    this.gridSize = state.gridSize || this.gridSize;
    this.showGrid = state.showGrid !== undefined ? state.showGrid : this.showGrid;
    this.snapToGrid = state.snapToGrid !== undefined ? state.snapToGrid : this.snapToGrid;
    
    this.invalidateAll();
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.resize);
    
    // Clean up renderer
    this.renderer.destroy();
    
    EventBus.off('node:moved', this.handleNodeMoved);
    EventBus.off('node:added', this.handleNodeAdded);
    EventBus.off('node:removed', this.handleNodeRemoved);
  }
}

export default CanvasManager;