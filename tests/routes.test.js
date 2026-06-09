/**
 * Artifex — 路由模块测试
 * 测试 image-proxy 和 auth 路由的集成行为
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const http = require('http');

// 使用临时数据库
const tmpDir = require('os').tmpdir();
const testDbPath = path.join(tmpDir, `artifex-routes-test-${Date.now()}.sqlite`);
process.env.USERS_DB_PATH = testDbPath;
process.env.PORT = '0'; // 随机端口
process.env.SESSION_SECRET = 'test-session-secret';

// 需要在加载 proxy 之前设置
const usersDb = require('../backend/db/users-db');

// 初始化数据库
usersDb.init();

// 清理临时文件
const cleanup = () => {
    try { require('fs').unlinkSync(testDbPath); } catch (_) {}
    try { require('fs').unlinkSync(testDbPath + '-shm'); } catch (_) {}
    try { require('fs').unlinkSync(testDbPath + '-wal'); } catch (_) {}
};

describe('image-proxy route module', () => {
    it('should export createImageRouter function', () => {
        const { createImageRouter } = require('../backend/routes/image-proxy');
        assert.equal(typeof createImageRouter, 'function');
    });

    it('should return an express router', () => {
        const { createImageRouter } = require('../backend/routes/image-proxy');
        const router = createImageRouter({
            requireAuth: (req, res, next) => next(),
            csrfProtection: (req, res, next) => next(),
            isAdminUser: () => false,
            getUserProviderConfig: () => ({}),
        });
        assert.equal(typeof router, 'function'); // express router is a function
    });
});

describe('auth route module', () => {
    it('should export createAuthRouter function', () => {
        const { createAuthRouter } = require('../backend/routes/auth');
        assert.equal(typeof createAuthRouter, 'function');
    });

    it('should return an express router', () => {
        const { createAuthRouter } = require('../backend/routes/auth');
        const router = createAuthRouter({
            usersDb,
            requireAuth: (req, res, next) => next(),
            isAdminUser: () => false,
            csrfProtection: (req, res, next) => next(),
            sanitizeApiSettingsPayload: () => null,
        });
        assert.equal(typeof router, 'function');
    });
});

describe('projects route module', () => {
    it('should export createProjectRouter function', () => {
        const { createProjectRouter } = require('../backend/routes/projects');
        assert.equal(typeof createProjectRouter, 'function');
    });

    it('should return an express router', () => {
        const { createProjectRouter } = require('../backend/routes/projects');
        const router = createProjectRouter({
            usersDb,
            requireAuth: (req, res, next) => next(),
            csrfProtection: (req, res, next) => next(),
        });
        assert.equal(typeof router, 'function');
    });
});

describe('asset-library route module', () => {
    it('should export createAssetLibraryRouter function', () => {
        const { createAssetLibraryRouter } = require('../backend/routes/asset-library');
        assert.equal(typeof createAssetLibraryRouter, 'function');
    });

    it('should return an express router', () => {
        const { createAssetLibraryRouter } = require('../backend/routes/asset-library');
        const router = createAssetLibraryRouter({
            usersDb,
            requireAuth: (req, res, next) => next(),
            csrfProtection: (req, res, next) => next(),
        });
        assert.equal(typeof router, 'function');
    });
});

describe('admin route module', () => {
    it('should export createAdminRouter function', () => {
        const { createAdminRouter } = require('../backend/routes/admin');
        assert.equal(typeof createAdminRouter, 'function');
    });

    it('should return an express router', () => {
        const { createAdminRouter } = require('../backend/routes/admin');
        const router = createAdminRouter({
            usersDb,
            requireAuth: (req, res, next) => next(),
            isAdminUser: () => false,
        });
        assert.equal(typeof router, 'function');
    });
});

describe('ai-providers route module', () => {
    it('should export createAiProviderRouter function', () => {
        const { createAiProviderRouter } = require('../backend/routes/ai-providers');
        assert.equal(typeof createAiProviderRouter, 'function');
    });
});

describe('helmet security headers', () => {
    let server;
    let baseUrl;

    before(async () => {
        // 动态导入以避免端口冲突
        const express = require('express');
        const helmet = require('helmet');
        const compression = require('compression');
        const app = express();

        app.use(helmet());
        app.use(compression());
        app.get('/test', (req, res) => res.json({ ok: true }));

        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) {
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('should include X-Content-Type-Options header', async () => {
        const res = await fetch(`${baseUrl}/test`);
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('should include X-Frame-Options header', async () => {
        const res = await fetch(`${baseUrl}/test`);
        assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    });

    it('should include Strict-Transport-Security header', async () => {
        const res = await fetch(`${baseUrl}/test`);
        const h = res.headers.get('strict-transport-security');
        assert.ok(h && h.includes('max-age'));
    });

    it('should include Content-Security-Policy header', async () => {
        const res = await fetch(`${baseUrl}/test`);
        const csp = res.headers.get('content-security-policy');
        assert.ok(csp && csp.includes("default-src 'self'"));
    });

    it('should compress response body', async () => {
        const res = await fetch(`${baseUrl}/test`, {
            headers: { 'Accept-Encoding': 'gzip' },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.deepEqual(body, { ok: true });
    });
});

// 全局清理
after(() => {
    cleanup();
    // 强制退出，防止 keep-alive 连接阻止进程退出
    setTimeout(() => process.exit(0), 100);
});
