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
  // Check if the user is already logged in
  if (isLoggedIn()) {
    redirectToApp();
    return;
  }

  // Set up event listeners
  setupEventListeners();
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
    // Check credentials with the server
    const isValid = await checkCredentials(username, password);

    if (isValid) {
      // Save login state
      setLoggedIn(true, username, rememberMe);

      // Redirect to the main app
      redirectToApp();
    } else {
      // Show error
      showError('Invalid username or password');

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
    // Try to call the login API
    try {
      const userData = await ApiService.users.login({
        username,
        password
      });

      // Store user data in localStorage
      localStorage.setItem(Config.storageKeys.userProfile, JSON.stringify(userData));

      return true;
    } catch (apiError) {
      console.warn('API login failed, falling back to local validation:', apiError);

      // Fallback to local validation if API fails
      // This is temporary until the server is fully set up
      const validCredentials = [
        { username: 'admin', password: 'password' },
        { username: 'user', password: 'user123' },
        { username: 'demo', password: 'demo' }
      ];

      const isValid = validCredentials.some(cred =>
        cred.username === username && cred.password === password
      );

      if (isValid) {
        // Create mock user data
        const mockUserData = {
          id: 'local-' + Date.now(),
          username: username,
          email: `${username}@example.com`,
          createdAt: new Date()
        };

        // Store mock user data
        localStorage.setItem(Config.storageKeys.userProfile, JSON.stringify(mockUserData));
      }

      return isValid;
    }
  } catch (error) {
    console.error('Login error:', error);
    return false;
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

// Set the logged in state
function setLoggedIn(isLoggedIn, username, rememberMe) {
  // Generate a dummy token (in a real app, this would come from the server)
  const token = 'dummy-token-' + Date.now();

  if (rememberMe) {
    // Store in localStorage (persists between sessions)
    localStorage.setItem(Config.storageKeys.authToken, token);
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('savedUsername', username);
  } else {
    // Store in sessionStorage (cleared when browser is closed)
    sessionStorage.setItem(Config.storageKeys.authToken, token);
    localStorage.setItem('rememberMe', 'false');
    localStorage.removeItem('savedUsername');
  }
}

// Check if the user is logged in
function isLoggedIn() {
  // Check both localStorage and sessionStorage for the auth token
  return localStorage.getItem(Config.storageKeys.authToken) !== null ||
         sessionStorage.getItem(Config.storageKeys.authToken) !== null;
}

// Redirect to the main application
function redirectToApp() {
  window.location.href = 'index.html';
}
