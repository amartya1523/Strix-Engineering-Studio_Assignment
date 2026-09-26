import { test, expect } from '@playwright/test';
const password = 'E2E-password-123';

test('protected pages redirect to login', async ({ page }) => {
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Good to see you again.' })).toBeVisible();
});

test('complete workspace: register, upload, review, artifacts, chat, history and deletion', async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Engineer');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name').fill('Integration workspace');
  await page.getByLabel('Description').fill('Browser-tested full-stack workflow');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('link', { name: 'Integration workspace', exact: true }).click();
  await page.getByLabel('Upload source files or ZIP').setInputFiles({
    name: 'auth.py',
    mimeType: 'text/plain',
    buffer: Buffer.from('password = "unsafe"\nprint(password)\n'),
  });
  await expect(page.getByRole('status')).toContainText('uploaded successfully');
  await page.getByRole('button', { name: 'auth.py', exact: true }).click();
  await expect(page.locator('.code-lines')).toContainText('password');
  await page.getByRole('link', { name: 'Connect a provider to get started' }).click();
  await page.getByRole('button', { name: 'Add provider', exact: true }).click();
  await page.getByLabel('Provider preset').selectOption({ label: 'Custom endpoint' });
  await page.getByLabel('Display name').fill('E2E fixture (not AI)');
  await page.getByLabel('Base URL').fill('http://localhost:8123/v1');
  await page.getByLabel('Model name').fill('fixture-model');
  await page.getByRole('button', { name: 'Save provider', exact: true }).click();
  await page.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Connected', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('link', { name: 'Integration workspace', exact: true }).click();
  await page.getByRole('button', { name: 'auth.py', exact: true }).click();
  await page.getByLabel('Select auth.py', { exact: true }).check();
  await page.getByRole('button', { name: 'Security', exact: true }).click();
  await page.getByRole('button', { name: /Run security analysis/ }).click();
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Hardcoded credential', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'auth.py:1', exact: true }).click();
  await expect(page.locator('#source-line-1')).toHaveClass('highlight-line');
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();
  expect((await exported).suggestedFilename()).toContain('codeatlas-security');
  await page.getByRole('button', { name: 'Documentation', exact: true }).click();
  await page.getByRole('button', { name: /Run documentation analysis/ }).click();
  await expect(page.getByRole('heading', { name: 'Generated documentation' })).toBeVisible();
  await page.getByRole('button', { name: 'Architecture', exact: true }).click();
  await page.getByRole('button', { name: /Run architecture analysis/ }).click();
  await expect(page.getByRole('heading', { name: 'Generated architecture summary' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().right))
    .toBeLessThanOrEqual(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '../artifacts/workspace-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect
    .poll(() => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().left))
    .toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: '../artifacts/workspace-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Chat with code', exact: true }).click();
  await page.getByLabel('Ask about your code').fill('Explain authentication');
  await page.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(page.locator('.chat-message.assistant')).toContainText('Authentication code is in');
  await page.reload();
  await page.getByRole('button', { name: 'Chat with code', exact: true }).click();
  await expect(page.locator('.chat-message.assistant')).toContainText('Authentication code is in');
  await page.getByRole('link', { name: 'Review history', exact: true }).click();
  await page.getByLabel('Search reviews').fill('hardcoded');
  await expect(page.locator('.history-card')).toHaveCount(3);
  await page.locator('.history-card').first().click();
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Integration workspace', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.motion-surface')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.hero-ribbon')).toHaveCSS('clip-path', 'none');
  await page.screenshot({
    path: '../artifacts/projects-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Delete Integration workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A clean slate. A new possibility.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'AI providers', exact: true }).click();
  await page.getByRole('button', { name: 'Delete E2E fixture (not AI)', exact: true }).click();
  await page.getByRole('button', { name: 'Remove provider', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test('mobile registration, navigation, empty states and no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Mobile Engineer');
  await page.getByLabel('Email address').fill(`mobile-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.screenshot({
    path: '../artifacts/register-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole('heading', { name: 'A clean slate. A new possibility.' }),
  ).toBeVisible();
  await expect(page.locator('.motion-surface')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.hero-ribbon')).toHaveCSS('clip-path', 'none');
  await page.screenshot({
    path: '../artifacts/projects-mobile.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'AI providers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your intelligence.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('studio motion: settled ribbons, responsive layouts, reduced-motion changes and route cleanup', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.text().includes('GSAP target')) runtimeErrors.push(message.text());
  });
  await page.goto('/login');
  await expect(page.locator('.motion-surface')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.hero-ribbon')).toHaveCSS('clip-path', 'none');
  await page.screenshot({ path: '../artifacts/login-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Full name').fill('Motion Engineer');
  await page.getByLabel('Email address').fill(`motion-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('.motion-surface')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.hero-ribbon')).toHaveCSS('clip-path', 'none');
  await expect
    .poll(() =>
      page
        .locator('.floating-symbol')
        .first()
        .evaluate((el) => el.getAttribute('style') || ''),
    )
    .toContain('transform');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      page
        .locator('.floating-symbol')
        .first()
        .evaluate((el) => (el as HTMLElement).style.transform),
    )
    .toBe('');
  await expect(page.locator('.motion-surface')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.hero-ribbon')).toHaveCSS('clip-path', 'none');
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole('button', { name: 'New project', exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Review history', exact: true }).click();
  await page.getByRole('link', { name: 'AI providers', exact: true }).click();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.locator('.floating-symbol').first()).not.toHaveAttribute('style', /transform/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() =>
      page
        .locator('.floating-symbol')
        .first()
        .evaluate((el) => el.getAttribute('style') || ''),
    )
    .toContain('transform');
  await expect(page.locator('.motion-surface')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.hero-ribbon')).toHaveCSS('clip-path', 'none');
  expect(runtimeErrors).toEqual([]);
});
