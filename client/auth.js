/**
 * Authentication System
 * Checks if the user is logged in and manages logout
 */

const Auth = {
  // Initialize the authentication system
  init() {
    // Check if the user is logged in
    if (!this.isLoggedIn()) {
      this.redirectToLogin();
      return;
    }
    
    // Add the user info and logout button to the toolbar
    this.addUserInfoToToolbar();
  },
  
  // Check if the user is logged in
  isLoggedIn() {
    return sessionStorage.getItem('isLoggedIn') === 'true';
  },
  
  // Get the current username
  getUsername() {
    return sessionStorage.getItem('username') || 'User';
  },
  
  // Redirect to the login page
  redirectToLogin() {
    window.location.href = 'login.html';
  },
  
  // Log out the user
  logout() {
    // Clear the session storage
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    
    // Redirect to the login page
    this.redirectToLogin();
  },
  
  // Add the user info and logout button to the toolbar
  addUserInfoToToolbar() {
    // Create the user info container
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    // Get the username
    const username = this.getUsername();
    
    // Create the user avatar
    const userAvatar = document.createElement('div');
    userAvatar.className = 'user-avatar';
    userAvatar.textContent = username.charAt(0).toUpperCase();
    
    // Create the username display
    const usernameDisplay = document.createElement('span');
    usernameDisplay.className = 'username-display';
    usernameDisplay.textContent = username;
    
    // Create the logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.type = 'button';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', () => {
      this.logout();
    });
    
    // Add everything to the user info container
    userInfo.appendChild(userAvatar);
    userInfo.appendChild(usernameDisplay);
    userInfo.appendChild(logoutBtn);
    
    // Add the user info to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.appendChild(userInfo);
    }
  }
};

// Initialize the authentication system when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
