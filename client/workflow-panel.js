// Workflow Panel - Integrated workflow interface
const WorkflowPanel = {
  // Properties
  isCollapsed: false,
  
  // Initialize the workflow panel
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Update the status
    WorkflowIO.updateStatus();
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Toggle panel collapse/expand
    const toggleBtn = document.getElementById('toggleWorkflowPanel');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('workflowPanel');
        if (panel) {
          panel.classList.toggle('collapsed');
          this.isCollapsed = panel.classList.contains('collapsed');
          toggleBtn.textContent = this.isCollapsed ? '+' : '-';
        }
      });
    }
    
    // Run workflow button
    const runWorkflowBtn = document.getElementById('runWorkflowBtn');
    if (runWorkflowBtn) {
      runWorkflowBtn.addEventListener('click', () => {
        WorkflowIO.runWorkflow();
      });
    }
    
    // Clear input button
    const clearInputBtn = document.getElementById('clearInputBtn');
    if (clearInputBtn) {
      clearInputBtn.addEventListener('click', () => {
        const workflowInput = document.getElementById('workflowInput');
        if (workflowInput) {
          workflowInput.value = '';
        }
      });
    }
    
    // Clear output button
    const clearOutputBtn = document.getElementById('clearOutputBtn');
    if (clearOutputBtn) {
      clearOutputBtn.addEventListener('click', () => {
        WorkflowIO.clearOutput();
      });
    }
    
    // Copy output button
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    if (copyOutputBtn) {
      copyOutputBtn.addEventListener('click', () => {
        WorkflowIO.copyOutput();
      });
    }
  }
};

// Initialize the workflow panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    // Make sure WorkflowIO is defined before using it
    if (typeof WorkflowIO !== 'undefined') {
      WorkflowPanel.init();
      
      // Update the WorkflowIO methods to work with the panel
      
      // Override the openWorkflowIO method
      const originalOpenWorkflowIO = WorkflowIO.openWorkflowIO;
      WorkflowIO.openWorkflowIO = function() {
        // Update the status
        this.updateStatus();
        
        // Show the panel
        const panel = document.getElementById('workflowPanel');
        if (panel) {
          panel.classList.remove('collapsed');
          WorkflowPanel.isCollapsed = false;
          
          const toggleBtn = document.getElementById('toggleWorkflowPanel');
          if (toggleBtn) {
            toggleBtn.textContent = '-';
          }
        }
      };
      
      // Override the closeWorkflowIO method
      const originalCloseWorkflowIO = WorkflowIO.closeWorkflowIO;
      WorkflowIO.closeWorkflowIO = function() {
        // Do nothing, as we don't want to close the panel
        // The user can collapse it if they want
      };
      
      // Override the updateStatus method
      const originalUpdateStatus = WorkflowIO.updateStatus;
      WorkflowIO.updateStatus = function() {
        // Call the original method if it exists
        if (typeof originalUpdateStatus === 'function') {
          originalUpdateStatus.call(this);
        }
        
        // Update the status in the panel
        const inputNodeStatus = document.getElementById('inputNodeStatus');
        const outputNodeStatus = document.getElementById('outputNodeStatus');
        const runWorkflowBtn = document.getElementById('runWorkflowBtn');
        
        if (!inputNodeStatus || !outputNodeStatus) return;
        
        // Update input node status
        if (this.inputNode) {
          inputNodeStatus.textContent = `Node ${this.inputNode.id}: ${this.inputNode.title || 'Untitled'}`;
          inputNodeStatus.className = 'status-value set';
        } else {
          inputNodeStatus.textContent = 'Not Set';
          inputNodeStatus.className = 'status-value not-set';
        }
        
        // Update output node status
        if (this.outputNode) {
          outputNodeStatus.textContent = `Node ${this.outputNode.id}: ${this.outputNode.title || 'Untitled'}`;
          outputNodeStatus.className = 'status-value set';
        } else {
          outputNodeStatus.textContent = 'Not Set';
          outputNodeStatus.className = 'status-value not-set';
        }
        
        // Update the run button state
        if (runWorkflowBtn) {
          runWorkflowBtn.disabled = !this.inputNode || !this.outputNode || this.isProcessing;
        }
      };
    }
  }, 100);
});
