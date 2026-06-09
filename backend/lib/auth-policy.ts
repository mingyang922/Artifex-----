/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

import { Request, Response, NextFunction } from 'express';
import { User } from './types';

// 扩展 Express Session 类型
declare module 'express-session' {
    interface SessionData {
        userId: number;
    }
}

interface UsersDb {
    getUserById(id: number): User | undefined;
}

interface AuthPolicyResult {
    requireAuth: (req: Request, res: Response, next: NextFunction) => void;
    isAdminUser: (row: User | null | undefined) => boolean;
}

function createAuthPolicy(usersDb: UsersDb): AuthPolicyResult {
    // 短 TTL 缓存，减少每次 API 请求都查库
    const USER_CACHE_TTL = 5000; // 5 秒
    const userCache = new Map<number, { user: User; expireAt: number }>();

    function getCachedUser(userId: number): User | undefined {
        const entry = userCache.get(userId);
        if (entry && Date.now() < entry.expireAt) {
            return entry.user;
        }
        const user = usersDb.getUserById(userId);
        if (user) {
            userCache.set(userId, { user, expireAt: Date.now() + USER_CACHE_TTL });
        }
        return user;
    }

    function requireAuth(req: Request, res: Response, next: NextFunction): void {
        if (!req.session.userId) {
            res.status(401).json({ error: '未登录' });
            return;
        }
        const row = getCachedUser(req.session.userId);
        if (!row) {
            res.status(401).json({ error: '未登录' });
            return;
        }
        req.currentUser = row;
        next();
    }

    function isAdminUser(row: User | null | undefined): boolean {
        if (!row) return false;
        // 仅信任 users 表 role 列，不从 profile_json 读取（防止权限提升）
        return row.role === 'admin';
    }

    return {
        requireAuth,
        isAdminUser,
    };
}

export { createAuthPolicy };
