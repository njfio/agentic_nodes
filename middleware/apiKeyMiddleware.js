const User = require('../models/User');

/**
 * Middleware to fetch API keys from user settings if not provided in headers
 */
async function enrichApiKeys(req, res, next) {
  try {
    // Skip if no user is authenticated
    if (!req.user) {
      return next();
    }

    // Check each service and add to headers if not already present
    const services = ['openai', 'anthropic', 'google', 'perplexity'];
    
    for (const service of services) {
      const headerKey = `x-${service}-api-key`;
      
      // If API key not in headers, try to get from user settings
      if (!req.headers[headerKey]) {
        const apiKey = await req.user.getApiKey(service);
        if (apiKey) {
          req.headers[headerKey] = apiKey;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error enriching API keys:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Endpoint to get user's API key settings (masked)
 */
async function getApiKeys(req, res) {
  try {
    const apiKeys = await req.user.getAllApiKeys();
    res.json({ apiKeys });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
}

/**
 * Endpoint to update a user's API key
 */
async function updateApiKey(req, res) {
  try {
    const { service, apiKey } = req.body;
    
    // Validate service
    const validServices = ['openai', 'anthropic', 'google', 'perplexity'];
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: 'Invalid service' });
    }

    // Validate API key format based on service
    if (service === 'openai' && apiKey && !apiKey.startsWith('sk-')) {
      return res.status(400).json({ error: 'OpenAI API key must start with "sk-"' });
    }

    // Update the API key
    await req.user.setApiKey(service, apiKey);
    
    res.json({ 
      message: 'API key updated successfully',
      service: service,
      masked: apiKey ? '***' + apiKey.slice(-4) : 'removed'
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
}

module.exports = {
  enrichApiKeys,
  getApiKeys,
  updateApiKey
};