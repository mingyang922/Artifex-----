// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: register + login, then navigate to user center
async function loginAndGoToUserCenter(page) {
    const email = `e2e-uc-${Date.now()}@test.com`;
    const password = 'test123456';

    await page.goto('/login.html');
    await page.click('[data-switch-form="registerForm"]');
    const username = `e2euc${Date.now()}`;
    await page.fill('#registerUsername', username);
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.check('#agreeTerms');
    await page.click('#register button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 20000 });

    // Navigate to user center
    await Promise.all([
        page.waitForURL('**/userCenter.html', { timeout: 15000 }),
        page.click('[data-module="user-center"]'),
    ]);
}

test.describe('用户中心', () => {
    test.beforeEach(async ({ page }) => {
        await loginAndGoToUserCenter(page);
    });

    test('用户中心页面加载正常', async ({ page }) => {
        await expect(page).toHaveTitle(/用户中心/);
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
    });

    test('个人信息表单加载', async ({ page }) => {
        // Personal info tab should be active by default
        await expect(page.locator('.user-center-tab.active')).toHaveAttribute('data-tab', 'personal-info');

        // Personal info form should be visible
        await expect(page.locator('#personal-info')).toBeVisible();
        await expect(page.locator('#personal-info-form')).toBeVisible();

        // Basic fields should exist
        await expect(page.locator('#username')).toBeAttached();
        await expect(page.locator('#email')).toBeAttached();
        await expect(page.locator('#nickname')).toBeAttached();
        await expect(page.locator('#bio')).toBeAttached();
    });

    test('API 设置选项卡加载', async ({ page }) => {
        // Click the API settings tab
        await page.click('.user-center-tab[data-tab="api-settings"]');

        // API settings section should become visible
        await expect(page.locator('#api-settings')).toBeVisible();
        await expect(page.locator('#api-settings-form')).toBeAttached();

        // Provider select should exist
        await expect(page.locator('#api-provider-select')).toBeAttached();

        // API key field should exist
        await expect(page.locator('#api-field-1')).toBeAttached();

        // Save button should exist
        await expect(page.locator('#save-api-settings-btn')).toBeAttached();
    });

    test('语言选择器存在且有 5 个选项', async ({ page }) => {
        const langSelect = page.locator('#language');
        await expect(langSelect).toBeAttached();

        // Count the options
        const optionCount = await langSelect.locator('option').count();
        expect(optionCount).toBe(5);

        // Verify the expected language values
        const values = await langSelect.locator('option').evaluateAll(
            (els) => els.map((el) => el.value)
        );
        expect(values).toEqual(['zh', 'zht', 'en', 'ja', 'ko']);
    });
});
