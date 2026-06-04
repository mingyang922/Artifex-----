/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
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
        // 优先使用 users 表 role 列
        if (row.role === 'admin') return true;
        // 兼容旧数据：从 profile_json 读取
        try {
            const profile = JSON.parse(row.profile_json || '{}');
            if (profile.role === 'admin') return true;
            if (Array.isArray(profile.roles) && profile.roles.includes('admin')) return true;
        } catch (_) {
            /* ignore */
        }
        return false;
    }

    return {
        requireAuth,
        isAdminUser,
    };
}

module.exports = { createAuthPolicy };
