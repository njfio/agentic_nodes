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

    // Zoom in button
    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (App.zoomIn) {
          App.zoomIn();
          DebugManager.addLog('Zoomed in', 'info');
        }
      });
    }

    // Zoom out button
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (App.zoomOut) {
          App.zoomOut();
          DebugManager.addLog('Zoomed out', 'info');
        }
      });
    }

    // Reset zoom button
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => {
        if (App.resetZoom) {
          App.resetZoom();
          DebugManager.addLog('Zoom reset', 'info');
        }
      });
    }

    // Add Fit All Nodes button if it doesn't exist
    let fitAllNodesBtn = document.getElementById('fitAllNodesBtn');
    if (!fitAllNodesBtn) {
      const miniMapControls = document.querySelector('.mini-map-controls');
      if (miniMapControls) {
        fitAllNodesBtn = document.createElement('button');
        fitAllNodesBtn.id = 'fitAllNodesBtn';
        fitAllNodesBtn.className = 'mini-map-btn';
        fitAllNodesBtn.title = 'Fit All Nodes';
        fitAllNodesBtn.textContent = '⊡';
        miniMapControls.appendChild(fitAllNodesBtn);
      }
    }

    // Set up Fit All Nodes button
    if (fitAllNodesBtn) {
      fitAllNodesBtn.addEventListener('click', () => {
        this.fitAllNodes();
        DebugManager.addLog('Adjusted view to fit all nodes on screen', 'info');
      });
    }

    // Auto arrange button
    const autoArrangeBtn = document.getElementById('autoArrangeBtn');
    if (autoArrangeBtn) {
      autoArrangeBtn.addEventListener('click', () => {
        this.autoArrangeNodes();
        DebugManager.addLog('Auto-arranged nodes', 'info');
      });
    }

    // Horizontal layout button
    const horizontalLayoutBtn = document.getElementById('horizontalLayoutBtn');
    if (horizontalLayoutBtn) {
      horizontalLayoutBtn.addEventListener('click', () => {
        this.arrangeNodesHorizontally();
        DebugManager.addLog('Arranged nodes horizontally', 'info');
      });
    }

    // Vertical layout button
    const verticalLayoutBtn = document.getElementById('verticalLayoutBtn');
    if (verticalLayoutBtn) {
      verticalLayoutBtn.addEventListener('click', () => {
        this.arrangeNodesVertically();
        DebugManager.addLog('Arranged nodes vertically', 'info');
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

      // Set a flag to indicate that we're interacting with the minimap
      // This will prevent the event from being handled by the main canvas
      window.miniMapInteraction = true;

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
      e.stopPropagation();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.isCollapsed) return;

      // Keep the minimap interaction flag set
      window.miniMapInteraction = true;

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

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;

      // Reset the minimap interaction flag after a short delay
      // This allows the main canvas to recognize that the interaction has ended
      setTimeout(() => {
        window.miniMapInteraction = false;
      }, 50);
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
    this.canvas.height = rect.height - 70; // Subtract header and controls height
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
  },

  // Auto arrange nodes in a force-directed layout
  autoArrangeNodes() {
    if (!App.nodes || App.nodes.length === 0) return;

    // Constants for the force-directed layout
    const REPULSION = 25000;  // Significantly increased repulsion force between nodes
    const ATTRACTION = 0.02;  // Reduced attraction force for connections
    const DAMPING = 0.8;      // Adjusted damping factor to prevent oscillation
    const ITERATIONS = 150;   // Increased iterations for better convergence
    const MIN_NODE_DISTANCE = 350; // Minimum distance between node centers
    const PADDING = 100;      // Additional padding around nodes

    // Initialize velocities
    const velocities = {};
    App.nodes.forEach(node => {
      velocities[node.id] = { x: 0, y: 0 };
    });

    // If nodes are all at the same position, distribute them randomly first
    const allSamePosition = App.nodes.every(node =>
      node.x === App.nodes[0].x && node.y === App.nodes[0].y
    );

    if (allSamePosition) {
      const radius = Math.sqrt(App.nodes.length) * 200;
      App.nodes.forEach((node, i) => {
        const angle = (i / App.nodes.length) * 2 * Math.PI;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
      });
    }

    // Run the simulation for a fixed number of iterations
    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Calculate forces for each node
      App.nodes.forEach(node1 => {
        let forceX = 0;
        let forceY = 0;

        // Repulsion forces from other nodes
        App.nodes.forEach(node2 => {
          if (node1 !== node2) {
            const dx = node1.x - node2.x;
            const dy = node1.y - node2.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1; // Avoid division by zero

            // Calculate node bounding boxes with padding
            const node1Right = node1.x + node1.width + PADDING;
            const node1Bottom = node1.y + node1.height + PADDING;
            const node2Right = node2.x + node2.width + PADDING;
            const node2Bottom = node2.y + node2.height + PADDING;

            // Check for overlap
            const overlap = !(
              node1Right < node2.x ||
              node1.x > node2Right ||
              node1Bottom < node2.y ||
              node1.y > node2Bottom
            );

            // Apply stronger repulsion force if nodes overlap
            if (overlap) {
              // Calculate overlap amount
              const overlapX = Math.min(node1Right - node2.x, node2Right - node1.x);
              const overlapY = Math.min(node1Bottom - node2.y, node2Bottom - node1.y);

              // Apply strong directional force to resolve overlap
              if (overlapX < overlapY) {
                // Resolve horizontal overlap
                if (node1.x < node2.x) {
                  forceX -= overlapX * 3;
                } else {
                  forceX += overlapX * 3;
                }
              } else {
                // Resolve vertical overlap
                if (node1.y < node2.y) {
                  forceY -= overlapY * 3;
                } else {
                  forceY += overlapY * 3;
                }
              }
            }

            // Apply standard repulsion force (inverse square law)
            // Use a stronger repulsion for nodes that are too close
            const desiredDistance = MIN_NODE_DISTANCE + (node1.width + node2.width + node1.height + node2.height) / 4;
            let force = REPULSION / (distance * distance);

            // Increase force if nodes are closer than desired distance
            if (distance < desiredDistance) {
              force *= (desiredDistance / distance);
            }

            forceX += (dx / distance) * force;
            forceY += (dy / distance) * force;
          }
        });

        // Attraction forces from connections
        App.connections.forEach(conn => {
          if (conn.fromNode === node1) {
            const toNode = conn.toNode;
            const dx = node1.x - toNode.x;
            const dy = node1.y - toNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            // Apply attraction force (linear)
            forceX -= (dx / distance) * distance * ATTRACTION;
            forceY -= (dy / distance) * distance * ATTRACTION;
          } else if (conn.toNode === node1) {
            const fromNode = conn.fromNode;
            const dx = node1.x - fromNode.x;
            const dy = node1.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            // Apply attraction force (linear)
            forceX -= (dx / distance) * distance * ATTRACTION;
            forceY -= (dy / distance) * distance * ATTRACTION;
          }
        });

        // Update velocity with damping
        velocities[node1.id].x = (velocities[node1.id].x + forceX) * DAMPING;
        velocities[node1.id].y = (velocities[node1.id].y + forceY) * DAMPING;
      });

      // Apply velocities to node positions
      App.nodes.forEach(node => {
        node.x += velocities[node.id].x;
        node.y += velocities[node.id].y;
      });

      // Check for node overlaps after each iteration
      if (iter % 10 === 0) { // Only resolve overlaps every 10 iterations for performance
        this.resolveNodeOverlaps();
      }
    }

    // Final overlap resolution pass
    this.resolveNodeOverlaps();

    // Center the layout in the viewport
    this.centerLayout();

    // Fit all nodes in the viewport
    this.fitAllNodes();

    // Redraw the canvas
    App.draw();

    DebugManager.addLog('Auto-arranged nodes with improved spacing and layout', 'info');
  },

  // Resolve any remaining node overlaps
  resolveNodeOverlaps() {
    const PADDING = 80; // Increased minimum space between nodes
    const MAX_PASSES = 10; // Maximum number of passes to prevent infinite loops
    let overlapsResolved = false;
    let passCount = 0;

    // Repeat until no more overlaps are found or max passes reached
    while (!overlapsResolved && passCount < MAX_PASSES) {
      overlapsResolved = true;
      passCount++;

      // Check each pair of nodes for overlap
      for (let i = 0; i < App.nodes.length; i++) {
        const node1 = App.nodes[i];

        for (let j = i + 1; j < App.nodes.length; j++) {
          const node2 = App.nodes[j];

          // Calculate node bounding boxes with padding
          const node1Right = node1.x + node1.width + PADDING;
          const node1Bottom = node1.y + node1.height + PADDING;
          const node2Right = node2.x + node2.width + PADDING;
          const node2Bottom = node2.y + node2.height + PADDING;

          // Check for overlap
          const overlap = !(
            node1Right < node2.x ||
            node1.x > node2Right ||
            node1Bottom < node2.y ||
            node1.y > node2Bottom
          );

          if (overlap) {
            overlapsResolved = false;

            // Calculate overlap amount
            const overlapX = Math.min(node1Right - node2.x, node2Right - node1.x);
            const overlapY = Math.min(node1Bottom - node2.y, node2Bottom - node1.y);

            // Calculate the center points of each node
            const node1CenterX = node1.x + node1.width / 2;
            const node1CenterY = node1.y + node1.height / 2;
            const node2CenterX = node2.x + node2.width / 2;
            const node2CenterY = node2.y + node2.height / 2;

            // Calculate the direction vector between centers
            const dirX = node2CenterX - node1CenterX;
            const dirY = node2CenterY - node1CenterY;

            // Calculate the distance between centers
            const distance = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

            // Normalize the direction vector
            const normDirX = dirX / distance;
            const normDirY = dirY / distance;

            // Calculate the desired distance between centers
            const desiredDistance = (node1.width + node2.width) / 2 +
                                   (node1.height + node2.height) / 2 +
                                   PADDING;

            // Calculate the amount to move each node
            const moveDistance = (desiredDistance - distance) / 2 + 10; // Add extra to ensure separation

            // Move nodes apart along the direction vector
            node1.x -= normDirX * moveDistance;
            node1.y -= normDirY * moveDistance;
            node2.x += normDirX * moveDistance;
            node2.y += normDirY * moveDistance;
          }
        }
      }
    }

    // If we still have overlaps after max passes, try a different approach
    if (!overlapsResolved) {
      // Apply a grid-based layout as a fallback
      this.applyGridLayout();
    }
  },

  // Apply a grid layout as a fallback for overlap resolution
  applyGridLayout() {
    if (!App.nodes || App.nodes.length === 0) return;

    // Calculate the number of rows and columns for the grid
    const count = App.nodes.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    // Calculate the maximum node dimensions
    let maxWidth = 0;
    let maxHeight = 0;

    App.nodes.forEach(node => {
      maxWidth = Math.max(maxWidth, node.width);
      maxHeight = Math.max(maxHeight, node.height);
    });

    // Add padding
    const GRID_PADDING = 100;
    const cellWidth = maxWidth + GRID_PADDING;
    const cellHeight = maxHeight + GRID_PADDING;

    // Calculate the grid origin (top-left corner)
    const gridWidth = cols * cellWidth;
    const gridHeight = rows * cellHeight;
    const startX = -gridWidth / 2 + cellWidth / 2;
    const startY = -gridHeight / 2 + cellHeight / 2;

    // Position each node in the grid
    App.nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      node.x = startX + col * cellWidth;
      node.y = startY + row * cellHeight;
    });

    DebugManager.addLog('Applied grid layout to resolve node overlaps', 'info');
  },

  // Arrange nodes horizontally based on connections
  arrangeNodesHorizontally() {
    if (!App.nodes || App.nodes.length === 0) return;

    // Find root nodes (nodes with no incoming connections)
    const rootNodes = App.nodes.filter(node => {
      return !App.connections.some(conn => conn.toNode === node);
    });

    // If no root nodes, use the leftmost node
    if (rootNodes.length === 0) {
      rootNodes.push(App.nodes.reduce((leftmost, node) =>
        node.x < leftmost.x ? node : leftmost, App.nodes[0]));
    }

    // Reset visited flag
    App.nodes.forEach(node => {
      node.visited = false;
    });

    // Arrange nodes in levels
    const levels = [];
    let currentLevel = rootNodes;

    // Mark root nodes as visited
    rootNodes.forEach(node => {
      node.visited = true;
    });

    // Add root nodes to the first level
    levels.push(currentLevel);

    // Build levels based on connections
    while (currentLevel.length > 0) {
      const nextLevel = [];

      currentLevel.forEach(node => {
        // Find all nodes connected from this node
        App.connections.forEach(conn => {
          if (conn.fromNode === node && !conn.toNode.visited) {
            conn.toNode.visited = true;
            nextLevel.push(conn.toNode);
          }
        });
      });

      if (nextLevel.length > 0) {
        levels.push(nextLevel);
      }

      currentLevel = nextLevel;
    }

    // Check for any unvisited nodes and add them to a new level
    const unvisitedNodes = App.nodes.filter(node => !node.visited);
    if (unvisitedNodes.length > 0) {
      levels.push(unvisitedNodes);
    }

    // Position nodes based on levels with improved spacing
    const LEVEL_SPACING = 400; // Increased spacing between levels
    const MIN_NODE_SPACING = 250; // Minimum spacing between nodes in the same level

    // Calculate node positions with dynamic spacing
    levels.forEach((level, levelIndex) => {
      // Calculate total width needed for this level
      let totalWidth = 0;
      level.forEach(node => {
        totalWidth += node.width + MIN_NODE_SPACING;
      });

      // Starting X position for this level
      let currentX = -totalWidth / 2;

      // Position each node in the level
      level.forEach((node, nodeIndex) => {
        // Position the node
        node.x = currentX;
        node.y = levelIndex * LEVEL_SPACING;

        // Move to the next position
        currentX += node.width + MIN_NODE_SPACING;
      });
    });

    // Resolve any remaining overlaps
    this.resolveNodeOverlaps();

    // Center the layout in the viewport
    this.centerLayout();

    // Fit all nodes in the viewport
    this.fitAllNodes();

    // Redraw the canvas
    App.draw();

    DebugManager.addLog('Arranged nodes in horizontal flow layout with improved spacing', 'info');
  },

  // Arrange nodes vertically based on connections
  arrangeNodesVertically() {
    if (!App.nodes || App.nodes.length === 0) return;

    // Find root nodes (nodes with no incoming connections)
    const rootNodes = App.nodes.filter(node => {
      return !App.connections.some(conn => conn.toNode === node);
    });

    // If no root nodes, use the topmost node
    if (rootNodes.length === 0) {
      rootNodes.push(App.nodes.reduce((topmost, node) =>
        node.y < topmost.y ? node : topmost, App.nodes[0]));
    }

    // Reset visited flag
    App.nodes.forEach(node => {
      node.visited = false;
    });

    // Arrange nodes in levels
    const levels = [];
    let currentLevel = rootNodes;

    // Mark root nodes as visited
    rootNodes.forEach(node => {
      node.visited = true;
    });

    // Add root nodes to the first level
    levels.push(currentLevel);

    // Build levels based on connections
    while (currentLevel.length > 0) {
      const nextLevel = [];

      currentLevel.forEach(node => {
        // Find all nodes connected from this node
        App.connections.forEach(conn => {
          if (conn.fromNode === node && !conn.toNode.visited) {
            conn.toNode.visited = true;
            nextLevel.push(conn.toNode);
          }
        });
      });

      if (nextLevel.length > 0) {
        levels.push(nextLevel);
      }

      currentLevel = nextLevel;
    }

    // Check for any unvisited nodes and add them to a new level
    const unvisitedNodes = App.nodes.filter(node => !node.visited);
    if (unvisitedNodes.length > 0) {
      levels.push(unvisitedNodes);
    }

    // Position nodes based on levels with improved spacing
    const LEVEL_SPACING = 400; // Increased spacing between levels
    const MIN_NODE_SPACING = 250; // Minimum spacing between nodes in the same level

    // Calculate node positions with dynamic spacing
    levels.forEach((level, levelIndex) => {
      // Calculate total height needed for this level
      let totalHeight = 0;
      level.forEach(node => {
        totalHeight += node.height + MIN_NODE_SPACING;
      });

      // Starting Y position for this level
      let currentY = -totalHeight / 2;

      // Position each node in the level
      level.forEach((node, nodeIndex) => {
        // Position the node
        node.x = levelIndex * LEVEL_SPACING;
        node.y = currentY;

        // Move to the next position
        currentY += node.height + MIN_NODE_SPACING;
      });
    });

    // Resolve any remaining overlaps
    this.resolveNodeOverlaps();

    // Center the layout in the viewport
    this.centerLayout();

    // Fit all nodes in the viewport
    this.fitAllNodes();

    // Redraw the canvas
    App.draw();

    DebugManager.addLog('Arranged nodes in vertical flow layout with improved spacing', 'info');
  },

  // Center the layout in the viewport
  centerLayout() {
    if (!App.nodes || App.nodes.length === 0) return;

    // Find the bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    App.nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    // Calculate the center of the layout
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Center the view on this point
    App.centerViewOn(centerX, centerY);
  },

  // Fit all nodes in the viewport
  fitAllNodes() {
    if (!App.nodes || App.nodes.length === 0) return;

    // Find the bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    App.nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate the content width and height
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate the scale needed to fit all nodes
    const scaleX = window.innerWidth / contentWidth;
    const scaleY = window.innerHeight / contentHeight;

    // Use the smaller scale to ensure everything fits
    const newScale = Math.min(scaleX, scaleY, App.MAX_SCALE);

    // Set the new scale
    App.zoom = newScale;

    // Center the layout
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate the new offsets to center the view
    App.offsetX = window.innerWidth / 2 - centerX * newScale;
    App.offsetY = window.innerHeight / 2 - centerY * newScale;

    // Redraw the canvas
    App.draw();

    DebugManager.addLog(`Fit all nodes to view at ${Math.round(newScale * 100)}% zoom`, 'info');
  }
};

// Initialize the mini-map when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    // Make sure App is defined before using it
    if (typeof App !== 'undefined') {
      // Add the centerViewOn method to the App object
      App.centerViewOn = function(x, y) {
        // Calculate the new offset to center the view on the given point
        this.offsetX = -(x - window.innerWidth / 2 / this.zoom);
        this.offsetY = -(y - window.innerHeight / 2 / this.zoom);

        // Redraw the canvas
        this.draw();
      };

      // Update the mini-map when the App draws
      const originalDraw = App.draw;
      App.draw = function() {
        // Call the original draw method
        originalDraw.call(this);

        // Update the mini-map
        MiniMap.update();
      };

      // Initialize the mini-map
      MiniMap.init();
    } else {
      console.warn('App not defined yet, mini-map initialization delayed');
      // Try again after a longer delay
      setTimeout(() => {
        if (typeof App !== 'undefined') {
          MiniMap.init();
        } else {
          console.error('App still not defined, mini-map initialization failed');
        }
      }, 500);
    }
  }, 100);
});
