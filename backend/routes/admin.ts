/**
 * Artifex — 管理员路由
 * 用量统计 + 用户管理
 */
'use strict';

import { Router, Request, Response } from 'express';
import type { User, UsageLog } from '../lib/types';

// ── 依赖接口 ──────────────────────────────────────────────

interface AdminUsersDb {
    getUserUsageStats(userId: number): UsageLog[];
    getUserUsageToday(userId: number): UsageLog[];
    getGlobalUsageSummary(): Record<string, unknown>;
    getGlobalUsageStats(): UsageLog[];
    getAllUsers(): User[];
}

interface AdminDeps {
    usersDb: AdminUsersDb;
    requireAuth: (req: Request, res: Response, next: () => void) => void;
    isAdminUser: (user: User | undefined) => boolean;
    csrfProtection?: (req: Request, res: Response, next: () => void) => void;
}

// ── 路由创建函数 ──────────────────────────────────────────

function createAdminRouter(deps: AdminDeps): Router {
    const router = Router();
    const { usersDb, requireAuth, isAdminUser, csrfProtection } = deps;

    // 用户自己的用量
    router.get('/me/usage', requireAuth, (req: Request, res: Response): void => {
        const stats: UsageLog[] = usersDb.getUserUsageStats(req.currentUser!.id);
        const today: UsageLog[] = usersDb.getUserUsageToday(req.currentUser!.id);
        res.json({ ok: true, stats, today });
    });

    // 管理员：全局用量
    router.get('/admin/usage', requireAuth, (req: Request, res: Response): void => {
        if (!isAdminUser(req.currentUser)) {
            res.status(403).json({ error: '权限不足' });
            return;
        }
        const summary: Record<string, unknown> = usersDb.getGlobalUsageSummary();
        const details: UsageLog[] = usersDb.getGlobalUsageStats();
        res.json({ ok: true, summary, details });
    });

    // 管理员：用户列表
    router.get('/admin/users', requireAuth, (req: Request, res: Response): void => {
        if (!isAdminUser(req.currentUser)) {
            res.status(403).json({ error: '权限不足' });
            return;
        }
        const users: User[] = usersDb.getAllUsers();
        res.json({ ok: true, users });
    });

    return router;
}

export { createAdminRouter };
