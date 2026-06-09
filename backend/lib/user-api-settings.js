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
        if (!payload || typeof payload != 'object') return null;

        function trimLimit(val) {
            return String(val || '').trim().slice(0, MAX_FIELD_LEN);
        }

        if (p === 'jimeng') {
            const apiKey = trimLimit(payload.apiKey);
            const endpoint = trimLimit(payload.endpoint);
            const model = trimLimit(payload.model);
            if (!apiKey) return null;
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
