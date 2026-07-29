/**
 * Artifex — 素材库路由
 * 用户素材库 CRUD
 */
'use strict';

const { Router } = require('express');
const logger = require('../lib/logger');
const { sendError, ERR } = require('../lib/error-response');

/**
 * @param {object} deps
 * @param {object} deps.usersDb
 * @param {Function} deps.requireAuth
 * @param {Function} deps.csrfProtection
 * @returns {import('express').Router}
 */
function createAssetLibraryRouter(deps) {
    const router = Router();
    const { usersDb, requireAuth, csrfProtection } = deps;

    // 获取用户素材库（支持分页）
    router.get('/asset-library', requireAuth, (req, res) => {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;
        const total = usersDb.getAssetLibraryCount(req.currentUser.id);
        const assets = usersDb.getAssetLibrary(req.currentUser.id, limit, offset);
        res.json({ ok: true, assets, total, page, limit });
    });

    // 添加素材
    router.post('/asset-library', requireAuth, csrfProtection, (req, res) => {
        const { name, type, content, desc, source, tags } = req.body || {};
        if (!name || !content) {
            return sendError(res, 400, ERR.VALIDATION, '素材名称和内容不能为空');
        }
        const MAX_ASSET_SIZE = 10 * 1024 * 1024;
        if (typeof content === 'string' && content.length > MAX_ASSET_SIZE) {
            return sendError(res, 413, ERR.VALIDATION, '素材内容过大，最大允许 10MB');
        }
        const item = usersDb.addAssetLibraryItem(req.currentUser.id, { name, type, content, desc, source, tags });
        try {
            usersDb.addActivity(req.currentUser.id, '保存素材', 'asset', item.id, name);
        } catch (_) {
            /* 活动日志非关键 */
        }
        res.json({ ok: true, item });
    });

    // 更新素材
    router.put('/asset-library/:id', requireAuth, csrfProtection, (req, res) => {
        const assetId = Number(req.params.id);
        if (!assetId || isNaN(assetId)) return sendError(res, 400, ERR.VALIDATION, '无效的素材 ID');
        const updates = req.body || {};
        const item = usersDb.updateAssetLibraryItem(req.currentUser.id, assetId, updates);
        if (!item) {
            return sendError(res, 404, ERR.NOT_FOUND, '素材不存在');
        }
        res.json({ ok: true, item });
    });

    // 删除素材
    router.delete('/asset-library/:id', requireAuth, csrfProtection, (req, res) => {
        const assetId = Number(req.params.id);
        if (!assetId || isNaN(assetId)) return sendError(res, 400, ERR.VALIDATION, '无效的素材 ID');
        usersDb.deleteAssetLibraryItem(req.currentUser.id, assetId);
        res.json({ ok: true });
    });

    // ── 全局错误处理 ──
    router.use((err, req, res, _next) => {
        logger.error('[asset-library] 未处理的路由错误:', err);
        if (!res.headersSent) {
            sendError(res, 500, ERR.INTERNAL, '服务器内部错误');
        }
    });

    return router;
}

module.exports = { createAssetLibraryRouter };
