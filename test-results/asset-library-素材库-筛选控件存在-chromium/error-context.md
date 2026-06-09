# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: asset-library.spec.js >> 素材库 >> 筛选控件存在
- Location: e2e\asset-library.spec.js:63:5

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
          - textbox "用户名" [ref=e14]: e2eal1780925951047
        - generic [ref=e15]:
          - generic [ref=e16]: 
          - textbox "邮箱地址" [ref=e17]: e2e-al-1780925950870@test.com
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
  - generic [ref=e39]: 请求过于频繁，请稍后再试
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
  4  | // Helper: register + login, then navigate to asset library
  5  | async function loginAndGoToAssetLibrary(page) {
  6  |     const email = `e2e-al-${Date.now()}@test.com`;
  7  |     const password = 'test123456';
  8  | 
  9  |     await page.goto('/login.html');
  10 |     await page.click('[data-switch-form="registerForm"]');
  11 |     const username = `e2eal${Date.now()}`;
  12 |     await page.fill('#registerUsername', username);
  13 |     await page.fill('#registerEmail', email);
  14 |     await page.fill('#registerPassword', password);
  15 |     await page.check('#agreeTerms');
  16 |     await page.click('#register button[type="submit"]');
> 17 |     await page.waitForURL('**/dashboard.html', { timeout: 20000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  18 | 
  19 |     // Navigate to asset library
  20 |     await Promise.all([
  21 |         page.waitForURL('**/asset-library.html', { timeout: 15000 }),
  22 |         page.click('[data-module="asset-library"]'),
  23 |     ]);
  24 | }
  25 | 
  26 | test.describe('素材库', () => {
  27 |     test.beforeEach(async ({ page }) => {
  28 |         await loginAndGoToAssetLibrary(page);
  29 |     });
  30 | 
  31 |     test('素材库页面加载正常', async ({ page }) => {
  32 |         await expect(page).toHaveTitle(/素材库/);
  33 |         await expect(page.locator('.sidebar')).toBeVisible();
  34 |         await expect(page.locator('.main-content')).toBeVisible();
  35 |     });
  36 | 
  37 |     test('素材库内容区域加载', async ({ page }) => {
  38 |         // The asset-wrap section should be visible
  39 |         await expect(page.locator('.asset-wrap')).toBeVisible();
  40 | 
  41 |         // Header should show the title
  42 |         await expect(page.locator('.form-header h2')).toContainText('素材库');
  43 |     });
  44 | 
  45 |     test('搜索输入框存在', async ({ page }) => {
  46 |         const searchInput = page.locator('#assetSearch');
  47 |         await expect(searchInput).toBeAttached();
  48 |         await expect(searchInput).toHaveAttribute('placeholder', /搜索素材/);
  49 |     });
  50 | 
  51 |     test('上传按钮存在', async ({ page }) => {
  52 |         // The upload area should exist
  53 |         await expect(page.locator('#uploadArea')).toBeVisible();
  54 | 
  55 |         // File chooser button should exist
  56 |         await expect(page.locator('#btnChoose')).toBeAttached();
  57 |         await expect(page.locator('#btnChoose')).toContainText('选择文件');
  58 | 
  59 |         // File input should be present (hidden)
  60 |         await expect(page.locator('#fileInput')).toBeAttached();
  61 |     });
  62 | 
  63 |     test('筛选控件存在', async ({ page }) => {
  64 |         // Type filter select should exist
  65 |         await expect(page.locator('#typeFilter')).toBeAttached();
  66 | 
  67 |         // Sort order select should exist
  68 |         await expect(page.locator('#sortOrder')).toBeAttached();
  69 | 
  70 |         // Category filter should exist
  71 |         await expect(page.locator('#categoryFilter')).toBeAttached();
  72 |     });
  73 | });
  74 | 
```