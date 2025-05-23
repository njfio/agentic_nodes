/**
 * Canvas Utilities Module
 * Provides drawing and rendering utilities for the canvas
 */

export const CanvasUtils = {
  /**
   * Draw a bezier connection between two points
   */
  drawConnection(ctx, startX, startY, endX, endY, options = {}) {
    const {
      color = '#4a90e2',
      lineWidth = 3,
      showArrow = false,
      dashPattern = null,
      curvature = 50
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    if (dashPattern) {
      ctx.setLineDash(dashPattern);
    }

    ctx.beginPath();

    // Calculate control points for bezier curve
    const cp1x = startX + curvature;
    const cp1y = startY;
    const cp2x = endX - curvature;
    const cp2y = endY;

    // Draw the curve
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();

    if (showArrow) {
      this.drawArrow(ctx, cp2x, cp2y, endX, endY, color);
    }

    ctx.restore();
  },

  /**
   * Draw an arrow head
   */
  drawArrow(ctx, fromX, fromY, toX, toY, color, size = 10) {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - size * Math.cos(angle - Math.PI/6),
      toY - size * Math.sin(angle - Math.PI/6)
    );
    ctx.lineTo(
      toX - size * Math.cos(angle + Math.PI/6),
      toY - size * Math.sin(angle + Math.PI/6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  },

  /**
   * Draw a tooltip
   */
  drawTooltip(ctx, text, x, y, options = {}) {
    const {
      backgroundColor = 'rgba(0, 0, 0, 0.8)',
      textColor = '#fff',
      font = '12px Arial',
      padding = 5,
      borderRadius = 4
    } = options;

    ctx.save();
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const width = metrics.width + padding * 2;
    const height = parseInt(font) + padding * 2;

    // Draw background with rounded corners
    this.drawRoundedRect(
      ctx,
      x - width/2,
      y - height - 5,
      width,
      height,
      borderRadius,
      backgroundColor
    );

    // Draw text
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - height/2 - 5);
    ctx.restore();
  },

  /**
   * Draw a rounded rectangle
   */
  drawRoundedRect(ctx, x, y, width, height, radius, fillColor = null, strokeColor = null) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  },

  /**
   * Draw a grid
   */
  drawGrid(ctx, offsetX, offsetY, zoom, gridSize = 20, options = {}) {
    const {
      color = '#e0e0e0',
      lineWidth = 0.5,
      majorGridMultiple = 5,
      majorColor = '#cccccc',
      majorLineWidth = 1
    } = options;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const scaledGridSize = gridSize * zoom;

    ctx.save();

    // Calculate grid offset
    const gridOffsetX = offsetX % scaledGridSize;
    const gridOffsetY = offsetY % scaledGridSize;

    // Draw minor grid lines
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    for (let x = gridOffsetX; x < width; x += scaledGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    for (let y = gridOffsetY; y < height; y += scaledGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();

    // Draw major grid lines
    if (majorGridMultiple > 1) {
      ctx.strokeStyle = majorColor;
      ctx.lineWidth = majorLineWidth;
      ctx.beginPath();

      const majorGridSize = scaledGridSize * majorGridMultiple;
      const majorOffsetX = offsetX % majorGridSize;
      const majorOffsetY = offsetY % majorGridSize;

      for (let x = majorOffsetX; x < width; x += majorGridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }

      for (let y = majorOffsetY; y < height; y += majorGridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }

      ctx.stroke();
    }

    ctx.restore();
  },

  /**
   * Clear canvas with optional background
   */
  clearCanvas(ctx, backgroundColor = null) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  },

  /**
   * Apply zoom and pan transformation
   */
  applyTransform(ctx, offsetX, offsetY, zoom) {
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);
  },

  /**
   * Reset transformation
   */
  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  },

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY, offsetX, offsetY, zoom) {
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom
    };
  },

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY, offsetX, offsetY, zoom) {
    return {
      x: worldX * zoom + offsetX,
      y: worldY * zoom + offsetY
    };
  },

  /**
   * Check if a point is visible on screen
   */
  isVisible(x, y, width, height, canvasWidth, canvasHeight, offsetX, offsetY, zoom) {
    const screenPos = this.worldToScreen(x, y, offsetX, offsetY, zoom);
    const screenWidth = width * zoom;
    const screenHeight = height * zoom;

    return !(
      screenPos.x + screenWidth < 0 ||
      screenPos.y + screenHeight < 0 ||
      screenPos.x > canvasWidth ||
      screenPos.y > canvasHeight
    );
  },

  /**
   * Get bounding box for a set of points
   */
  getBoundingBox(points) {
    if (points.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  },

  /**
   * Fit view to content
   */
  fitToContent(nodes, canvasWidth, canvasHeight, padding = 50) {
    if (nodes.length === 0) return { offsetX: 0, offsetY: 0, zoom: 1 };

    const points = nodes.map(node => ({
      x: node.x,
      y: node.y,
      x2: node.x + node.width,
      y2: node.y + node.height
    }));

    const bbox = this.getBoundingBox([
      ...points.map(p => ({ x: p.x, y: p.y })),
      ...points.map(p => ({ x: p.x2, y: p.y2 }))
    ]);

    if (!bbox) return { offsetX: 0, offsetY: 0, zoom: 1 };

    const scaleX = (canvasWidth - padding * 2) / bbox.width;
    const scaleY = (canvasHeight - padding * 2) / bbox.height;
    const zoom = Math.min(scaleX, scaleY, 2); // Cap at 2x zoom

    const offsetX = (canvasWidth - bbox.width * zoom) / 2 - bbox.x * zoom;
    const offsetY = (canvasHeight - bbox.height * zoom) / 2 - bbox.y * zoom;

    return { offsetX, offsetY, zoom };
  }
};