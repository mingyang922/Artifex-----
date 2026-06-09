/**
 * Artifex — 项目管理路由
 * 项目 CRUD + 项目素材
 */
'use strict';

import { Router, Request, Response } from 'express';
import type { User, Project, ProjectAsset } from '../lib/types';

// ── 依赖接口 ──────────────────────────────────────────────

interface ProjectUsersDb {
    getProjectCount(userId: number): number;
    getUserProjects(userId: number, limit: number, offset: number): Project[];
    createProject(userId: number, name: string, description: string, type: string): Project;
    updateProject(projectId: number, userId: number, updates: { name?: string; description?: string; type?: string; versionDesc?: string }): Project | null;
    getProject(projectId: number): Project | null;
    deleteProject(projectId: number, userId: number): void;
    addProjectAsset(projectId: string, userId: number, name: string, type: string, content: string): ProjectAsset;
    deleteProjectAsset(assetId: string, userId: number): void;
    addActivity(userId: number, action: string, targetType: string, targetId: number | string | null, details: string | null): void;
}

interface ProjectDeps {
    usersDb: ProjectUsersDb;
    requireAuth: (req: Request, res: Response, next: () => void) => void;
    csrfProtection: (req: Request, res: Response, next: () => void) => void;
}

// ── 路由创建函数 ──────────────────────────────────────────

function createProjectRouter(deps: ProjectDeps): Router {
    const router = Router();
    const { usersDb, requireAuth, csrfProtection } = deps;

    // 获取用户所有项目（支持分页）
    router.get('/projects', requireAuth, (req: Request, res: Response): void => {
        const page: number = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit: number = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
        const offset: number = (page - 1) * limit;
        const total: number = usersDb.getProjectCount(req.currentUser!.id);
        const projects: Project[] = usersDb.getUserProjects(req.currentUser!.id, limit, offset);
        res.json({ ok: true, projects, total, page, limit });
    });

    // 创建项目
    router.post('/projects', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const { name, description, type } = req.body || {};
        if (!name || !name.trim()) {
            res.status(400).json({ error: '项目名称不能为空' });
            return;
        }
        const project: Project = usersDb.createProject(req.currentUser!.id, name.trim(), description, type);
        try { usersDb.addActivity(req.currentUser!.id, '创建项目', 'project', project.id, name.trim()); } catch (_) { /* 活动日志非关键 */ }
        res.json({ ok: true, project });
    });

    // 更新项目
    router.put('/projects/:id', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const projectId: number = Number(req.params.id);
        if (!projectId || isNaN(projectId)) { res.status(400).json({ error: '无效的项目 ID' }); return; }
        const { name, description, type, versionDesc } = req.body || {};
        const project = usersDb.updateProject(projectId, req.currentUser!.id, { name, description, type, versionDesc });
        if (!project) {
            res.status(404).json({ error: '项目不存在' });
            return;
        }
        res.json({ ok: true, project });
    });

    // 删除项目
    router.delete('/projects/:id', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const projectId: number = Number(req.params.id);
        if (!projectId || isNaN(projectId)) { res.status(400).json({ error: '无效的项目 ID' }); return; }
        const project = usersDb.getProject(projectId);
        if (!project || project.user_id !== req.currentUser!.id) {
            res.status(404).json({ error: '项目不存在' });
            return;
        }
        usersDb.deleteProject(projectId, req.currentUser!.id);
        try { usersDb.addActivity(req.currentUser!.id, '删除项目', 'project', projectId, project.name); } catch (_) { /* 活动日志非关键 */ }
        res.json({ ok: true });
    });

    // 添加项目素材
    router.post('/projects/:id/assets', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const { name, type, content } = req.body || {};
        if (!name || !content) {
            res.status(400).json({ error: '素材名称和内容不能为空' });
            return;
        }
        // 限制单个素材内容大小不超过 10MB
        const MAX_ASSET_SIZE: number = 10 * 1024 * 1024;
        if (typeof content === 'string' && content.length > MAX_ASSET_SIZE) {
            res.status(413).json({ error: '素材内容过大，最大允许 10MB' });
            return;
        }

        // 图片格式验证
        if (typeof content === 'string' && content.startsWith('data:')) {
            const ALLOWED_MIME: string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
            const mimeMatch: RegExpMatchArray | null = content.match(/^data:([^;]+);base64,/);
            if (!mimeMatch) {
                res.status(400).json({ error: '无效的 data URL 格式' });
                return;
            }
            const claimedMime: string = mimeMatch[1].toLowerCase();
            if (!ALLOWED_MIME.includes(claimedMime)) {
                res.status(400).json({ error: `不支持的图片格式: ${claimedMime}，允许: ${ALLOWED_MIME.join(', ')}` });
                return;
            }
            // SVG 无需 magic bytes 验证
            if (claimedMime !== 'image/svg+xml') {
                const base64Data: string = content.substring(mimeMatch[0].length);
                const buf: Buffer = Buffer.from(base64Data.substring(0, 12), 'base64');
                if (buf.length < 4) {
                    res.status(400).json({ error: '图片数据过短，无法验证格式' });
                    return;
                }
                const validMagic: boolean =
                    (claimedMime === 'image/png'  && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) ||
                    (claimedMime === 'image/jpeg' && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) ||
                    (claimedMime === 'image/gif'  && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) ||
                    (claimedMime === 'image/webp' && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
                        buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50);
                if (!validMagic) {
                    res.status(400).json({ error: '图片文件头(magic bytes)与声明的格式不匹配' });
                    return;
                }
            }
        }

        const asset: ProjectAsset = usersDb.addProjectAsset(req.params.id as string, req.currentUser!.id, name, type, content);
        res.json({ ok: true, asset });
    });

    // 删除项目素材
    router.delete('/assets/:id', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        usersDb.deleteProjectAsset(req.params.id as string, req.currentUser!.id);
        res.json({ ok: true });
    });

    return router;
}

export { createProjectRouter };
