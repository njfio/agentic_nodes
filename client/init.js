// Additional initialization features
const AppInit = {
  // Initialize additional canvas features
  initCanvas() {
    // Skip if already initialized by App module
    if (window.App && App.canvas) {
      return;
    }

    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  },

  // Initialize resize handler
  initResizeHandler() {
    window.addEventListener('resize', () => {
      const canvas = document.getElementById('canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (typeof draw === 'function') {
          draw();
        }
      }
    });
  },

  // Initialize modal handlers
  initModalHandlers() {
    const modals = ['nodeEditor', 'saveLoadModal', 'helpModal', 'configModal', 'templateGeneratorModal', 'agentNodeEditor'];

    // Close modals on outside click
    window.addEventListener('click', (e) => {
      modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && e.target === modal) {
          modal.style.display = 'none';

          // Reset previews when closing node editor
          if (modalId === 'nodeEditor') {
            ['imagePreview', 'audioPreview', 'videoPreview'].forEach(previewId => {
              const preview = document.getElementById(previewId);
              if (preview) {
                preview.style.display = 'none';
              }
            });
          }
        }
      });
    });

    // Help modal specific handlers
    const helpBtn = document.getElementById('helpBtn');
    const closeHelpBtn = document.getElementById('closeHelp');
    const helpModal = document.getElementById('helpModal');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => {
        helpModal.style.display = 'block';
      });
    }

    if (closeHelpBtn && helpModal) {
      closeHelpBtn.addEventListener('click', () => {
        helpModal.style.display = 'none';
      });
    }
  },

  // Initialize keyboard shortcuts
  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle keyboard shortcuts
      switch (e.key) {
        case 'n':
        case 'N':
          if (typeof addNode === 'function') {
            addNode();
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (window.nodes && typeof draw === 'function') {
            const selectedNode = window.nodes.find(n => n.selected);
            if (selectedNode) {
              window.nodes = window.nodes.filter(n => n !== selectedNode);
              window.connections = window.connections.filter(c =>
                c.fromNode !== selectedNode && c.toNode !== selectedNode
              );
              draw();
            }
          }
          break;

        case 'Escape':
          // Close all modals
          ['nodeEditor', 'configModal', 'saveLoadModal', 'helpModal', 'templateGeneratorModal', 'agentNodeEditor'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
              modal.style.display = 'none';
            }
          });
          // Cancel connection if active
          if (window.connectingNode) {
            window.connectingNode = null;
            if (typeof draw === 'function') {
              draw();
            }
          }
          break;

        case 'h':
        case 'H':
          const helpModal = document.getElementById('helpModal');
          if (helpModal) {
            helpModal.style.display = helpModal.style.display === 'block' ? 'none' : 'block';
          }
          break;

        case 's':
          if ((e.ctrlKey || e.metaKey) && typeof saveBtn !== 'undefined') {
            e.preventDefault();
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) saveBtn.click();
          }
          break;

        case 'o':
          if ((e.ctrlKey || e.metaKey) && typeof loadBtn !== 'undefined') {
            e.preventDefault();
            const loadBtn = document.getElementById('loadBtn');
            if (loadBtn) loadBtn.click();
          }
          break;
      }
    });
  },

  // Initialize everything
  init() {
    this.initCanvas();
    this.initResizeHandler();
    this.initModalHandlers();
    this.initKeyboardShortcuts();

    if (typeof showStatus === 'function') {
      showStatus('Application initialized successfully');
    }
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  AppInit.init();
});
