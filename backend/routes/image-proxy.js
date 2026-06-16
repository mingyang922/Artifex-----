/**
 * Artifex — 图片生成路由
 * 从 proxy.js 提取，统一处理文生图 / 图生图 / 图片代理
 */
'use strict';

const axios = require('axios');
const dns = require('dns').promises;
const { generateMockImage, callFreeImageAPI } = require('../lib/utils');
const { imageGenerationLimiter } = require('../lib/rate-limiter');
const usersDbForActivity = require('../db/users-db');
const tencentProvider = require('../providers/tencent');
const alibabaProvider = require('../providers/alibaba');
const jimengProvider = require('../providers/jimeng');
const sdWebUiProvider = require('../providers/sd-webui');

/**
 * 创建图片相关路由
 * @param {object} deps
 * @param {Function} deps.requireAuth - 认证中间件
 * @param {Function} deps.csrfProtection - CSRF 中间件
 * @param {Function} deps.isAdminUser - 管理员判断
 * @param {Function} deps.getUserProviderConfig - 获取用户 provider 配置
 * @param {Function} deps.logApiCall - 记录 API 调用
 * @param {Function} deps.checkQuota - 检查配额
 * @returns {import('express').Router}
 */
function createImageRouter(deps) {
    const { Router } = require('express');
    const router = Router();
    const { requireAuth, csrfProtection, isAdminUser, getUserProviderConfig, logApiCall, checkQuota } = deps;

    // ── 文生图 / 图生图 ──────────────────────────────────────────
    router.post('/image-proxy', requireAuth, csrfProtection, imageGenerationLimiter.middleware(), async (req, res) => {
        try {
            const {
                prompt,
                size,
                provider = 'tencent',
                mode = 'text2img',
                image: imageDataUrl,
                strength = 0.7,
                imageModel,
                styleReferenceImage,
            } = req.body;

            const normalizedProvider = String(provider || '').trim().toLowerCase();
            const currentIsAdmin = isAdminUser(req.currentUser);

            // 即梦尺寸校验
            if (normalizedProvider === 'jimeng') {
                const sizeCheck = jimengProvider.validateJimengSize(size);
                if (!sizeCheck.ok) {
                    return res.status(400).json({ error: '参数错误', message: sizeCheck.message, provider: 'jimeng' });
                }
            }

            if (!prompt) {
                return res.status(400).json({ error: '参数错误', message: 'prompt参数不能为空' });
            }

            // 检查配额
            if (typeof checkQuota === 'function') {
                const quota = checkQuota(req.currentUser.id, normalizedProvider);
                if (!quota.ok) {
                    return res.status(429).json({
                        error: '调用次数超限',
                        message: `已达到${quota.reason === 'daily' ? '每日' : '每月'}调用上限（${quota.limit}次）`,
                        provider: normalizedProvider,
                        quota,
                    });
                }
            }

            // 腾讯云：普通用户必须自配密钥，管理员可用平台默认密钥
            if (normalizedProvider === 'tencent') {
                const userTencentCfg = getUserProviderConfig(req.currentUser.id, 'tencent');
                const hasOwnKeys = !!(userTencentCfg && userTencentCfg.secretId && userTencentCfg.secretKey);
                if (!currentIsAdmin && !hasOwnKeys) {
                    return res.status(403).json({
                        error: '未配置个人密钥',
                        message: '请先在「用户中心」配置你自己的腾讯云 SecretId / SecretKey，再使用腾讯云图片生成。',
                        code: 'no_personal_credentials',
                        provider: 'tencent',
                    });
                }
            }

            const isImg2Img = mode === 'img2img';
            let effectivePrompt = prompt;
            let effectiveImageDataUrl = imageDataUrl;
            let effectiveStrength = strength;
            let onJimengFrameSuccess = null;

            // 图生图：如果没有 image 但有 styleReferenceImage，用后者
            if (isImg2Img && !effectiveImageDataUrl && styleReferenceImage && typeof styleReferenceImage === 'string') {
                effectiveImageDataUrl = styleReferenceImage;
            }
            if (isImg2Img && !effectiveImageDataUrl) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '图生图模式需要上传线稿/草图（image 参数），或选择带参考图的风格预设',
                });
            }

            // 即梦文生图：可选携带风格参考图
            if (normalizedProvider === 'jimeng' && !isImg2Img && styleReferenceImage && typeof styleReferenceImage === 'string') {
                const j = req.body.jimeng && typeof req.body.jimeng === 'object' ? { ...req.body.jimeng } : {};
                const eb = j.extra_body && typeof j.extra_body === 'object' ? { ...j.extra_body } : {};
                eb.reference_image = styleReferenceImage;
                eb.image = styleReferenceImage;
                j.extra_body = eb;
                req.body.jimeng = j;
            }

            // 调用对应 provider
            const startTime = Date.now();
            let _callStatus = 'success';
            try {
                const imageUrl = await dispatchImageGeneration({
                    provider: normalizedProvider,
                    prompt: effectivePrompt,
                    imageDataUrl: effectiveImageDataUrl,
                    strength: effectiveStrength,
                    size,
                    mode: isImg2Img ? 'img2img' : 'text2img',
                    imageModel,
                    body: req.body,
                    userId: req.currentUser.id,
                    getUserProviderConfig,
                    req,
                    setOnJimengFrameSuccess: (fn) => { onJimengFrameSuccess = fn; },
                });

                // 即梦图生图回调
                if (normalizedProvider === 'jimeng' && isImg2Img && typeof onJimengFrameSuccess === 'function') {
                    onJimengFrameSuccess(imageUrl);
                }

                // 记录用量
                if (typeof logApiCall === 'function') {
                    logApiCall(req.currentUser.id, normalizedProvider, isImg2Img ? 'img2img' : 'text2img', 'success', Date.now() - startTime);
                }

                // 记录活动日志
                try { usersDbForActivity.addActivity(req.currentUser.id, 'AI 生成', 'image', null, normalizedProvider); } catch (_) { /* 活动日志非关键 */ }

                res.json({
                    image_url: imageUrl,
                    provider: normalizedProvider,
                    prompt: effectivePrompt,
                    size,
                    mode: isImg2Img ? 'img2img' : 'text2img',
                });
            } catch (err) {
                _callStatus = 'error';
                // 记录失败
                if (typeof logApiCall === 'function') {
                    logApiCall(req.currentUser.id, normalizedProvider, isImg2Img ? 'img2img' : 'text2img', 'error', Date.now() - startTime);
                }
                throw err;
            }
        } catch (apiError) {
            const provider = String(req.body?.provider || 'unknown').toLowerCase();
            const mode = req.body?.mode === 'img2img' ? '(图生图)' : '';
            console.error(`${provider}${mode} API调用失败:`, apiError.message || apiError);
            res.status(502).json({
                error: `${provider} 图片生成失败`,
                message: apiError.message || 'API调用失败',
                provider,
            });
        }
    });

    // ── 图片代理（拉取远程图片） ─────────────────────────────────
    router.get('/proxy-image', requireAuth, async (req, res) => {
        const url = req.query.url;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: '缺少 url 参数' });
        }

        // SSRF 防护：验证 URL + DNS 解析后二次校验
        try {
            const parsed = new URL(url);
            // 只允许 http/https 协议
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return res.status(400).json({ error: '只允许 http/https 协议' });
            }
            // 禁止访问内网地址（先检查 hostname 字面值）
            const hostname = parsed.hostname;
            const blockedPatterns = [
                /^127\./,           // 127.x.x.x
                /^10\./,            // 10.x.x.x
                /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16-31.x.x
                /^192\.168\./,      // 192.168.x.x
                /^169\.254\./,      // 169.254.x.x (云元数据)
                /^0\./,             // 0.x.x.x
                /^0\.0\.0\.0$/,     // 0.0.0.0
                /^localhost$/i,     // localhost
                /^::1$/,            // IPv6 localhost（URL.hostname 不含括号）
                /^fc00:/i,          // IPv6 私有地址
                /^fd00:/i,          // IPv6 私有地址
                /^fe80:/i,          // IPv6 链路本地地址
                /^::$/,             // IPv6 未指定地址
            ];
            if (blockedPatterns.some(pattern => pattern.test(hostname))) {
                return res.status(403).json({ error: '禁止访问内网地址' });
            }
            // DNS 解析后二次校验（防止 DNS rebinding 绕过）
            try {
                const { address: resolved } = await dns.lookup(hostname, { family: 0 });
                if (resolved && blockedPatterns.some(pattern => pattern.test(resolved))) {
                    return res.status(403).json({ error: '禁止访问内网地址（DNS 解析）' });
                }
            } catch (_) {
                // DNS 解析失败时阻止请求（防止绕过 SSRF 防护）
                return res.status(502).json({ error: 'DNS 解析失败，无法验证目标地址安全性' });
            }
        } catch (_e) {
            return res.status(400).json({ error: '无效的 URL' });
        }

        // 限制允许的 Content-Type
        const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                maxContentLength: 20 * 1024 * 1024, // 限制最大 20MB
                maxBodyLength: 20 * 1024 * 1024,
            });
            const contentType = (response.headers['content-type'] || 'image/png').split(';')[0].trim().toLowerCase();
            // 只允许图片类型，防止代理 HTML/JS 等内容（XSS 风险）
            if (!ALLOWED_CONTENT_TYPES.some(ct => contentType.startsWith(ct))) {
                return res.status(403).json({ error: '不允许的内容类型', contentType });
            }
            res.set('Content-Type', contentType);
            // 缓存 1 小时，减少重复请求
            res.set('Cache-Control', 'public, max-age=3600');
            res.send(response.data);
        } catch (error) {
            const upstreamStatus = error?.response?.status || 502;
            res.status(upstreamStatus).json({ error: '图片拉取失败', message: error.message, upstreamStatus });
        }
    });

    return router;
}

/**
 * 统一调度图片生成 provider
 */
async function dispatchImageGeneration(ctx) {
    const {
        provider, prompt, imageDataUrl, strength, size,
        mode, imageModel, body, userId, getUserProviderConfig, req,
        setOnJimengFrameSuccess,
    } = ctx;

    const isImg2Img = mode === 'img2img';

    // ── 图生图 ──
    if (isImg2Img) {
        switch (provider) {
            case 'tencent':
                return tencentProvider.callTencentImage2ImageAPI(prompt, imageDataUrl, strength, size, getUserProviderConfig(userId, 'tencent'));
            case 'sdwebui':
                return sdWebUiProvider.callSDWebUIImage2ImageAPI(prompt, imageDataUrl, strength, size, body.sd || {}, getUserProviderConfig(userId, 'sdwebui'));
            case 'jimeng': {
                const cfg = getUserProviderConfig(userId, 'jimeng');
                const control = jimengProvider.prepareJimengActionConsistency(req, body || {}, prompt, imageDataUrl, strength);
                setOnJimengFrameSuccess(control.onSuccess);
                return jimengProvider.callJimengImage2ImageAPI(control.prompt, control.image, control.strength, size, control.jimeng || {}, cfg);
            }
            default:
                throw new Error(`不支持的图生图服务: ${provider}`);
        }
    }

    // ── 文生图 ──
    switch (provider) {
        case 'tencent':
            return tencentProvider.callTencentImageAPI(prompt, size, getUserProviderConfig(userId, 'tencent'));
        case 'alibaba':
            return alibabaProvider.callAlibabaImageAPI(prompt, size, imageModel, getUserProviderConfig(userId, 'alibaba'));
        case 'sdwebui':
            return sdWebUiProvider.callSDWebUIText2ImageAPI(prompt, size, body.sd || {}, getUserProviderConfig(userId, 'sdwebui'));
        case 'free':
            return callFreeImageAPI(prompt, size);
        case 'mock':
            return generateMockImage(prompt, size);
        case 'jimeng':
            return jimengProvider.callJimengImageAPI(prompt, size, body.jimeng || {}, getUserProviderConfig(userId, 'jimeng'));
        default:
            throw new Error(`不支持的图片生成服务: ${provider}`);
    }
}

module.exports = { createImageRouter };
