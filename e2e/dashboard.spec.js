// @ts-check
const { test, expect } = require('@playwright/test');

// 辅助函数：登录
async function login(page) {
    const email = `e2e-dash-${Date.now()}@test.com`;
    const password = 'test123456';

    await page.goto('/login.html');
    await page.evaluate(() => localStorage.setItem('artifex-onboarding-v2', 'done'));
    await page.click('[data-switch-form="registerForm"]');
    const username = `e2edash${Date.now()}`;
    await page.fill('#registerUsername', username);
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.check('#agreeTerms');
    await page.click('#register button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 20000 });
}

test.describe('控制台', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('控制台页面加载正常', async ({ page }) => {
        await expect(page).toHaveTitle(/主控制台/);
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
        await expect(page.locator('.workspace-stats')).toBeVisible();
        await expect(page.locator('.workspace-insights')).toBeVisible();
    });

    test('Ctrl+K 打开全局命令面板', async ({ page }) => {
        await page.keyboard.press('Control+k');
        await expect(page.locator('.ux-command-backdrop')).toHaveClass(/is-open/);
        await page.locator('.ux-command-input').fill('素材库');
        await expect(page.locator('.ux-command-item')).toHaveCount(1);
    });

    test('侧边栏导航链接存在', async ({ page }) => {
        const navCount = await page.locator('.nav-link').count();
        expect(navCount).toBeGreaterThanOrEqual(4);
    });

    test('备案信息显示', async ({ page }) => {
        await expect(page.locator('.beian-footer')).toBeVisible();
        await expect(page.locator('.beian-footer')).toContainText('京公网安备');
        await expect(page.locator('.beian-footer')).toContainText('京ICP备');
    });

    test('点击 AI 生成导航', async ({ page }) => {
        await Promise.all([
            page.waitForURL('**/ai-generator-new.html', { timeout: 15000 }),
            page.click('[data-module="ai-generate"]'),
        ]);
    });
});
