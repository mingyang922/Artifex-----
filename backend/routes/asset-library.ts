/**
 * Artifex — 素材库路由
 * 用户素材库 CRUD
 */
'use strict';

import { Router, Request, Response } from 'express';
import type { User, AssetLibraryItem } from '../lib/types';

// ── 依赖接口 ──────────────────────────────────────────────

interface AssetLibraryUsersDb {
    getAssetLibraryCount(userId: number): number;
    getAssetLibrary(userId: number, limit: number, offset: number): AssetLibraryItem[];
    addAssetLibraryItem(userId: number, item: { name: string; type: string; content: string; desc?: string; source?: string; tags?: string }): AssetLibraryItem;
    updateAssetLibraryItem(userId: number, assetId: number, updates: Partial<AssetLibraryItem>): AssetLibraryItem | null;
    deleteAssetLibraryItem(userId: number, assetId: number): void;
    addActivity(userId: number, action: string, targetType: string, targetId: number | null, details: string | null): void;
}

interface AssetLibraryDeps {
    usersDb: AssetLibraryUsersDb;
    requireAuth: (req: Request, res: Response, next: () => void) => void;
    csrfProtection: (req: Request, res: Response, next: () => void) => void;
}

// ── 路由创建函数 ──────────────────────────────────────────

function createAssetLibraryRouter(deps: AssetLibraryDeps): Router {
    const router = Router();
    const { usersDb, requireAuth, csrfProtection } = deps;

    // 获取用户素材库（支持分页）
    router.get('/asset-library', requireAuth, (req: Request, res: Response): void => {
        const page: number = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit: number = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
        const offset: number = (page - 1) * limit;
        const total: number = usersDb.getAssetLibraryCount(req.currentUser!.id);
        const assets: AssetLibraryItem[] = usersDb.getAssetLibrary(req.currentUser!.id, limit, offset);
        res.json({ ok: true, assets, total, page, limit });
    });

    // 添加素材
    router.post('/asset-library', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const { name, type, content, desc, source, tags } = req.body || {};
        if (!name || !content) {
            res.status(400).json({ error: '素材名称和内容不能为空' });
            return;
        }
        const MAX_ASSET_SIZE: number = 10 * 1024 * 1024;
        if (typeof content === 'string' && content.length > MAX_ASSET_SIZE) {
            res.status(413).json({ error: '素材内容过大，最大允许 10MB' });
            return;
        }
        const item: AssetLibraryItem = usersDb.addAssetLibraryItem(req.currentUser!.id, { name, type, content, desc, source, tags });
        try { usersDb.addActivity(req.currentUser!.id, '保存素材', 'asset', item.id, name); } catch (_) { /* 活动日志非关键 */ }
        res.json({ ok: true, item });
    });

    // 更新素材
    router.put('/asset-library/:id', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const assetId: number = Number(req.params.id);
        if (!assetId || isNaN(assetId)) { res.status(400).json({ error: '无效的素材 ID' }); return; }
        const updates: Partial<AssetLibraryItem> = req.body || {};
        const item = usersDb.updateAssetLibraryItem(req.currentUser!.id, assetId, updates);
        if (!item) {
            res.status(404).json({ error: '素材不存在' });
            return;
        }
        res.json({ ok: true, item });
    });

    // 删除素材
    router.delete('/asset-library/:id', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const assetId: number = Number(req.params.id);
        if (!assetId || isNaN(assetId)) { res.status(400).json({ error: '无效的素材 ID' }); return; }
        usersDb.deleteAssetLibraryItem(req.currentUser!.id, assetId);
        res.json({ ok: true });
    });

    return router;
}

export { createAssetLibraryRouter };
