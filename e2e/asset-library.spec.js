// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: register + login, then navigate to asset library
async function loginAndGoToAssetLibrary(page) {
    const email = `e2e-al-${Date.now()}@test.com`;
    const password = 'test123456';

    await page.goto('/login.html');
    await page.click('[data-switch-form="registerForm"]');
    const username = `e2eal${Date.now()}`;
    await page.fill('#registerUsername', username);
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.check('#agreeTerms');
    await page.click('#register button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 20000 });

    // Navigate to asset library
    await Promise.all([
        page.waitForURL('**/asset-library.html', { timeout: 15000 }),
        page.click('[data-module="asset-library"]'),
    ]);
}

test.describe('素材库', () => {
    test.beforeEach(async ({ page }) => {
        await loginAndGoToAssetLibrary(page);
    });

    test('素材库页面加载正常', async ({ page }) => {
        await expect(page).toHaveTitle(/素材库/);
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
    });

    test('素材库内容区域加载', async ({ page }) => {
        // The asset-wrap section should be visible
        await expect(page.locator('.asset-wrap')).toBeVisible();

        // Header should show the title
        await expect(page.locator('.form-header h2')).toContainText('素材库');
    });

    test('搜索输入框存在', async ({ page }) => {
        const searchInput = page.locator('#assetSearch');
        await expect(searchInput).toBeAttached();
        await expect(searchInput).toHaveAttribute('placeholder', /搜索素材/);
    });

    test('上传按钮存在', async ({ page }) => {
        // The upload area should exist
        await expect(page.locator('#uploadArea')).toBeVisible();

        // File chooser button should exist
        await expect(page.locator('#btnChoose')).toBeAttached();
        await expect(page.locator('#btnChoose')).toContainText('选择文件');

        // File input should be present (hidden)
        await expect(page.locator('#fileInput')).toBeAttached();
    });

    test('筛选控件存在', async ({ page }) => {
        // Type filter select should exist
        await expect(page.locator('#typeFilter')).toBeAttached();

        // Sort order select should exist
        await expect(page.locator('#sortOrder')).toBeAttached();

        // Category filter should exist
        await expect(page.locator('#categoryFilter')).toBeAttached();
    });
});
