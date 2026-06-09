/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
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
        // 该用户是 ID=1，init() 中已自动提升为 admin
        // 如果 role 不是 admin（测试顺序问题），手动设置
        if (row.role !== 'admin') {
            const db = require('better-sqlite3')(testDbPath);
            db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(row.id);
            db.close();
            row.role = 'admin';
        }
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

describe('projects', () => {
    let userId;

    before(() => {
        const row = usersDb.createUser('projectuser', 'project@test.com', 'hashed');
        userId = row.id;
    });

    it('should create a project', () => {
        const project = usersDb.createProject(userId, 'Test Project', 'A test project', 'game');
        assert.ok(project.id > 0);
        assert.equal(project.name, 'Test Project');
        assert.equal(project.description, 'A test project');
        assert.equal(project.type, 'game');
    });

    it('should get user projects', () => {
        const projects = usersDb.getUserProjects(userId, 10, 0);
        assert.ok(projects.length > 0);
        assert.equal(projects[0].name, 'Test Project');
    });

    it('should get project by id', () => {
        const projects = usersDb.getUserProjects(userId, 10, 0);
        const project = usersDb.getProject(projects[0].id);
        assert.ok(project);
        assert.equal(project.name, 'Test Project');
        assert.ok(Array.isArray(project.assets));
        assert.ok(Array.isArray(project.versionHistory));
    });

    it('should update a project', () => {
        const projects = usersDb.getUserProjects(userId, 10, 0);
        const updated = usersDb.updateProject(projects[0].id, userId, {
            name: 'Updated Project',
            description: 'Updated desc',
            type: 'ui',
            versionDesc: 'test update',
        });
        assert.equal(updated.name, 'Updated Project');
        assert.equal(updated.type, 'ui');
        assert.ok(updated.version > 1);
    });

    it('should get project count', () => {
        const count = usersDb.getProjectCount(userId);
        assert.ok(count > 0);
    });

    it('should add project asset', () => {
        const projects = usersDb.getUserProjects(userId, 10, 0);
        const asset = usersDb.addProjectAsset(projects[0].id, userId, 'Test Asset', 'image', 'data:image/png;base64,abc');
        assert.ok(asset.id > 0);
        assert.equal(asset.name, 'Test Asset');
    });

    it('should delete project asset', () => {
        const projects = usersDb.getUserProjects(userId, 10, 0);
        const project = usersDb.getProject(projects[0].id);
        assert.ok(project.assets.length > 0);
        usersDb.deleteProjectAsset(project.assets[0].id, userId);
        const updated = usersDb.getProject(projects[0].id);
        assert.equal(updated.assets.length, 0);
    });

    it('should delete a project', () => {
        const projects = usersDb.getUserProjects(userId, 10, 0);
        usersDb.deleteProject(projects[0].id, userId);
        const remaining = usersDb.getUserProjects(userId, 10, 0);
        assert.equal(remaining.length, 0);
    });
});

describe('asset-library', () => {
    let userId;

    before(() => {
        const row = usersDb.createUser('assetuser', 'asset@test.com', 'hashed');
        userId = row.id;
    });

    it('should add asset to library', () => {
        const item = usersDb.addAssetLibraryItem(userId, {
            name: 'Library Asset',
            type: 'image/png',
            content: 'data:image/png;base64,xyz',
            desc: 'test.png',
            source: 'test',
            tags: '{"category":"图片"}',
        });
        assert.ok(item.id > 0);
        assert.equal(item.name, 'Library Asset');
    });

    it('should get asset library', () => {
        const items = usersDb.getAssetLibrary(userId, 10, 0);
        assert.ok(items.length > 0);
        assert.equal(items[0].name, 'Library Asset');
    });

    it('should get asset count', () => {
        const count = usersDb.getAssetLibraryCount(userId);
        assert.ok(count > 0);
    });

    it('should update asset', () => {
        const items = usersDb.getAssetLibrary(userId, 10, 0);
        const updated = usersDb.updateAssetLibraryItem(userId, items[0].id, {
            name: 'Updated Asset',
            tags: '{"category":"图标"}',
        });
        assert.equal(updated.name, 'Updated Asset');
    });

    it('should delete asset', () => {
        const items = usersDb.getAssetLibrary(userId, 10, 0);
        usersDb.deleteAssetLibraryItem(userId, items[0].id);
        const remaining = usersDb.getAssetLibrary(userId, 10, 0);
        assert.equal(remaining.length, 0);
    });
});

describe('activity-log', () => {
    let userId;

    before(() => {
        const row = usersDb.createUser('activityuser', 'activity@test.com', 'hashed');
        userId = row.id;
    });

    it('should add activity', () => {
        usersDb.addActivity(userId, '测试操作', 'test', null, null);
        const logs = usersDb.getActivityLog(userId, 10, 0);
        assert.ok(logs.length > 0);
        assert.equal(logs[0].action, '测试操作');
    });

    it('should get activity count', () => {
        const count = usersDb.getActivityLogCount(userId);
        assert.ok(count > 0);
    });

    it('should get recent activity across all users', () => {
        const logs = usersDb.getRecentActivity(10);
        assert.ok(logs.length > 0);
    });
});

describe('encryption', () => {
    it('should encrypt and decrypt text', () => {
        const { encryptText, decryptText } = require('../backend/lib/utils');
        const original = 'test-api-key-12345';
        const encrypted = encryptText(original);
        assert.notEqual(encrypted, original);
        const decrypted = decryptText(encrypted);
        assert.equal(decrypted, original);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
        const { encryptText } = require('../backend/lib/utils');
        const text = 'same-input';
        const enc1 = encryptText(text);
        const enc2 = encryptText(text);
        assert.notEqual(enc1, enc2);
    });

    it('should handle empty string', () => {
        const { encryptText, decryptText } = require('../backend/lib/utils');
        const encrypted = encryptText('');
        const decrypted = decryptText(encrypted);
        assert.equal(decrypted, '');
    });
});
