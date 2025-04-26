/**
 * API Service
 * Handles all API calls to the backend
 */

const ApiService = {
  /**
   * Validate a JWT token format
   * @param {string} token - The token to validate
   * @returns {boolean} - Whether the token is valid
   */
  isValidTokenFormat(token) {
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
  },

  /**
   * Make a request to the API with retry capability
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @param {boolean} retry - Whether to retry the request if token is invalid
   * @param {object} customHeaders - Additional headers to include in the request
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @param {number} retryDelay - Delay between retries in ms (default: 1000)
   * @param {number} retryCount - Current retry count (used internally)
   * @returns {Promise} - Promise with response data
   */
  async request(endpoint, method = 'GET', data = null, retry = true, customHeaders = {},
                maxRetries = 3, retryDelay = 1000, retryCount = 0) {
    const url = `${Config.apiBaseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      }
    };

    // Add auth token if available (check both localStorage and sessionStorage)
    let token = localStorage.getItem(Config.storageKeys.authToken) ||
                sessionStorage.getItem(Config.storageKeys.authToken);

    // Validate token format
    if (token && !this.isValidTokenFormat(token)) {
      console.warn('Found malformed token in storage, clearing it');
      localStorage.removeItem(Config.storageKeys.authToken);
      sessionStorage.removeItem(Config.storageKeys.authToken);
      token = null;
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    } else if (!endpoint.includes('/users/login') && !endpoint.includes('/users/register')) {
      console.warn('No auth token found for API request to:', endpoint);
    }

    // Add request body for non-GET requests
    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      options.signal = controller.signal;

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const responseData = await response.json();

        if (!response.ok) {
          // Handle authentication errors
          if (response.status === 401 && retry) {
            // Token might be invalid, try to refresh or redirect to login
            if (responseData.message === 'Token is not valid' ||
                responseData.message === 'No authentication token, access denied') {

              console.warn('Authentication token invalid or expired');

              // Clear the invalid token
              localStorage.removeItem(Config.storageKeys.authToken);
              sessionStorage.removeItem(Config.storageKeys.authToken);

              // If this is a login or register endpoint, don't redirect
              if (!endpoint.includes('/users/login') && !endpoint.includes('/users/register')) {
                // Notify the user and redirect to login
                if (confirm('Your session has expired. Please log in again.')) {
                  window.location.href = 'login.html';
                }
              }
            }
          }

          // For server errors (5xx) or rate limiting (429), retry if we haven't exceeded max retries
          if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
            console.warn(`API request failed with status ${response.status}. Retrying (${retryCount + 1}/${maxRetries})...`);

            // Calculate exponential backoff delay
            const backoffDelay = retryDelay * Math.pow(2, retryCount);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, backoffDelay));

            // Retry the request with incremented retry count
            return this.request(endpoint, method, data, retry, customHeaders, maxRetries, retryDelay, retryCount + 1);
          }

          throw new Error(responseData.message || `API request failed with status ${response.status}`);
        }

        return responseData;
      } else {
        if (!response.ok) {
          // For server errors (5xx) or rate limiting (429), retry if we haven't exceeded max retries
          if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
            console.warn(`API request failed with status ${response.status}. Retrying (${retryCount + 1}/${maxRetries})...`);

            // Calculate exponential backoff delay
            const backoffDelay = retryDelay * Math.pow(2, retryCount);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, backoffDelay));

            // Retry the request with incremented retry count
            return this.request(endpoint, method, data, retry, customHeaders, maxRetries, retryDelay, retryCount + 1);
          }

          throw new Error(`API request failed with status ${response.status}`);
        }

        return await response.text();
      }
    } catch (error) {
      // Handle network errors, timeouts, and aborts
      if (error.name === 'AbortError') {
        console.error(`API request to ${endpoint} timed out`);
        throw new Error('API request timed out. Please try again.');
      }

      if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
        console.error(`Network error for API request to ${endpoint}`);
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      // For network errors, retry if we haven't exceeded max retries
      if ((error.name === 'TypeError' || error.name === 'NetworkError') && retryCount < maxRetries) {
        console.warn(`Network error for API request to ${endpoint}. Retrying (${retryCount + 1}/${maxRetries})...`);

        // Calculate exponential backoff delay
        const backoffDelay = retryDelay * Math.pow(2, retryCount);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, backoffDelay));

        // Retry the request with incremented retry count
        return this.request(endpoint, method, data, retry, customHeaders, maxRetries, retryDelay, retryCount + 1);
      }

      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  // OpenAI API calls
  openai: {
    /**
     * Get the OpenAI API key from localStorage
     * @returns {string|null} - The API key or null if not found
     */
    getApiKey() {
      try {
        const config = JSON.parse(localStorage.getItem(Config.storageKeys.openAIConfig) || '{}');
        return config.apiKey || null;
      } catch (error) {
        console.error('Error getting OpenAI API key:', error);
        return null;
      }
    },

    /**
     * Call the OpenAI Chat API
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async chat(data) {
      const apiKey = this.getApiKey();
      const headers = apiKey ? { 'x-openai-api-key': apiKey } : {};
      return ApiService.request('/openai/chat', 'POST', data, true, headers);
    },

    /**
     * Call the OpenAI Image Generation API
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async generateImage(data) {
      const apiKey = this.getApiKey();
      const headers = apiKey ? { 'x-openai-api-key': apiKey } : {};
      return ApiService.request('/openai/images', 'POST', data, true, headers);
    }
  },

  // Workflow API calls
  workflows: {
    /**
     * Get all workflows
     * @returns {Promise} - Promise with workflows data
     */
    async getAll() {
      return ApiService.request('/workflows');
    },

    /**
     * Get a workflow by ID
     * @param {string} id - Workflow ID
     * @returns {Promise} - Promise with workflow data
     */
    async getById(id) {
      return ApiService.request(`/workflows/${id}`);
    },

    /**
     * Create a new workflow
     * @param {object} workflow - Workflow data
     * @returns {Promise} - Promise with created workflow data
     */
    async create(workflow) {
      return ApiService.request('/workflows', 'POST', workflow);
    },

    /**
     * Update a workflow
     * @param {string} id - Workflow ID
     * @param {object} workflow - Updated workflow data
     * @returns {Promise} - Promise with updated workflow data
     */
    async update(id, workflow) {
      return ApiService.request(`/workflows/${id}`, 'PUT', workflow);
    },

    /**
     * Delete a workflow
     * @param {string} id - Workflow ID
     * @returns {Promise} - Promise with deletion confirmation
     */
    async delete(id) {
      return ApiService.request(`/workflows/${id}`, 'DELETE');
    }
  },

  // Node API calls
  nodes: {
    /**
     * Get all nodes
     * @returns {Promise} - Promise with nodes data
     */
    async getAll() {
      return ApiService.request('/nodes');
    },

    /**
     * Get a node by ID
     * @param {string} id - Node ID
     * @returns {Promise} - Promise with node data
     */
    async getById(id) {
      return ApiService.request(`/nodes/${id}`);
    },

    /**
     * Create a new node
     * @param {object} node - Node data
     * @returns {Promise} - Promise with created node data
     */
    async create(node) {
      return ApiService.request('/nodes', 'POST', node);
    },

    /**
     * Update a node
     * @param {string} id - Node ID
     * @param {object} node - Updated node data
     * @returns {Promise} - Promise with updated node data
     */
    async update(id, node) {
      return ApiService.request(`/nodes/${id}`, 'PUT', node);
    },

    /**
     * Delete a node
     * @param {string} id - Node ID
     * @returns {Promise} - Promise with deletion confirmation
     */
    async delete(id) {
      return ApiService.request(`/nodes/${id}`, 'DELETE');
    }
  },

  // User API calls
  users: {
    /**
     * Register a new user
     * @param {object} userData - User registration data
     * @returns {Promise} - Promise with user data
     */
    async register(userData) {
      return ApiService.request('/users/register', 'POST', userData);
    },

    /**
     * Login a user
     * @param {object} credentials - User login credentials
     * @returns {Promise} - Promise with user data
     */
    async login(credentials) {
      return ApiService.request('/users/login', 'POST', credentials);
    },

    /**
     * Get user profile
     * @returns {Promise} - Promise with user profile data
     */
    async getProfile() {
      return ApiService.request('/users/profile');
    },

    /**
     * Update user profile
     * @param {object} profileData - Updated profile data
     * @returns {Promise} - Promise with updated profile data
     */
    async updateProfile(profileData) {
      return ApiService.request('/users/profile', 'PUT', profileData);
    },

    /**
     * Logout user
     * @returns {Promise} - Promise with logout confirmation
     */
    async logout() {
      return ApiService.request('/users/logout', 'POST');
    },

    /**
     * Logout from all devices
     * @returns {Promise} - Promise with logout confirmation
     */
    async logoutAll() {
      return ApiService.request('/users/logoutAll', 'POST');
    },

    /**
     * Verify email
     * @param {string} token - Verification token
     * @returns {Promise} - Promise with verification result
     */
    async verifyEmail(token) {
      return ApiService.request(`/users/verify-email?token=${token}`, 'GET');
    },

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise} - Promise with request result
     */
    async requestPasswordReset(email) {
      return ApiService.request('/users/request-password-reset', 'POST', { email });
    },

    /**
     * Reset password
     * @param {string} token - Reset token
     * @param {string} password - New password
     * @returns {Promise} - Promise with reset result
     */
    async resetPassword(token, password) {
      return ApiService.request('/users/reset-password', 'POST', { token, password });
    }
  }
};

// Export the API service
window.ApiService = ApiService;
