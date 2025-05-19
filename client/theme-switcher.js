/**
 * Theme Switcher Component
 * Handles switching between light and dark themes
 */
class ThemeSwitcher {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    // Apply the saved theme on page load
    this.applyTheme(this.currentTheme);
    
    // Create the theme toggle button
    this.createThemeToggle();
    
    // Listen for system theme changes
    this.listenForSystemThemeChanges();
  }

  createThemeToggle() {
    // Create the theme toggle container
    const container = document.createElement('div');
    container.className = 'theme-toggle-container';
    
    // Create the toggle button
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Toggle theme');
    toggle.innerHTML = this.currentTheme === 'dark' 
      ? '<i class="fas fa-sun"></i>' 
      : '<i class="fas fa-moon"></i>';
    
    // Add click event listener
    toggle.addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Append toggle to container
    container.appendChild(toggle);
    
    // Add the container to the DOM
    const header = document.querySelector('.header') || document.querySelector('header');
    if (header) {
      header.appendChild(container);
    } else {
      // If no header exists, create one
      const newHeader = document.createElement('div');
      newHeader.className = 'header';
      newHeader.appendChild(container);
      document.body.insertBefore(newHeader, document.body.firstChild);
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    this.currentTheme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    // Update the toggle button icon
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.innerHTML = this.currentTheme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
    }
    
    // Dispatch a theme change event
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme: this.currentTheme } 
    }));
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }

  listenForSystemThemeChanges() {
    // Check if the user has a system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // If the user hasn't manually set a theme, use the system preference
    if (!localStorage.getItem('theme')) {
      this.applyTheme(prefersDarkScheme.matches ? 'dark' : 'light');
      this.currentTheme = prefersDarkScheme.matches ? 'dark' : 'light';
    }
    
    // Listen for changes to the system preference
    prefersDarkScheme.addEventListener('change', (e) => {
      // Only apply if the user hasn't manually set a theme
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.currentTheme = newTheme;
        
        // Update the toggle button icon
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
          toggle.innerHTML = this.currentTheme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
        }
      }
    });
  }
}

// Add theme toggle styles
const style = document.createElement('style');
style.textContent = `
  .theme-toggle-container {
    margin-left: auto;
    padding: 0 15px;
  }
  
  .theme-toggle {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 5px;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.3s;
  }
  
  .theme-toggle:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  :root.dark-theme .theme-toggle:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;
document.head.appendChild(style);

// Initialize the theme switcher when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeSwitcher = new ThemeSwitcher();
});

// Export the ThemeSwitcher class
export default ThemeSwitcher;
