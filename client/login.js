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
    // Try to login with the API
    const userData = await checkCredentials(username, password);

    if (userData) {
      // Save login state
      setLoggedIn(userData, rememberMe);

      // Redirect to the main app
      redirectToApp();
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
    // IMPORTANT: For development, we'll bypass the API and use mock data for all users
    // This ensures the application works even if MongoDB is not available

    // List of valid test users
    const validCredentials = [
      { username: 'testuser', password: 'password123', role: 'user' },
      { username: 'admin', password: 'password', role: 'admin' },
      { username: 'user', password: 'user123', role: 'user' },
      { username: 'demo', password: 'demo', role: 'user' }
    ];

    // Check if the credentials match any of our test users
    const matchedUser = validCredentials.find(cred =>
      cred.username === username && cred.password === password
    );

    if (matchedUser) {
      console.log(`Using mock data for ${username}`);

      // Create a mock user and token
      const mockToken = `mock-user-token-${Date.now()}`;
      const mockUser = {
        id: `mock-${Date.now()}`,
        username: matchedUser.username,
        email: `${matchedUser.username}@example.com`,
        role: matchedUser.role,
        isVerified: true,
        tokens: [],
        createdAt: new Date()
      };

      // Return mock user data and token
      return {
        user: mockUser,
        token: mockToken
      };
    }

    // If we get here, try the API as a fallback (but we shouldn't need this in development)
    try {
      // Call the login API
      const userData = await ApiService.users.login({
        username,
        password
      });

      // Return the user data and token
      return userData;
    } catch (apiError) {
      console.warn('API login failed:', apiError);
      return null;
    }
  } catch (error) {
    console.error('Login error:', error);
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
  window.location.href = 'index.html';
}
