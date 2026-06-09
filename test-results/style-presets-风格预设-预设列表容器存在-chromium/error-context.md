# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: style-presets.spec.js >> 风格预设 >> 预设列表容器存在
- Location: e2e\style-presets.spec.js:45:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard.html" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img "Artifex" [ref=e5]
      - heading "Artifex" [level=1] [ref=e6]
    - text:   
    - generic [ref=e7]:
      - generic [ref=e8]:
        - heading "创建账户" [level=2] [ref=e9]
        - paragraph [ref=e10]: 注册成为 Artifex 开发者
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: 
          - textbox "用户名" [ref=e14]: e2esp1780925994292
        - generic [ref=e15]:
          - generic [ref=e16]: 
          - textbox "邮箱地址" [ref=e17]: e2e-sp-1780925994095@test.com
        - generic [ref=e18]:
          - generic [ref=e19]: 
          - generic [ref=e20]:
            - textbox "设置密码" [ref=e21]: test123456
            - button "显示密码" [ref=e22] [cursor=pointer]:
              - generic [ref=e23]: 
        - generic [ref=e27]: "密码强度: 中"
        - generic [ref=e29] [cursor=pointer]:
          - checkbox "我同意 服务条款 和 隐私政策" [checked] [ref=e30]
          - generic [ref=e31]: 我同意
          - link "服务条款" [ref=e32]:
            - /url: "#"
          - generic [ref=e33]: 和
          - link "隐私政策" [ref=e34]:
            - /url: "#"
        - button "创建账户" [active] [ref=e35] [cursor=pointer]
        - paragraph [ref=e37]:
          - text: 已有账户？
          - link "立即登录" [ref=e38] [cursor=pointer]:
            - /url: "#"
  - generic [ref=e39]: 请求过于频繁，请 15 分钟后再试
  - contentinfo [ref=e40]:
    - link "公安备案 京公网安备11010802048813号" [ref=e41] [cursor=pointer]:
      - /url: https://beian.mps.gov.cn/#/query/webSearch?code=11010802048813
      - img "公安备案" [ref=e42]
      - text: 京公网安备11010802048813号
    - text: "|"
    - link "京ICP备2026031602号" [ref=e43] [cursor=pointer]:
      - /url: https://beian.miit.gov.cn/
```

# Test source

```ts
  1  | // @ts-check
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | // Helper: register + login, then navigate to style presets
  5  | async function loginAndGoToStylePresets(page) {
  6  |     const email = `e2e-sp-${Date.now()}@test.com`;
  7  |     const password = 'test123456';
  8  | 
  9  |     await page.goto('/login.html');
  10 |     await page.click('[data-switch-form="registerForm"]');
  11 |     const username = `e2esp${Date.now()}`;
  12 |     await page.fill('#registerUsername', username);
  13 |     await page.fill('#registerEmail', email);
  14 |     await page.fill('#registerPassword', password);
  15 |     await page.check('#agreeTerms');
  16 |     await page.click('#register button[type="submit"]');
> 17 |     await page.waitForURL('**/dashboard.html', { timeout: 20000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  18 | 
  19 |     // Navigate to style presets
  20 |     await Promise.all([
  21 |         page.waitForURL('**/style-presets.html', { timeout: 15000 }),
  22 |         page.click('[data-module="style-presets"]'),
  23 |     ]);
  24 | }
  25 | 
  26 | test.describe('风格预设', () => {
  27 |     test.beforeEach(async ({ page }) => {
  28 |         await loginAndGoToStylePresets(page);
  29 |     });
  30 | 
  31 |     test('风格预设页面加载正常', async ({ page }) => {
  32 |         await expect(page).toHaveTitle(/风格预设/);
  33 |         await expect(page.locator('.sidebar')).toBeVisible();
  34 |         await expect(page.locator('.main-content')).toBeVisible();
  35 |     });
  36 | 
  37 |     test('内容区域加载', async ({ page }) => {
  38 |         // The asset-wrap section should be visible
  39 |         await expect(page.locator('.asset-wrap')).toBeVisible();
  40 | 
  41 |         // Header should show the title
  42 |         await expect(page.locator('.form-header h2')).toContainText('风格预设库');
  43 |     });
  44 | 
  45 |     test('预设列表容器存在', async ({ page }) => {
  46 |         // The preset library list container should be present
  47 |         await expect(page.locator('#stylePresetLibraryList')).toBeAttached();
  48 | 
  49 |         // For a new user, there should be either preset cards or an empty state message
  50 |         const listContainer = page.locator('#stylePresetLibraryList');
  51 |         const hasPresetCards = await listContainer.locator('.style-preset-lib-row').count();
  52 |         const hasEmptyState = await listContainer.locator('.style-preset-empty').count();
  53 | 
  54 |         // At least one of these should be true
  55 |         expect(hasPresetCards + hasEmptyState).toBeGreaterThanOrEqual(1);
  56 |     });
  57 | });
  58 | 
```