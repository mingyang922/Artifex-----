// @ts-check
const { test, expect } = require('@playwright/test');

test('production dist loads its generated classic bundle without missing assets', async ({ page }) => {
    const pageErrors = [];
    const missingAssets = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
        if (response.status() === 404) missingAssets.push(response.url());
    });

    await page.goto('/login.html');
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('script[src*="classic-login-"]')).toHaveCount(1);
    expect(pageErrors).toEqual([]);
    expect(missingAssets).toEqual([]);

    const health = await page.request.get('/api/health');
    expect(health.ok()).toBeTruthy();
    await expect(health.json()).resolves.toMatchObject({ status: 'ok', version: '1.4.0' });
});
