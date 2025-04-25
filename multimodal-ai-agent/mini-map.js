/**
 * Mini-map functionality for the canvas
 * Provides a small overview of the entire canvas with a viewport indicator
 */

const MiniMap = {
  // Properties
  canvas: null,
  ctx: null,
  mainCanvas: null,
  mainCtx: null,
  viewport: null,
  scale: 0.1, // Scale factor for the mini-map
  isDragging: false,
  isCollapsed: false,
  lastMainCanvasState: {
    offsetX: 0,
    offsetY: 0,
    zoom: 1
  },

  // Initialize the mini-map
  init() {
    // Get the mini-map canvas and context
    this.canvas = document.getElementById('miniMapCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Get the main canvas and context
    this.mainCanvas = document.getElementById('canvas');
    this.mainCtx = this.mainCanvas.getContext('2d');
    
    // Get the viewport element
    this.viewport = document.querySelector('.mini-map-viewport');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initial draw
    this.resize();
    this.draw();
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Toggle mini-map collapse/expand
    const toggleBtn = document.getElementById('toggleMiniMap');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const miniMap = document.getElementById('miniMap');
        if (miniMap) {
          miniMap.classList.toggle('collapsed');
          this.isCollapsed = miniMap.classList.contains('collapsed');
          toggleBtn.textContent = this.isCollapsed ? '+' : '-';
          
          // If expanding, redraw
          if (!this.isCollapsed) {
            this.resize();
            this.draw();
          }
        }
      });
    }
    
    // Make mini-map draggable
    const miniMapHeader = document.querySelector('.mini-map-header');
    if (miniMapHeader) {
      let isDraggingHeader = false;
      let startX, startY, startLeft, startTop;
      
      miniMapHeader.addEventListener('mousedown', (e) => {
        isDraggingHeader = true;
        const miniMap = document.getElementById('miniMap');
        const rect = miniMap.getBoundingClientRect();
        
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDraggingHeader) return;
        
        const miniMap = document.getElementById('miniMap');
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        miniMap.style.left = `${startLeft + dx}px`;
        miniMap.style.top = `${startTop + dy}px`;
        miniMap.style.bottom = 'auto';
        miniMap.style.right = 'auto';
      });
      
      document.addEventListener('mouseup', () => {
        isDraggingHeader = false;
      });
    }
    
    // Handle clicks on the mini-map to navigate
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isCollapsed) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate the center position in the main canvas coordinates
      const mainX = x / this.scale;
      const mainY = y / this.scale;
      
      // Center the main canvas view on this point
      App.centerViewOn(mainX, mainY);
      
      // Update the mini-map
      this.draw();
      
      this.isDragging = true;
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.isCollapsed) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate the center position in the main canvas coordinates
      const mainX = x / this.scale;
      const mainY = y / this.scale;
      
      // Center the main canvas view on this point
      App.centerViewOn(mainX, mainY);
      
      // Update the mini-map
      this.draw();
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    // Resize the mini-map when the window is resized
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  },
  
  // Resize the mini-map canvas
  resize() {
    if (this.isCollapsed) return;
    
    const miniMap = document.getElementById('miniMap');
    const rect = miniMap.getBoundingClientRect();
    
    this.canvas.width = rect.width;
    this.canvas.height = rect.height - 30; // Subtract header height
  },
  
  // Draw the mini-map
  draw() {
    if (this.isCollapsed || !this.ctx || !this.canvas) return;
    
    // Clear the mini-map canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate the scale based on the canvas size and content
    this.updateScale();
    
    // Draw the nodes
    this.drawNodes();
    
    // Draw the connections
    this.drawConnections();
    
    // Draw the viewport
    this.drawViewport();
    
    // Store the current main canvas state
    this.lastMainCanvasState = {
      offsetX: App.offsetX,
      offsetY: App.offsetY,
      zoom: App.zoom
    };
  },
  
  // Update the scale factor based on the canvas content
  updateScale() {
    if (!App.nodes || App.nodes.length === 0) {
      this.scale = 0.1;
      return;
    }
    
    // Find the bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    App.nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    
    // Add some padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Calculate the content width and height
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Calculate the scale factors for width and height
    const scaleX = this.canvas.width / contentWidth;
    const scaleY = this.canvas.height / contentHeight;
    
    // Use the smaller scale factor to ensure everything fits
    this.scale = Math.min(scaleX, scaleY, 0.2); // Cap at 0.2 to prevent too large scaling
  },
  
  // Draw the nodes on the mini-map
  drawNodes() {
    if (!App.nodes) return;
    
    this.ctx.save();
    
    App.nodes.forEach(node => {
      // Calculate the scaled position and size
      const x = node.x * this.scale;
      const y = node.y * this.scale;
      const width = node.width * this.scale;
      const height = node.height * this.scale;
      
      // Draw the node background
      this.ctx.fillStyle = node.selected ? '#4a90e2' : '#333';
      this.ctx.fillRect(x, y, width, height);
      
      // Draw a border
      this.ctx.strokeStyle = node.hasBeenProcessed ? '#2ecc71' : '#666';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
      
      // If the node has an error, draw a red indicator
      if (node.error) {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x + width - 2, y + 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // If the node is processing, draw a yellow indicator
      if (node.processing) {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.beginPath();
        this.ctx.arc(x + width - 2, y + 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    
    this.ctx.restore();
  },
  
  // Draw the connections on the mini-map
  drawConnections() {
    if (!App.connections) return;
    
    this.ctx.save();
    
    App.connections.forEach(conn => {
      // Get the output and input points
      const fromNode = conn.fromNode;
      const toNode = conn.toNode;
      
      // Calculate the output connector position
      const outputX = (fromNode.x + fromNode.width) * this.scale;
      const outputY = (fromNode.y + fromNode.height / 2) * this.scale;
      
      // Calculate the input connector position
      const inputX = toNode.x * this.scale;
      const inputY = (toNode.y + toNode.height / 2) * this.scale;
      
      // Draw the connection line
      this.ctx.strokeStyle = '#4a90e2';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(outputX, outputY);
      
      // Draw a bezier curve
      const controlPointX1 = outputX + 20 * this.scale;
      const controlPointY1 = outputY;
      const controlPointX2 = inputX - 20 * this.scale;
      const controlPointY2 = inputY;
      
      this.ctx.bezierCurveTo(
        controlPointX1, controlPointY1,
        controlPointX2, controlPointY2,
        inputX, inputY
      );
      
      this.ctx.stroke();
    });
    
    this.ctx.restore();
  },
  
  // Draw the viewport indicator on the mini-map
  drawViewport() {
    if (!this.viewport) return;
    
    // Calculate the viewport position and size based on the main canvas
    const viewportWidth = window.innerWidth * this.scale / App.zoom;
    const viewportHeight = window.innerHeight * this.scale / App.zoom;
    
    // Calculate the viewport position
    const viewportX = -App.offsetX * this.scale / App.zoom;
    const viewportY = -App.offsetY * this.scale / App.zoom;
    
    // Update the viewport element
    this.viewport.style.left = `${viewportX}px`;
    this.viewport.style.top = `${viewportY + 30}px`; // Add header height
    this.viewport.style.width = `${viewportWidth}px`;
    this.viewport.style.height = `${viewportHeight}px`;
  },
  
  // Update the mini-map when the main canvas changes
  update() {
    // Check if the main canvas state has changed
    if (
      this.lastMainCanvasState.offsetX !== App.offsetX ||
      this.lastMainCanvasState.offsetY !== App.offsetY ||
      this.lastMainCanvasState.zoom !== App.zoom
    ) {
      this.draw();
    }
  }
};

// Add the centerViewOn method to the App object
App.centerViewOn = function(x, y) {
  // Calculate the new offset to center the view on the given point
  this.offsetX = -(x - window.innerWidth / 2 / this.zoom);
  this.offsetY = -(y - window.innerHeight / 2 / this.zoom);
  
  // Redraw the canvas
  this.draw();
};

// Initialize the mini-map when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    MiniMap.init();
  }, 100);
});

// Update the mini-map when the App draws
const originalDraw = App.draw;
App.draw = function() {
  // Call the original draw method
  originalDraw.call(this);
  
  // Update the mini-map
  MiniMap.update();
};
