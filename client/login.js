/**
 * Login System
 * Provides authentication for the application
 * Now integrated with the server API
 */

// Load configuration
document.addEventListener('DOMContentLoaded', () => {
  // Create a script element for config.js
  const configScript = document.createElement('script');
  configScript.src = 'config.js';
  configScript.onload = () => {
    // After config is loaded, load the API service
    const apiScript = document.createElement('script');
    apiScript.src = 'api-service.js';
    apiScript.onload = initLogin;
    document.head.appendChild(apiScript);
  };
  document.head.appendChild(configScript);
});

// Initialize login functionality
function initLogin() {
  // Special case for Docker environment - auto-login with test user
  const isDockerEnv = window.location.hostname === 'localhost' &&
                      (window.location.port === '8732' || window.location.port === '8731');

  // Check if we're in the middle of auto-login to prevent loops
  const autoLoginAttempted = sessionStorage.getItem('loginAutoLoginAttempted') === 'true';

  // Check if the user manually logged out
  const manualLogout = localStorage.getItem('manualLogout') === 'true';

  // Check if we already have a user profile and auth token
  const hasUserProfile = localStorage.getItem(Config.storageKeys.userProfile) !== null;
  const hasAuthToken = localStorage.getItem(Config.storageKeys.authToken) !== null ||
                      sessionStorage.getItem(Config.storageKeys.authToken) !== null;

  // Check if this is a logout redirect
  const isLogoutRedirect = window.location.search.includes('logout=true');

  // If we're already logged in, redirect to app
  if (isLoggedIn()) {
    redirectToApp();
    return;
  }

  // If in Docker and haven't attempted auto-login yet and not a manual logout
  if (isDockerEnv && !autoLoginAttempted && !manualLogout && !isLogoutRedirect) {
    // Set flag to prevent infinite loops
    sessionStorage.setItem('loginAutoLoginAttempted', 'true');

    // Show loading indicator
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
        <h2>Docker Environment Detected</h2>
        <p>Auto-logging in as test user...</p>
        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Use the Docker auto-login endpoint with the correct API URL
    fetch('http://localhost:8732/api/docker/auto-login')
      .then(response => {
        if (!response.ok) {
          throw new Error('Auto-login failed');
        }
        return response.json();
      })
      .then(data => {
        // Clear the attempt flag since we succeeded
        sessionStorage.removeItem('loginAutoLoginAttempted');

        // Auto-login with test user from server
        setLoggedIn(data, true);

        // Set a flag to indicate Docker auto-login
        localStorage.setItem('dockerAutoLogin', 'true');

        // Redirect to app with cache-busting parameter
        window.location.href = `index.html?dockerLogin=success&t=${Date.now()}`;
      })
      .catch(error => {
        // Clear the attempt flag since we failed
        sessionStorage.removeItem('loginAutoLoginAttempted');

        // Show the login form with error message
        setupLoginForm();
        showError('Docker auto-login failed. Please log in manually.');
      });

    return;
  } else if (isDockerEnv && autoLoginAttempted) {
    // If we've already attempted auto-login, clear the flag to allow manual login
    sessionStorage.removeItem('loginAutoLoginAttempted');
  }

  // Set up the login form for manual login
  setupLoginForm();
}

// Set up the login form for manual login
function setupLoginForm() {
  // Set up event listeners
  setupEventListeners();

  // Show default login credentials hint
  const loginForm = document.querySelector('.login-form');
  if (loginForm) {
    const credentialsHint = document.createElement('div');
    credentialsHint.className = 'credentials-hint';
    credentialsHint.innerHTML = `
      <p>Default login: <strong>testuser</strong> / <strong>password123</strong></p>
    `;
    loginForm.appendChild(credentialsHint);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Login button click
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  // Enter key press in password field
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }

  // Remember me checkbox
  const rememberMeCheckbox = document.getElementById('rememberMe');
  if (rememberMeCheckbox) {
    // Check if there's a saved preference
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    rememberMeCheckbox.checked = rememberMe;

    // If remember me was checked, fill in the username
    if (rememberMe) {
      const savedUsername = localStorage.getItem('savedUsername');
      if (savedUsername) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
          usernameInput.value = savedUsername;
        }
      }
    }
  }
}

// Handle login attempt
async function handleLogin() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');

  if (!usernameInput || !passwordInput || !loginError) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

  // Validate inputs
  if (!username || !password) {
    showError('Please enter both username and password');
    return;
  }

  // Disable login button and show loading state
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
  }

  try {
    // First, clear any existing auth data to prevent conflicts
    localStorage.removeItem(Config.storageKeys.authToken);
    sessionStorage.removeItem(Config.storageKeys.authToken);
    localStorage.removeItem(Config.storageKeys.userProfile);

    // Try to login with the API
    const userData = await checkCredentials(username, password);

    if (userData) {
      // Save login state
      setLoggedIn(userData, rememberMe);

      // Add a small delay to ensure storage is updated before redirect
      setTimeout(() => {
        // Redirect to the main application with a cache-busting parameter
        window.location.href = 'index.html?nocache=' + Date.now();
      }, 100);
    } else {
      // Show error with hint about default user
      showError('Invalid username or password. Try using testuser/password123');

      // Shake the form
      const loginForm = document.querySelector('.login-form');
      if (loginForm) {
        loginForm.classList.add('shake');
        setTimeout(() => {
          loginForm.classList.remove('shake');
        }, 600);
      }

      // Clear the password field
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (error) {
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    // Re-enable login button
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  }
}

// Check if the credentials are valid
async function checkCredentials(username, password) {
  try {
    const userData = await ApiService.users.login({ username, password });
    return userData;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

// Show an error message
function showError(message) {
  const loginError = document.getElementById('loginError');
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.add('show');
  }
}

// Validate JWT token format
function isValidTokenFormat(token) {
  if (!token) return false;

  // Basic JWT format check: should be three parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  // Each part should be base64url encoded
  try {
    for (const part of parts) {
      // Check if it's valid base64url format (may contain only A-Z, a-z, 0-9, -, _, = padding)
      if (!/^[A-Za-z0-9_-]+={0,2}$/.test(part)) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Set the logged in state
function setLoggedIn(userData, rememberMe) {
  // Get the token from the response
  const { user, token } = userData;

  if (!token) {
    console.error('No token provided');
    return;
  }

  // Validate token format
  if (!isValidTokenFormat(token)) {
    console.error('Invalid token format received from server');
    showError('Invalid authentication token received from server. Please try again.');
    return;
  }

  // Store user data
  localStorage.setItem(Config.storageKeys.userProfile, JSON.stringify(user));

  if (rememberMe) {
    // Store in localStorage (persists between sessions)
    localStorage.setItem(Config.storageKeys.authToken, token);
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('savedUsername', user.username);
  } else {
    // Store in sessionStorage (cleared when browser is closed)
    sessionStorage.setItem(Config.storageKeys.authToken, token);
    localStorage.setItem('rememberMe', 'false');
    localStorage.removeItem('savedUsername');
  }

  // Clear any manual logout flag since we're now logging in
  localStorage.removeItem('manualLogout');
}

// Check if the user is logged in
function isLoggedIn() {
  // Check both localStorage and sessionStorage for the auth token
  const localToken = localStorage.getItem(Config.storageKeys.authToken);
  const sessionToken = sessionStorage.getItem(Config.storageKeys.authToken);

  return localToken !== null || sessionToken !== null;
}

// Redirect to the main application
function redirectToApp() {
  // Add a cache-busting parameter to prevent caching issues
  window.location.href = `index.html?nocache=${Date.now()}`;
}
