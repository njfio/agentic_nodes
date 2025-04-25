/**
 * Login System
 * Provides authentication for the application
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if the user is already logged in
  if (isLoggedIn()) {
    redirectToApp();
    return;
  }
  
  // Set up event listeners
  setupEventListeners();
});

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
function handleLogin() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const loginError = document.getElementById('loginError');
  
  if (!usernameInput || !passwordInput || !loginError) return;
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
  
  // Validate inputs
  if (!username || !password) {
    showError('Please enter both username and password');
    return;
  }
  
  // Check credentials (in a real app, this would be a server request)
  if (checkCredentials(username, password)) {
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
}

// Check if the credentials are valid
function checkCredentials(username, password) {
  // In a real app, this would be a server request
  // For demo purposes, we'll accept a few hardcoded credentials
  const validCredentials = [
    { username: 'admin', password: 'password' },
    { username: 'user', password: 'user123' },
    { username: 'demo', password: 'demo' }
  ];
  
  return validCredentials.some(cred => 
    cred.username === username && cred.password === password
  );
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
  // Store the login state in sessionStorage (cleared when browser is closed)
  sessionStorage.setItem('isLoggedIn', isLoggedIn);
  sessionStorage.setItem('username', username);
  
  // If remember me is checked, store in localStorage (persists)
  localStorage.setItem('rememberMe', rememberMe);
  if (rememberMe) {
    localStorage.setItem('savedUsername', username);
  } else {
    localStorage.removeItem('savedUsername');
  }
}

// Check if the user is logged in
function isLoggedIn() {
  return sessionStorage.getItem('isLoggedIn') === 'true';
}

// Redirect to the main application
function redirectToApp() {
  window.location.href = 'index.html';
}
