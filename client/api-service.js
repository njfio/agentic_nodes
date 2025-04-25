/**
 * API Service
 * Handles all API calls to the backend
 */

const ApiService = {
  /**
   * Make a request to the API
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise} - Promise with response data
   */
  async request(endpoint, method = 'GET', data = null) {
    const url = `${Config.apiBaseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add auth token if available
    const token = localStorage.getItem(Config.storageKeys.authToken);
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add request body for non-GET requests
    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || 'API request failed');
        }

        return responseData;
      } else {
        if (!response.ok) {
          throw new Error('API request failed');
        }

        return await response.text();
      }
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  // OpenAI API calls
  openai: {
    /**
     * Call the OpenAI Chat API
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async chat(data) {
      return ApiService.request('/openai/chat', 'POST', data);
    },

    /**
     * Call the OpenAI Image Generation API
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async generateImage(data) {
      return ApiService.request('/openai/images', 'POST', data);
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
