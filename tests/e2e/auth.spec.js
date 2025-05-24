const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login page for unauthenticated users', async ({ page }) => {
    // Check if redirected to login
    await expect(page).toHaveURL(/\/login/);
    
    // Check login form elements
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for login title
    await expect(page.locator('h1, h2').filter({ hasText: /log\s*in/i })).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    await page.click('text=Sign up');
    
    // Fill registration form
    const username = `testuser_${Date.now()}`;
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to main app
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#main-canvas, #canvas-container')).toBeVisible();
    
    // Should show user menu with username
    await expect(page.locator('.user-name, .user-menu')).toContainText(username);
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register a user
    const username = `testuser_${Date.now()}`;
    const password = 'Test123!@#';
    
    await page.goto('/login');
    await page.click('text=Sign up');
    
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    // Logout
    await page.click('.user-menu, .user-button');
    await page.click('text=Logout');
    
    // Login again
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Should be logged in
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#main-canvas, #canvas-container')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="username"]', 'invaliduser');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message, .alert-error')).toBeVisible();
    await expect(page.locator('.error-message, .alert-error')).toContainText(/invalid/i);
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up');
    
    const username = `testuser_${Date.now()}`;
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    
    // Try weak password
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    
    // Check for validation message
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    
    // Or check for error message
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .field-error')).toContainText(/password/i);
  });

  test('should logout user', async ({ page, context }) => {
    // Login first
    const username = `testuser_${Date.now()}`;
    const password = 'Test123!@#';
    
    await page.goto('/login');
    await page.click('text=Sign up');
    
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for app to load
    await expect(page.locator('#main-canvas, #canvas-container')).toBeVisible();
    
    // Logout
    await page.click('.user-menu, .user-button');
    await page.click('text=Logout');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Try to access protected page
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should persist login across page refresh', async ({ page, context }) => {
    // Login
    const username = `testuser_${Date.now()}`;
    const password = 'Test123!@#';
    
    await page.goto('/login');
    await page.click('text=Sign up');
    
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for app to load
    await expect(page.locator('#main-canvas, #canvas-container')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#main-canvas, #canvas-container')).toBeVisible();
    await expect(page.locator('.user-name, .user-menu')).toContainText(username);
  });

  test('should handle session expiry', async ({ page, context }) => {
    // Login
    const username = `testuser_${Date.now()}`;
    const password = 'Test123!@#';
    
    await page.goto('/login');
    await page.click('text=Sign up');
    
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    // Clear auth token to simulate expiry
    await context.addCookies([{ 
      name: 'authToken', 
      value: 'expired-token', 
      domain: 'localhost', 
      path: '/' 
    }]);
    
    // Or clear localStorage
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
    });
    
    // Try to perform authenticated action
    await page.reload();
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});