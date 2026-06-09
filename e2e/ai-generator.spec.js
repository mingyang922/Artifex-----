// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: register + login, then navigate to AI generator
async function loginAndGoToAiGenerator(page) {
    const email = `e2e-ai-${Date.now()}@test.com`;
    const password = 'test123456';

    await page.goto('/login.html');
    await page.click('[data-switch-form="registerForm"]');
    const username = `e2eai${Date.now()}`;
    await page.fill('#registerUsername', username);
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.check('#agreeTerms');
    await page.click('#register button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 20000 });

    // Navigate to AI generator
    await Promise.all([
        page.waitForURL('**/ai-generator-new.html', { timeout: 15000 }),
        page.click('[data-module="ai-generate"]'),
    ]);
}

test.describe('AI 生成器', () => {
    test.beforeEach(async ({ page }) => {
        await loginAndGoToAiGenerator(page);
    });

    test('AI 生成器页面加载正常', async ({ page }) => {
        await expect(page).toHaveTitle(/AI生成器/);
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
    });

    test('图片生成表单元素存在', async ({ page }) => {
        // Switch to the image generation tab
        await page.click('.tab-button[data-tab="image"]');
        await expect(page.locator('#view-image')).toBeVisible();

        // Description textarea should exist
        const textarea = page.locator('#imageDescription');
        await expect(textarea).toBeAttached();

        // Generate button should exist
        await expect(page.locator('#imageGenBtn')).toBeAttached();
    });

    test('API 服务商选择器存在', async ({ page }) => {
        // Switch to the image generation tab
        await page.click('.tab-button[data-tab="image"]');
        await expect(page.locator('#view-image')).toBeVisible();

        // Provider selector should exist
        const providerSelect = page.locator('#apiProvider');
        await expect(providerSelect).toBeAttached();

        // Should have multiple options
        const optionCount = await providerSelect.locator('option').count();
        expect(optionCount).toBeGreaterThanOrEqual(3);
    });

    test('图片尺寸选择器存在', async ({ page }) => {
        // Switch to the image generation tab
        await page.click('.tab-button[data-tab="image"]');
        await expect(page.locator('#view-image')).toBeVisible();

        // Size selector should exist
        const sizeSelect = page.locator('#imageSize');
        await expect(sizeSelect).toBeAttached();

        // Should have size options
        const optionCount = await sizeSelect.locator('option').count();
        expect(optionCount).toBeGreaterThanOrEqual(4);
    });

    test('功能选项卡切换正常', async ({ page }) => {
        // Default tab should be "code" (asset editor)
        await expect(page.locator('#view-code')).toBeVisible();

        // Switch to image generation
        await page.click('.tab-button[data-tab="image"]');
        await expect(page.locator('#view-image')).toBeVisible();
        await expect(page.locator('#view-code')).not.toBeVisible();

        // Switch to action group
        await page.click('.tab-button[data-tab="action-group"]');
        await expect(page.locator('#view-action-group')).toBeVisible();
        await expect(page.locator('#view-image')).not.toBeVisible();
    });
});
