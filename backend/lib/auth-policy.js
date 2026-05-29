/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 Artifex Team
 * 版本: 1.0.0 */
function createAuthPolicy(usersDb) {
    function requireAuth(req, res, next) {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        const row = usersDb.getUserById(req.session.userId);
        if (!row) {
            return res.status(401).json({ error: '未登录' });
        }
        req.currentUser = row;
        return next();
    }

    function isAdminUser(row) {
        if (!row) return false;
        try {
            const profile = JSON.parse(row.profile_json || '{}');
            if (profile.role === 'admin') return true;
            if (Array.isArray(profile.roles) && profile.roles.includes('admin')) return true;
        } catch (_) {
            return false;
        }
        return false;
    }

    return {
        requireAuth,
        isAdminUser,
    };
}

module.exports = { createAuthPolicy };
