/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * utils.js 单元测试：加密/解密、密钥规范化、尺寸解析
 */
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// 设置测试用的 SESSION_SECRET
process.env.SESSION_SECRET = 'test-session-secret-for-encryption';
process.env.NODE_ENV = 'test';

const utils = require('../backend/lib/utils');

describe('encryptText / decryptText', () => {
    it('should encrypt and decrypt text roundtrip', () => {
        const original = 'my-secret-api-key-12345';
        const encrypted = utils.encryptText(original);
        assert.ok(encrypted !== original, 'encrypted text should differ from original');
        assert.ok(encrypted.includes(':'), 'encrypted text should contain : separators');

        const decrypted = utils.decryptText(encrypted);
        assert.equal(decrypted, original);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
        const text = 'same-input';
        const enc1 = utils.encryptText(text);
        const enc2 = utils.encryptText(text);
        assert.notEqual(enc1, enc2, 'same input should produce different ciphertext due to random IV');
        assert.equal(utils.decryptText(enc1), text);
        assert.equal(utils.decryptText(enc2), text);
    });

    it('should return empty string for empty input', () => {
        assert.equal(utils.encryptText(''), '');
        assert.equal(utils.encryptText(null), '');
        assert.equal(utils.decryptText(''), '');
        assert.equal(utils.decryptText(null), '');
    });

    it('should return empty string when decrypting with wrong key (tampered)', () => {
        const encrypted = utils.encryptText('secret');
        // Tamper with the ciphertext
        const tampered = encrypted.slice(0, -4) + 'xxxx';
        const result = utils.decryptText(tampered);
        assert.equal(result, '', 'tampered ciphertext should return empty string');
    });

    it('should handle unicode text', () => {
        const original = '混元生图-API密钥测试🔐';
        const encrypted = utils.encryptText(original);
        const decrypted = utils.decryptText(encrypted);
        assert.equal(decrypted, original);
    });

    it('should handle long text', () => {
        const original = 'x'.repeat(10000);
        const encrypted = utils.encryptText(original);
        assert.equal(utils.decryptText(encrypted), original);
    });
});

describe('encryptSensitiveFields / decryptSensitiveFields', () => {
    it('should encrypt and decrypt sensitive fields', () => {
        const original = {
            apiKey: 'sk-test-key-12345',
            secretKey: 'my-secret-key',
            secretId: 'AKID-test-id',
            endpoint: 'https://api.example.com',
            model: 'wanx-v1',
        };

        const encrypted = utils.encryptSensitiveFields(original);
        assert.ok(encrypted.apiKey !== original.apiKey, 'apiKey should be encrypted');
        assert.ok(encrypted.secretKey !== original.secretKey, 'secretKey should be encrypted');
        assert.ok(encrypted.secretId !== original.secretId, 'secretId should be encrypted');
        assert.equal(encrypted.endpoint, original.endpoint, 'endpoint should not be encrypted');
        assert.equal(encrypted.model, original.model, 'model should not be encrypted');

        const decrypted = utils.decryptSensitiveFields(encrypted);
        assert.equal(decrypted.apiKey, original.apiKey);
        assert.equal(decrypted.secretKey, original.secretKey);
        assert.equal(decrypted.secretId, original.secretId);
        assert.equal(decrypted.endpoint, original.endpoint);
    });

    it('should handle null/undefined input', () => {
        assert.equal(utils.encryptSensitiveFields(null), null);
        assert.equal(utils.encryptSensitiveFields(undefined), undefined);
        assert.equal(utils.decryptSensitiveFields(null), null);
    });

    it('should handle object with no sensitive fields', () => {
        const obj = { endpoint: 'http://localhost', model: 'test' };
        const result = utils.encryptSensitiveFields(obj);
        assert.equal(result.endpoint, obj.endpoint);
        assert.equal(result.model, obj.model);
    });
});

describe('normalizeJimengApiKey', () => {
    it('should strip BOM and whitespace', () => {
        assert.equal(utils.normalizeJimengApiKey('\uFEFF  sk-test123  '), 'sk-test123');
    });

    it('should strip Authorization: Bearer prefix', () => {
        assert.equal(utils.normalizeJimengApiKey('Bearer sk-test123'), 'sk-test123');
        assert.equal(utils.normalizeJimengApiKey('Authorization: Bearer sk-test123'), 'sk-test123');
    });

    it('should strip surrounding quotes', () => {
        assert.equal(utils.normalizeJimengApiKey('"sk-test123"'), 'sk-test123');
        assert.equal(utils.normalizeJimengApiKey("'sk-test123'"), 'sk-test123');
    });

    it('should add sk- prefix to UUID-like keys', () => {
        const uuid = 'e50b230f-a742-4b76-8114-df97c1f9c2c3';
        const result = utils.normalizeJimengApiKey(uuid);
        assert.ok(result.startsWith('sk-'), 'UUID should get sk- prefix');
        assert.ok(result.includes(uuid), 'should contain original UUID');
    });

    it('should fix sk-sk- double prefix', () => {
        assert.equal(utils.normalizeJimengApiKey('sk-sk-test123'), 'sk-test123');
    });

    it('should return empty string for null/empty', () => {
        assert.equal(utils.normalizeJimengApiKey(null), '');
        assert.equal(utils.normalizeJimengApiKey(''), '');
    });
});

describe('normalizePixelSize', () => {
    it('should normalize various size formats', () => {
        assert.equal(utils.normalizePixelSize('1024x1024'), '1024x1024');
        assert.equal(utils.normalizePixelSize('1024*768'), '1024x768');
        assert.equal(utils.normalizePixelSize('1024:768'), '1024x768');
        assert.equal(utils.normalizePixelSize(' 1024 x 768 '), '1024x768');
    });

    it('should return null for invalid input', () => {
        assert.equal(utils.normalizePixelSize(null), null);
        assert.equal(utils.normalizePixelSize(''), null);
        assert.equal(utils.normalizePixelSize('abc'), null);
    });
});

describe('validateTencentCamCredential', () => {
    it('should reject empty credentials', () => {
        const result = utils.validateTencentCamCredential('', '');
        assert.equal(result.ok, false);
        assert.equal(result.code, 'not_configured');
    });

    it('should reject placeholder values', () => {
        const result = utils.validateTencentCamCredential('YOUR_SECRET_ID', 'YOUR_SECRET_KEY');
        assert.equal(result.ok, false);
    });

    it('should reject non-AKID format', () => {
        const result = utils.validateTencentCamCredential('sk-12345', 'some-key');
        assert.equal(result.ok, false);
        assert.equal(result.code, 'invalid_format');
    });

    it('should accept valid AKID format', () => {
        const result = utils.validateTencentCamCredential('AKIDtest123456789', 'valid-secret-key-12345');
        assert.equal(result.ok, true);
    });
});

describe('parseJimengImageResponse', () => {
    it('should extract URL from data array', () => {
        const data = { data: [{ url: 'https://example.com/image.png' }] };
        assert.equal(utils.parseJimengImageResponse(data), 'https://example.com/image.png');
    });

    it('should extract URL from string array', () => {
        const data = { data: ['https://example.com/image.png'] };
        assert.equal(utils.parseJimengImageResponse(data), 'https://example.com/image.png');
    });

    it('should throw on failed status', () => {
        assert.throws(() => utils.parseJimengImageResponse({ task_status: 'failed', error: { message: 'bad' } }));
    });

    it('should return null for null input', () => {
        assert.equal(utils.parseJimengImageResponse(null), null);
    });
});
