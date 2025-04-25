/**
 * Workflow List
 * Handles the workflow list dropdown in the toolbar
 */

const WorkflowList = {
  // Initialize the workflow list
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Load workflows
    this.loadWorkflows();
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Toggle dropdown when clicking the button
    const workflowsBtn = document.getElementById('workflowsBtn');
    if (workflowsBtn) {
      workflowsBtn.addEventListener('click', () => {
        this.toggleDropdown();
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.toolbar-dropdown')) {
        this.closeDropdown();
      }
    });
    
    // Search workflows
    const workflowSearch = document.getElementById('workflowSearch');
    if (workflowSearch) {
      workflowSearch.addEventListener('input', () => {
        this.filterWorkflows(workflowSearch.value);
      });
    }
    
    // New workflow button
    const newWorkflowBtn = document.getElementById('newWorkflowBtn');
    if (newWorkflowBtn) {
      newWorkflowBtn.addEventListener('click', () => {
        this.createNewWorkflow();
      });
    }
  },
  
  // Toggle the dropdown
  toggleDropdown() {
    const dropdown = document.getElementById('workflowsDropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
      
      // If showing, focus the search input
      if (dropdown.classList.contains('show')) {
        const searchInput = document.getElementById('workflowSearch');
        if (searchInput) {
          searchInput.focus();
        }
      }
    }
  },
  
  // Close the dropdown
  closeDropdown() {
    const dropdown = document.getElementById('workflowsDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  },
  
  // Load workflows from the server
  async loadWorkflows() {
    const workflowsList = document.getElementById('workflowsList');
    if (!workflowsList) return;
    
    try {
      // Show loading indicator
      workflowsList.innerHTML = '<div class="dropdown-item loading">Loading workflows...</div>';
      
      // Load workflows from the server
      const workflows = await ApiService.workflows.getAll();
      
      // Clear loading indicator
      workflowsList.innerHTML = '';
      
      // If no workflows, show message
      if (!workflows || workflows.length === 0) {
        workflowsList.innerHTML = '<div class="dropdown-item empty">No workflows found</div>';
        return;
      }
      
      // Sort workflows by updated date (newest first)
      workflows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // Add workflows to the list
      workflows.forEach(workflow => {
        this.addWorkflowToList(workflow);
      });
    } catch (error) {
      console.error('Error loading workflows:', error);
      workflowsList.innerHTML = '<div class="dropdown-item error">Error loading workflows</div>';
    }
  },
  
  // Add a workflow to the list
  addWorkflowToList(workflow) {
    const workflowsList = document.getElementById('workflowsList');
    if (!workflowsList) return;
    
    // Create workflow item
    const workflowItem = document.createElement('div');
    workflowItem.className = 'dropdown-item workflow';
    workflowItem.dataset.id = workflow._id;
    
    // Format date
    const date = new Date(workflow.updatedAt || workflow.createdAt);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    // Create workflow item content
    workflowItem.innerHTML = `
      <div class="workflow-info">
        <div class="workflow-name">${workflow.name || 'Untitled Workflow'}</div>
        <div class="workflow-date">${formattedDate}</div>
      </div>
      <div class="workflow-actions">
        <button class="workflow-load" title="Load Workflow">Load</button>
        <button class="workflow-delete" title="Delete Workflow">×</button>
      </div>
    `;
    
    // Add event listeners
    const loadBtn = workflowItem.querySelector('.workflow-load');
    if (loadBtn) {
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadWorkflow(workflow._id);
      });
    }
    
    const deleteBtn = workflowItem.querySelector('.workflow-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteWorkflow(workflow._id);
      });
    }
    
    // Add click event to the whole item
    workflowItem.addEventListener('click', () => {
      this.loadWorkflow(workflow._id);
    });
    
    // Add to list
    workflowsList.appendChild(workflowItem);
  },
  
  // Filter workflows by search term
  filterWorkflows(searchTerm) {
    const workflowItems = document.querySelectorAll('.dropdown-item.workflow');
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    workflowItems.forEach(item => {
      const workflowName = item.querySelector('.workflow-name').textContent.toLowerCase();
      
      if (workflowName.includes(normalizedSearchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
    
    // Show empty message if no results
    const workflowsList = document.getElementById('workflowsList');
    const visibleItems = document.querySelectorAll('.dropdown-item.workflow[style="display: flex"]');
    
    if (visibleItems.length === 0 && workflowsList) {
      // Check if empty message already exists
      let emptyMessage = workflowsList.querySelector('.dropdown-item.empty');
      
      if (!emptyMessage) {
        emptyMessage = document.createElement('div');
        emptyMessage.className = 'dropdown-item empty';
        workflowsList.appendChild(emptyMessage);
      }
      
      emptyMessage.textContent = `No workflows matching "${searchTerm}"`;
      emptyMessage.style.display = 'block';
    } else {
      // Hide empty message if there are results
      const emptyMessage = workflowsList.querySelector('.dropdown-item.empty');
      if (emptyMessage) {
        emptyMessage.style.display = 'none';
      }
    }
  },
  
  // Load a workflow
  async loadWorkflow(workflowId) {
    try {
      // Close dropdown
      this.closeDropdown();
      
      // Show loading indicator
      DebugManager.addLog(`Loading workflow ${workflowId}...`, 'info');
      
      // Load workflow from server
      const workflow = await ApiService.workflows.getById(workflowId);
      
      // Store the current workflow ID
      localStorage.setItem('current_workflow_id', workflowId);
      
      // Load the workflow
      App.loadWorkflowState(workflow);
      
      DebugManager.addLog(`Workflow ${workflowId} loaded successfully`, 'success');
    } catch (error) {
      console.error('Error loading workflow:', error);
      DebugManager.addLog(`Error loading workflow: ${error.message}`, 'error');
    }
  },
  
  // Delete a workflow
  async deleteWorkflow(workflowId) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    
    try {
      // Delete workflow from server
      await ApiService.workflows.delete(workflowId);
      
      // Remove from list
      const workflowItem = document.querySelector(`.dropdown-item.workflow[data-id="${workflowId}"]`);
      if (workflowItem) {
        workflowItem.remove();
      }
      
      // If current workflow was deleted, clear current workflow ID
      if (localStorage.getItem('current_workflow_id') === workflowId) {
        localStorage.removeItem('current_workflow_id');
      }
      
      DebugManager.addLog(`Workflow ${workflowId} deleted successfully`, 'success');
      
      // If no workflows left, show empty message
      const workflowsList = document.getElementById('workflowsList');
      if (workflowsList && workflowsList.children.length === 0) {
        workflowsList.innerHTML = '<div class="dropdown-item empty">No workflows found</div>';
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      DebugManager.addLog(`Error deleting workflow: ${error.message}`, 'error');
    }
  },
  
  // Create a new workflow
  createNewWorkflow() {
    // Close dropdown
    this.closeDropdown();
    
    // Clear the canvas
    App.nodes = [];
    App.connections = [];
    App.draw();
    
    // Clear current workflow ID
    localStorage.removeItem('current_workflow_id');
    
    DebugManager.addLog('New workflow created', 'success');
  }
};

// Initialize the workflow list when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for App to be initialized
  if (typeof App !== 'undefined') {
    WorkflowList.init();
  } else {
    // Wait for App to be loaded
    const checkApp = setInterval(() => {
      if (typeof App !== 'undefined') {
        clearInterval(checkApp);
        WorkflowList.init();
      }
    }, 100);
  }
});
