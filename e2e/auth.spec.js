// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('认证流程', () => {
    test('登录页面加载正常', async ({ page }) => {
        await page.goto('/login.html');
        await expect(page).toHaveTitle(/Artifex/);
        await expect(page.locator('#login')).toBeVisible();
    });

    test('注册新用户并登录', async ({ page }) => {
        const email = `e2e-${Date.now()}@test.com`;
        const password = 'test123456';

        await page.goto('/login.html');

        // 切换到注册表单
        await page.click('[data-switch-form="registerForm"]');
        await expect(page.locator('#registerForm')).toBeVisible();

        // 填写注册信息
        await page.fill('#registerUsername', `e2euser${Date.now()}`);
        await page.fill('#registerEmail', email);
        await page.fill('#registerPassword', password);
        await page.check('#agreeTerms');

        // 提交注册
        await page.click('#register button[type="submit"]');

        // 等待跳转到 dashboard
        await page.waitForURL('**/dashboard.html', { timeout: 10000 });
        await expect(page).toHaveTitle(/主控制台/);
    });

    test('登录失败显示错误', async ({ page }) => {
        await page.goto('/login.html');
        await page.fill('#loginEmail', 'wrong@test.com');
        await page.fill('#loginPassword', 'wrongpassword');
        await page.click('#login button[type="submit"]');

        // 应显示错误消息
        await expect(page.locator('.message')).toBeVisible({ timeout: 5000 });
    });
});
