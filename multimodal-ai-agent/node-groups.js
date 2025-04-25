/**
 * Node Grouping functionality
 * Allows creating groups of nodes for better organization
 */

class NodeGroup {
  constructor(x, y, id) {
    this.id = id || `group_${Date.now()}`;
    this.x = x;
    this.y = y;
    this.width = 300;
    this.height = 200;
    this.title = "Group";
    this.color = "#3498db";
    this.nodes = [];
    this.collapsed = false;
    this.selected = false;
    this.dragging = false;
    this.resizing = false;
    this.resizeHandle = { width: 10, height: 10 };
    this.minWidth = 200;
    this.minHeight = 100;
    this.padding = 20;
    this.headerHeight = 30;
    this.originalPositions = []; // For storing node positions when collapsed
  }

  // Add a node to the group
  addNode(node) {
    if (!this.nodes.includes(node)) {
      this.nodes.push(node);
      node.group = this;
      this.recalculateSize();
    }
  }

  // Remove a node from the group
  removeNode(node) {
    const index = this.nodes.indexOf(node);
    if (index !== -1) {
      this.nodes.splice(index, 1);
      node.group = null;
      this.recalculateSize();
    }
  }

  // Check if a point is inside the group
  containsPoint(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  // Check if a point is inside the group header
  headerContainsPoint(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.headerHeight
    );
  }

  // Check if a point is inside the resize handle
  resizeHandleContainsPoint(x, y) {
    return (
      x >= this.x + this.width - this.resizeHandle.width &&
      x <= this.x + this.width &&
      y >= this.y + this.height - this.resizeHandle.height &&
      y <= this.y + this.height
    );
  }

  // Toggle collapse state
  toggleCollapse() {
    if (!this.collapsed) {
      // Store original positions before collapsing
      this.originalPositions = this.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y
      }));
      
      // Collapse the group
      this.collapsed = true;
      
      // Hide the nodes
      this.nodes.forEach(node => {
        node.hidden = true;
      });
    } else {
      // Expand the group
      this.collapsed = false;
      
      // Show the nodes and restore positions
      this.nodes.forEach(node => {
        node.hidden = false;
        
        // Find the original position
        const originalPos = this.originalPositions.find(pos => pos.id === node.id);
        if (originalPos) {
          node.x = originalPos.x;
          node.y = originalPos.y;
        }
      });
      
      // Clear the original positions
      this.originalPositions = [];
      
      // Recalculate the group size
      this.recalculateSize();
    }
  }

  // Recalculate the group size based on contained nodes
  recalculateSize() {
    if (this.nodes.length === 0) {
      // Set to minimum size if no nodes
      this.width = this.minWidth;
      this.height = this.minHeight;
      return;
    }

    // Find the bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    
    // Set the group position and size with padding
    this.x = minX - this.padding;
    this.y = minY - this.padding - this.headerHeight;
    this.width = Math.max(this.minWidth, maxX - minX + this.padding * 2);
    this.height = Math.max(this.minHeight, maxY - minY + this.padding * 2 + this.headerHeight);
  }

  // Move the group and all contained nodes
  move(dx, dy) {
    this.x += dx;
    this.y += dy;
    
    // Move all nodes in the group
    this.nodes.forEach(node => {
      node.x += dx;
      node.y += dy;
    });
  }

  // Resize the group
  resize(newWidth, newHeight) {
    // Ensure minimum size
    this.width = Math.max(this.minWidth, newWidth);
    this.height = Math.max(this.minHeight, newHeight);
  }

  // Draw the group
  draw(ctx) {
    ctx.save();
    
    // Draw the group background
    ctx.fillStyle = this.selected ? 
      `${this.color}80` : // 50% opacity when selected
      `${this.color}40`;  // 25% opacity when not selected
    
    // Draw rounded rectangle
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(this.x + radius, this.y);
    ctx.lineTo(this.x + this.width - radius, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
    ctx.lineTo(this.x + this.width, this.y + this.height - radius);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
    ctx.lineTo(this.x + radius, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
    ctx.lineTo(this.x, this.y + radius);
    ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
    ctx.closePath();
    ctx.fill();
    
    // Draw the group border
    ctx.strokeStyle = this.selected ? this.color : `${this.color}80`;
    ctx.lineWidth = this.selected ? 2 : 1;
    ctx.stroke();
    
    // Draw the header background
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x + radius, this.y);
    ctx.lineTo(this.x + this.width - radius, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
    ctx.lineTo(this.x + this.width, this.y + this.headerHeight);
    ctx.lineTo(this.x, this.y + this.headerHeight);
    ctx.lineTo(this.x, this.y + radius);
    ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
    ctx.closePath();
    ctx.fill();
    
    // Draw the title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.title, this.x + 10, this.y + this.headerHeight / 2);
    
    // Draw node count
    const nodeCountText = `${this.nodes.length} node${this.nodes.length !== 1 ? 's' : ''}`;
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(nodeCountText, this.x + this.width - 30, this.y + this.headerHeight / 2);
    
    // Draw collapse/expand button
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    if (this.collapsed) {
      // Draw + symbol
      ctx.moveTo(this.x + this.width - 15, this.y + this.headerHeight / 2);
      ctx.lineTo(this.x + this.width - 10, this.y + this.headerHeight / 2);
      ctx.moveTo(this.x + this.width - 12.5, this.y + this.headerHeight / 2 - 2.5);
      ctx.lineTo(this.x + this.width - 12.5, this.y + this.headerHeight / 2 + 2.5);
    } else {
      // Draw - symbol
      ctx.moveTo(this.x + this.width - 15, this.y + this.headerHeight / 2);
      ctx.lineTo(this.x + this.width - 10, this.y + this.headerHeight / 2);
    }
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw resize handle if not collapsed
    if (!this.collapsed) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width, this.y + this.height);
      ctx.lineTo(this.x + this.width - this.resizeHandle.width, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height - this.resizeHandle.height);
      ctx.closePath();
      ctx.fill();
    }
    
    // If collapsed, draw a preview of the nodes
    if (this.collapsed) {
      // Draw a grid of small squares representing nodes
      const maxPreviewNodes = 9; // 3x3 grid
      const previewSize = 10;
      const previewGap = 5;
      const previewRows = 3;
      const previewCols = 3;
      const startX = this.x + (this.width - (previewCols * previewSize + (previewCols - 1) * previewGap)) / 2;
      const startY = this.y + this.headerHeight + (this.height - this.headerHeight - (previewRows * previewSize + (previewRows - 1) * previewGap)) / 2;
      
      for (let i = 0; i < Math.min(this.nodes.length, maxPreviewNodes); i++) {
        const row = Math.floor(i / previewCols);
        const col = i % previewCols;
        const x = startX + col * (previewSize + previewGap);
        const y = startY + row * (previewSize + previewGap);
        
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, previewSize, previewSize);
      }
      
      // If there are more nodes than can be shown in the preview
      if (this.nodes.length > maxPreviewNodes) {
        ctx.fillStyle = "#fff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`+${this.nodes.length - maxPreviewNodes} more`, this.x + this.width / 2, this.y + this.height - 15);
      }
    }
    
    ctx.restore();
  }
}

const NodeGroups = {
  // Properties
  groups: [],
  creatingGroup: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  selectedGroup: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  
  // Initialize the node groups functionality
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Add the create group button to the toolbar
    this.addCreateGroupButton();
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Add mouse event listeners to the canvas
    const canvas = document.getElementById('canvas');
    
    // Mouse down event for selecting and dragging groups
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only handle left mouse button
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
      const y = (e.clientY - rect.top) / App.zoom - App.offsetY;
      
      // Check if creating a new group
      if (this.creatingGroup) {
        this.startX = x;
        this.startY = y;
        this.currentX = x;
        this.currentY = y;
        return;
      }
      
      // Check if clicking on a group
      let clickedOnGroup = false;
      
      // Check groups in reverse order (top to bottom in z-index)
      for (let i = this.groups.length - 1; i >= 0; i--) {
        const group = this.groups[i];
        
        // Check if clicking on the resize handle
        if (!group.collapsed && group.resizeHandleContainsPoint(x, y)) {
          group.resizing = true;
          this.selectedGroup = group;
          clickedOnGroup = true;
          break;
        }
        
        // Check if clicking on the header (for dragging or collapsing)
        if (group.headerContainsPoint(x, y)) {
          // Check if clicking on the collapse/expand button
          if (x >= group.x + group.width - 20 && x <= group.x + group.width - 5) {
            group.toggleCollapse();
            App.draw();
            clickedOnGroup = true;
            break;
          }
          
          // Start dragging the group
          group.dragging = true;
          this.dragOffsetX = x - group.x;
          this.dragOffsetY = y - group.y;
          
          // Select the group
          this.selectGroup(group);
          clickedOnGroup = true;
          break;
        }
        
        // Check if clicking inside the group (for selection)
        if (group.containsPoint(x, y)) {
          // Don't select the group if clicking on a node inside it
          let clickedOnNode = false;
          
          // Check if clicking on a node
          for (const node of App.nodes) {
            if (!node.hidden && node.containsPoint(x, y)) {
              clickedOnNode = true;
              break;
            }
          }
          
          if (!clickedOnNode) {
            this.selectGroup(group);
            clickedOnGroup = true;
            break;
          }
        }
      }
      
      // If not clicking on any group, deselect the current group
      if (!clickedOnGroup) {
        this.deselectAll();
      }
    });
    
    // Mouse move event for dragging and resizing groups
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
      const y = (e.clientY - rect.top) / App.zoom - App.offsetY;
      
      // Update cursor based on hover state
      this.updateCursor(x, y);
      
      // Handle creating a new group
      if (this.creatingGroup && e.buttons === 1) {
        this.currentX = x;
        this.currentY = y;
        App.draw();
        return;
      }
      
      // Handle dragging a group
      if (this.selectedGroup && this.selectedGroup.dragging && e.buttons === 1) {
        const newX = x - this.dragOffsetX;
        const newY = y - this.dragOffsetY;
        const dx = newX - this.selectedGroup.x;
        const dy = newY - this.selectedGroup.y;
        
        this.selectedGroup.move(dx, dy);
        App.draw();
        return;
      }
      
      // Handle resizing a group
      if (this.selectedGroup && this.selectedGroup.resizing && e.buttons === 1) {
        const newWidth = x - this.selectedGroup.x;
        const newHeight = y - this.selectedGroup.y;
        
        this.selectedGroup.resize(newWidth, newHeight);
        App.draw();
        return;
      }
    });
    
    // Mouse up event for finishing drag, resize, or group creation
    canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return; // Only handle left mouse button
      
      // Handle finishing group creation
      if (this.creatingGroup) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
        const y = (e.clientY - rect.top) / App.zoom - App.offsetY;
        
        // Calculate the bounds of the selection rectangle
        const left = Math.min(this.startX, x);
        const top = Math.min(this.startY, y);
        const right = Math.max(this.startX, x);
        const bottom = Math.max(this.startY, y);
        const width = right - left;
        const height = bottom - top;
        
        // Only create a group if the selection has a minimum size
        if (width > 20 && height > 20) {
          // Create a new group
          const group = new NodeGroup(left, top);
          group.width = width;
          group.height = height;
          
          // Add nodes that are inside the selection rectangle
          App.nodes.forEach(node => {
            if (
              node.x >= left &&
              node.x + node.width <= right &&
              node.y >= top &&
              node.y + node.height <= bottom
            ) {
              group.addNode(node);
            }
          });
          
          // Only add the group if it contains nodes
          if (group.nodes.length > 0) {
            this.groups.push(group);
            this.selectGroup(group);
            DebugManager.addLog(`Created group with ${group.nodes.length} nodes`, 'success');
          } else {
            DebugManager.addLog('No nodes selected for grouping', 'error');
          }
        }
        
        this.creatingGroup = false;
        App.draw();
        return;
      }
      
      // Reset dragging and resizing flags
      if (this.selectedGroup) {
        this.selectedGroup.dragging = false;
        this.selectedGroup.resizing = false;
      }
    });
    
    // Double click event for editing group title
    canvas.addEventListener('dblclick', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
      const y = (e.clientY - rect.top) / App.zoom - App.offsetY;
      
      // Check if double-clicking on a group header
      for (let i = this.groups.length - 1; i >= 0; i--) {
        const group = this.groups[i];
        
        if (group.headerContainsPoint(x, y)) {
          // Don't edit if clicking on the collapse button
          if (x >= group.x + group.width - 20 && x <= group.x + group.width - 5) {
            return;
          }
          
          // Prompt for a new title
          const newTitle = prompt('Enter a new title for the group:', group.title);
          if (newTitle !== null) {
            group.title = newTitle;
            App.draw();
          }
          
          break;
        }
      }
    });
    
    // Key event for deleting groups
    document.addEventListener('keydown', (e) => {
      // Delete key
      if (e.key === 'Delete' && this.selectedGroup) {
        this.deleteSelectedGroup();
      }
    });
  },
  
  // Add the create group button to the toolbar
  addCreateGroupButton() {
    // Create the button
    const createGroupBtn = document.createElement('button');
    createGroupBtn.id = 'createGroupBtn';
    createGroupBtn.type = 'button';
    createGroupBtn.textContent = 'Create Group';
    
    // Add click event listener
    createGroupBtn.addEventListener('click', () => {
      this.startCreatingGroup();
    });
    
    // Add the button to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      // Insert after the add node button
      const addNodeBtn = document.getElementById('addNodeBtn');
      if (addNodeBtn) {
        toolbar.insertBefore(createGroupBtn, addNodeBtn.nextSibling);
      } else {
        toolbar.appendChild(createGroupBtn);
      }
    }
  },
  
  // Start creating a new group
  startCreatingGroup() {
    this.creatingGroup = true;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    
    // Change cursor to crosshair
    document.body.style.cursor = 'crosshair';
    
    DebugManager.addLog('Drag to select nodes for grouping', 'info');
  },
  
  // Select a group
  selectGroup(group) {
    // Deselect all groups
    this.deselectAll();
    
    // Select the new group
    group.selected = true;
    this.selectedGroup = group;
    
    App.draw();
  },
  
  // Deselect all groups
  deselectAll() {
    this.groups.forEach(group => {
      group.selected = false;
    });
    
    this.selectedGroup = null;
    
    App.draw();
  },
  
  // Delete the selected group
  deleteSelectedGroup() {
    if (!this.selectedGroup) return;
    
    // Remove the group reference from all nodes
    this.selectedGroup.nodes.forEach(node => {
      node.group = null;
      node.hidden = false;
    });
    
    // Remove the group from the list
    const index = this.groups.indexOf(this.selectedGroup);
    if (index !== -1) {
      this.groups.splice(index, 1);
    }
    
    this.selectedGroup = null;
    
    DebugManager.addLog('Group deleted', 'info');
    App.draw();
  },
  
  // Update cursor based on hover state
  updateCursor(x, y) {
    let cursorSet = false;
    
    // Check if creating a group
    if (this.creatingGroup) {
      document.body.style.cursor = 'crosshair';
      cursorSet = true;
    } else {
      // Check if hovering over a group
      for (let i = this.groups.length - 1; i >= 0; i--) {
        const group = this.groups[i];
        
        // Check if hovering over the resize handle
        if (!group.collapsed && group.resizeHandleContainsPoint(x, y)) {
          document.body.style.cursor = 'nwse-resize';
          cursorSet = true;
          break;
        }
        
        // Check if hovering over the header
        if (group.headerContainsPoint(x, y)) {
          // Check if hovering over the collapse/expand button
          if (x >= group.x + group.width - 20 && x <= group.x + group.width - 5) {
            document.body.style.cursor = 'pointer';
          } else {
            document.body.style.cursor = 'move';
          }
          cursorSet = true;
          break;
        }
      }
    }
    
    // Reset cursor if not hovering over anything special
    if (!cursorSet) {
      document.body.style.cursor = 'default';
    }
  },
  
  // Draw all groups
  draw(ctx) {
    // Draw the selection rectangle when creating a group
    if (this.creatingGroup) {
      ctx.save();
      
      // Calculate the bounds of the selection rectangle
      const left = Math.min(this.startX, this.currentX);
      const top = Math.min(this.startY, this.currentY);
      const width = Math.abs(this.currentX - this.startX);
      const height = Math.abs(this.currentY - this.startY);
      
      // Draw the selection rectangle
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(left, top, width, height);
      
      // Draw the fill with low opacity
      ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
      ctx.fillRect(left, top, width, height);
      
      ctx.restore();
    }
    
    // Draw all groups
    this.groups.forEach(group => {
      group.draw(ctx);
    });
  }
};

// Add the group property to the Node class
Object.defineProperty(Node.prototype, 'group', {
  get: function() {
    return this._group || null;
  },
  set: function(value) {
    this._group = value;
  }
});

// Add the hidden property to the Node class
Object.defineProperty(Node.prototype, 'hidden', {
  get: function() {
    return this._hidden || false;
  },
  set: function(value) {
    this._hidden = value;
  }
});

// Modify the Node's draw method to respect the hidden property
const originalNodeDrawForGroups = Node.prototype.draw;
Node.prototype.draw = function(ctx) {
  // Skip drawing if the node is hidden
  if (this.hidden) return;
  
  // Call the original draw method
  originalNodeDrawForGroups.call(this, ctx);
};

// Modify the App's draw method to draw groups
const originalAppDrawForGroups = App.draw;
App.draw = function() {
  // Call the original draw method
  originalAppDrawForGroups.call(this);
  
  // Draw the groups
  NodeGroups.draw(this.ctx);
};

// Initialize the node groups functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    NodeGroups.init();
  }, 100);
});
