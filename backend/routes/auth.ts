/**
 * Artifex — 认证路由
 * 注册 / 登录 / 登出 / 用户信息 / API 设置
 */
'use strict';

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import type { User, UserProfile, ApiCredentials } from '../lib/types';

// 扩展 Express Session 类型
declare module 'express-session' {
    interface SessionData {
        userId: number;
    }
}

// ── 依赖接口 ──────────────────────────────────────────────

interface UsersDb {
    getUserByEmail(email: string): User | undefined;
    getUserByUsername(username: string): User | undefined;
    getUserById(id: number): User | undefined;
    createUser(username: string, email: string, hash: string): User;
    updatePassword(userId: number, hash: string): void;
    updateProfile(userId: number, profile: Partial<UserProfile>): void;
    getAllUserApiCredentials(userId: number): Record<string, ApiCredentials>;
    getUserApiCredentialStatus(userId: number): Record<string, boolean>;
    upsertUserApiCredentials(userId: number, provider: string, credentials: ApiCredentials): void;
    deleteUserApiCredentials(userId: number, provider: string): void;
    addActivity(userId: number, action: string, targetType: string, targetId: number | null, details: string | null): void;
}

interface AuthDeps {
    usersDb: UsersDb;
    requireAuth: (req: Request, res: Response, next: () => void) => void;
    isAdminUser: (user: User | undefined) => boolean;
    csrfProtection: (req: Request, res: Response, next: () => void) => void;
    sanitizeApiSettingsPayload: (provider: string, payload: Record<string, unknown> | null | undefined) => ApiCredentials | null;
}

// ── 公开用户信息接口 ──────────────────────────────────────

interface PublicUser {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
    profile: UserProfile;
}

// ── 路由创建函数 ──────────────────────────────────────────

function createAuthRouter(deps: AuthDeps): Router {
    const router = Router();
    const { usersDb, requireAuth, isAdminUser, csrfProtection, sanitizeApiSettingsPayload } = deps;

    // ── 工具函数 ──
    function publicUser(row: User | null | undefined): PublicUser | null {
        if (!row) return null;
        let profile: UserProfile = {};
        try { profile = JSON.parse(row.profile_json || '{}') as UserProfile; } catch { profile = {}; }
        return { id: row.id, username: row.username, email: row.email, role: row.role || 'user', created_at: row.created_at, profile };
    }

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        message: { error: '请求过于频繁，请 15 分钟后再试' },
        standardHeaders: true,
        legacyHeaders: false,
    });
    const passwordChangeLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { error: '密码修改请求过于频繁，请 15 分钟后再试' },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // ── 注册 ──
    router.post('/auth/register', csrfProtection, authLimiter, async (req: Request, res: Response): Promise<void> => {
        try {
            const { username, email, password } = req.body || {};
            if (!username || !email || !password) { res.status(400).json({ error: '请填写用户名、邮箱和密码' }); return; }
            if (String(password).length < 6) { res.status(400).json({ error: '密码至少 6 位' }); return; }
            // 用户名校验：只允许字母、数字、下划线、中文，2-32 字符
            const u = String(username).trim();
            if (u.length < 2 || u.length > 32) { res.status(400).json({ error: '用户名长度应为 2-32 字符' }); return; }
            if (!/^[\w一-鿿㐀-䶿]+$/.test(u)) { res.status(400).json({ error: '用户名只允许字母、数字、下划线和中文' }); return; }

            const em = String(email).trim().toLowerCase();
            if (usersDb.getUserByEmail(em)) { res.status(409).json({ error: '该邮箱已注册' }); return; }
            if (usersDb.getUserByUsername(u)) { res.status(409).json({ error: '该用户名已被使用' }); return; }

            const hash: string = await bcrypt.hash(String(password), 10);
            const row = usersDb.createUser(u, em, hash);
            req.session.regenerate((err: Error | null) => {
                if (err) { console.error('session regenerate', err); res.status(500).json({ error: '注册失败' }); return; }
                req.session.userId = row.id;
                res.json({ ok: true, user: publicUser(row) });
            });
        } catch (e) {
            console.error('register', e);
            res.status(500).json({ error: '注册失败' });
        }
    });

    // ── 登录 ──
    router.post('/auth/login', csrfProtection, authLimiter, async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body || {};
            const em = String(email || '').trim().toLowerCase();
            const row = usersDb.getUserByEmail(em);
            if (!row || !(await bcrypt.compare(String(password || ''), row.password_hash))) {
                res.status(401).json({ error: '邮箱或密码错误' });
                return;
            }
            req.session.regenerate((err: Error | null) => {
                if (err) { console.error('session regenerate', err); res.status(500).json({ error: '登录失败' }); return; }
                req.session.userId = row!.id;
                try { usersDb.addActivity(row!.id, '用户登录', 'auth', null, null); } catch (_) { /* 活动日志非关键 */ }
                res.json({ ok: true, user: publicUser(row) });
            });
        } catch (e) {
            console.error('login', e);
            res.status(500).json({ error: '登录失败' });
        }
    });

    // ── 登出 ──
    router.post('/auth/logout', csrfProtection, (req: Request, res: Response): void => {
        const cookieName = 'connect.sid';
        // clearCookie 必须传与 Set-Cookie 相同的选项，否则浏览器不会清除
        const cookieOpts: Record<string, unknown> = {
            httpOnly: true,
            sameSite: 'lax',
            secure: req.secure || req.protocol === 'https',
            path: '/',
        };
        req.session.destroy(() => {
            res.clearCookie(cookieName, cookieOpts);
            res.json({ ok: true });
        });
    });

    // ── 修改密码 ──
    router.post('/me/change-password', requireAuth, csrfProtection, passwordChangeLimiter, async (req: Request, res: Response): Promise<void> => {
        try {
            const { currentPassword, newPassword } = req.body || {};
            if (!currentPassword || !newPassword) {
                res.status(400).json({ error: '请填写当前密码和新密码' });
                return;
            }
            if (String(newPassword).length < 6) {
                res.status(400).json({ error: '新密码至少 6 位' });
                return;
            }
            // 验证当前密码
            const user = usersDb.getUserById(req.currentUser!.id);
            if (!user || !(await bcrypt.compare(String(currentPassword), user.password_hash))) {
                res.status(401).json({ error: '当前密码不正确' });
                return;
            }
            // 更新密码
            const hash: string = await bcrypt.hash(String(newPassword), 10);
            usersDb.updatePassword(req.currentUser!.id, hash);
            // 审计日志
            try { usersDb.addActivity(req.currentUser!.id, '修改密码', 'security', null, null); } catch (_) {}
            res.json({ ok: true, message: '密码修改成功' });
        } catch (e) {
            console.error('change-password', e);
            res.status(500).json({ error: '密码修改失败' });
        }
    });

    // ── 当前用户 ──
    router.get('/me', requireAuth, (req: Request, res: Response): void => {
        res.json(publicUser(req.currentUser));
    });

    // ── 更新资料 ──
    router.put('/me/profile', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const { profile } = req.body || {};
        if (!profile || typeof profile !== 'object') { res.status(400).json({ error: '无效资料' }); return; }
        // 限制 profile JSON 大小不超过 50KB
        const profileStr: string = JSON.stringify(profile);
        if (profileStr.length > 50 * 1024) {
            res.status(400).json({ error: '资料数据过大' });
            return;
        }
        // 字段白名单：只允许更新预期的字段
        const ALLOWED_FIELDS: string[] = ['nickname', 'gender', 'bio', 'country', 'language', 'avatar', 'settings'];
        const sanitized: Record<string, unknown> = {};
        for (const key of ALLOWED_FIELDS) {
            if (profile[key] !== undefined) sanitized[key] = profile[key];
        }
        usersDb.updateProfile(req.currentUser!.id, sanitized as Partial<UserProfile>);
        res.json({ ok: true });
    });

    // ── 获取 API 设置 ──
    router.get('/me/api-settings', requireAuth, (req: Request, res: Response): void => {
        const settings = usersDb.getAllUserApiCredentials(req.currentUser!.id);
        const masked: Record<string, ApiCredentials> = {};
        Object.entries(settings).forEach(([provider, value]) => {
            const next: ApiCredentials = { ...value };
            if (next.apiKey) next.apiKey = `***${String(next.apiKey).slice(-4)}`;
            if (next.secretKey) next.secretKey = `***${String(next.secretKey).slice(-4)}`;
            if (next.secretId) next.secretId = `***${String(next.secretId).slice(-4)}`;
            masked[provider] = next;
        });
        res.json({ ok: true, isAdmin: isAdminUser(req.currentUser), settings: masked });
    });

    // ── API 设置状态 ──
    router.get('/me/api-settings/status', requireAuth, (req: Request, res: Response): void => {
        res.json({
            ok: true,
            isAdmin: isAdminUser(req.currentUser),
            status: usersDb.getUserApiCredentialStatus(req.currentUser!.id),
        });
    });

    // ── 更新 API 设置 ──
    router.put('/me/api-settings', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const provider: string = String((req.body && req.body.provider) || '').trim().toLowerCase();
        const credentials = sanitizeApiSettingsPayload(provider, req.body && req.body.credentials);
        if (!provider || !credentials) {
            res.status(400).json({ error: '参数错误', message: 'provider 或 credentials 无效' });
            return;
        }
        usersDb.upsertUserApiCredentials(req.currentUser!.id, provider, credentials);
        // 审计日志
        try { usersDb.addActivity(req.currentUser!.id, '更新 API 密钥: ' + provider, 'security', null, provider); } catch (_) {}
        res.json({ ok: true, provider, configured: true });
    });

    // ── 验证 API 密钥 ──
    router.post('/me/api-settings/validate', requireAuth, csrfProtection, async (req: Request, res: Response): Promise<void> => {
        const provider: string = String((req.body && req.body.provider) || '').trim().toLowerCase();
        const credentials = sanitizeApiSettingsPayload(provider, req.body && req.body.credentials);
        if (!provider || !credentials) {
            res.status(400).json({ error: '参数错误', message: 'provider 或 credentials 无效' });
            return;
        }

        // 各 provider 的简单验证
        try {
            let valid = false;
            let message = '';

            if (provider === 'jimeng') {
                // 即梦：检查 API Key 格式
                const key = credentials.apiKey || '';
                valid = key.length >= 10;
                message = valid ? 'API Key 格式正确' : 'API Key 格式不正确';
            } else if (provider === 'alibaba') {
                // 阿里云：检查 API Key 格式
                const key = credentials.apiKey || '';
                valid = key.startsWith('sk-') && key.length > 10;
                message = valid ? 'API Key 格式正确' : 'API Key 应以 sk- 开头';
            } else if (provider === 'tencent') {
                // 腾讯云：检查 SecretId 和 SecretKey
                const id = credentials.secretId || '';
                const key = credentials.secretKey || '';
                valid = id.startsWith('AKID') && key.length > 10;
                message = valid ? '密钥格式正确' : 'SecretId 应以 AKID 开头';
            } else if (provider === 'sdwebui') {
                // SD WebUI：检查 URL 格式
                const url = credentials.baseUrl || '';
                valid = url.startsWith('http');
                message = valid ? '地址格式正确' : '请输入有效的 URL';
            } else {
                res.status(400).json({ error: '不支持的服务商', message: `未知的 provider: ${provider}` });
                return;
            }

            res.json({ ok: true, valid, message, provider });
        } catch (err: any) {
            res.json({ ok: true, valid: false, message: '验证失败: ' + err.message, provider });
        }
    });

    // ── 删除 API 设置 ──
    router.delete('/me/api-settings/:provider', requireAuth, csrfProtection, (req: Request, res: Response): void => {
        const provider: string = String(req.params.provider || '').trim().toLowerCase();
        usersDb.deleteUserApiCredentials(req.currentUser!.id, provider);
        // 审计日志
        try { usersDb.addActivity(req.currentUser!.id, '删除 API 密钥: ' + provider, 'security', null, provider); } catch (_) {}
        res.json({ ok: true, provider, configured: false });
    });

    return router;
}

export { createAuthRouter };
