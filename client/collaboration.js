/**
 * Collaboration features
 * Provides commenting, annotation, and sharing capabilities
 */

const Collaboration = {
  // Properties
  comments: [],
  annotations: [],
  currentUser: {
    name: 'User',
    color: '#4a90e2'
  },
  isAddingComment: false,
  isAddingAnnotation: false,
  selectedComment: null,

  // Initialize the collaboration features
  init() {
    // Create the collaboration modal
    this.createCollaborationModal();

    // Set up event listeners
    this.setupEventListeners();

    // Add the collaboration button to the toolbar
    this.addCollaborationButton();
  },

  // Create the collaboration modal
  createCollaborationModal() {
    // Create the modal HTML
    const modalHTML = `
      <div id="collaborationModal" class="modal">
        <div class="modal-content">
          <h2>Collaboration</h2>
          <div class="collaboration-tabs">
            <button id="commentsTab" class="tab-btn active" type="button">Comments</button>
            <button id="sharingTab" class="tab-btn" type="button">Sharing</button>
            <button id="usersTab" class="tab-btn" type="button">Users</button>
          </div>

          <div id="commentsPanel" class="tab-panel">
            <div class="comments-list">
              <div id="noCommentsMessage" class="no-items-message">No comments yet</div>
              <ul id="commentsList"></ul>
            </div>
            <div class="comment-form">
              <input type="text" id="commentInput" placeholder="Add a comment...">
              <button id="addCommentBtn" class="primary-btn" type="button">Add</button>
              <button id="addAnnotationBtn" class="secondary-btn" type="button">Add Annotation</button>
            </div>
          </div>

          <div id="sharingPanel" class="tab-panel" style="display: none;">
            <div class="sharing-options">
              <h3>Share Your Workflow</h3>
              <div class="form-group">
                <label for="shareLink">Share Link:</label>
                <div class="input-with-button">
                  <input type="text" id="shareLink" readonly>
                  <button id="copyLinkBtn" class="secondary-btn" type="button">Copy</button>
                </div>
              </div>
              <div class="form-group">
                <label>Permissions:</label>
                <div class="radio-group">
                  <input type="radio" id="permissionView" name="permission" value="view" checked>
                  <label for="permissionView">View only</label>
                </div>
                <div class="radio-group">
                  <input type="radio" id="permissionEdit" name="permission" value="edit">
                  <label for="permissionEdit">Can edit</label>
                </div>
                <div class="radio-group">
                  <input type="radio" id="permissionAdmin" name="permission" value="admin">
                  <label for="permissionAdmin">Full access</label>
                </div>
              </div>
              <button id="generateLinkBtn" class="primary-btn" type="button">Generate Link</button>
            </div>
            <div class="export-options">
              <h3>Export Options</h3>
              <button id="exportJSONBtn" class="secondary-btn" type="button">Export as JSON</button>
              <button id="exportImageBtn" class="secondary-btn" type="button">Export as Image</button>
            </div>
          </div>

          <div id="usersPanel" class="tab-panel" style="display: none;">
            <div class="user-settings">
              <h3>Your Profile</h3>
              <div class="form-group">
                <label for="userName">Display Name:</label>
                <input type="text" id="userName" value="User">
              </div>
              <div class="form-group">
                <label for="userColor">Color:</label>
                <input type="color" id="userColor" value="#4a90e2">
              </div>
              <button id="saveUserBtn" class="primary-btn" type="button">Save Profile</button>
            </div>
            <div class="active-users">
              <h3>Active Users</h3>
              <div id="noUsersMessage" class="no-items-message">No other users currently active</div>
              <ul id="usersList"></ul>
            </div>
          </div>

          <div class="button-group">
            <button id="closeCollaboration" class="secondary-btn" type="button">Close</button>
          </div>
        </div>
      </div>
    `;

    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  // Set up event listeners
  setupEventListeners() {
    // Tab switching
    document.getElementById('commentsTab').addEventListener('click', () => {
      this.switchTab('commentsPanel');
    });

    document.getElementById('sharingTab').addEventListener('click', () => {
      this.switchTab('sharingPanel');
    });

    document.getElementById('usersTab').addEventListener('click', () => {
      this.switchTab('usersPanel');
    });

    // Close button
    document.getElementById('closeCollaboration').addEventListener('click', () => {
      ModalManager.closeModal('collaborationModal');
    });

    // Add comment button
    document.getElementById('addCommentBtn').addEventListener('click', () => {
      this.addComment();
    });

    // Comment input enter key
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addComment();
      }
    });

    // Add annotation button
    document.getElementById('addAnnotationBtn').addEventListener('click', () => {
      this.startAddingAnnotation();
    });

    // Generate link button
    document.getElementById('generateLinkBtn').addEventListener('click', () => {
      this.generateShareLink();
    });

    // Copy link button
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
      this.copyShareLink();
    });

    // Export buttons
    document.getElementById('exportJSONBtn').addEventListener('click', () => {
      WorkflowTest.exportWorkflow();
    });

    document.getElementById('exportImageBtn').addEventListener('click', () => {
      this.exportAsImage();
    });

    // Save user profile button
    document.getElementById('saveUserBtn').addEventListener('click', () => {
      this.saveUserProfile();
    });

    // Canvas click for adding annotations
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', (e) => {
      if (this.isAddingAnnotation) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
        const y = (e.clientY - rect.top) / App.zoom - App.offsetY;

        this.addAnnotation(x, y);
      }
    });
  },

  // Add the collaboration button to the toolbar
  addCollaborationButton() {
    // Create the button
    const collaborationBtn = document.createElement('button');
    collaborationBtn.id = 'collaborationBtn';
    collaborationBtn.type = 'button';
    collaborationBtn.textContent = 'Collaborate';

    // Add click event listener
    collaborationBtn.addEventListener('click', () => {
      this.openCollaborationModal();
    });

    // Add the button to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      // Insert before the help button
      const helpBtn = document.getElementById('helpBtn');
      if (helpBtn) {
        toolbar.insertBefore(collaborationBtn, helpBtn);
      } else {
        toolbar.appendChild(collaborationBtn);
      }
    }
  },

  // Open the collaboration modal
  openCollaborationModal() {
    // Update the comments list
    this.updateCommentsList();

    // Update the users list
    this.updateUsersList();

    // Show the modal
    ModalManager.openModal('collaborationModal');
  },

  // Switch between tabs
  switchTab(tabId) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show the selected tab panel
    document.getElementById(tabId).style.display = 'block';

    // Add active class to the selected tab button
    let tabBtnId;
    switch (tabId) {
      case 'commentsPanel':
        tabBtnId = 'commentsTab';
        break;
      case 'sharingPanel':
        tabBtnId = 'sharingTab';
        break;
      case 'usersPanel':
        tabBtnId = 'usersTab';
        break;
    }

    if (tabBtnId) {
      document.getElementById(tabBtnId).classList.add('active');
    }
  },

  // Add a comment
  addComment() {
    const commentInput = document.getElementById('commentInput');
    const text = commentInput.value.trim();

    if (text) {
      // Create a new comment
      const comment = {
        id: Date.now(),
        text,
        user: this.currentUser.name,
        color: this.currentUser.color,
        timestamp: new Date().toISOString(),
        position: null // General comment, not attached to a specific position
      };

      // Add the comment to the list
      this.comments.push(comment);

      // Clear the input
      commentInput.value = '';

      // Update the comments list
      this.updateCommentsList();

      DebugManager.addLog('Comment added', 'success');
    }
  },

  // Start adding an annotation
  startAddingAnnotation() {
    // Set the flag
    this.isAddingAnnotation = true;

    // Change cursor to crosshair
    document.body.style.cursor = 'crosshair';

    // Close the modal
    ModalManager.closeModal('collaborationModal');

    DebugManager.addLog('Click on the canvas to add an annotation', 'info');
  },

  // Add an annotation at the specified position
  addAnnotation(x, y) {
    // Get the comment text
    const text = prompt('Enter annotation text:');

    if (text) {
      // Create a new annotation
      const annotation = {
        id: Date.now(),
        text,
        user: this.currentUser.name,
        color: this.currentUser.color,
        timestamp: new Date().toISOString(),
        position: { x, y }
      };

      // Add the annotation to the list
      this.annotations.push(annotation);

      DebugManager.addLog('Annotation added', 'success');
    }

    // Reset the flag and cursor
    this.isAddingAnnotation = false;
    document.body.style.cursor = 'default';

    // Redraw the canvas
    App.draw();
  },

  // Update the comments list in the modal
  updateCommentsList() {
    const commentsList = document.getElementById('commentsList');
    const noCommentsMessage = document.getElementById('noCommentsMessage');

    if (!commentsList || !noCommentsMessage) return;

    // Clear the list
    commentsList.innerHTML = '';

    // Combine comments and annotations
    const allComments = [
      ...this.comments,
      ...this.annotations
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Show/hide the no comments message
    if (allComments.length === 0) {
      noCommentsMessage.style.display = 'block';
    } else {
      noCommentsMessage.style.display = 'none';

      // Add each comment to the list
      allComments.forEach(comment => {
        const li = document.createElement('li');
        li.className = 'comment-item';

        // Create the comment HTML
        li.innerHTML = `
          <div class="comment-header">
            <span class="comment-user" style="color: ${comment.color}">${comment.user}</span>
            <span class="comment-time">${this.formatTimestamp(comment.timestamp)}</span>
          </div>
          <div class="comment-text">${comment.text}</div>
          ${comment.position ? '<div class="comment-badge">Annotation</div>' : ''}
          <div class="comment-actions">
            <button class="comment-reply-btn" data-id="${comment.id}">Reply</button>
            <button class="comment-delete-btn" data-id="${comment.id}">Delete</button>
          </div>
        `;

        // Add event listeners
        li.querySelector('.comment-reply-btn').addEventListener('click', () => {
          this.replyToComment(comment.id);
        });

        li.querySelector('.comment-delete-btn').addEventListener('click', () => {
          this.deleteComment(comment.id);
        });

        // Add the comment to the list
        commentsList.appendChild(li);
      });
    }
  },

  // Format a timestamp for display
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  },

  // Reply to a comment
  replyToComment(commentId) {
    // Find the comment
    const comment = [...this.comments, ...this.annotations].find(c => c.id === commentId);

    if (comment) {
      // Set the input value to a reply format
      const commentInput = document.getElementById('commentInput');
      commentInput.value = `@${comment.user} `;
      commentInput.focus();
    }
  },

  // Delete a comment
  deleteComment(commentId) {
    // Check if it's a regular comment
    const commentIndex = this.comments.findIndex(c => c.id === commentId);
    if (commentIndex !== -1) {
      this.comments.splice(commentIndex, 1);
      this.updateCommentsList();
      DebugManager.addLog('Comment deleted', 'info');
      return;
    }

    // Check if it's an annotation
    const annotationIndex = this.annotations.findIndex(a => a.id === commentId);
    if (annotationIndex !== -1) {
      this.annotations.splice(annotationIndex, 1);
      this.updateCommentsList();
      App.draw();
      DebugManager.addLog('Annotation deleted', 'info');
      return;
    }
  },

  // Generate a share link
  generateShareLink() {
    // Get the selected permission
    let permission = 'view';
    if (document.getElementById('permissionEdit').checked) {
      permission = 'edit';
    } else if (document.getElementById('permissionAdmin').checked) {
      permission = 'admin';
    }

    // Create a state object
    const state = {
      nodes: App.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        title: node.title,
        content: node.content,
        inputContent: node.inputContent,
        contentType: node.contentType,
        systemPrompt: node.systemPrompt,
        aiProcessor: node.aiProcessor,
        inputType: node.inputType,
        outputType: node.outputType,
        hasBeenProcessed: node.hasBeenProcessed,
        autoSize: node.autoSize,
        selected: node.selected,
        expanded: node.expanded,
        error: node.error
      })),
      connections: App.connections.map(conn => ({
        fromNodeId: conn.fromNode.id,
        toNodeId: conn.toNode.id
      })),
      comments: this.comments,
      annotations: this.annotations,
      permission
    };

    // Convert to JSON and encode
    const stateString = JSON.stringify(state);
    const encodedState = btoa(stateString);

    // Create a share link
    const shareLink = `${window.location.origin}${window.location.pathname}?share=${encodedState}`;

    // Update the share link input
    const shareLinkInput = document.getElementById('shareLink');
    shareLinkInput.value = shareLink;

    DebugManager.addLog('Share link generated', 'success');
  },

  // Copy the share link to clipboard
  copyShareLink() {
    const shareLinkInput = document.getElementById('shareLink');

    if (shareLinkInput.value) {
      // Select the text
      shareLinkInput.select();
      shareLinkInput.setSelectionRange(0, 99999);

      // Copy to clipboard
      document.execCommand('copy');

      // Deselect the text
      shareLinkInput.blur();

      DebugManager.addLog('Share link copied to clipboard', 'success');
    } else {
      DebugManager.addLog('Generate a share link first', 'error');
    }
  },

  // Export the canvas as an image
  exportAsImage() {
    // Create a temporary canvas with the same dimensions as the app canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = App.canvas.width;
    tempCanvas.height = App.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw a white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the app canvas content
    tempCtx.drawImage(App.canvas, 0, 0);

    // Convert to data URL
    const dataURL = tempCanvas.toDataURL('image/png');

    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = `workflow-${new Date().toISOString().slice(0, 10)}.png`;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    DebugManager.addLog('Canvas exported as image', 'success');
  },

  // Save the user profile
  saveUserProfile() {
    const nameInput = document.getElementById('userName');
    const colorInput = document.getElementById('userColor');

    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (name) {
      this.currentUser.name = name;
      this.currentUser.color = color;

      // Save to localStorage
      localStorage.setItem('user_profile', JSON.stringify(this.currentUser));

      DebugManager.addLog('User profile saved', 'success');
    } else {
      DebugManager.addLog('Please enter a valid name', 'error');
    }
  },

  // Update the users list in the modal
  updateUsersList() {
    const usersList = document.getElementById('usersList');
    const noUsersMessage = document.getElementById('noUsersMessage');

    if (!usersList || !noUsersMessage) return;

    // Clear the list
    usersList.innerHTML = '';

    // For now, just show a demo user
    const demoUser = {
      name: 'Demo User',
      color: '#e74c3c',
      status: 'online'
    };

    // Add the demo user to the list
    const li = document.createElement('li');
    li.className = 'user-item';

    // Create the user HTML
    li.innerHTML = `
      <div class="user-avatar" style="background-color: ${demoUser.color}">
        ${demoUser.name.charAt(0)}
      </div>
      <div class="user-info">
        <div class="user-name">${demoUser.name}</div>
        <div class="user-status ${demoUser.status}">${demoUser.status}</div>
      </div>
    `;

    // Add the user to the list
    usersList.appendChild(li);

    // Hide the no users message
    noUsersMessage.style.display = 'none';
  },

  // Draw annotations on the canvas
  drawAnnotations(ctx) {
    // Draw each annotation
    this.annotations.forEach(annotation => {
      const x = annotation.position.x;
      const y = annotation.position.y;

      ctx.save();

      // Draw a circle
      ctx.fillStyle = annotation.color;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw the annotation number
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.annotations.indexOf(annotation) + 1, x, y);

      // Draw the annotation text if hovered
      if (this.isHoveringAnnotation === annotation.id) {
        const textX = x + 15;
        const textY = y - 15;
        const textWidth = ctx.measureText(annotation.text).width + 20;
        const textHeight = 30;

        // Draw the text background
        ctx.fillStyle = '#2e2e2e';
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(textX, textY - textHeight, textWidth, textHeight, 5);
        ctx.fill();
        ctx.stroke();

        // Draw the text
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(annotation.text, textX + 10, textY - textHeight / 2);
      }

      ctx.restore();
    });
  },

  // Check if the mouse is hovering over an annotation
  checkAnnotationHover(x, y) {
    // Reset the hovering flag
    this.isHoveringAnnotation = null;

    // Check each annotation
    for (const annotation of this.annotations) {
      const dx = x - annotation.position.x;
      const dy = y - annotation.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 10) {
        this.isHoveringAnnotation = annotation.id;
        return true;
      }
    }

    return false;
  },

  // Load the user profile from localStorage
  loadUserProfile() {
    const profileString = localStorage.getItem('user_profile');

    if (profileString) {
      try {
        const profile = JSON.parse(profileString);

        this.currentUser.name = profile.name;
        this.currentUser.color = profile.color;

        // Update the form fields
        const nameInput = document.getElementById('userName');
        const colorInput = document.getElementById('userColor');

        if (nameInput) nameInput.value = this.currentUser.name;
        if (colorInput) colorInput.value = this.currentUser.color;
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
  }
};

// Add mouse move event listener to check for annotation hover
document.addEventListener('mousemove', (e) => {
  const canvas = document.getElementById('canvas');
  if (!canvas || typeof App === 'undefined') return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / App.zoom - App.offsetX;
  const y = (e.clientY - rect.top) / App.zoom - App.offsetY;

  // Check if hovering over an annotation
  if (Collaboration.checkAnnotationHover(x, y)) {
    document.body.style.cursor = 'pointer';
    if (typeof App !== 'undefined') {
      App.draw();
    }
  } else if (document.body.style.cursor === 'pointer' && !Collaboration.isAddingAnnotation) {
    document.body.style.cursor = 'default';
    if (typeof App !== 'undefined') {
      App.draw();
    }
  }
});

// Initialize the collaboration features when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    // Make sure App is defined before using it
    if (typeof App !== 'undefined') {
      // Modify the App's draw method to draw annotations
      const originalAppDrawForCollaboration = App.draw;
      App.draw = function() {
        // Call the original draw method
        originalAppDrawForCollaboration.call(this);

        // Draw the annotations
        Collaboration.drawAnnotations(this.ctx);
      };

      // Initialize collaboration features
      Collaboration.init();
      Collaboration.loadUserProfile();
    } else {
      console.warn('App not defined yet, collaboration initialization delayed');
      // Try again after a longer delay
      setTimeout(() => {
        if (typeof App !== 'undefined') {
          // Modify the App's draw method to draw annotations
          const originalAppDrawForCollaboration = App.draw;
          App.draw = function() {
            // Call the original draw method
            originalAppDrawForCollaboration.call(this);

            // Draw the annotations
            Collaboration.drawAnnotations(this.ctx);
          };

          Collaboration.init();
          Collaboration.loadUserProfile();
        } else {
          console.error('App still not defined, collaboration initialization failed');
        }
      }, 500);
    }
  }, 100);
});
