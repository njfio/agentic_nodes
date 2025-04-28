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
   * Check if a payload is large and might exceed size limits
   * @param {object} data - The data to check
   * @returns {boolean} - Whether the payload is large
   */
  isLargePayload(data) {
    try {
      // Stringify the data to check its size
      const jsonString = JSON.stringify(data);

      // Check if the payload is larger than 10MB (a conservative threshold)
      const sizeInMB = jsonString.length / (1024 * 1024);

      // Log the payload size for debugging
      if (sizeInMB > 1) {
        DebugManager.addLog(`Payload size: ${sizeInMB.toFixed(2)}MB`, 'info');
      }

      return sizeInMB > 10; // Return true if payload is larger than 10MB
    } catch (error) {
      console.error('Error checking payload size:', error);
      return false;
    }
  },

  /**
   * Optimize a payload by compressing image data
   * @param {object} data - The data to optimize
   * @returns {object} - The optimized data
   */
  optimizePayload(data) {
    try {
      // Create a deep copy of the data
      const optimizedData = JSON.parse(JSON.stringify(data));

      // Process the payload to optimize image data
      this.processObjectForOptimization(optimizedData);

      return optimizedData;
    } catch (error) {
      console.error('Error optimizing payload:', error);
      return data; // Return original data if optimization fails
    }
  },

  /**
   * Recursively process an object to optimize image data
   * @param {object} obj - The object to process
   */
  processObjectForOptimization(obj) {
    if (!obj || typeof obj !== 'object') return;

    // Process arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'object') {
          this.processObjectForOptimization(obj[i]);
        } else if (typeof obj[i] === 'string' && this.isBase64Image(obj[i])) {
          // Optimize base64 image data
          obj[i] = this.optimizeBase64Image(obj[i]);
        }
      }
      return;
    }

    // Process objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object') {
          this.processObjectForOptimization(obj[key]);
        } else if (typeof obj[key] === 'string' && this.isBase64Image(obj[key])) {
          // Optimize base64 image data
          obj[key] = this.optimizeBase64Image(obj[key]);
        }
      }
    }
  },

  /**
   * Check if a string is a base64 encoded image
   * @param {string} str - The string to check
   * @returns {boolean} - Whether the string is a base64 encoded image
   */
  isBase64Image(str) {
    return typeof str === 'string' &&
           (str.startsWith('data:image/') ||
            str.startsWith('data:application/octet-stream;base64,'));
  },

  /**
   * Optimize a base64 encoded image
   * @param {string} base64String - The base64 encoded image
   * @returns {string} - The optimized image or a reference to it
   */
  optimizeBase64Image(base64String) {
    try {
      // If the image is already small, return it as is
      if (base64String.length < 100_000) { // Less than 100KB
        return base64String;
      }

      // For large images, we'll use a placeholder and store the actual data in ImageStorage
      const imageId = ImageStorage.saveImage(base64String);

      // Return a placeholder that references the stored image
      return `[image:${imageId}]`;
    } catch (error) {
      console.error('Error optimizing base64 image:', error);
      return base64String; // Return original string if optimization fails
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
   * @param {number} timeout - Request timeout in ms (default: 300000 - 5 minutes)
   * @returns {Promise} - Promise with response data
   */
  async request(endpoint, method = 'GET', data = null, retry = true, customHeaders = {},
                maxRetries = 3, retryDelay = 1000, retryCount = 0, timeout = 300000) { // Default 5 minute timeout
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
      // Check if this is a large payload that might exceed size limits
      const isLargePayload = this.isLargePayload(data);

      if (isLargePayload && (endpoint === '/openai/chat' || endpoint === '/openai/images')) {
        // For large payloads to OpenAI endpoints, use chunking strategy
        DebugManager.addLog('Large payload detected, optimizing request size...', 'info');

        // Optimize the payload by compressing image data
        const optimizedData = this.optimizePayload(data);
        options.body = JSON.stringify(optimizedData);

        // Add header to indicate payload was optimized
        options.headers['x-payload-optimized'] = 'true';
      } else {
        // Normal payload
        options.body = JSON.stringify(data);
      }
    }

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout); // Use the provided timeout value
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
        console.error(`API request to ${endpoint} timed out after ${timeout/1000} seconds`);

        // Provide a more specific error message for image generation timeouts
        if (endpoint === '/openai/images') {
          throw new Error('Image generation timed out. This operation can take longer than expected. Please try again or consider using a simpler prompt.');
        } else {
          throw new Error('API request timed out. Please try again.');
        }
      }

      if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
        console.error(`Network error for API request to ${endpoint}`);
        throw new Error('Network error. Please check your internet connection and try again.');
      }

      // For network errors or timeouts, retry if we haven't exceeded max retries
      const retryableErrors = ['TypeError', 'NetworkError', 'AbortError'];
      if (retryableErrors.includes(error.name) && retryCount < maxRetries) {
        console.warn(`${error.name} for API request to ${endpoint}. Retrying (${retryCount + 1}/${maxRetries})...`);

        // Calculate exponential backoff delay
        const backoffDelay = retryDelay * (2 ** retryCount);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, backoffDelay));

        // For image generation, increase timeout on each retry
        let nextTimeout = timeout;
        if (endpoint === '/openai/images' && error.name === 'AbortError') {
          // Increase timeout by 30 seconds on each retry
          nextTimeout = timeout + 30_000 * (retryCount + 1);
          console.warn(`Increasing timeout for image generation to ${nextTimeout/1000} seconds`);
        }

        // Retry the request with incremented retry count
        return this.request(endpoint, method, data, retry, customHeaders, maxRetries, retryDelay, retryCount + 1, nextTimeout);
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
        // Try to get the API key from the correct storage key
        const config = JSON.parse(localStorage.getItem(Config.storageKeys.openAIConfig) || '{}');

        // Debug logging can be enabled here if needed
        // console.log('OpenAI config from storage:', config);

        return config.apiKey || null;
      } catch (error) {
        console.error('Error getting OpenAI API key:', error);
        return null;
      }
    },

    /**
     * Get the OpenAI configuration from localStorage
     * @returns {object} - The OpenAI configuration
     */
    getConfig() {
      try {
        // Try to get the config from the correct storage key
        const config = JSON.parse(localStorage.getItem(Config.storageKeys.openAIConfig) || '{}');

        // Apply defaults for any missing values
        return {
          apiKey: config.apiKey || null,
          model: config.model || Config.defaultOpenAIConfig.model,
          temperature: config.temperature || Config.defaultOpenAIConfig.temperature,
          maxTokens: config.maxTokens || Config.defaultOpenAIConfig.maxTokens,
          timeout: config.timeout || Config.defaultOpenAIConfig.timeout
        };
      } catch (error) {
        console.error('Error getting OpenAI config:', error);
        return {
          apiKey: null,
          model: Config.defaultOpenAIConfig.model,
          temperature: Config.defaultOpenAIConfig.temperature,
          maxTokens: Config.defaultOpenAIConfig.maxTokens,
          timeout: Config.defaultOpenAIConfig.timeout
        };
      }
    },

    /**
     * Call the OpenAI Chat API
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async chat(data) {
      const config = this.getConfig();

      // Add API key and timeout to headers
      const headers = {};
      if (config.apiKey) {
        headers['x-openai-api-key'] = config.apiKey;
      }

      // Convert timeout from seconds to milliseconds and add to headers
      const timeoutMs = (config.timeout || 300) * 1000;
      headers['x-openai-timeout'] = timeoutMs.toString();

      // Add debug log
      DebugManager.addLog(`Using timeout of ${timeoutMs}ms for OpenAI chat request`, 'info');

      return ApiService.request(
        '/openai/chat',
        'POST',
        data,
        true,
        headers,
        3,    // maxRetries
        1000, // retryDelay
        0,    // retryCount
        timeoutMs
      );
    },

    /**
     * Call the OpenAI Image Generation API
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async generateImage(data) {
      const config = this.getConfig();

      // Add API key and timeout to headers
      const headers = {};
      if (config.apiKey) {
        headers['x-openai-api-key'] = config.apiKey;
      }

      // Use a longer timeout for image generation
      // Image generation can take significantly longer than text generation
      // Use the configured timeout but multiply it by 2 for image generation, with a minimum of 10 minutes
      const configuredTimeoutMs = (config.timeout || 300) * 1000;
      const IMAGE_GENERATION_TIMEOUT = Math.max(configuredTimeoutMs * 2, 600_000); // At least 10 minutes

      // Add timeout to headers
      headers['x-openai-timeout'] = IMAGE_GENERATION_TIMEOUT.toString();

      // Add debug log
      DebugManager.addLog(`Using timeout of ${IMAGE_GENERATION_TIMEOUT}ms for OpenAI image generation request`, 'info');

      return ApiService.request(
        '/openai/images',
        'POST',
        data,
        true,
        headers,
        3,    // maxRetries
        1000, // retryDelay
        0,    // retryCount
        IMAGE_GENERATION_TIMEOUT
      );
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
