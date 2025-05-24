import EventBus from './event-bus.js';

/**
 * UIManager - Manages user interface interactions and modal dialogs
 */
export class UIManager {
  constructor(options = {}) {
    this.options = {
      modalContainer: options.modalContainer || 'body',
      animationDuration: options.animationDuration || 300,
      closeOnOverlayClick: options.closeOnOverlayClick !== false,
      closeOnEscape: options.closeOnEscape !== false,
      enableKeyboardNavigation: options.enableKeyboardNavigation !== false,
      ...options
    };
    
    // State
    this.modals = new Map();
    this.activeModal = null;
    this.modalStack = [];
    this.notifications = [];
    this.contextMenus = new Map();
    this.tooltips = new Map();
    
    // UI Elements
    this.container = null;
    this.overlay = null;
    this.notificationContainer = null;
    
    this.init();
  }

  /**
   * Initialize UI manager
   */
  init() {
    this.createContainers();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  /**
   * Create UI containers
   */
  createContainers() {
    // Modal overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'ui-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: none;
      opacity: 0;
      transition: opacity ${this.options.animationDuration}ms ease;
    `;
    document.body.appendChild(this.overlay);

    // Notification container
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.className = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2000;
      pointer-events: none;
    `;
    document.body.appendChild(this.notificationContainer);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Overlay click to close modal
    if (this.options.closeOnOverlayClick) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.closeModal();
        }
      });
    }

    // Escape key to close modal
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeModal) {
          this.closeModal();
        }
      });
    }

    // Global UI events
    EventBus.on('ui:showModal', this.showModal.bind(this));
    EventBus.on('ui:closeModal', this.closeModal.bind(this));
    EventBus.on('ui:notification', this.showNotification.bind(this));
    EventBus.on('ui:contextMenu', this.showContextMenu.bind(this));
    EventBus.on('ui:tooltip', this.showTooltip.bind(this));
    EventBus.on('ui:hideTooltip', this.hideTooltip.bind(this));
    
    // Canvas events
    EventBus.on('canvas:nodeClicked', this.handleNodeClick.bind(this));
    EventBus.on('canvas:contextMenu', this.handleCanvasContextMenu.bind(this));
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    if (!this.options.enableKeyboardNavigation) return;

    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when no modal is open or when modal allows it
      if (this.activeModal && !this.activeModal.allowKeyboardShortcuts) return;
      
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      // Common shortcuts
      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            EventBus.emit('workflow:save');
            break;
          case 'o':
            e.preventDefault();
            EventBus.emit('workflow:open');
            break;
          case 'n':
            e.preventDefault();
            EventBus.emit('workflow:new');
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              EventBus.emit('editor:redo');
            } else {
              EventBus.emit('editor:undo');
            }
            break;
          case 'c':
            if (!e.target.matches('input, textarea')) {
              e.preventDefault();
              EventBus.emit('editor:copy');
            }
            break;
          case 'v':
            if (!e.target.matches('input, textarea')) {
              e.preventDefault();
              EventBus.emit('editor:paste');
            }
            break;
          case 'x':
            if (!e.target.matches('input, textarea')) {
              e.preventDefault();
              EventBus.emit('editor:cut');
            }
            break;
          case 'a':
            if (!e.target.matches('input, textarea')) {
              e.preventDefault();
              EventBus.emit('editor:selectAll');
            }
            break;
        }
      }
      
      // Function keys
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            EventBus.emit('editor:delete');
          }
          break;
        case 'F5':
          e.preventDefault();
          EventBus.emit('workflow:run');
          break;
        case 'F9':
          e.preventDefault();
          EventBus.emit('workflow:debug');
          break;
      }
    });
  }

  /**
   * Show modal dialog
   */
  async showModal(options) {
    const modal = this.createModal(options);
    this.modals.set(modal.id, modal);
    
    // Add to stack
    if (this.activeModal) {
      this.modalStack.push(this.activeModal);
    }
    
    this.activeModal = modal;
    
    // Show overlay
    this.overlay.style.display = 'block';
    await this.animateIn(this.overlay, { opacity: 1 });
    
    // Show modal
    document.body.appendChild(modal.element);
    await this.animateIn(modal.element, modal.animation || { 
      opacity: 1, 
      transform: 'scale(1)' 
    });
    
    // Focus management
    this.setupModalFocus(modal);
    
    EventBus.emit('modal:opened', { modal });
    
    return new Promise((resolve, reject) => {
      modal.resolve = resolve;
      modal.reject = reject;
    });
  }

  /**
   * Create modal element
   */
  createModal(options) {
    const modal = {
      id: options.id || `modal_${Date.now()}`,
      type: options.type || 'dialog',
      title: options.title || '',
      content: options.content || '',
      buttons: options.buttons || [],
      closable: options.closable !== false,
      allowKeyboardShortcuts: options.allowKeyboardShortcuts || false,
      animation: options.animation,
      data: options.data || {}
    };

    // Create modal element
    const element = document.createElement('div');
    element.className = `modal modal-${modal.type}`;
    element.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 1001;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      opacity: 0;
      transition: all ${this.options.animationDuration}ms ease;
    `;

    // Build modal content
    element.innerHTML = this.buildModalHTML(modal);
    
    // Setup modal event handlers
    this.setupModalEvents(element, modal);
    
    modal.element = element;
    return modal;
  }

  /**
   * Build modal HTML
   */
  buildModalHTML(modal) {
    let html = '';
    
    // Header
    if (modal.title || modal.closable) {
      html += `
        <div class="modal-header" style="
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h3 style="margin: 0; font-size: 18px; color: #333;">${modal.title}</h3>
          ${modal.closable ? `
            <button class="modal-close" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #666;
              padding: 0;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">&times;</button>
          ` : ''}
        </div>
      `;
    }
    
    // Content
    html += `
      <div class="modal-content" style="padding: 20px;">
        ${typeof modal.content === 'string' ? modal.content : ''}
      </div>
    `;
    
    // Footer with buttons
    if (modal.buttons.length > 0) {
      html += `
        <div class="modal-footer" style="
          padding: 16px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        ">
          ${modal.buttons.map(button => `
            <button 
              class="modal-button" 
              data-action="${button.action || 'close'}"
              data-value="${button.value || ''}"
              style="
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: ${button.primary ? '#007bff' : 'white'};
                color: ${button.primary ? 'white' : '#333'};
                cursor: pointer;
                font-size: 14px;
              "
            >
              ${button.text}
            </button>
          `).join('')}
        </div>
      `;
    }
    
    return html;
  }

  /**
   * Setup modal events
   */
  setupModalEvents(element, modal) {
    // Close button
    const closeBtn = element.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    
    // Action buttons
    const buttons = element.querySelectorAll('.modal-button');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const value = e.target.dataset.value;
        
        if (action === 'close') {
          this.closeModal();
        } else {
          this.handleModalAction(modal, action, value);
        }
      });
    });
    
    // Custom content setup
    if (typeof modal.content === 'function') {
      const contentContainer = element.querySelector('.modal-content');
      modal.content(contentContainer, modal);
    }
  }

  /**
   * Handle modal action
   */
  handleModalAction(modal, action, value) {
    const result = { action, value, data: modal.data };
    
    if (modal.resolve) {
      modal.resolve(result);
    }
    
    EventBus.emit('modal:action', { modal, action, value });
    this.closeModal();
  }

  /**
   * Close active modal
   */
  async closeModal() {
    if (!this.activeModal) return;
    
    const modal = this.activeModal;
    
    // Animate out
    await this.animateOut(modal.element, { 
      opacity: 0, 
      transform: 'translate(-50%, -50%) scale(0.9)' 
    });
    
    // Remove from DOM
    modal.element.remove();
    this.modals.delete(modal.id);
    
    // Restore previous modal or hide overlay
    if (this.modalStack.length > 0) {
      this.activeModal = this.modalStack.pop();
    } else {
      this.activeModal = null;
      await this.animateOut(this.overlay, { opacity: 0 });
      this.overlay.style.display = 'none';
    }
    
    // Resolve with cancel if no explicit result
    if (modal.resolve && !modal.resolved) {
      modal.resolve({ action: 'cancel' });
    }
    
    EventBus.emit('modal:closed', { modal });
  }

  /**
   * Setup modal focus management
   */
  setupModalFocus(modal) {
    const focusableElements = modal.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      
      // Trap focus within modal
      modal.element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      });
    }
  }

  /**
   * Show notification
   */
  showNotification(options) {
    const notification = {
      id: `notification_${Date.now()}`,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      duration: options.duration || (options.type === 'error' ? 0 : 5000),
      actions: options.actions || []
    };

    const element = this.createNotificationElement(notification);
    this.notificationContainer.appendChild(element);
    this.notifications.push(notification);

    // Auto remove
    if (notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }

    // Animate in
    requestAnimationFrame(() => {
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
    });

    EventBus.emit('notification:shown', { notification });
    return notification.id;
  }

  /**
   * Create notification element
   */
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.style.cssText = `
      background: white;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-bottom: 10px;
      padding: 16px;
      max-width: 400px;
      transform: translateX(100%);
      opacity: 0;
      transition: all 300ms ease;
      pointer-events: auto;
      border-left: 4px solid ${this.getNotificationColor(notification.type)};
    `;

    element.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${this.getNotificationColor(notification.type)};
          flex-shrink: 0;
          margin-top: 2px;
        "></div>
        <div style="flex: 1;">
          ${notification.title ? `<div style="font-weight: 600; margin-bottom: 4px;">${notification.title}</div>` : ''}
          <div style="color: #666; font-size: 14px;">${notification.message}</div>
          ${notification.actions.length > 0 ? `
            <div style="margin-top: 12px; display: flex; gap: 8px;">
              ${notification.actions.map(action => `
                <button 
                  class="notification-action"
                  data-action="${action.action}"
                  style="
                    padding: 4px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: white;
                    color: #333;
                    cursor: pointer;
                    font-size: 12px;
                  "
                >
                  ${action.text}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <button 
          class="notification-close"
          style="
            background: none;
            border: none;
            cursor: pointer;
            color: #999;
            font-size: 18px;
            padding: 0;
            width: 20px;
            height: 20px;
          "
        >&times;</button>
      </div>
    `;

    // Setup events
    element.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(notification.id);
    });

    element.querySelectorAll('.notification-action').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        EventBus.emit('notification:action', { notification, action });
        this.removeNotification(notification.id);
      });
    });

    notification.element = element;
    return element;
  }

  /**
   * Get notification color by type
   */
  getNotificationColor(type) {
    const colors = {
      info: '#007bff',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };
    return colors[type] || colors.info;
  }

  /**
   * Remove notification
   */
  removeNotification(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification || !notification.element) return;

    // Animate out
    notification.element.style.transform = 'translateX(100%)';
    notification.element.style.opacity = '0';

    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 300);

    EventBus.emit('notification:removed', { notification });
  }

  /**
   * Show context menu
   */
  showContextMenu(options) {
    const { x, y, items, target } = options;
    
    // Hide existing context menus
    this.hideContextMenus();
    
    const menu = this.createContextMenu(items);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    document.body.appendChild(menu);
    
    // Adjust position if off-screen
    this.adjustContextMenuPosition(menu);
    
    // Store reference
    this.contextMenus.set(menu.id, menu);
    
    // Auto-hide on click outside
    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenus.bind(this), { once: true });
    }, 0);
  }

  /**
   * Create context menu
   */
  createContextMenu(items) {
    const menu = document.createElement('div');
    menu.id = `context_menu_${Date.now()}`;
    menu.className = 'context-menu';
    menu.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 3000;
      min-width: 160px;
      padding: 4px 0;
    `;

    items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 1px; background: #eee; margin: 4px 0;';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          color: ${item.disabled ? '#999' : '#333'};
          pointer-events: ${item.disabled ? 'none' : 'auto'};
        `;
        menuItem.textContent = item.text;

        if (!item.disabled) {
          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.background = '#f5f5f5';
          });
          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.background = 'transparent';
          });
          menuItem.addEventListener('click', () => {
            EventBus.emit('contextMenu:action', { action: item.action, data: item.data });
            this.hideContextMenus();
          });
        }

        menu.appendChild(menuItem);
      }
    });

    return menu;
  }

  /**
   * Hide all context menus
   */
  hideContextMenus() {
    this.contextMenus.forEach(menu => {
      if (menu.parentNode) {
        menu.parentNode.removeChild(menu);
      }
    });
    this.contextMenus.clear();
  }

  /**
   * Handle node click
   */
  handleNodeClick(data) {
    if (data.event.detail === 2) { // Double click
      this.showNodeEditor(data.node);
    }
  }

  /**
   * Handle canvas context menu
   */
  handleCanvasContextMenu(data) {
    const items = [
      { text: 'Add Node', action: 'addNode', data: data.position },
      { separator: true },
      { text: 'Paste', action: 'paste', disabled: !this.hasClipboardData() },
      { separator: true },
      { text: 'Select All', action: 'selectAll' },
      { text: 'Clear Canvas', action: 'clearCanvas' }
    ];

    this.showContextMenu({
      x: data.event.clientX,
      y: data.event.clientY,
      items: items
    });
  }

  /**
   * Show node editor
   */
  showNodeEditor(node) {
    this.showModal({
      id: 'nodeEditor',
      title: `Edit ${node.name || node.type}`,
      content: (container, modal) => {
        // This would be implemented to show node-specific editor
        container.innerHTML = '<p>Node editor would be implemented here</p>';
      },
      buttons: [
        { text: 'Cancel', action: 'cancel' },
        { text: 'Save', action: 'save', primary: true }
      ]
    });
  }

  /**
   * Check if clipboard has data
   */
  hasClipboardData() {
    // This would check for copied nodes/data
    return false;
  }

  /**
   * Adjust context menu position
   */
  adjustContextMenuPosition(menu) {
    const rect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Adjust horizontal position
    if (rect.right > windowWidth) {
      menu.style.left = (windowWidth - rect.width - 10) + 'px';
    }

    // Adjust vertical position
    if (rect.bottom > windowHeight) {
      menu.style.top = (windowHeight - rect.height - 10) + 'px';
    }
  }

  /**
   * Animation helpers
   */
  async animateIn(element, styles) {
    return new Promise(resolve => {
      Object.assign(element.style, styles);
      setTimeout(resolve, this.options.animationDuration);
    });
  }

  async animateOut(element, styles) {
    return new Promise(resolve => {
      Object.assign(element.style, styles);
      setTimeout(resolve, this.options.animationDuration);
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    // Close all modals
    while (this.activeModal) {
      this.closeModal();
    }

    // Remove containers
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.notificationContainer.parentNode) {
      this.notificationContainer.parentNode.removeChild(this.notificationContainer);
    }

    // Clear data
    this.modals.clear();
    this.notifications = [];
    this.hideContextMenus();

    // Remove event listeners
    EventBus.off('ui:showModal', this.showModal);
    EventBus.off('ui:closeModal', this.closeModal);
    EventBus.off('ui:notification', this.showNotification);
  }
}

export default UIManager;