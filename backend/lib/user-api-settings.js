/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
function createUserApiSettingsHelpers(usersDb) {
    function sanitizeApiSettingsPayload(provider, payload) {
        const p = String(provider || '')
            .trim()
            .toLowerCase();
        if (!payload || typeof payload !== 'object') return null;
        if (p === 'jimeng') {
            const apiKey = String(payload.apiKey || '').trim();
            const endpoint = String(payload.endpoint || '').trim();
            const model = String(payload.model || '').trim();
            if (!apiKey) return null;
            return { apiKey, endpoint, model };
        }
        if (p === 'alibaba') {
            const apiKey = String(payload.apiKey || '').trim();
            const model = String(payload.model || '').trim();
            const visionModel = String(payload.visionModel || '').trim();
            if (!apiKey) return null;
            return { apiKey, model, visionModel };
        }
        if (p === 'tencent') {
            const secretId = String(payload.secretId || '').trim();
            const secretKey = String(payload.secretKey || '').trim();
            if (!secretId || !secretKey) return null;
            return { secretId, secretKey };
        }
        if (p === 'sdwebui') {
            const baseUrl = String(payload.baseUrl || '').trim();
            const apiKey = String(payload.apiKey || '').trim();
            if (!baseUrl) return null;
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
