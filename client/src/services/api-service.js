/**
 * API Service
 * Centralized service for all API calls
 */

import { ConfigManager } from '../config/config-manager.js';
import { Logger } from '../core/logger.js';
import { EventBus } from '../core/event-bus.js';

class ApiServiceClass {
  constructor() {
    this.baseUrl = '/api'; // Use v1 API version to match server
    this.version = '1.0.0';
    this.headers = {
      'Content-Type': 'application/json'
    };
    this.interceptors = {
      request: [],
      response: []
    };
    this.token = localStorage.getItem('authToken');
  }

  /**
   * Initialize the API service
   */
  init() {
    this.baseUrl = ConfigManager.get('api.baseUrl', window.location.origin);
    this.headers = {
      'Content-Type': 'application/json'
    };

    Logger.info('api', `API Service initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  /**
   * Make an API request
   */
  async request(url, options = {}) {
    // Apply request interceptors
    let finalUrl = url;
    let finalOptions = { ...options };

    for (const interceptor of this.interceptors.request) {
      const result = await interceptor(finalUrl, finalOptions);
      if (result) {
        finalUrl = result.url || finalUrl;
        finalOptions = result.options || finalOptions;
      }
    }

    // Add default headers
    finalOptions.headers = {
      ...this.headers,
      ...finalOptions.headers
    };

    // Make the request
    const startTime = performance.now();
    let response;

    try {
      Logger.debug('api', `${finalOptions.method || 'GET'} ${finalUrl}`);
      EventBus.emit('api:request-start', { url: finalUrl, options: finalOptions });

      response = await fetch(finalUrl, finalOptions);

      // Apply response interceptors
      for (const interceptor of this.interceptors.response) {
        response = await interceptor(response) || response;
      }

      const duration = performance.now() - startTime;
      Logger.debug('api', `${finalOptions.method || 'GET'} ${finalUrl} completed in ${duration.toFixed(2)}ms`);

      EventBus.emit('api:request-complete', {
        url: finalUrl,
        options: finalOptions,
        response,
        duration
      });

      // Check for errors
      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      return response;

    } catch (error) {
      const duration = performance.now() - startTime;
      Logger.error('api', `${finalOptions.method || 'GET'} ${finalUrl} failed after ${duration.toFixed(2)}ms: ${error.message}`);

      EventBus.emit('api:request-error', {
        url: finalUrl,
        options: finalOptions,
        error,
        duration
      });

      throw error;
    }
  }

  /**
   * Handle error response
   */
  async handleErrorResponse(response) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error?.message || errorMessage;
    } catch (e) {
      // If can't parse JSON, use default message
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = response;

    return error;
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * Upload file
   */
  async upload(url, formData, options = {}) {
    const uploadOptions = {
      ...options,
      method: 'POST',
      body: formData
    };

    // Remove Content-Type to let browser set it with boundary
    delete uploadOptions.headers['Content-Type'];

    return this.request(url, uploadOptions);
  }
}

// Create singleton instance
export const ApiService = new ApiServiceClass();

/**
 * OpenAI API wrapper
 */
ApiService.openai = {
  /**
   * Create chat completion
   */
  async createChatCompletion(params) {
    const config = ConfigManager.get('openai');

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await ApiService.post('/api/openai/chat', params, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    return await response.json();
  },

  /**
   * Create image
   */
  async createImage(params) {
    const config = ConfigManager.get('openai');

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await ApiService.post('/api/openai/images', params, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    return await response.json();
  },

  /**
   * Create image variation
   */
  async createImageVariation(formData) {
    const config = ConfigManager.get('openai');

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await ApiService.upload('/api/openai/images/variations', formData, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    return await response.json();
  }
};

/**
 * Workflow API wrapper
 */
ApiService.workflows = {
  /**
   * Get all workflows
   */
  async getAll() {
    const response = await ApiService.get('/api/workflows');
    return await response.json();
  },

  /**
   * Get workflow by ID
   */
  async getById(id) {
    const response = await ApiService.get(`/api/workflows/${id}`);
    return await response.json();
  },

  /**
   * Create workflow
   */
  async create(workflow) {
    const response = await ApiService.post('/api/workflows', workflow);
    return await response.json();
  },

  /**
   * Update workflow
   */
  async update(id, workflow) {
    const response = await ApiService.put(`/api/workflows/${id}`, workflow);
    return await response.json();
  },

  /**
   * Delete workflow
   */
  async delete(id) {
    const response = await ApiService.delete(`/api/workflows/${id}`);
    return await response.json();
  }
};

/**
 * User API wrapper
 */
ApiService.users = {
  /**
   * Login
   */
  async login(credentials) {
    const response = await ApiService.post('/api/users/login', credentials);
    const data = await response.json();

    // Store token if provided
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      ApiService.headers['Authorization'] = `Bearer ${data.token}`;
    }

    return data;
  },

  /**
   * Register
   */
  async register(userData) {
    const response = await ApiService.post('/api/users/register', userData);
    return await response.json();
  },

  /**
   * Logout
   */
  async logout() {
    const response = await ApiService.post('/api/users/logout');

    // Clear token
    localStorage.removeItem('auth_token');
    delete ApiService.headers['Authorization'];

    return await response.json();
  },

  /**
   * Get profile
   */
  async getProfile() {
    const response = await ApiService.get('/api/users/profile');
    return await response.json();
  },

  /**
   * Update profile
   */
  async updateProfile(updates) {
    const response = await ApiService.put('/api/users/profile', updates);
    return await response.json();
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    ApiService.init();

    // Check for existing auth token
    const token = localStorage.getItem('auth_token');
    if (token) {
      ApiService.headers['Authorization'] = `Bearer ${token}`;
    }
  });
}