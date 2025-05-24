#!/bin/bash

echo "📦 Installing missing test dependencies..."

# Install missing Jest dependencies
npm install --save-dev \
  @babel/core \
  @babel/preset-env \
  @babel/plugin-proposal-class-properties \
  @babel/plugin-proposal-optional-chaining \
  @babel/plugin-proposal-nullish-coalescing-operator \
  babel-jest \
  @testing-library/jest-dom \
  jest-environment-jsdom

# Install Playwright for E2E tests
npm install --save-dev @playwright/test

echo "✅ Test dependencies installed!"
echo ""
echo "You can now run:"
echo "  npm test          - Run all tests"
echo "  npm run test:e2e  - Run E2E tests"
echo ""
echo "Note: Playwright may need to install browsers on first run."