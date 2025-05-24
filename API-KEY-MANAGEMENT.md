# API Key Management

## Overview

The application now stores API keys securely in user settings within the database, rather than requiring them as environment variables. This allows each user to have their own API keys and manage them through the application interface.

## How It Works

1. **No Environment Variables Required**: The application no longer requires `OPENAI_API_KEY` or other API keys to be set as environment variables at startup.

2. **User-Specific Keys**: Each user can store their own API keys for different services:
   - OpenAI
   - Anthropic
   - Google (Gemini)
   - Perplexity

3. **Secure Storage**: API keys are:
   - Stored encrypted in the database
   - Excluded from API responses by default
   - Only accessible by the authenticated user

## API Endpoints

### Get API Keys (Masked)
```
GET /api/settings/api-keys
Authorization: Bearer <token>

Response:
{
  "apiKeys": {
    "openai": "***-1234",      // Last 4 chars only
    "anthropic": "***-5678",
    "google": "",
    "perplexity": ""
  }
}
```

### Update API Key
```
PUT /api/settings/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "service": "openai",
  "apiKey": "sk-your-actual-api-key"
}

Response:
{
  "message": "API key updated successfully",
  "service": "openai",
  "masked": "***-key"
}
```

## Client-Side Usage

### Setting API Keys

Users can update their API keys through the settings interface:

```javascript
// Update OpenAI API key
await fetch('/api/settings/api-keys', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    service: 'openai',
    apiKey: 'sk-your-actual-api-key'
  })
});
```

### Using API Keys

When making AI requests, the API keys are automatically retrieved from user settings:

```javascript
// No need to include API key in headers - it's fetched automatically
await fetch('/api/openai/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

### Override with Custom Key

You can still override with a different API key if needed:

```javascript
await fetch('/api/openai/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-openai-api-key': 'sk-different-api-key'  // Override user's stored key
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

## Migration for Existing Users

If you were previously using environment variables:

1. Remove `OPENAI_API_KEY` from your `.env` file or Docker environment
2. Login to the application
3. Go to Settings → API Keys
4. Enter your API keys for each service
5. Save the settings

## Security Considerations

1. **Encryption**: Consider adding field-level encryption for API keys in the database
2. **Audit Trail**: Log when API keys are accessed or updated
3. **Rate Limiting**: API key update endpoints are rate-limited
4. **Validation**: API keys are validated for correct format before storage

## Docker Configuration

Update your `docker-compose.yml` to remove API key environment variables:

```yaml
# Before
environment:
  - OPENAI_API_KEY=sk-your-key
  
# After - No API keys needed!
environment:
  - NODE_ENV=production
  - MONGODB_URI=mongodb://mongodb:27017/multimodal
```

## Troubleshooting

### "OpenAI API key is not configured"
1. Make sure you're logged in
2. Go to Settings → API Keys
3. Enter your OpenAI API key
4. Try your request again

### "Invalid API key format"
- OpenAI keys must start with `sk-`
- Make sure you're copying the entire key
- Check for extra spaces or characters

### API Key Not Working
1. Verify the key works in OpenAI playground
2. Check if the key has the required permissions
3. Ensure you have sufficient credits/quota