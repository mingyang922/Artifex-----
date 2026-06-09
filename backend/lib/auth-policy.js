/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
function createAuthPolicy(usersDb) {
    // 短 TTL 缓存，减少每次 API 请求都查库
    const USER_CACHE_TTL = 5000; // 5 秒
    const userCache = new Map();

    function getCachedUser(userId) {
        const entry = userCache.get(userId);
        if (entry && Date.now() < entry.expireAt) {
            return entry.user;
        }
        const user = usersDb.getUserById(userId);
        if (user) {
            userCache.set(userId, { user, expireAt: Date.now() + USER_CACHE_TTL });
        }
        return user;
    }

    function requireAuth(req, res, next) {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        const row = getCachedUser(req.session.userId);
        if (!row) {
            return res.status(401).json({ error: '未登录' });
        }
        req.currentUser = row;
        return next();
    }

    function isAdminUser(row) {
        if (!row) return false;
        // 仅信任 users 表 role 列，不从 profile_json 读取（防止权限提升）
        return row.role === 'admin';
    }

    return {
        requireAuth,
        isAdminUser,
    };
}

module.exports = { createAuthPolicy };
