/**
 * Artifex — 认证路由
 * 注册 / 登录 / 登出 / 用户信息 / API 设置
 */
'use strict';

const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { sendError, ERR } = require('../lib/error-response');
const logger = require('../lib/logger');

/** 包装异步路由处理器，捕获未处理的 Promise 拒绝 */
function wrapAsync(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * @param {object} deps
 * @param {object} deps.usersDb
 * @param {Function} deps.requireAuth
 * @param {Function} deps.isAdminUser
 * @param {Function} deps.csrfProtection
 * @param {Function} deps.sanitizeApiSettingsPayload
 * @returns {import('express').Router}
 */
function createAuthRouter(deps) {
    const { Router } = require('express');
    const router = Router();
    const { usersDb, requireAuth, isAdminUser, csrfProtection, sanitizeApiSettingsPayload, workspaceDb } = deps;

    // ── 工具函数 ──
    function publicUser(row) {
        if (!row) return null;
        let profile = {};
        try {
            profile = JSON.parse(row.profile_json || '{}');
        } catch {
            profile = {};
        }
        return {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role || 'user',
            created_at: row.created_at,
            profile,
        };
    }

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: process.env.NODE_ENV === 'test' ? 10000 : 20,
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
    router.post(
        '/auth/register',
        csrfProtection,
        authLimiter,
        wrapAsync(async (req, res) => {
            try {
                if (String(process.env.REGISTRATION_ENABLED || 'true').toLowerCase() === 'false') {
                    return sendError(res, 403, ERR.FORBIDDEN, '当前站点已关闭公开注册');
                }
                const { username, email, password } = req.body || {};
                if (!username || !email || !password)
                    return sendError(res, 400, ERR.VALIDATION, '请填写用户名、邮箱和密码');
                if (String(password).length < 8 || String(password).length > 128) {
                    return sendError(res, 400, ERR.VALIDATION, '密码长度应为 8-128 位');
                }
                // 用户名校验：只允许字母、数字、下划线、中文，2-32 字符
                const u = String(username).trim();
                if (u.length < 2 || u.length > 32)
                    return sendError(res, 400, ERR.VALIDATION, '用户名长度应为 2-32 字符');
                if (!/^[\w一-鿿㐀-䶿]+$/.test(u))
                    return sendError(res, 400, ERR.VALIDATION, '用户名只允许字母、数字、下划线和中文');

                const em = String(email).trim().toLowerCase();
                if (em.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
                    return sendError(res, 400, ERR.VALIDATION, '请输入有效的邮箱地址');
                }
                if (usersDb.getUserByEmail(em)) return sendError(res, 409, ERR.CONFLICT, '该邮箱已注册');
                if (usersDb.getUserByUsername(u)) return sendError(res, 409, ERR.CONFLICT, '该用户名已被使用');

                const hash = await bcrypt.hash(String(password), 10);
                const row = usersDb.createUser(u, em, hash);
                req.session.regenerate((err) => {
                    if (err) {
                        logger.error('session regenerate', err);
                        return sendError(res, 500, ERR.INTERNAL, '注册失败');
                    }
                    req.session.userId = row.id;
                    res.json({ ok: true, user: publicUser(row) });
                });
            } catch (e) {
                logger.error('register', e);
                sendError(res, 500, ERR.INTERNAL, '注册失败');
            }
        })
    );

    // ── 登录 ──
    router.post(
        '/auth/login',
        csrfProtection,
        authLimiter,
        wrapAsync(async (req, res) => {
            try {
                const { email, password } = req.body || {};
                const em = String(email || '')
                    .trim()
                    .toLowerCase();
                const row = usersDb.getUserByEmail(em);
                if (!row || !(await bcrypt.compare(String(password || ''), row.password_hash))) {
                    return sendError(res, 401, ERR.AUTH_REQUIRED, '邮箱或密码错误');
                }
                req.session.regenerate((err) => {
                    if (err) {
                        logger.error('session regenerate', err);
                        return sendError(res, 500, ERR.INTERNAL, '登录失败');
                    }
                    req.session.userId = row.id;
                    try {
                        usersDb.addActivity(row.id, '用户登录', 'auth', null, null);
                    } catch (_) {
                        /* 活动日志非关键 */
                    }
                    res.json({ ok: true, user: publicUser(row) });
                });
            } catch (e) {
                logger.error('login', e);
                sendError(res, 500, ERR.INTERNAL, '登录失败');
            }
        })
    );

    // ── 登出 ──
    router.post('/auth/logout', csrfProtection, (req, res) => {
        const cookieName = req.session?.cookie?.name || 'connect.sid';
        // clearCookie 必须传与 Set-Cookie 相同的选项，否则浏览器不会清除
        const cookieOpts = {
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

    // ── 密码重置 ──
    router.post(
        '/auth/forgot-password',
        csrfProtection,
        authLimiter,
        wrapAsync(async (req, res) => {
            const email = String(req.body?.email || '')
                .trim()
                .toLowerCase();
            const reset = workspaceDb?.requestPasswordReset(email);
            if (reset) {
                const resetUrl = `${req.protocol}://${req.get('host')}/login.html?resetToken=${encodeURIComponent(reset.token)}`;
                const webhook = String(process.env.PASSWORD_RESET_WEBHOOK_URL || '').trim();
                if (webhook) {
                    try {
                        await fetch(webhook, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                event: 'password_reset',
                                email: reset.email,
                                resetUrl,
                                expiresAt: reset.expiresAt,
                            }),
                        });
                    } catch (error) {
                        logger.error('[password-reset] webhook delivery failed:', error.message);
                    }
                }
                // 本地/测试环境直接返回令牌，方便离线部署验证；生产环境不会泄露令牌。
                if (process.env.NODE_ENV !== 'production') {
                    return res.json({ ok: true, message: '重置请求已创建', resetToken: reset.token, resetUrl });
                }
            }
            res.json({ ok: true, message: '如果该邮箱已注册，重置说明将会发送' });
        })
    );

    router.post(
        '/auth/reset-password',
        csrfProtection,
        authLimiter,
        wrapAsync(async (req, res) => {
            const value = String(req.body?.token || '');
            const password = String(req.body?.newPassword || '');
            if (password.length < 8) return sendError(res, 400, ERR.VALIDATION, '新密码至少 8 位');
            const userId = workspaceDb?.consumePasswordReset(value);
            if (!userId) return sendError(res, 400, ERR.VALIDATION, '重置链接无效或已过期');
            usersDb.updatePassword(userId, await bcrypt.hash(password, 10));
            usersDb.addActivity(userId, '通过重置链接修改密码', 'security', null, null);
            res.json({ ok: true, message: '密码已重置，请重新登录' });
        })
    );

    // ── 修改密码 ──
    router.post(
        '/me/change-password',
        requireAuth,
        csrfProtection,
        passwordChangeLimiter,
        wrapAsync(async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body || {};
                if (!currentPassword || !newPassword) {
                    return sendError(res, 400, ERR.VALIDATION, '请填写当前密码和新密码');
                }
                if (String(newPassword).length < 6) {
                    return sendError(res, 400, ERR.VALIDATION, '新密码至少 6 位');
                }
                // 验证当前密码
                const user = usersDb.getUserById(req.currentUser.id);
                if (!user || !(await bcrypt.compare(String(currentPassword), user.password_hash))) {
                    return sendError(res, 401, ERR.AUTH_REQUIRED, '当前密码不正确');
                }
                // 更新密码
                const hash = await bcrypt.hash(String(newPassword), 10);
                usersDb.updatePassword(req.currentUser.id, hash);
                // 审计日志
                try {
                    usersDb.addActivity(req.currentUser.id, '修改密码', 'security', null, null);
                } catch (_) {
                    /* 活动日志非关键 */
                }
                res.json({ ok: true, message: '密码修改成功' });
            } catch (e) {
                logger.error('change-password', e);
                sendError(res, 500, ERR.INTERNAL, '密码修改失败');
            }
        })
    );

    // ── 当前用户 ──
    router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.currentUser)));

    // ── 更新资料 ──
    router.put('/me/profile', requireAuth, csrfProtection, (req, res) => {
        const { profile } = req.body || {};
        if (!profile || typeof profile !== 'object') return sendError(res, 400, ERR.VALIDATION, '无效资料');
        // 限制 profile JSON 大小不超过 50KB
        const profileStr = JSON.stringify(profile);
        if (profileStr.length > 50 * 1024) {
            return sendError(res, 400, ERR.VALIDATION, '资料数据过大');
        }
        // 字段白名单：只允许更新预期的字段
        const ALLOWED_FIELDS = ['nickname', 'gender', 'bio', 'country', 'language', 'avatar', 'settings'];
        const sanitized = {};
        for (const key of ALLOWED_FIELDS) {
            if (profile[key] !== undefined) sanitized[key] = profile[key];
        }
        usersDb.updateProfile(req.currentUser.id, sanitized);
        res.json({ ok: true });
    });

    // ── 获取 API 设置 ──
    router.get('/me/api-settings', requireAuth, (req, res) => {
        const settings = usersDb.getAllUserApiCredentials(req.currentUser.id);
        const masked = {};
        Object.entries(settings).forEach(([provider, value]) => {
            const next = { ...value };
            if (next.apiKey) next.apiKey = `***${String(next.apiKey).slice(-4)}`;
            if (next.secretKey) next.secretKey = `***${String(next.secretKey).slice(-4)}`;
            if (next.secretId) next.secretId = `***${String(next.secretId).slice(-4)}`;
            masked[provider] = next;
        });
        res.json({ ok: true, isAdmin: isAdminUser(req.currentUser), settings: masked });
    });

    // ── API 设置状态 ──
    router.get('/me/api-settings/status', requireAuth, (req, res) => {
        res.json({
            ok: true,
            isAdmin: isAdminUser(req.currentUser),
            status: usersDb.getUserApiCredentialStatus(req.currentUser.id),
        });
    });

    // ── 更新 API 设置 ──
    router.put('/me/api-settings', requireAuth, csrfProtection, (req, res) => {
        const provider = String((req.body && req.body.provider) || '')
            .trim()
            .toLowerCase();
        const credentials = sanitizeApiSettingsPayload(provider, req.body && req.body.credentials);
        if (!provider || !credentials) {
            return sendError(res, 400, ERR.VALIDATION, 'provider 或 credentials 无效');
        }
        usersDb.upsertUserApiCredentials(req.currentUser.id, provider, credentials);
        // 审计日志
        try {
            usersDb.addActivity(req.currentUser.id, '更新 API 密钥: ' + provider, 'security', null, provider);
        } catch (_) {
            /* 活动日志非关键 */
        }
        res.json({ ok: true, provider, configured: true });
    });

    // ── 验证 API 密钥 ──
    router.post(
        '/me/api-settings/validate',
        requireAuth,
        csrfProtection,
        wrapAsync(async (req, res) => {
            const provider = String((req.body && req.body.provider) || '')
                .trim()
                .toLowerCase();
            const credentials = sanitizeApiSettingsPayload(provider, req.body && req.body.credentials);
            if (!provider || !credentials) {
                return sendError(res, 400, ERR.VALIDATION, 'provider 或 credentials 无效');
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
                    return sendError(res, 400, ERR.VALIDATION, `不支持的服务商: ${provider}`);
                }

                res.json({ ok: true, valid, message, provider });
            } catch (err) {
                res.json({ ok: true, valid: false, message: '验证失败: ' + err.message, provider });
            }
        })
    );

    // ── 删除 API 设置 ──
    router.delete('/me/api-settings/:provider', requireAuth, csrfProtection, (req, res) => {
        const provider = String(req.params.provider || '')
            .trim()
            .toLowerCase();
        usersDb.deleteUserApiCredentials(req.currentUser.id, provider);
        // 审计日志
        try {
            usersDb.addActivity(req.currentUser.id, '删除 API 密钥: ' + provider, 'security', null, provider);
        } catch (_) {
            /* 活动日志非关键 */
        }
        res.json({ ok: true, provider, configured: false });
    });

    // ── 全局错误处理（捕获 wrapAsync 未处理的异步错误） ──
    router.use((err, req, res, _next) => {
        logger.error('[auth] 未处理的路由错误:', err);
        if (!res.headersSent) {
            sendError(res, 500, ERR.INTERNAL, '服务器内部错误');
        }
    });

    return router;
}

module.exports = { createAuthRouter };
