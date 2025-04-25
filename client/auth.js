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

  console.warn('Config object not loaded yet, using default values');
}

const Auth = {
  // Initialize the authentication system
  init() {
    console.log('Auth init called');

    // Check if we're on the login page
    if (window.location.pathname.includes('login.html')) {
      console.log('On login page, skipping auth check');
      return;
    }

    // Check if the user is logged in
    if (!this.isLoggedIn()) {
      console.log('User not logged in, redirecting to login');
      this.redirectToLogin();
      return;
    }

    console.log('User is logged in, adding user info to toolbar');

    // Add the user info and logout button to the toolbar
    this.addUserInfoToToolbar();
  },

  // Check if the user is logged in
  isLoggedIn() {
    // Check both localStorage and sessionStorage
    const localToken = localStorage.getItem('auth_token');
    const sessionToken = sessionStorage.getItem('auth_token');

    console.log('Checking login status:', { localToken, sessionToken });

    return localToken !== null || sessionToken !== null;
  },

  // Get the current user data
  getUserData() {
    const userData = localStorage.getItem('user_profile');
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
      // Call the logout API if available
      if (typeof ApiService !== 'undefined') {
        await ApiService.users.logout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      // Clear the auth data
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');

      // Redirect to the login page
      this.redirectToLogin();
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
