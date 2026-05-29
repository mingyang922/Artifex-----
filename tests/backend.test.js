/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 Artifex Team
 * 版本: 1.0.0 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// 使用临时数据库避免污染生产数据
const tmpDir = require('os').tmpdir();
const testDbPath = path.join(tmpDir, `artifex-test-${Date.now()}.sqlite`);
process.env.USERS_DB_PATH = testDbPath;

const usersDb = require('../backend/db/users-db');
const { createAuthPolicy } = require('../backend/lib/auth-policy');
const { createUserApiSettingsHelpers } = require('../backend/lib/user-api-settings');

describe('users-db', () => {
    before(() => {
        usersDb.init();
    });

    after(() => {
        try {
            require('fs').unlinkSync(testDbPath);
            require('fs').unlinkSync(testDbPath + '-shm');
            require('fs').unlinkSync(testDbPath + '-wal');
        } catch (_) {}
    });

    it('should create a user', () => {
        const row = usersDb.createUser('testuser', 'test@example.com', 'hashed_pw_123');
        assert.ok(row.id > 0);
        assert.equal(row.username, 'testuser');
        assert.equal(row.email, 'test@example.com');
    });

    it('should find user by email', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        assert.ok(row);
        assert.equal(row.username, 'testuser');
    });

    it('should find user by id', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        const found = usersDb.getUserById(row.id);
        assert.ok(found);
        assert.equal(found.email, 'test@example.com');
    });

    it('should return null for unknown email', () => {
        const row = usersDb.getUserByEmail('nobody@example.com');
        assert.equal(row, undefined);
    });

    it('should update profile', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        usersDb.updateProfile(row.id, { nickname: '测试用户', role: 'admin' });
        const updated = usersDb.getUserById(row.id);
        const profile = JSON.parse(updated.profile_json);
        assert.equal(profile.nickname, '测试用户');
        assert.equal(profile.role, 'admin');
    });

    it('should upsert and read API credentials', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        usersDb.upsertUserApiCredentials(row.id, 'jimeng', { apiKey: 'test-key-123', model: 'seedream' });
        const creds = usersDb.getUserApiCredentials(row.id, 'jimeng');
        assert.equal(creds.apiKey, 'test-key-123');
        assert.equal(creds.model, 'seedream');
    });

    it('should list all API credentials', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        usersDb.upsertUserApiCredentials(row.id, 'alibaba', { apiKey: 'ali-key' });
        const all = usersDb.getAllUserApiCredentials(row.id);
        assert.ok(all.jimeng);
        assert.ok(all.alibaba);
    });

    it('should delete API credentials', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        usersDb.deleteUserApiCredentials(row.id, 'alibaba');
        const creds = usersDb.getUserApiCredentials(row.id, 'alibaba');
        assert.equal(creds, null);
    });

    it('should get credential status', () => {
        const row = usersDb.getUserByEmail('test@example.com');
        const status = usersDb.getUserApiCredentialStatus(row.id);
        assert.equal(status.jimeng, true);
        assert.equal(status.alibaba, false);
        assert.equal(status.tencent, false);
        assert.equal(status.sdwebui, false);
    });
});

describe('auth-policy', () => {
    it('should reject unauthenticated requests', () => {
        const { requireAuth } = createAuthPolicy(usersDb);
        let statusCode = null;
        let body = null;
        const req = { session: {} };
        const res = {
            status(code) { statusCode = code; return this; },
            json(obj) { body = obj; },
        };
        requireAuth(req, res, () => {});
        assert.equal(statusCode, 401);
        assert.equal(body.error, '未登录');
    });

    it('should pass authenticated requests', () => {
        const { requireAuth } = createAuthPolicy(usersDb);
        const row = usersDb.getUserByEmail('test@example.com');
        let called = false;
        const req = { session: { userId: row.id } };
        const res = {
            status() { return this; },
            json() {},
        };
        requireAuth(req, res, () => { called = true; });
        assert.ok(called);
    });

    it('should detect admin users', () => {
        const { isAdminUser } = createAuthPolicy(usersDb);
        const row = usersDb.getUserByEmail('test@example.com');
        assert.ok(isAdminUser(row));
    });

    it('should detect non-admin users', () => {
        const { isAdminUser } = createAuthPolicy(usersDb);
        usersDb.createUser('regular', 'regular@example.com', 'pw');
        const row = usersDb.getUserByEmail('regular@example.com');
        assert.equal(isAdminUser(row), false);
    });
});

describe('user-api-settings', () => {
    it('should sanitize jimeng credentials', () => {
        const { sanitizeApiSettingsPayload } = createUserApiSettingsHelpers(usersDb);
        const result = sanitizeApiSettingsPayload('jimeng', { apiKey: 'key123', model: 'seedream' });
        assert.equal(result.apiKey, 'key123');
        assert.equal(result.model, 'seedream');
    });

    it('should reject jimeng credentials without apiKey', () => {
        const { sanitizeApiSettingsPayload } = createUserApiSettingsHelpers(usersDb);
        const result = sanitizeApiSettingsPayload('jimeng', { model: 'seedream' });
        assert.equal(result, null);
    });

    it('should sanitize tencent credentials', () => {
        const { sanitizeApiSettingsPayload } = createUserApiSettingsHelpers(usersDb);
        const result = sanitizeApiSettingsPayload('tencent', { secretId: 'AKID123', secretKey: 'secret456' });
        assert.equal(result.secretId, 'AKID123');
        assert.equal(result.secretKey, 'secret456');
    });

    it('should reject unknown provider', () => {
        const { sanitizeApiSettingsPayload } = createUserApiSettingsHelpers(usersDb);
        const result = sanitizeApiSettingsPayload('unknown', { apiKey: 'key' });
        assert.equal(result, null);
    });

    it('should check provider configured for user', () => {
        const { providerConfiguredForUser } = createUserApiSettingsHelpers(usersDb);
        const row = usersDb.getUserByEmail('test@example.com');
        assert.ok(providerConfiguredForUser(row.id, 'jimeng'));
        assert.equal(providerConfiguredForUser(row.id, 'sdwebui'), false);
    });
});
