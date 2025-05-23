/**
 * Canvas Renderer Module
 * Optimized rendering with dirty rectangles and layers
 */

import { CanvasUtils } from './canvas-utils.js';

export class CanvasRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Rendering options
    this.options = {
      enableDirtyRects: true,
      enableLayers: true,
      enableCaching: true,
      maxFPS: 60,
      backgroundColor: '#f5f5f5',
      showGrid: true,
      gridSize: 20,
      showDebugInfo: false,
      ...options
    };

    // View state
    this.viewState = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1
    };

    // Dirty rectangles
    this.dirtyRects = [];
    this.fullRedraw = true;

    // Layers
    this.layers = {
      background: null,
      grid: null,
      connections: null,
      nodes: null,
      overlay: null
    };

    // Node cache
    this.nodeCache = new Map();

    // Performance tracking
    this.performance = {
      lastFrameTime: 0,
      fps: 0,
      renderTime: 0,
      nodeCount: 0,
      visibleNodeCount: 0
    };

    // Animation frame
    this.animationFrameId = null;
    this.renderRequested = false;

    this.initializeLayers();
  }

  /**
   * Initialize canvas layers
   */
  initializeLayers() {
    if (!this.options.enableLayers) return;

    // Create off-screen canvases for each layer
    for (const layer in this.layers) {
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = this.canvas.width;
      layerCanvas.height = this.canvas.height;
      this.layers[layer] = {
        canvas: layerCanvas,
        ctx: layerCanvas.getContext('2d'),
        dirty: true
      };
    }
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;

    // Resize layers
    if (this.options.enableLayers) {
      for (const layer in this.layers) {
        if (this.layers[layer]) {
          this.layers[layer].canvas.width = width;
          this.layers[layer].canvas.height = height;
          this.layers[layer].dirty = true;
        }
      }
    }

    // Clear cache
    this.nodeCache.clear();
    
    // Force full redraw
    this.fullRedraw = true;
    this.requestRender();
  }

  /**
   * Set view state
   */
  setViewState(offsetX, offsetY, zoom) {
    const changed = 
      this.viewState.offsetX !== offsetX ||
      this.viewState.offsetY !== offsetY ||
      this.viewState.zoom !== zoom;

    if (changed) {
      this.viewState.offsetX = offsetX;
      this.viewState.offsetY = offsetY;
      this.viewState.zoom = zoom;

      // Mark grid layer as dirty
      if (this.layers.grid) {
        this.layers.grid.dirty = true;
      }

      // Request render
      this.requestRender();
    }
  }

  /**
   * Add dirty rectangle
   */
  addDirtyRect(x, y, width, height) {
    if (!this.options.enableDirtyRects) {
      this.fullRedraw = true;
      return;
    }

    // Convert to screen coordinates
    const screenRect = this.worldToScreenRect(x, y, width, height);
    
    // Add some padding
    const padding = 5;
    this.dirtyRects.push({
      x: screenRect.x - padding,
      y: screenRect.y - padding,
      width: screenRect.width + padding * 2,
      height: screenRect.height + padding * 2
    });

    this.requestRender();
  }

  /**
   * Mark node as dirty
   */
  markNodeDirty(node) {
    // Invalidate cache
    this.nodeCache.delete(node.id);

    // Add dirty rect
    this.addDirtyRect(node.x, node.y, node.width, node.height);
  }

  /**
   * Mark connection as dirty
   */
  markConnectionDirty(connection, nodes) {
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);

    if (fromNode && toNode) {
      // Calculate bounding box of connection
      const minX = Math.min(fromNode.x + fromNode.width, toNode.x);
      const maxX = Math.max(fromNode.x + fromNode.width, toNode.x);
      const minY = Math.min(fromNode.y + fromNode.height/2, toNode.y + toNode.height/2);
      const maxY = Math.max(fromNode.y + fromNode.height/2, toNode.y + toNode.height/2);

      this.addDirtyRect(minX, minY, maxX - minX, maxY - minY);
    }

    // Mark connections layer as dirty
    if (this.layers.connections) {
      this.layers.connections.dirty = true;
    }
  }

  /**
   * Request render
   */
  requestRender() {
    if (this.renderRequested) return;

    this.renderRequested = true;
    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  /**
   * Main render function
   */
  render() {
    const startTime = performance.now();
    this.renderRequested = false;

    // Clear main canvas
    if (this.fullRedraw || !this.options.enableDirtyRects) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Clear only dirty rectangles
      this.clearDirtyRects();
    }

    if (this.options.enableLayers) {
      this.renderWithLayers();
    } else {
      this.renderDirect();
    }

    // Render debug info
    if (this.options.showDebugInfo) {
      this.renderDebugInfo();
    }

    // Update performance metrics
    this.updatePerformance(startTime);

    // Clear dirty rects
    this.dirtyRects = [];
    this.fullRedraw = false;
  }

  /**
   * Render with layers
   */
  renderWithLayers() {
    // Background layer
    if (this.layers.background.dirty || this.fullRedraw) {
      this.renderBackgroundLayer();
    }

    // Grid layer
    if (this.layers.grid.dirty || this.fullRedraw) {
      this.renderGridLayer();
    }

    // Composite layers
    this.composeLayers();
  }

  /**
   * Render directly to canvas
   */
  renderDirect() {
    const { offsetX, offsetY, zoom } = this.viewState;

    // Background
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    if (this.options.showGrid) {
      CanvasUtils.drawGrid(this.ctx, offsetX, offsetY, zoom, this.options.gridSize);
    }

    // Apply transform
    this.ctx.save();
    CanvasUtils.applyTransform(this.ctx, offsetX, offsetY, zoom);

    // Render content (to be implemented by subclass)
    this.renderContent();

    this.ctx.restore();
  }

  /**
   * Render background layer
   */
  renderBackgroundLayer() {
    const ctx = this.layers.background.ctx;
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.layers.background.dirty = false;
  }

  /**
   * Render grid layer
   */
  renderGridLayer() {
    const ctx = this.layers.grid.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.options.showGrid) {
      CanvasUtils.drawGrid(
        ctx,
        this.viewState.offsetX,
        this.viewState.offsetY,
        this.viewState.zoom,
        this.options.gridSize
      );
    }
    
    this.layers.grid.dirty = false;
  }

  /**
   * Compose layers onto main canvas
   */
  composeLayers() {
    // Draw layers in order
    const layerOrder = ['background', 'grid', 'connections', 'nodes', 'overlay'];
    
    for (const layerName of layerOrder) {
      const layer = this.layers[layerName];
      if (layer && layer.canvas) {
        if (this.fullRedraw || !this.options.enableDirtyRects) {
          // Draw entire layer
          this.ctx.drawImage(layer.canvas, 0, 0);
        } else {
          // Draw only dirty rectangles
          for (const rect of this.dirtyRects) {
            this.ctx.drawImage(
              layer.canvas,
              rect.x, rect.y, rect.width, rect.height,
              rect.x, rect.y, rect.width, rect.height
            );
          }
        }
      }
    }
  }

  /**
   * Clear dirty rectangles
   */
  clearDirtyRects() {
    for (const rect of this.dirtyRects) {
      this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  /**
   * Render debug info
   */
  renderDebugInfo() {
    const info = [
      `FPS: ${this.performance.fps.toFixed(1)}`,
      `Render: ${this.performance.renderTime.toFixed(1)}ms`,
      `Nodes: ${this.performance.visibleNodeCount}/${this.performance.nodeCount}`,
      `Zoom: ${(this.viewState.zoom * 100).toFixed(0)}%`,
      `Dirty Rects: ${this.dirtyRects.length}`
    ];

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 150, info.length * 20 + 10);
    
    this.ctx.fillStyle = '#0f0';
    this.ctx.font = '12px monospace';
    info.forEach((line, i) => {
      this.ctx.fillText(line, 15, 25 + i * 20);
    });
    
    this.ctx.restore();

    // Draw dirty rectangles
    if (this.dirtyRects.length > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      this.ctx.lineWidth = 1;
      
      for (const rect of this.dirtyRects) {
        this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
      
      this.ctx.restore();
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformance(startTime) {
    const now = performance.now();
    const renderTime = now - startTime;
    const deltaTime = now - this.performance.lastFrameTime;

    this.performance.renderTime = renderTime;
    this.performance.fps = 1000 / deltaTime;
    this.performance.lastFrameTime = now;
  }

  /**
   * Convert world rectangle to screen rectangle
   */
  worldToScreenRect(x, y, width, height) {
    const { offsetX, offsetY, zoom } = this.viewState;
    return {
      x: x * zoom + offsetX,
      y: y * zoom + offsetY,
      width: width * zoom,
      height: height * zoom
    };
  }

  /**
   * Render cached node
   */
  renderCachedNode(node, ctx) {
    if (!this.options.enableCaching) {
      return false;
    }

    const cacheKey = this.getNodeCacheKey(node);
    let cached = this.nodeCache.get(node.id);

    // Check if cache is valid
    if (cached && cached.key === cacheKey) {
      // Draw cached image
      ctx.drawImage(cached.canvas, node.x, node.y);
      return true;
    }

    // Create cache
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = node.width;
    cacheCanvas.height = node.height;
    const cacheCtx = cacheCanvas.getContext('2d');

    // Render node to cache (to be implemented by subclass)
    if (this.renderNodeToCache(node, cacheCtx)) {
      this.nodeCache.set(node.id, {
        canvas: cacheCanvas,
        key: cacheKey
      });

      // Draw cached image
      ctx.drawImage(cacheCanvas, node.x, node.y);
      return true;
    }

    return false;
  }

  /**
   * Get node cache key
   */
  getNodeCacheKey(node) {
    return `${node.width}_${node.height}_${node.selected}_${node.processing}_${node.error}`;
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.nodeCache.clear();
    
    // Mark all layers as dirty
    for (const layer in this.layers) {
      if (this.layers[layer]) {
        this.layers[layer].dirty = true;
      }
    }
  }

  /**
   * Destroy renderer
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.clearCaches();
    this.dirtyRects = [];
  }

  /**
   * To be implemented by subclass
   */
  renderContent() {
    // Override in subclass
  }

  /**
   * To be implemented by subclass
   */
  renderNodeToCache(node, ctx) {
    // Override in subclass
    return false;
  }
}