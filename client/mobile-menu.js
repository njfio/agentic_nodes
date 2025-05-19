/**
 * Mobile Menu Handler
 * Manages the mobile menu functionality for responsive design
 */
class MobileMenuHandler {
  constructor() {
    this.menuButton = document.getElementById('mobileMenuBtn');
    this.menuDropdown = document.getElementById('mobileMenuDropdown');
    this.toolbarButtons = Array.from(document.querySelectorAll('#toolbar button:not(#addNodeBtn, #workflowsBtn, #saveWorkflowBtn, #mobileMenuBtn)'));
    
    this.isMenuOpen = false;
    this.init();
  }

  init() {
    // Initialize the mobile menu
    this.populateMenu();
    
    // Add event listeners
    this.menuButton.addEventListener('click', () => this.toggleMenu());
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && 
          e.target !== this.menuButton && 
          !this.menuButton.contains(e.target) && 
          e.target !== this.menuDropdown && 
          !this.menuDropdown.contains(e.target)) {
        this.closeMenu();
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && this.isMenuOpen) {
        this.closeMenu();
      }
    });
    
    // Listen for theme changes to update menu styling
    window.addEventListener('themechange', () => {
      // Re-apply any theme-specific styling if needed
    });
  }

  populateMenu() {
    // Clear existing menu items
    this.menuDropdown.innerHTML = '';
    
    // Clone toolbar buttons for the mobile menu
    this.toolbarButtons.forEach(button => {
      if (button.id !== 'mobileMenuBtn') {
        const menuItem = document.createElement('button');
        menuItem.textContent = button.textContent;
        menuItem.setAttribute('type', 'button');
        menuItem.setAttribute('data-original-id', button.id);
        
        // Add click event to trigger the original button's click
        menuItem.addEventListener('click', () => {
          // Close the menu
          this.closeMenu();
          
          // Trigger the original button's click event
          document.getElementById(button.id).click();
        });
        
        this.menuDropdown.appendChild(menuItem);
      }
    });
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.menuDropdown.style.display = 'block';
    this.isMenuOpen = true;
    this.menuButton.classList.add('active');
  }

  closeMenu() {
    this.menuDropdown.style.display = 'none';
    this.isMenuOpen = false;
    this.menuButton.classList.remove('active');
  }

  // Update the menu when toolbar buttons change
  updateMenu() {
    this.toolbarButtons = Array.from(document.querySelectorAll('#toolbar button:not(#addNodeBtn, #workflowsBtn, #saveWorkflowBtn, #mobileMenuBtn)'));
    this.populateMenu();
  }
}

// Initialize the mobile menu handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.mobileMenuHandler = new MobileMenuHandler();
});

// Export the MobileMenuHandler class
export default MobileMenuHandler;
