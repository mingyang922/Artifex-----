// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e',
    testMatch: 'production-smoke.spec.js',
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:3001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
    webServer: {
        command:
            'cross-env NODE_ENV=production PORT=3001 SESSION_SECRET=production-e2e-session-secret-at-least-32-characters ENCRYPTION_KEY=production-e2e-encryption-key-at-least-32-characters ALLOWED_ORIGINS=http://127.0.0.1:3001 USERS_DB_PATH=backend/data/e2e-production.sqlite node backend/proxy.js',
        port: 3001,
        reuseExistingServer: false,
        timeout: 15000,
    },
});
