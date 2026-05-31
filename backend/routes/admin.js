/**
 * Artifex — 管理员路由
 * 用量统计 + 用户管理
 */
'use strict';

const { Router } = require('express');

/**
 * @param {object} deps
 * @param {object} deps.usersDb
 * @param {Function} deps.requireAuth
 * @param {Function} deps.isAdminUser
 * @returns {import('express').Router}
 */
function createAdminRouter(deps) {
    const router = Router();
    const { usersDb, requireAuth, isAdminUser } = deps;

    // 用户自己的用量
    router.get('/me/usage', requireAuth, (req, res) => {
        const stats = usersDb.getUserUsageStats(req.currentUser.id);
        const today = usersDb.getUserUsageToday(req.currentUser.id);
        res.json({ ok: true, stats, today });
    });

    // 管理员：全局用量
    router.get('/admin/usage', requireAuth, (req, res) => {
        if (!isAdminUser(req.currentUser)) {
            return res.status(403).json({ error: '权限不足' });
        }
        const summary = usersDb.getGlobalUsageSummary();
        const details = usersDb.getGlobalUsageStats();
        res.json({ ok: true, summary, details });
    });

    // 管理员：用户列表
    router.get('/admin/users', requireAuth, (req, res) => {
        if (!isAdminUser(req.currentUser)) {
            return res.status(403).json({ error: '权限不足' });
        }
        const users = usersDb.getAllUsers();
        res.json({ ok: true, users });
    });

    return router;
}

module.exports = { createAdminRouter };
