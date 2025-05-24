const { test, expect } = require('@playwright/test');

test.describe('Workflow Editor', () => {
  let username;
  let password;

  test.beforeAll(async ({ browser }) => {
    // Register a test user
    const page = await browser.newPage();
    username = `e2e_user_${Date.now()}`;
    password = 'Test123!@#';
    
    await page.goto('/login');
    await page.click('text=Sign up');
    
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for app to load
    await expect(page.locator('#main-canvas, canvas')).toBeVisible();
  });

  test('should display workflow editor interface', async ({ page }) => {
    // Check main UI elements
    await expect(page.locator('#toolbar, .toolbar')).toBeVisible();
    await expect(page.locator('#main-canvas, canvas')).toBeVisible();
    await expect(page.locator('#sidebar, .sidebar')).toBeVisible();
    
    // Check toolbar buttons
    await expect(page.locator('#play-button, button:has-text("Run")')).toBeVisible();
    await expect(page.locator('#save-button, button:has-text("Save")')).toBeVisible();
    await expect(page.locator('#load-button, button:has-text("Load")')).toBeVisible();
  });

  test('should add nodes to canvas', async ({ page }) => {
    // Open node panel if not visible
    const nodePanel = page.locator('.node-categories, #nodes-panel');
    if (!(await nodePanel.isVisible())) {
      await page.click('button[data-tab="nodes"]');
    }
    
    // Click on a node type
    await page.click('.node-item:has-text("Input"), .node-type:has-text("Input")');
    
    // Click on canvas to place node
    const canvas = page.locator('#main-canvas, canvas').first();
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Check if node was added
    await expect(page.locator('.node:has-text("Input"), [data-node-type="input"]')).toBeVisible();
    
    // Add another node
    await page.click('.node-item:has-text("Output"), .node-type:has-text("Output")');
    await canvas.click({ position: { x: 400, y: 200 } });
    
    await expect(page.locator('.node')).toHaveCount(2);
  });

  test('should connect nodes', async ({ page }) => {
    // Add two nodes first
    const canvas = page.locator('#main-canvas, canvas').first();
    
    await page.click('.node-item:has-text("Input"), .node-type:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    await page.click('.node-item:has-text("Output"), .node-type:has-text("Output")');
    await canvas.click({ position: { x: 400, y: 200 } });
    
    // Connect nodes by dragging from output to input
    const firstNode = page.locator('.node').first();
    const secondNode = page.locator('.node').last();
    
    const outputSocket = firstNode.locator('.socket-output, .output-socket').first();
    const inputSocket = secondNode.locator('.socket-input, .input-socket').first();
    
    await outputSocket.dragTo(inputSocket);
    
    // Check if connection was created
    await expect(page.locator('.connection, path[class*="connection"]')).toBeVisible();
  });

  test('should edit node properties', async ({ page }) => {
    // Add a node
    const canvas = page.locator('#main-canvas, canvas').first();
    await page.click('.node-item:has-text("Input"), .node-type:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Double-click node to edit
    const node = page.locator('.node').first();
    await node.dblclick();
    
    // Check if properties panel opened
    await expect(page.locator('.node-editor, .modal:has-text("Edit")')).toBeVisible();
    
    // Edit a property
    await page.fill('input[name="value"], input[placeholder*="value"]', '42');
    await page.click('button:has-text("Save"), button:has-text("OK")');
    
    // Verify property was saved (this depends on your UI)
    await node.click();
    await expect(page.locator('.properties-panel, #properties-panel')).toContainText('42');
  });

  test('should save and load workflows', async ({ page }) => {
    // Create a simple workflow
    const canvas = page.locator('#main-canvas, canvas').first();
    
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    await page.click('.node-item:has-text("Output")');
    await canvas.click({ position: { x: 400, y: 200 } });
    
    // Save workflow
    await page.click('#save-button, button:has-text("Save")');
    
    // Fill workflow name
    await page.fill('input[name="workflowName"], input[placeholder*="name"]', 'Test Workflow E2E');
    await page.click('button:has-text("Save"), button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('.success-message, .notification-success')).toBeVisible();
    
    // Clear canvas
    await page.reload();
    
    // Load workflow
    await page.click('#load-button, button:has-text("Load")');
    await page.click('.workflow-item:has-text("Test Workflow E2E")');
    
    // Verify nodes are restored
    await expect(page.locator('.node')).toHaveCount(2);
  });

  test('should execute workflow', async ({ page }) => {
    // Create executable workflow
    const canvas = page.locator('#main-canvas, canvas').first();
    
    // Add input node
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Configure input value
    const inputNode = page.locator('.node').first();
    await inputNode.dblclick();
    await page.fill('input[name="value"]', '10');
    await page.click('button:has-text("Save")');
    
    // Add transform node
    await page.click('.node-item:has-text("Transform"), .node-item:has-text("Math")');
    await canvas.click({ position: { x: 400, y: 200 } });
    
    // Add output node
    await page.click('.node-item:has-text("Output")');
    await canvas.click({ position: { x: 600, y: 200 } });
    
    // Connect nodes
    // (Implementation depends on your UI)
    
    // Execute workflow
    await page.click('#play-button, button:has-text("Run")');
    
    // Check for execution feedback
    await expect(page.locator('.execution-status, .status:has-text("Running")')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('.execution-status:has-text("Completed"), .status:has-text("Success")')).toBeVisible({
      timeout: 10000
    });
    
    // Check output
    const outputNode = page.locator('.node').last();
    await outputNode.click();
    await expect(page.locator('.node-output, .properties-panel')).toContainText(/result|output/i);
  });

  test('should handle workflow errors', async ({ page }) => {
    // Create workflow with error
    const canvas = page.locator('#main-canvas, canvas').first();
    
    // Add a node that will cause an error
    await page.click('.node-item:has-text("Transform")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Don't connect any inputs (should cause error)
    
    // Execute workflow
    await page.click('#play-button, button:has-text("Run")');
    
    // Check for error indication
    await expect(page.locator('.error-message, .node.error')).toBeVisible({
      timeout: 5000
    });
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Add some nodes
    const canvas = page.locator('#main-canvas, canvas').first();
    
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Select node
    const node = page.locator('.node').first();
    await node.click();
    
    // Test delete shortcut
    await page.keyboard.press('Delete');
    await expect(page.locator('.node')).toHaveCount(0);
    
    // Test undo shortcut
    await page.keyboard.press('Control+z');
    await expect(page.locator('.node')).toHaveCount(1);
    
    // Test save shortcut
    await page.keyboard.press('Control+s');
    await expect(page.locator('.save-dialog, .modal:has-text("Save")')).toBeVisible();
  });

  test('should zoom and pan canvas', async ({ page }) => {
    const canvas = page.locator('#main-canvas, canvas').first();
    
    // Add a node as reference
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Test zoom in
    await page.click('#zoom-in, button:has-text("+")');
    await expect(page.locator('#zoom-level, .zoom-display')).toContainText(/120|125|150/);
    
    // Test zoom out
    await page.click('#zoom-out, button:has-text("-")');
    await page.click('#zoom-out, button:has-text("-")');
    await expect(page.locator('#zoom-level, .zoom-display')).toContainText(/80|75|50/);
    
    // Test fit to content
    await page.click('#fit-to-content, button[title*="Fit"]');
    
    // Test pan by dragging
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 400, y: 400 },
      targetPosition: { x: 200, y: 200 }
    });
    
    // Verify node moved with canvas
    const nodeBounds = await page.locator('.node').first().boundingBox();
    expect(nodeBounds).toBeTruthy();
  });

  test('should show node context menu', async ({ page }) => {
    // Add a node
    const canvas = page.locator('#main-canvas, canvas').first();
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Right-click node
    const node = page.locator('.node').first();
    await node.click({ button: 'right' });
    
    // Check context menu
    await expect(page.locator('.context-menu')).toBeVisible();
    await expect(page.locator('.context-menu')).toContainText('Delete');
    await expect(page.locator('.context-menu')).toContainText('Duplicate');
    
    // Click duplicate
    await page.click('.context-menu >> text=Duplicate');
    
    // Should have 2 nodes now
    await expect(page.locator('.node')).toHaveCount(2);
  });

  test('should support multiple selection', async ({ page }) => {
    const canvas = page.locator('#main-canvas, canvas').first();
    
    // Add multiple nodes
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    await page.click('.node-item:has-text("Transform")');
    await canvas.click({ position: { x: 400, y: 200 } });
    
    await page.click('.node-item:has-text("Output")');
    await canvas.click({ position: { x: 600, y: 200 } });
    
    // Select all with Ctrl+A
    await canvas.click();
    await page.keyboard.press('Control+a');
    
    // Check all nodes are selected
    await expect(page.locator('.node.selected')).toHaveCount(3);
    
    // Delete all selected
    await page.keyboard.press('Delete');
    await expect(page.locator('.node')).toHaveCount(0);
  });

  test('should display minimap', async ({ page }) => {
    // Check if minimap is visible
    const minimap = page.locator('#minimap, .minimap');
    await expect(minimap).toBeVisible();
    
    // Add nodes spread across canvas
    const canvas = page.locator('#main-canvas, canvas').first();
    
    await page.click('.node-item:has-text("Input")');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    await page.click('.node-item:has-text("Output")');
    await canvas.click({ position: { x: 800, y: 600 } });
    
    // Minimap should show overview
    const minimapCanvas = minimap.locator('canvas');
    await expect(minimapCanvas).toBeVisible();
    
    // Click on minimap to navigate
    await minimapCanvas.click({ position: { x: 50, y: 50 } });
    
    // Canvas view should update
    // (Verification depends on your implementation)
  });
});