/**
 * Application Configuration
 */

const Config = {
  // API base URL
  apiBaseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8732/api'
    : '/api',

  // Default OpenAI settings
  defaultOpenAIConfig: {
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 120 // Default timeout in seconds
  },

  // Available models
  availableModels: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'o4-mini-high', name: 'o4-mini-high' }
  ],

  // Image generation model
  imageModel: 'gpt-image-1',

  // Image analysis model
  imageAnalysisModel: 'gpt-4o',

  // Local storage keys
  storageKeys: {
    openAIConfig: 'openai_config',
    canvasState: 'canvas_state',
    userProfile: 'user_profile',
    authToken: 'auth_token'
  }
};

// Export the config
window.Config = Config;
