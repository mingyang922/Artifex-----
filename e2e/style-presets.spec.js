// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: register + login, then navigate to style presets
async function loginAndGoToStylePresets(page) {
    const email = `e2e-sp-${Date.now()}@test.com`;
    const password = 'test123456';

    await page.goto('/login.html');
    await page.click('[data-switch-form="registerForm"]');
    const username = `e2esp${Date.now()}`;
    await page.fill('#registerUsername', username);
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.check('#agreeTerms');
    await page.click('#register button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 20000 });

    // Navigate to style presets
    await Promise.all([
        page.waitForURL('**/style-presets.html', { timeout: 15000 }),
        page.click('[data-module="style-presets"]'),
    ]);
}

test.describe('风格预设', () => {
    test.beforeEach(async ({ page }) => {
        await loginAndGoToStylePresets(page);
    });

    test('风格预设页面加载正常', async ({ page }) => {
        await expect(page).toHaveTitle(/风格预设/);
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
    });

    test('内容区域加载', async ({ page }) => {
        // The asset-wrap section should be visible
        await expect(page.locator('.asset-wrap')).toBeVisible();

        // Header should show the title
        await expect(page.locator('.form-header h2')).toContainText('风格预设库');
    });

    test('预设列表容器存在', async ({ page }) => {
        // The preset library list container should be present
        await expect(page.locator('#stylePresetLibraryList')).toBeAttached();

        // For a new user, there should be either preset cards or an empty state message
        const listContainer = page.locator('#stylePresetLibraryList');
        const hasPresetCards = await listContainer.locator('.style-preset-lib-row').count();
        const hasEmptyState = await listContainer.locator('.style-preset-empty').count();

        // At least one of these should be true
        expect(hasPresetCards + hasEmptyState).toBeGreaterThanOrEqual(1);
    });
});
