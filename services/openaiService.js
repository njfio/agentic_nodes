const axios = require('axios');
const https = require('https');
const cacheService = require('./cacheService');
const { logger } = require('./loggingService');

class OpenAIService {
  constructor() {
    this.baseUrl = 'https://api.openai.com/v1';
  }

  getApiKey(headers) {
    return headers['x-openai-api-key'] || process.env.OPENAI_API_KEY;
  }

  getTimeout(headers, defaultTimeout = 300000) {
    return parseInt(headers['x-openai-timeout']) || defaultTimeout;
  }

  validateApiKey(apiKey) {
    if (!apiKey || 
        apiKey === 'sk-your-actual-openai-api-key' || 
        apiKey === 'REPLACE_WITH_YOUR_OPENAI_API_KEY') {
      throw new Error('OpenAI API key is not configured. Please set your API key in the OpenAI Configuration modal.');
    }
  }

  createHttpsAgent() {
    return new https.Agent({
      rejectUnauthorized: true,
      secureProtocol: 'TLSv1_2_method'
    });
  }

  generateCacheKey(endpoint, data) {
    const requestString = JSON.stringify({
      endpoint,
      data: this.sortObject(data)
    });
    
    return require('crypto').createHash('md5').update(requestString).digest('hex');
  }

  sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }
    
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = this.sortObject(obj[key]);
      return result;
    }, {});
  }

  async makeRequest(endpoint, data, headers, timeout, useCache = true) {
    try {
      const cacheKey = this.generateCacheKey(endpoint, data);
      
      if (useCache) {
        const cachedResponse = await cacheService.get(cacheKey);
        if (cachedResponse) {
          logger.info(`Cache hit for OpenAI request: ${endpoint}`);
          return cachedResponse;
        }
      }

      const apiKey = this.getApiKey(headers);
      this.validateApiKey(apiKey);

      const httpsAgent = this.createHttpsAgent();

      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        httpsAgent,
        timeout
      });

      if (useCache) {
        await cacheService.set(cacheKey, response.data, 60 * 60);
      }

      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  handleApiError(error) {
    logger.error('OpenAI API error:', {
      message: error.message,
      response: error.response?.data
    });

    if (error.response?.data?.error?.message?.includes('API key')) {
      throw new Error('Invalid OpenAI API key. Please update your API key in the OpenAI Configuration modal.');
    }

    if (error.message && (
        error.message.includes('SSL') ||
        error.message.includes('ssl') ||
        error.message.includes('alert bad record mac') ||
        error.message.includes('ECONNRESET'))){
      throw new Error('SSL connection error with OpenAI API. Please try again or check your network connection.');
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request to OpenAI API timed out. Please try again or check your network connection.');
    }

    throw new Error(error.response?.data?.error?.message || 'An error occurred with the OpenAI API');
  }

  async processChatCompletion(payload, headers) {
    logger.info('Processing chat completion request');
    
    const timeout = this.getTimeout(headers, 300000);
    logger.debug(`Using timeout of ${timeout}ms for OpenAI chat request`);

    if (payload.tools && payload.tools.length > 0) {
      payload = this.validateTools(payload);
    }

    return this.makeRequest('/chat/completions', payload, headers, timeout);
  }

  async processImageGeneration(payload, headers) {
    logger.info('Processing image generation request');
    
    const timeout = this.getTimeout(headers, 600000);
    logger.debug(`Using timeout of ${timeout}ms for OpenAI image generation request`);

    return this.makeRequest('/images/generations', payload, headers, timeout, false);
  }

  validateTools(payload) {
    logger.debug(`Request includes ${payload.tools.length} tools`);
    const toolNames = payload.tools.map(t => t.function?.name).filter(Boolean);
    logger.debug(`Tool names: ${toolNames.join(', ')}`);

    const validTools = payload.tools.filter(tool => {
      if (!tool.type || tool.type !== 'function') {
        logger.warn(`Invalid tool type: ${tool.type}`);
        return false;
      }
      if (!tool.function || !tool.function.name) {
        logger.warn('Tool missing function name');
        return false;
      }
      if (!tool.function.parameters) {
        logger.warn(`Tool ${tool.function.name} missing parameters`);
        return false;
      }
      return true;
    });

    if (validTools.length !== payload.tools.length) {
      logger.warn(`Filtered out ${payload.tools.length - validTools.length} invalid tools`);
      payload.tools = validTools;
    }

    if (!payload.tool_choice) {
      logger.debug('Setting tool_choice to auto');
      payload.tool_choice = 'auto';
    }

    return payload;
  }
}

module.exports = new OpenAIService();
