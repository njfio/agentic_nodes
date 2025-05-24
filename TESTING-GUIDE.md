# Testing Guide

## Overview

This project uses a comprehensive testing strategy with multiple layers:

- **Unit Tests**: Test individual modules and functions
- **Integration Tests**: Test API endpoints and database interactions
- **End-to-End Tests**: Test complete user workflows
- **Performance Benchmarks**: Measure and track performance metrics

## Test Stack

- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **Supertest**: API endpoint testing
- **MongoDB Memory Server**: In-memory database for tests

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
npm run coverage:report  # Opens HTML report
```

### Performance Benchmarks
```bash
npm run benchmark
```

## Test Structure

```
tests/
├── client/              # Client-side tests
│   ├── setup.js        # Client test setup
│   ├── __mocks__/      # Mock files
│   └── modules/        # Module unit tests
├── server/             # Server-side tests
│   ├── setup.js        # Server test setup
│   ├── models/         # Model unit tests
│   ├── middleware/     # Middleware tests
│   └── integration/    # API integration tests
├── e2e/                # End-to-end tests
│   ├── auth.spec.js    # Authentication flows
│   └── workflow-editor.spec.js
└── performance/        # Performance benchmarks
    └── benchmark.js
```

## Writing Tests

### Unit Test Example

```javascript
describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  it('should update state through dispatch', () => {
    stateManager.init({ counter: 0 });
    
    stateManager.dispatch({
      type: 'INCREMENT',
      payload: 5
    });

    expect(stateManager.getState().counter).toBe(5);
  });
});
```

### Integration Test Example

```javascript
describe('POST /api/v2/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(server)
      .post('/api/v2/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      })
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe('testuser');
  });
});
```

### E2E Test Example

```javascript
test('should create and execute workflow', async ({ page }) => {
  // Add nodes
  await page.click('.node-item:has-text("Input")');
  await canvas.click({ position: { x: 200, y: 200 } });
  
  // Connect nodes
  await outputSocket.dragTo(inputSocket);
  
  // Execute
  await page.click('#play-button');
  
  // Verify
  await expect(page.locator('.status')).toHaveText('Completed');
});
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- Separate projects for client and server tests
- Coverage thresholds set to 70%
- Automatic test detection
- Module name mapping for CSS/assets

### Playwright Configuration (`playwright.config.js`)

- Tests multiple browsers (Chrome, Firefox, Safari)
- Mobile device testing
- Automatic screenshots on failure
- Video recording for failed tests
- Parallel test execution

## Mocking

### API Mocking
```javascript
// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mocked' })
  })
);
```

### Module Mocking
```javascript
jest.mock('../../../models/User');
User.findById.mockResolvedValue(mockUser);
```

### Canvas Mocking
```javascript
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  // ... other canvas methods
}));
```

## Coverage Goals

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

Critical modules should aim for >90% coverage:
- Authentication middleware
- Workflow execution engine
- State management
- API routes

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

## Performance Testing

Run benchmarks to track performance:

```bash
npm run benchmark
```

Benchmarks measure:
- Database query performance
- Workflow execution speed
- Node processing times
- Memory usage

### Benchmark Results

Results are displayed as:
- Min/Max/Mean execution times
- 95th and 99th percentiles
- Standard deviation
- Error rates

## Debugging Tests

### Jest Debugging
```bash
# Run specific test file
jest tests/server/models/User.test.js

# Run tests matching pattern
jest --testNamePattern="should create user"

# Debug in VS Code
# Add breakpoint and use "Jest: Debug" launch config
```

### Playwright Debugging
```bash
# Debug mode with inspector
npm run test:e2e:debug

# UI mode for interactive testing
npm run test:e2e:ui

# Generate test code
npx playwright codegen http://localhost:8732
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Use descriptive test names
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock External Dependencies**: Don't make real API calls
5. **Test Error Cases**: Not just happy paths
6. **Use Test Utilities**: Create helpers for common operations
7. **Keep Tests Fast**: Mock heavy operations
8. **Test Behavior, Not Implementation**: Focus on outcomes

## Common Issues

### Port Already in Use
```bash
# Kill process on port 8732
lsof -ti:8732 | xargs kill -9
```

### Database Connection Issues
- Ensure MongoDB is running for integration tests
- Tests use in-memory database by default

### Flaky E2E Tests
- Add explicit waits: `await page.waitForSelector()`
- Increase timeouts for slow operations
- Check for race conditions

### Coverage Not Generated
- Ensure `collectCoverage: true` in Jest config
- Check `collectCoverageFrom` patterns
- Run with `--coverage` flag

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)