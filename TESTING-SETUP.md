# Testing Setup Guide

## Current Status

The project has a comprehensive testing infrastructure prepared, but currently runs in a minimal configuration to avoid dependency issues.

## Quick Start (Minimal Testing)

```bash
# Run basic tests (no external dependencies required)
npm test
```

This runs only the basic health check tests that verify Jest is working correctly.

## Full Testing Setup

To enable the complete test suite with all features:

### 1. Install Dependencies

```bash
# Make the installation script executable
chmod +x install-test-deps.sh

# Install all testing dependencies
./install-test-deps.sh
```

This installs:
- Babel and plugins for modern JavaScript
- Jest DOM utilities
- Playwright for E2E testing
- Testing library utilities

### 2. Enable Full Test Configuration

```bash
# Replace simple config with full config
mv jest.config.js jest.config.simple.js
mv jest.config.full.js jest.config.js
```

### 3. Run Full Test Suite

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires running server)
npm run test:e2e

# With coverage
npm run test:coverage
```

## Test Files Structure

```
tests/
├── server/
│   ├── health.test.js          ✅ Working (basic tests)
│   ├── models/                 🔧 Requires MongoDB
│   │   └── User.test.js
│   ├── middleware/             🔧 Requires dependencies
│   │   └── auth.test.js
│   └── integration/            🔧 Requires full server
│       ├── auth.test.js
│       └── workflows.test.js
├── client/
│   └── modules/                🔧 Requires Babel/DOM
│       ├── StateManager.test.js
│       └── WorkflowEngine.test.js
├── e2e/                        🔧 Requires Playwright
│   ├── auth.spec.js
│   └── workflow-editor.spec.js
└── performance/
    └── benchmark.js            🔧 Requires database
```

## Troubleshooting

### "Cannot find module" Errors

If you see module not found errors:
1. Run `./install-test-deps.sh` to install dependencies
2. Check that all imports in test files point to existing modules
3. Some modules may need to be mocked if they don't exist yet

### Database Connection Errors

The full test suite requires MongoDB. Either:
1. Install and run MongoDB locally
2. Use Docker: `docker-compose up -d mongodb`
3. Set `MONGODB_URI` environment variable

### Babel/Transform Errors

If you see Babel-related errors:
1. Ensure `.babelrc` exists with proper configuration
2. Install Babel dependencies: `npm install --save-dev @babel/core @babel/preset-env babel-jest`
3. Or use the simple config that doesn't require Babel

### E2E Test Failures

For Playwright E2E tests:
1. Ensure the server is running: `npm run start:test`
2. Install browsers: `npx playwright install`
3. Check that UI elements match the selectors in tests

## Development Workflow

### Writing New Tests

1. **Unit Tests**: Test individual functions/modules
   ```javascript
   describe('MyModule', () => {
     it('should do something', () => {
       expect(myFunction()).toBe('expected');
     });
   });
   ```

2. **Integration Tests**: Test API endpoints
   ```javascript
   const request = require('supertest');
   const app = require('../../server');
   
   it('should respond to GET', async () => {
     const res = await request(app).get('/api/v2/health');
     expect(res.status).toBe(200);
   });
   ```

3. **E2E Tests**: Test user workflows
   ```javascript
   test('user can login', async ({ page }) => {
     await page.goto('/login');
     await page.fill('input[name="username"]', 'user');
     await page.click('button[type="submit"]');
     await expect(page).toHaveURL('/dashboard');
   });
   ```

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: ./install-test-deps.sh
      - run: npm run test:ci
```

## Next Steps

1. **Install Dependencies**: Run `./install-test-deps.sh`
2. **Enable Full Config**: Switch to `jest.config.full.js`
3. **Write More Tests**: Expand test coverage for your modules
4. **Set Up CI**: Configure automated testing in your pipeline
5. **Monitor Coverage**: Aim for >70% code coverage

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](./TESTING-GUIDE.md)