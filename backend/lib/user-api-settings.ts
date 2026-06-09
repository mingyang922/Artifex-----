/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

import type { ApiCredentials } from './types';

// 单个字段最大长度限制（防止恶意超大输入）
const MAX_FIELD_LEN: number = 4096;

interface SanitizedPayload extends ApiCredentials {
    apiKey?: string;
    secretId?: string;
    secretKey?: string;
    endpoint?: string;
    model?: string;
    visionModel?: string;
    baseUrl?: string;
}

interface UsersDb {
    getUserApiCredentials(userId: number, provider: string): ApiCredentials | null;
}

interface UserApiSettingsHelpers {
    sanitizeApiSettingsPayload(provider: string, payload: Record<string, unknown> | null | undefined): SanitizedPayload | null;
    providerConfiguredForUser(userId: number, provider: string): boolean;
    getUserProviderConfig(userId: number, provider: string): ApiCredentials | null;
}

function createUserApiSettingsHelpers(usersDb: UsersDb): UserApiSettingsHelpers {
    function sanitizeApiSettingsPayload(provider: string, payload: Record<string, unknown> | null | undefined): SanitizedPayload | null {
        const p: string = String(provider || '')
            .trim()
            .toLowerCase();
        if (!payload || typeof payload !== 'object') return null;

        function trimLimit(val: unknown): string {
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

    function providerConfiguredForUser(userId: number, provider: string): boolean {
        const p: string = String(provider || '')
            .trim()
            .toLowerCase();
        const row: ApiCredentials | null = usersDb.getUserApiCredentials(userId, p);
        return !!(row && typeof row === 'object' && Object.keys(row).length > 0);
    }

    function getUserProviderConfig(userId: number, provider: string): ApiCredentials | null {
        return usersDb.getUserApiCredentials(userId, provider) || null;
    }

    return {
        sanitizeApiSettingsPayload,
        providerConfiguredForUser,
        getUserProviderConfig,
    };
}

export { createUserApiSettingsHelpers };
