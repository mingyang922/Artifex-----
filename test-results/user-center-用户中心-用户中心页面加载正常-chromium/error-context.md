# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-center.spec.js >> 用户中心 >> 用户中心页面加载正常
- Location: e2e\user-center.spec.js:31:5

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
          - textbox "用户名" [ref=e14]: e2euc1780926015252
        - generic [ref=e15]:
          - generic [ref=e16]: 
          - textbox "邮箱地址" [ref=e17]: e2e-uc-1780926015076@test.com
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
  4  | // Helper: register + login, then navigate to user center
  5  | async function loginAndGoToUserCenter(page) {
  6  |     const email = `e2e-uc-${Date.now()}@test.com`;
  7  |     const password = 'test123456';
  8  | 
  9  |     await page.goto('/login.html');
  10 |     await page.click('[data-switch-form="registerForm"]');
  11 |     const username = `e2euc${Date.now()}`;
  12 |     await page.fill('#registerUsername', username);
  13 |     await page.fill('#registerEmail', email);
  14 |     await page.fill('#registerPassword', password);
  15 |     await page.check('#agreeTerms');
  16 |     await page.click('#register button[type="submit"]');
> 17 |     await page.waitForURL('**/dashboard.html', { timeout: 20000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  18 | 
  19 |     // Navigate to user center
  20 |     await Promise.all([
  21 |         page.waitForURL('**/userCenter.html', { timeout: 15000 }),
  22 |         page.click('[data-module="user-center"]'),
  23 |     ]);
  24 | }
  25 | 
  26 | test.describe('用户中心', () => {
  27 |     test.beforeEach(async ({ page }) => {
  28 |         await loginAndGoToUserCenter(page);
  29 |     });
  30 | 
  31 |     test('用户中心页面加载正常', async ({ page }) => {
  32 |         await expect(page).toHaveTitle(/用户中心/);
  33 |         await expect(page.locator('.sidebar')).toBeVisible();
  34 |         await expect(page.locator('.main-content')).toBeVisible();
  35 |     });
  36 | 
  37 |     test('个人信息表单加载', async ({ page }) => {
  38 |         // Personal info tab should be active by default
  39 |         await expect(page.locator('.user-center-tab.active')).toHaveAttribute('data-tab', 'personal-info');
  40 | 
  41 |         // Personal info form should be visible
  42 |         await expect(page.locator('#personal-info')).toBeVisible();
  43 |         await expect(page.locator('#personal-info-form')).toBeVisible();
  44 | 
  45 |         // Basic fields should exist
  46 |         await expect(page.locator('#username')).toBeAttached();
  47 |         await expect(page.locator('#email')).toBeAttached();
  48 |         await expect(page.locator('#nickname')).toBeAttached();
  49 |         await expect(page.locator('#bio')).toBeAttached();
  50 |     });
  51 | 
  52 |     test('API 设置选项卡加载', async ({ page }) => {
  53 |         // Click the API settings tab
  54 |         await page.click('.user-center-tab[data-tab="api-settings"]');
  55 | 
  56 |         // API settings section should become visible
  57 |         await expect(page.locator('#api-settings')).toBeVisible();
  58 |         await expect(page.locator('#api-settings-form')).toBeAttached();
  59 | 
  60 |         // Provider select should exist
  61 |         await expect(page.locator('#api-provider-select')).toBeAttached();
  62 | 
  63 |         // API key field should exist
  64 |         await expect(page.locator('#api-field-1')).toBeAttached();
  65 | 
  66 |         // Save button should exist
  67 |         await expect(page.locator('#save-api-settings-btn')).toBeAttached();
  68 |     });
  69 | 
  70 |     test('语言选择器存在且有 5 个选项', async ({ page }) => {
  71 |         const langSelect = page.locator('#language');
  72 |         await expect(langSelect).toBeAttached();
  73 | 
  74 |         // Count the options
  75 |         const optionCount = await langSelect.locator('option').count();
  76 |         expect(optionCount).toBe(5);
  77 | 
  78 |         // Verify the expected language values
  79 |         const values = await langSelect.locator('option').evaluateAll(
  80 |             (els) => els.map((el) => el.value)
  81 |         );
  82 |         expect(values).toEqual(['zh', 'zht', 'en', 'ja', 'ko']);
  83 |     });
  84 | });
  85 | 
```