/**
 * Artifex — 认证路由
 * 注册 / 登录 / 登出 / 用户信息 / API 设置
 */
'use strict';

const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

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
    const { usersDb, requireAuth, isAdminUser, csrfProtection, sanitizeApiSettingsPayload } = deps;

    // ── 工具函数 ──
    function publicUser(row) {
        if (!row) return null;
        let profile = {};
        try { profile = JSON.parse(row.profile_json || '{}'); } catch { profile = {}; }
        return { id: row.id, username: row.username, email: row.email, created_at: row.created_at, profile };
    }

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        message: { error: '请求过于频繁，请 15 分钟后再试' },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // ── 注册 ──
    router.post('/auth/register', csrfProtection, authLimiter, async (req, res) => {
        try {
            const { username, email, password } = req.body || {};
            if (!username || !email || !password) return res.status(400).json({ error: '请填写用户名、邮箱和密码' });
            if (String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' });

            const u = String(username).trim();
            const em = String(email).trim().toLowerCase();
            if (usersDb.getUserByEmail(em)) return res.status(409).json({ error: '该邮箱已注册' });
            if (usersDb.getUserByUsername(u)) return res.status(409).json({ error: '该用户名已被使用' });

            const hash = await bcrypt.hash(String(password), 10);
            const row = usersDb.createUser(u, em, hash);
            req.session.regenerate((err) => {
                if (err) { console.error('session regenerate', err); return res.status(500).json({ error: '注册失败' }); }
                req.session.userId = row.id;
                res.json({ ok: true, user: publicUser(row) });
            });
        } catch (e) {
            console.error('register', e);
            res.status(500).json({ error: '注册失败' });
        }
    });

    // ── 登录 ──
    router.post('/auth/login', csrfProtection, authLimiter, async (req, res) => {
        try {
            const { email, password } = req.body || {};
            const em = String(email || '').trim().toLowerCase();
            const row = usersDb.getUserByEmail(em);
            if (!row || !(await bcrypt.compare(String(password || ''), row.password_hash))) {
                return res.status(401).json({ error: '邮箱或密码错误' });
            }
            req.session.regenerate((err) => {
                if (err) { console.error('session regenerate', err); return res.status(500).json({ error: '登录失败' }); }
                req.session.userId = row.id;
                res.json({ ok: true, user: publicUser(row) });
            });
        } catch (e) {
            console.error('login', e);
            res.status(500).json({ error: '登录失败' });
        }
    });

    // ── 登出 ──
    router.post('/auth/logout', (req, res) => {
        req.session.destroy(() => res.json({ ok: true }));
    });

    // ── 修改密码 ──
    router.post('/me/change-password', requireAuth, csrfProtection, async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body || {};
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: '请填写当前密码和新密码' });
            }
            if (String(newPassword).length < 6) {
                return res.status(400).json({ error: '新密码至少 6 位' });
            }
            // 验证当前密码
            const user = usersDb.getUserById(req.currentUser.id);
            if (!user || !(await bcrypt.compare(String(currentPassword), user.password_hash))) {
                return res.status(401).json({ error: '当前密码不正确' });
            }
            // 更新密码
            const hash = await bcrypt.hash(String(newPassword), 10);
            usersDb.updatePassword(req.currentUser.id, hash);
            res.json({ ok: true, message: '密码修改成功' });
        } catch (e) {
            console.error('change-password', e);
            res.status(500).json({ error: '密码修改失败' });
        }
    });

    // ── 当前用户 ──
    router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.currentUser)));

    // ── 更新资料 ──
    router.put('/me/profile', requireAuth, csrfProtection, (req, res) => {
        const { profile } = req.body || {};
        if (!profile || typeof profile !== 'object') return res.status(400).json({ error: '无效资料' });
        usersDb.updateProfile(req.currentUser.id, profile);
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
        const provider = String((req.body && req.body.provider) || '').trim().toLowerCase();
        const credentials = sanitizeApiSettingsPayload(provider, req.body && req.body.credentials);
        if (!provider || !credentials) {
            return res.status(400).json({ error: '参数错误', message: 'provider 或 credentials 无效' });
        }
        usersDb.upsertUserApiCredentials(req.currentUser.id, provider, credentials);
        res.json({ ok: true, provider, configured: true });
    });

    // ── 验证 API 密钥 ──
    router.post('/me/api-settings/validate', requireAuth, csrfProtection, async (req, res) => {
        const provider = String((req.body && req.body.provider) || '').trim().toLowerCase();
        const credentials = sanitizeApiSettingsPayload(provider, req.body && req.body.credentials);
        if (!provider || !credentials) {
            return res.status(400).json({ error: '参数错误', message: 'provider 或 credentials 无效' });
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
                return res.status(400).json({ error: '不支持的服务商', message: `未知的 provider: ${provider}` });
            }

            res.json({ ok: true, valid, message, provider });
        } catch (err) {
            res.json({ ok: true, valid: false, message: '验证失败: ' + err.message, provider });
        }
    });

    // ── 删除 API 设置 ──
    router.delete('/me/api-settings/:provider', requireAuth, csrfProtection, (req, res) => {
        const provider = String(req.params.provider || '').trim().toLowerCase();
        usersDb.deleteUserApiCredentials(req.currentUser.id, provider);
        res.json({ ok: true, provider, configured: false });
    });

    return router;
}

module.exports = { createAuthRouter };
