/**
 * Authentication System
 * Checks if the user is logged in and manages logout
 * Now integrated with the server API
 */

// Make sure we have a Config object
if (typeof Config === 'undefined') {
  // Define a temporary Config object if it doesn't exist yet
  window.Config = {
    storageKeys: {
      authToken: 'auth_token',
      userProfile: 'user_profile'
    }
  };
}

const Auth = {
  // Initialize the authentication system
  init() {
    // Check if we're on the login page
    if (window.location.pathname.includes('login.html')) {
      return;
    }

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
    // Check for both user profile and token
    const userProfile = localStorage.getItem(Config.storageKeys.userProfile);
    const localToken = localStorage.getItem(Config.storageKeys.authToken);
    const sessionToken = sessionStorage.getItem(Config.storageKeys.authToken);

    // Special case for Docker environment - auto-login with test user
    const isDockerEnv = window.location.hostname === 'localhost' &&
                        (window.location.port === '8732' || window.location.port === '8731');

    // Check if we're in Docker environment and have the Docker auto-login flag
    const isDockerAutoLogin = localStorage.getItem('dockerAutoLogin') === 'true';

    // If we're in Docker environment and don't have credentials yet
    if (isDockerEnv && (!userProfile || (!localToken && !sessionToken))) {
      // If we haven't tried auto-login yet, redirect to login page
      if (!isDockerAutoLogin) {
        // We'll let the login page handle the auto-login
        return false;
      }


      return false;
    // Return true if we have both user profile and a token
    return userProfile !== null && (localToken !== null || sessionToken !== null);
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

  // Redirect to the login page
  redirectToLogin() {
    window.location.href = 'login.html';
  },

  // Log out the user
  async logout() {
    try {
      // Check if we're in Docker environment
      const isDockerEnv = window.location.hostname === 'localhost' &&
                         (window.location.port === '8732' || window.location.port === '8731');

      // Call the logout API if available
      if (typeof ApiService !== 'undefined') {
        try {
          await ApiService.users.logout();
        } catch (apiError) {
          console.warn('API logout failed, continuing with local logout');
        }
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      // Clear all auth data
      localStorage.removeItem(Config.storageKeys.authToken);
      sessionStorage.removeItem(Config.storageKeys.authToken);
      localStorage.removeItem(Config.storageKeys.userProfile);
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedUsername');

      // Clear Docker auto-login flag to prevent immediate re-login
      localStorage.removeItem('dockerAutoLogin');

      // Set a flag to prevent auto-login on the next page load
      localStorage.setItem('manualLogout', 'true');

      // Clear any other potential auth-related data
      sessionStorage.clear();

      // Redirect to the login page with a parameter to prevent auto-login
      window.location.href = 'login.html?logout=true&t=' + Date.now();
    }
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
