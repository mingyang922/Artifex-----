/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
function createUserApiSettingsHelpers(usersDb) {
    // 单个字段最大长度限制（防止恶意超大输入）
    const MAX_FIELD_LEN = 4096;

    function sanitizeApiSettingsPayload(provider, payload) {
        const p = String(provider || '')
            .trim()
            .toLowerCase();
        if (!payload || typeof payload !== 'object') return null;

        function trimLimit(val) {
            return String(val || '')
                .trim()
                .slice(0, MAX_FIELD_LEN);
        }

        function isPrivateOrReservedHost(hostname) {
            // Block private/reserved IP ranges to prevent SSRF
            if (!hostname) return false;
            const lower = hostname.toLowerCase();
            if (lower === 'localhost' || lower === '[::1]' || lower.endsWith('.local')) return true;
            // IPv4 private ranges
            const parts = lower.split('.').map(Number);
            if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
                if (parts[0] === 10) return true;
                if (parts[0] === 127) return true;
                if (parts[0] === 169 && parts[1] === 254) return true;
                if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
                if (parts[0] === 192 && parts[1] === 168) return true;
                if (parts[0] === 0) return true;
            }
            return false;
        }

        function validateUrlNotPrivate(urlStr) {
            if (!urlStr) return true;
            try {
                const url = new URL(urlStr);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
                return !isPrivateOrReservedHost(url.hostname);
            } catch (_) {
                return false;
            }
        }

        if (p === 'jimeng') {
            const apiKey = trimLimit(payload.apiKey);
            const endpoint = trimLimit(payload.endpoint);
            const model = trimLimit(payload.model);
            if (!apiKey) return null;
            if (endpoint && !validateUrlNotPrivate(endpoint)) return null;
            return { apiKey, endpoint, model };
        }
        if (p === 'alibaba') {
            const apiKey = trimLimit(payload.apiKey);
            const model = trimLimit(payload.model);
            const visionModel = trimLimit(payload.visionModel);
            if (!apiKey) return null;
            return { apiKey, model, visionModel };
        }
        if (p === 'tencent') {
            const secretId = trimLimit(payload.secretId);
            const secretKey = trimLimit(payload.secretKey);
            if (!secretId || !secretKey) return null;
            return { secretId, secretKey };
        }
        if (p === 'sdwebui') {
            const baseUrl = trimLimit(payload.baseUrl);
            const apiKey = trimLimit(payload.apiKey);
            if (!baseUrl) return null;
            if (!validateUrlNotPrivate(baseUrl)) return null;
            return { baseUrl, apiKey };
        }
        return null;
    }

    function providerConfiguredForUser(userId, provider) {
        const p = String(provider || '')
            .trim()
            .toLowerCase();
        const row = usersDb.getUserApiCredentials(userId, p);
        return !!(row && typeof row === 'object' && Object.keys(row).length > 0);
    }

    function getUserProviderConfig(userId, provider) {
        return usersDb.getUserApiCredentials(userId, provider) || null;
    }

    return {
        sanitizeApiSettingsPayload,
        providerConfiguredForUser,
        getUserProviderConfig,
    };
}

module.exports = { createUserApiSettingsHelpers };
