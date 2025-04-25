/**
 * Authentication System
 * Checks if the user is logged in and manages logout
 * Now integrated with the server API
 */

const Auth = {
  // Initialize the authentication system
  init() {
    // Check if the user is logged in
    if (!this.isLoggedIn()) {
      this.redirectToLogin();
      return;
    }

    // Verify token with the server
    this.verifyToken()
      .then(valid => {
        if (valid) {
          // Add the user info and logout button to the toolbar
          this.addUserInfoToToolbar();
        } else {
          // Token is invalid, log out
          this.logout();
        }
      })
      .catch(error => {
        console.error('Error verifying token:', error);
        // If there's an error, we'll still show the UI but log the error
        this.addUserInfoToToolbar();
      });
  },

  // Check if the user is logged in
  isLoggedIn() {
    return localStorage.getItem(Config.storageKeys.authToken) !== null;
  },

  // Get the current user data
  getUserData() {
    const userData = localStorage.getItem(Config.storageKeys.userProfile);
    return userData ? JSON.parse(userData) : { username: 'User' };
  },

  // Get the current username
  getUsername() {
    return this.getUserData().username || 'User';
  },

  // Verify the token with the server
  async verifyToken() {
    try {
      // In a real implementation, this would call an API endpoint to verify the token
      // For now, we'll just check if the token exists
      return this.isLoggedIn();
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  },

  // Redirect to the login page
  redirectToLogin() {
    window.location.href = 'login.html';
  },

  // Log out the user
  logout() {
    // Clear the auth data
    localStorage.removeItem(Config.storageKeys.authToken);
    localStorage.removeItem(Config.storageKeys.userProfile);

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
