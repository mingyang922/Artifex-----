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

    it('decryptText with invalid GCM-format ciphertext returns empty string', () => {
        const { decryptText } = require('../backend/lib/utils');
        // 3-part format triggers GCM decryption; invalid hex will fail and return ''
        assert.equal(decryptText('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz:zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz:zz'), '');
    });

    it('decryptText with plain-text (no colons) returns as-is (legacy behavior)', () => {
        const { decryptText } = require('../backend/lib/utils');
        // Strings without colons are treated as unencrypted legacy data
        assert.equal(decryptText('not-valid-encrypted-data'), 'not-valid-encrypted-data');
    });

    it('decryptText with tampered auth tag returns empty string', () => {
        const { encryptText, decryptText } = require('../backend/lib/utils');
        const encrypted = encryptText('secret-data');
        const parts = encrypted.split(':');
        // Tamper with the auth tag
        parts[1] = '0'.repeat(32);
        const tampered = parts.join(':');
        assert.equal(decryptText(tampered), '');
    });

    it('decryptText with null/undefined returns empty string', () => {
        const { decryptText } = require('../backend/lib/utils');
        assert.equal(decryptText(null), '');
        assert.equal(decryptText(undefined), '');
    });

    it('should follow AES-256-GCM format (IV:AuthTag:Ciphertext)', () => {
        const { encryptText } = require('../backend/lib/utils');
        const encrypted = encryptText('test-data-123');
        const parts = encrypted.split(':');
        assert.equal(parts.length, 3, 'should have exactly 3 colon-separated parts');
        // IV: 16 bytes = 32 hex chars
        assert.equal(parts[0].length, 32, 'IV should be 32 hex chars');
        // AuthTag: 16 bytes = 32 hex chars
        assert.equal(parts[1].length, 32, 'AuthTag should be 32 hex chars');
        // Ciphertext: non-empty hex
        assert.ok(parts[2].length > 0, 'Ciphertext should not be empty');
        assert.ok(/^[0-9a-f]+$/.test(parts[0]), 'IV should be hex');
        assert.ok(/^[0-9a-f]+$/.test(parts[1]), 'AuthTag should be hex');
        assert.ok(/^[0-9a-f]+$/.test(parts[2]), 'Ciphertext should be hex');
    });

    it('encryptSensitiveFields encrypts apiKey, secretKey, secretId', () => {
        const { encryptSensitiveFields } = require('../backend/lib/utils');
        const obj = { apiKey: 'my-key', secretKey: 'my-secret', secretId: 'my-id', other: 'plain' };
        const encrypted = encryptSensitiveFields(obj);
        assert.notEqual(encrypted.apiKey, obj.apiKey);
        assert.notEqual(encrypted.secretKey, obj.secretKey);
        assert.notEqual(encrypted.secretId, obj.secretId);
        assert.equal(encrypted.other, 'plain');
    });

    it('decryptSensitiveFields restores original values', () => {
        const { encryptSensitiveFields, decryptSensitiveFields } = require('../backend/lib/utils');
        const original = { apiKey: 'key-123', secretKey: 'secret-456', secretId: 'id-789', other: 'plain' };
        const encrypted = encryptSensitiveFields(original);
        const decrypted = decryptSensitiveFields(encrypted);
        assert.equal(decrypted.apiKey, original.apiKey);
        assert.equal(decrypted.secretKey, original.secretKey);
        assert.equal(decrypted.secretId, original.secretId);
        assert.equal(decrypted.other, 'plain');
    });

    it('encryptSensitiveFields with null/undefined returns as-is', () => {
        const { encryptSensitiveFields } = require('../backend/lib/utils');
        assert.equal(encryptSensitiveFields(null), null);
        assert.equal(encryptSensitiveFields(undefined), undefined);
    });
});

describe('checkQuota', () => {
    let quotaUserId;

    before(() => {
        const row = usersDb.createUser('quotauser', 'quota@test.com', 'hashed');
        quotaUserId = row.id;
    });

    it('should return ok when under limit', () => {
        const result = usersDb.checkQuota(quotaUserId, 'tencent');
        assert.equal(result.ok, true);
    });

    it('should return daily limit exceeded', () => {
        // Set a very low daily limit
        usersDb.setUserQuota(quotaUserId, 'jimeng', 2, 1000);
        // Log enough calls to exceed daily limit
        usersDb.logApiCall(quotaUserId, 'jimeng', 'text2img', 'success', 100);
        usersDb.logApiCall(quotaUserId, 'jimeng', 'text2img', 'success', 100);
        const result = usersDb.checkQuota(quotaUserId, 'jimeng');
        assert.equal(result.ok, false);
        assert.equal(result.reason, 'daily');
        assert.equal(result.limit, 2);
    });

    it('should return monthly limit exceeded', () => {
        // Create a separate user for this test to avoid interference
        const row = usersDb.createUser('monthlyuser', 'monthly@test.com', 'hashed');
        usersDb.setUserQuota(row.id, 'alibaba', 1000, 2);
        usersDb.logApiCall(row.id, 'alibaba', 'text2img', 'success', 100);
        usersDb.logApiCall(row.id, 'alibaba', 'text2img', 'success', 100);
        const result = usersDb.checkQuota(row.id, 'alibaba');
        assert.equal(result.ok, false);
        assert.equal(result.reason, 'monthly');
        assert.equal(result.limit, 2);
    });

    it('should return ok for empty provider', () => {
        const result = usersDb.checkQuota(quotaUserId, '');
        assert.equal(result.ok, true);
    });
});

describe('provider-routing', () => {
    const { dispatchImageGeneration } = require('../backend/routes/image-proxy');

    const baseCtx = {
        prompt: 'test prompt',
        size: '512x512',
        mode: 'text2img',
        imageDataUrl: null,
        strength: 0.7,
        imageModel: null,
        body: {},
        userId: 1,
        getUserProviderConfig: () => null,
        req: {},
        setOnJimengFrameSuccess: () => {},
    };

    it('dispatchImageGeneration with mock provider returns URL', async () => {
        const result = await dispatchImageGeneration({ ...baseCtx, provider: 'mock' });
        assert.ok(typeof result === 'string');
        assert.ok(result.length > 0);
        assert.ok(result.includes('placeholder.com'), 'mock should return a placeholder URL');
    });

    it('dispatchImageGeneration with free provider returns URL or data URI', async () => {
        const result = await dispatchImageGeneration({ ...baseCtx, provider: 'free' });
        assert.ok(typeof result === 'string');
        assert.ok(result.length > 0);
        // free provider returns either an https URL or a data: URI (SVG fallback)
        assert.ok(
            result.startsWith('https://') || result.startsWith('data:'),
            'free provider should return https URL or data URI'
        );
    });

    it('dispatchImageGeneration with unknown text2img provider throws error', async () => {
        await assert.rejects(
            () => dispatchImageGeneration({ ...baseCtx, provider: 'unknown-provider' }),
            (err) => {
                assert.ok(err.message.includes('不支持的图片生成服务'));
                return true;
            }
        );
    });

    it('dispatchImageGeneration with unknown img2img provider throws error', async () => {
        await assert.rejects(
            () => dispatchImageGeneration({
                ...baseCtx,
                provider: 'unknown-provider',
                mode: 'img2img',
                imageDataUrl: 'data:image/png;base64,abc',
            }),
            (err) => {
                assert.ok(err.message.includes('不支持的图生图服务'));
                return true;
            }
        );
    });
});

describe('ssrf-protection', () => {
    const { isBlockedHostname } = require('../backend/routes/image-proxy');

    it('should block localhost', () => {
        assert.equal(isBlockedHostname('localhost'), true);
        assert.equal(isBlockedHostname('LOCALHOST'), true);
    });

    it('should block 127.x.x.x loopback', () => {
        assert.equal(isBlockedHostname('127.0.0.1'), true);
        assert.equal(isBlockedHostname('127.255.255.255'), true);
    });

    it('should block 10.x.x.x private range', () => {
        assert.equal(isBlockedHostname('10.0.0.1'), true);
        assert.equal(isBlockedHostname('10.255.255.255'), true);
    });

    it('should block 172.16-31.x.x private range', () => {
        assert.equal(isBlockedHostname('172.16.0.1'), true);
        assert.equal(isBlockedHostname('172.31.255.255'), true);
    });

    it('should block 192.168.x.x private range', () => {
        assert.equal(isBlockedHostname('192.168.1.1'), true);
        assert.equal(isBlockedHostname('192.168.0.1'), true);
    });

    it('should block 169.254.x.x link-local', () => {
        assert.equal(isBlockedHostname('169.254.169.254'), true);
    });

    it('should block 0.0.0.0', () => {
        assert.equal(isBlockedHostname('0.0.0.0'), true);
    });

    it('should block IPv6 localhost ::1', () => {
        assert.equal(isBlockedHostname('::1'), true);
    });

    it('should block IPv6 private addresses', () => {
        assert.equal(isBlockedHostname('fc00::1'), true);
        assert.equal(isBlockedHostname('fd00::1'), true);
        assert.equal(isBlockedHostname('fe80::1'), true);
        assert.equal(isBlockedHostname('::'), true);
    });

    it('should allow public hostnames', () => {
        assert.equal(isBlockedHostname('example.com'), false);
        assert.equal(isBlockedHostname('google.com'), false);
        assert.equal(isBlockedHostname('8.8.8.8'), false);
        assert.equal(isBlockedHostname('1.1.1.1'), false);
    });

    it('should allow addresses outside private ranges', () => {
        // 172.32.x.x is not in the 172.16-31 private range
        assert.equal(isBlockedHostname('172.32.0.1'), false);
        // 172.15.x.x is not in the 172.16-31 private range
        assert.equal(isBlockedHostname('172.15.0.1'), false);
        // 11.x.x.x is not in the 10.x.x.x range
        assert.equal(isBlockedHostname('11.0.0.1'), false);
    });
});
