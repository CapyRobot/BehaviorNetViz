import { test, expect } from '@playwright/test';
import { MockRuntimeServer } from './mock-ws-server';

// Run tests serially since they all use the same WebSocket port
test.describe.configure({ mode: 'serial' });

const TEST_CONFIG = {
  places: [
    { id: 'entry', type: 'entrypoint', name: 'Entry Point' },
    { id: 'process', type: 'action', name: 'Process Item' },
    { id: 'done', type: 'exit_logger', name: 'Done' },
  ],
  transitions: [
    { id: 't1', from: ['entry'], to: ['process'] },
    { id: 't2', from: ['process::success'], to: ['done'] },
  ],
};

let mockServer: MockRuntimeServer;

test.beforeEach(async () => {
  mockServer = new MockRuntimeServer(8080);
  mockServer.setConfig(TEST_CONFIG);
  await mockServer.start();
});

test.afterEach(async () => {
  await mockServer.stop();
  // Small delay to allow port to be freed
  await new Promise(resolve => setTimeout(resolve, 100));
});

test.describe('Runtime Mode', () => {
  test('should connect to runtime server and display config', async ({ page }) => {
    await page.goto('/');

    // Switch to Runtime mode
    await page.getByRole('combobox').selectOption('runtime');

    // Connection dialog should appear
    await expect(page.getByText('Connect to Runtime Server')).toBeVisible();

    // Enter server URL and connect
    await page.getByPlaceholder('ws://localhost:8080').fill('ws://localhost:8080');
    await page.getByRole('button', { name: 'Connect' }).click();

    // Wait for connection
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Verify config was loaded - check for place IDs (PlaceNode displays typeLabel : id)
    await expect(page.getByText('entry', { exact: false })).toBeVisible();
    await expect(page.getByText('process', { exact: false })).toBeVisible();
    await expect(page.getByText('done', { exact: false })).toBeVisible();
  });

  test('should display runtime stats', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Stats should be visible (RuntimeControls shows label and value separately)
    await expect(page.locator('.stat-label').filter({ hasText: 'Epoch' })).toBeVisible();
    await expect(page.locator('.stat-label').filter({ hasText: 'Transitions' })).toBeVisible();
    await expect(page.locator('.stat-label').filter({ hasText: 'Active Tokens' })).toBeVisible();
  });

  test('should show token count on places when tokens exist', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Simulate a token entering a place and broadcast state update
    mockServer.simulateTokenEnter('entry', { item: 'test-item' });
    mockServer.broadcastStateSnapshot();

    // Wait for token badge to appear
    await expect(page.locator('.token-count.runtime')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.token-count.runtime')).toHaveText('1');
  });

  test('should update token count when tokens move', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Simulate token flow
    mockServer.simulateTokenEnter('entry', { item: 'item1' });
    mockServer.broadcastStateSnapshot();
    await expect(page.locator('.token-count.runtime').first()).toHaveText('1', { timeout: 5000 });

    // Add another token
    mockServer.simulateTokenEnter('entry', { item: 'item2' });
    mockServer.broadcastStateSnapshot();
    await expect(page.locator('.token-count.runtime').first()).toHaveText('2', { timeout: 5000 });
  });

  test('should send inject_token message when injecting at entrypoint', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Clear any messages from connection
    mockServer.clearReceivedMessages();

    // Click inject token button to open dialog
    await page.getByRole('button', { name: 'Inject Token' }).click();

    // Select entrypoint from dropdown
    await expect(page.getByText('Select Entrypoint')).toBeVisible();
    await page.getByRole('combobox').last().selectOption('entry');

    // Click Inject button in dialog (use exact match to avoid matching "Inject Token")
    await page.getByRole('button', { name: 'Inject', exact: true }).click();

    // Wait a moment for message to be sent
    await page.waitForTimeout(100);

    // Check that inject_token message was received
    const messages = mockServer.getReceivedMessages();
    const injectMessage = messages.find(m => m.type === 'inject_token');
    expect(injectMessage).toBeDefined();
    expect((injectMessage?.payload as { entrypointId: string }).entrypointId).toBe('entry');
  });

  test('should disconnect and show disconnected banner', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Click disconnect
    await page.getByRole('button', { name: 'Disconnect' }).click();

    // Should show disconnected banner
    await expect(page.getByText('Disconnected - switch mode or reconnect')).toBeVisible();
  });

  test('should retain config after disconnect', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Verify config loaded
    await expect(page.getByText('entry', { exact: false })).toBeVisible();

    // Disconnect
    await page.getByRole('button', { name: 'Disconnect' }).click();
    await expect(page.getByText('Disconnected')).toBeVisible();

    // Config should still be visible
    await expect(page.getByText('entry', { exact: false })).toBeVisible();
    await expect(page.getByText('process', { exact: false })).toBeVisible();
  });

  test('should switch to editor mode and keep config', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Switch to editor mode
    await page.getByRole('combobox').selectOption('editor');

    // Config should be editable - check place label
    await expect(page.locator('.place-label').filter({ hasText: 'entry' })).toBeVisible();

    // Should not show runtime banner
    await expect(page.getByText('Connected to runtime server')).not.toBeVisible();
  });

  test('should handle server disconnect gracefully', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Stop the server
    await mockServer.stop();

    // Should show disconnected state
    await expect(page.getByText('Disconnected')).toBeVisible({ timeout: 5000 });
  });

  test('should update stats when transition fires', async ({ page }) => {
    await page.goto('/');

    // Connect to server
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(page.getByText('Connected to runtime server')).toBeVisible({ timeout: 5000 });

    // Initial stats - check the value next to Transitions label
    const transitionsValue = page.locator('.stat-item').filter({ hasText: 'Transitions' }).locator('.stat-value');
    await expect(transitionsValue).toHaveText('0');

    // Simulate transition firing
    mockServer.simulateTransitionFire('t1');

    // Stats should update
    await expect(transitionsValue).toHaveText('1', { timeout: 3000 });
  });
});

test.describe('Connection Dialog', () => {
  test('should show error on connection failure', async ({ page }) => {
    // Stop the server to simulate connection failure
    await mockServer.stop();

    await page.goto('/');

    // Try to connect
    await page.getByRole('combobox').selectOption('runtime');
    await page.getByPlaceholder('ws://localhost:8080').fill('ws://localhost:8080');
    await page.getByRole('button', { name: 'Connect' }).click();

    // Should show error message in the dialog
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
  });

  test('should close dialog when clicking close button', async ({ page }) => {
    await page.goto('/');

    // Open connection dialog
    await page.getByRole('combobox').selectOption('runtime');
    await expect(page.getByText('Connect to Runtime Server')).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should be closed, should be back to previous mode
    await expect(page.getByText('Connect to Runtime Server')).not.toBeVisible();
  });

  test('should show default URL in connection dialog', async ({ page }) => {
    await page.goto('/');

    // Open connection dialog
    await page.getByRole('combobox').selectOption('runtime');
    await expect(page.getByText('Connect to Runtime Server')).toBeVisible();

    // The input should have the default URL
    const urlInput = page.locator('#server-url');
    await expect(urlInput).toHaveValue('ws://localhost:8080');

    // Should be able to edit the URL
    await urlInput.fill('ws://localhost:9090');
    await expect(urlInput).toHaveValue('ws://localhost:9090');
  });
});
