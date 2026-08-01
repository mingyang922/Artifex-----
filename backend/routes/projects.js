/**
 * Artifex — 项目管理路由
 * 项目 CRUD + 项目素材
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
function createProjectRouter(deps) {
    const router = Router();
    const { usersDb, workspaceDb, requireAuth, csrfProtection } = deps;

    // 获取用户所有项目（支持分页）
    router.get('/projects', requireAuth, (req, res) => {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;
        const total = usersDb.getProjectCount(req.currentUser.id);
        const projects =
            req.query.summary === '1'
                ? usersDb.getUserProjectSummaries(req.currentUser.id, limit, offset)
                : usersDb.getUserProjects(req.currentUser.id, limit, offset);
        res.json({ ok: true, projects, total, page, limit });
    });

    // 创建项目
    router.post('/projects', requireAuth, csrfProtection, (req, res) => {
        const { name, description, type } = req.body || {};
        if (!name || !String(name).trim()) {
            return sendError(res, 400, ERR.VALIDATION, '项目名称不能为空');
        }
        if (String(name).trim().length > 120 || String(description || '').length > 5000) {
            return sendError(res, 400, ERR.VALIDATION, '项目名称或描述过长');
        }
        const project = usersDb.createProject(req.currentUser.id, name.trim(), description, type);
        workspaceDb?.captureProjectVersion(project.id);
        try {
            usersDb.addActivity(req.currentUser.id, '创建项目', 'project', project.id, name.trim());
        } catch (_) {
            /* 活动日志非关键 */
        }
        res.json({ ok: true, project });
    });

    // 更新项目
    router.put('/projects/:id', requireAuth, csrfProtection, (req, res) => {
        const projectId = Number(req.params.id);
        if (!projectId || isNaN(projectId)) return sendError(res, 400, ERR.VALIDATION, '无效的项目 ID');
        const { name, description, type, versionDesc } = req.body || {};
        if (
            (name !== undefined && (!String(name).trim() || String(name).trim().length > 120)) ||
            String(description || '').length > 5000
        ) {
            return sendError(res, 400, ERR.VALIDATION, '项目名称或描述无效');
        }
        const project = usersDb.updateProject(projectId, req.currentUser.id, { name, description, type, versionDesc });
        if (!project) {
            return sendError(res, 404, ERR.NOT_FOUND, '项目不存在');
        }
        workspaceDb?.captureProjectVersion(project.id);
        res.json({ ok: true, project });
    });

    // 删除项目
    router.delete('/projects/:id', requireAuth, csrfProtection, (req, res) => {
        const projectId = Number(req.params.id);
        if (!projectId || isNaN(projectId)) return sendError(res, 400, ERR.VALIDATION, '无效的项目 ID');
        const project = usersDb.getProject(projectId);
        if (!project || project.user_id !== req.currentUser.id) {
            return sendError(res, 404, ERR.NOT_FOUND, '项目不存在');
        }
        usersDb.deleteProject(projectId, req.currentUser.id);
        try {
            usersDb.addActivity(req.currentUser.id, '删除项目', 'project', projectId, project.name);
        } catch (_) {
            /* 活动日志非关键 */
        }
        res.json({ ok: true });
    });

    // 添加项目素材
    router.post('/projects/:id/assets', requireAuth, csrfProtection, (req, res) => {
        const projectId = Number(req.params.id);
        if (!projectId || isNaN(projectId)) return sendError(res, 400, ERR.VALIDATION, '无效的项目 ID');
        const project = usersDb.getProject(projectId);
        if (!project || project.user_id !== req.currentUser.id) {
            return sendError(res, 404, ERR.NOT_FOUND, '项目不存在');
        }
        const { name, type, content } = req.body || {};
        const validationError = validateAssetPayload({ name, type, content }, { requireContent: true });
        if (validationError) return sendError(res, 400, ERR.VALIDATION, validationError);

        // 图片格式验证
        if (typeof content === 'string' && content.startsWith('data:')) {
            const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
            const mimeMatch = content.match(/^data:([^;]+);base64,/);
            if (!mimeMatch) {
                return sendError(res, 400, ERR.VALIDATION, '无效的 data URL 格式');
            }
            const claimedMime = mimeMatch[1].toLowerCase();
            if (!ALLOWED_MIME.includes(claimedMime)) {
                return sendError(
                    res,
                    400,
                    ERR.VALIDATION,
                    `不支持的图片格式: ${claimedMime}，允许: ${ALLOWED_MIME.join(', ')}`
                );
            }
            // SVG 无需 magic bytes 验证
            if (claimedMime !== 'image/svg+xml') {
                const base64Data = content.substring(mimeMatch[0].length);
                const buf = Buffer.from(base64Data.substring(0, 12), 'base64');
                if (buf.length < 4) {
                    return sendError(res, 400, ERR.VALIDATION, '图片数据过短，无法验证格式');
                }
                const validMagic =
                    (claimedMime === 'image/png' &&
                        buf[0] === 0x89 &&
                        buf[1] === 0x50 &&
                        buf[2] === 0x4e &&
                        buf[3] === 0x47) ||
                    (claimedMime === 'image/jpeg' && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
                    (claimedMime === 'image/gif' && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) ||
                    (claimedMime === 'image/webp' &&
                        buf[0] === 0x52 &&
                        buf[1] === 0x49 &&
                        buf[2] === 0x46 &&
                        buf[3] === 0x46 &&
                        buf.length >= 12 &&
                        buf[8] === 0x57 &&
                        buf[9] === 0x45 &&
                        buf[10] === 0x42 &&
                        buf[11] === 0x50);
                if (!validMagic) {
                    return sendError(res, 400, ERR.VALIDATION, '图片文件头(magic bytes)与声明的格式不匹配');
                }
            }
        }

        const asset = usersDb.addProjectAsset(projectId, req.currentUser.id, name, type, content);
        usersDb.updateProject(projectId, req.currentUser.id, { versionDesc: `添加素材：${String(name).slice(0, 80)}` });
        workspaceDb?.captureProjectVersion(projectId);
        res.json({ ok: true, asset });
    });

    // 删除项目素材
    router.delete('/assets/:id', requireAuth, csrfProtection, (req, res) => {
        const assetId = Number(req.params.id);
        if (!assetId || isNaN(assetId)) return sendError(res, 400, ERR.VALIDATION, '无效的素材 ID');
        const asset = usersDb
            .getDb()
            .prepare('SELECT id,project_id,name FROM project_assets WHERE id=? AND user_id=?')
            .get(assetId, req.currentUser.id);
        if (!asset) return sendError(res, 404, ERR.NOT_FOUND, '素材不存在');
        usersDb.deleteProjectAsset(assetId, req.currentUser.id);
        usersDb.updateProject(asset.project_id, req.currentUser.id, {
            versionDesc: `删除素材：${String(asset.name).slice(0, 80)}`,
        });
        workspaceDb?.captureProjectVersion(asset.project_id);
        res.json({ ok: true });
    });

    // ── 全局错误处理 ──
    router.use((err, req, res, _next) => {
        logger.error('[projects] 未处理的路由错误:', err);
        if (!res.headersSent) {
            sendError(res, 500, ERR.INTERNAL, '服务器内部错误');
        }
    });

    return router;
}

module.exports = { createProjectRouter };
