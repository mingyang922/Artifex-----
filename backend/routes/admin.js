/**
 * Artifex — 管理员路由
 * 用量统计 + 用户管理
 */
'use strict';

const { Router } = require('express');
const logger = require('../lib/logger');
const { sendError, ERR } = require('../lib/error-response');

/**
 * @param {object} deps
 * @param {object} deps.usersDb
 * @param {Function} deps.requireAuth
 * @param {Function} deps.isAdminUser
 * @param {Function} [deps.csrfProtection] - CSRF 中间件（预留，当前仅 GET 路由不需要）
 * @returns {import('express').Router}
 */
function createAdminRouter(deps) {
    const router = Router();
    const { usersDb, requireAuth, isAdminUser, csrfProtection: _csrfProtection } = deps;

    // 用户自己的用量
    router.get('/me/usage', requireAuth, (req, res) => {
        const stats = usersDb.getUserUsageStats(req.currentUser.id);
        const today = usersDb.getUserUsageToday(req.currentUser.id);
        res.json({ ok: true, stats, today });
    });

    // 管理员：全局用量
    router.get('/admin/usage', requireAuth, (req, res) => {
        if (!isAdminUser(req.currentUser)) {
            return sendError(res, 403, ERR.FORBIDDEN, '权限不足');
        }
        const limit = parseInt(req.query.limit, 10) || 200;
        const offset = parseInt(req.query.offset, 10) || 0;
        const summary = usersDb.getGlobalUsageSummary();
        const details = usersDb.getGlobalUsageStats(limit, offset);
        const total = usersDb.getGlobalUsageStatsCount();
        res.json({ ok: true, summary, details, total, limit, offset });
    });

    // 管理员：用户列表
    router.get('/admin/users', requireAuth, (req, res) => {
        if (!isAdminUser(req.currentUser)) {
            return sendError(res, 403, ERR.FORBIDDEN, '权限不足');
        }
        const limit = parseInt(req.query.limit, 10) || 100;
        const offset = parseInt(req.query.offset, 10) || 0;
        const users = usersDb.getAllUsers(limit, offset);
        const total = usersDb.getAllUsersCount();
        res.json({ ok: true, users, total, limit, offset });
    });

    // ── 全局错误处理 ──
    router.use((err, req, res, _next) => {
        logger.error('[admin] 未处理的路由错误:', err);
        if (!res.headersSent) {
            sendError(res, 500, ERR.INTERNAL, '服务器内部错误');
        }
    });

    return router;
}

module.exports = { createAdminRouter };
