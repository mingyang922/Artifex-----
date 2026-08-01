/**
 * Artifex — 素材库路由
 * 用户素材库 CRUD
 */
'use strict';

const { Router } = require('express');
const logger = require('../lib/logger');
const { sendError, ERR } = require('../lib/error-response');
const { validateAssetPayload } = require('../lib/asset-validation');

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
        const filters = {
            q: req.query.q,
            type: req.query.type,
            source: req.query.source,
            tag: req.query.tag,
            status: req.query.status,
            favorite: req.query.favorite,
            deleted: req.query.deleted === '1',
            sort: req.query.sort,
            limit,
            offset,
        };
        const total = usersDb.getAssetLibraryCount(req.currentUser.id, filters);
        const assets = usersDb.getAssetLibrary(req.currentUser.id, filters);
        // 同时保留 assets 与旧前端使用的 items，避免升级过程中的契约断裂。
        res.json({ ok: true, assets, items: assets, total, page, limit });
    });

    // 添加素材
    router.post('/asset-library', requireAuth, csrfProtection, (req, res) => {
        const { name, type, content, desc, source, tags, status, favorite, metadata } = req.body || {};
        const validationError = validateAssetPayload(req.body, { requireContent: true });
        if (validationError) return sendError(res, 400, ERR.VALIDATION, validationError);
        const item = usersDb.addAssetLibraryItem(req.currentUser.id, {
            name,
            type,
            content,
            desc,
            source,
            tags,
            status,
            favorite,
            metadata,
        });
        try {
            usersDb.addActivity(req.currentUser.id, '保存素材', 'asset', item.id, name);
        } catch (_) {
            /* 活动日志非关键 */
        }
        res.json({ ok: true, item });
    });

    // 更新素材
    router.put('/asset-library/:id(\\d+)', requireAuth, csrfProtection, (req, res) => {
        const assetId = Number(req.params.id);
        if (!assetId || isNaN(assetId)) return sendError(res, 400, ERR.VALIDATION, '无效的素材 ID');
        const updates = req.body || {};
        const validationError = validateAssetPayload(updates);
        if (validationError) return sendError(res, 400, ERR.VALIDATION, validationError);
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

    // 回收站恢复
    router.post('/asset-library/:id/restore', requireAuth, csrfProtection, (req, res) => {
        const result = usersDb
            .getDb()
            .prepare('UPDATE asset_library SET deleted_at=NULL,updated_at=? WHERE id=? AND user_id=?')
            .run(new Date().toISOString(), Number(req.params.id), req.currentUser.id);
        if (!result.changes) return sendError(res, 404, ERR.NOT_FOUND, '回收站中未找到该素材');
        res.json({ ok: true });
    });

    // 批量更新分类、状态、收藏或标签
    router.put('/asset-library/batch/update', requireAuth, csrfProtection, (req, res) => {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean).slice(0, 200) : [];
        if (!ids.length) return sendError(res, 400, ERR.VALIDATION, '请选择素材');
        const updates = req.body?.updates || {};
        const updateMany = usersDb.getDb().transaction(() => {
            for (const id of ids) usersDb.updateAssetLibraryItem(req.currentUser.id, id, updates);
        });
        updateMany();
        res.json({ ok: true, updated: ids.length });
    });

    // 精确重复检测（相同内容哈希）；前端感知哈希仍可用于视觉近似检测。
    router.get('/asset-library/duplicates', requireAuth, (req, res) => {
        const groups = usersDb
            .getDb()
            .prepare(
                `SELECT content_hash,COUNT(*) AS count,GROUP_CONCAT(id) AS ids
                 FROM asset_library WHERE user_id=? AND deleted_at IS NULL AND content_hash!=''
                 GROUP BY content_hash HAVING COUNT(*)>1 ORDER BY count DESC`
            )
            .all(req.currentUser.id)
            .map((row) => ({ hash: row.content_hash, count: row.count, ids: row.ids.split(',').map(Number) }));
        res.json({ ok: true, groups });
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
