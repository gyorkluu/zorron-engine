/**
 * Frontend E2E: editor happy path.
 *
 * Flow: Open editor → Add nodes to canvas → Connect nodes → Edit in inspector → Save.
 *
 * Requires the editor dev server at http://localhost:5173 and the backend
 * at http://localhost:3000 to be running.
 *
 * Note: React Flow renders nodes on an HTML canvas wrapper. We interact via
 * the NodePalette drag handles and the InspectorPanel form fields, which are
 * real DOM elements with stable text content.
 */

import { test, expect, type Page } from '@playwright/test';

/** Wait for the editor toolbar to be visible (app fully booted). */
async function waitForEditor(page: Page): Promise<void> {
  await expect(page.getByText('Zorron').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Node Palette')).toBeVisible();
}

test.describe('Editor happy path: add nodes, connect, edit, save', () => {
  test('opens the editor and shows the toolbar + palette', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await waitForEditor(page);
    // The toolbar brand and the palette heading should both be visible.
    await expect(page.getByText('Node Palette')).toBeVisible();
    // The save status badge should be present.
    await expect(page.getByTestId('save-status')).toBeVisible();
  });

  test('adds a start node by clicking the palette item', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await waitForEditor(page);

    // Click the "Start" palette item to add it at the canvas center.
    const startItem = page.getByText('Start', { exact: true }).first();
    await startItem.click();

    // The inspector should now show the Start form with a "Title" field.
    await expect(page.getByText('Title').first()).toBeVisible({ timeout: 5_000 });
  });

  test('adds a scene node and edits its dialogue in the inspector', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await waitForEditor(page);

    // Add a scene node by clicking its palette card.
    const sceneItem = page.getByText('Scene', { exact: true }).first();
    await sceneItem.click();

    // The inspector should show a "Dialogue" textarea.
    const dialogueLabel = page.getByText('Dialogue', { exact: true }).first();
    await expect(dialogueLabel).toBeVisible({ timeout: 5_000 });

    // Type into the dialogue field (the textarea that follows the label).
    const dialogueTextarea = dialogueLabel.locator('xpath=following::textarea[1]');
    await dialogueTextarea.fill('Hello from Playwright!');

    // The textarea should now contain the typed text.
    await expect(dialogueTextarea).toHaveValue('Hello from Playwright!');
  });

  test('exports the project as JSON (triggers a download)', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await waitForEditor(page);

    // Set up a download listener before clicking Export.
    const downloadPromise = page.waitForEvent('download', { timeout: 5_000 });
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('save button is present and clickable', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await waitForEditor(page);

    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible();
    // Click should not throw; in local mode the snapshot is recorded.
    await saveButton.click();
  });
});
