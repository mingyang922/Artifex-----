/**
 * Artifex — 图片生成路由
 * 从 proxy.js 提取，统一处理文生图 / 图生图 / 图片代理
 */
'use strict';

const axios = require('axios');
const dns = require('dns').promises;
const { generateMockImage, callFreeImageAPI } = require('../lib/utils');
const { imageGenerationLimiter } = require('../lib/rate-limiter');
const { sendError, ERR } = require('../lib/error-response');
const logger = require('../lib/logger');
const { isBlockedHostname } = require('../lib/ssrf-guard');
const usersDbForActivity = require('../db/users-db');

const MAX_IMAGE_REDIRECTS = 5;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
]);

class ImageProxyUrlError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'ImageProxyUrlError';
        this.statusCode = statusCode;
    }
}

async function validatePublicImageUrl(value, lookup = dns.lookup) {
    let parsed;
    try {
        parsed = new URL(value);
    } catch (_error) {
        throw new ImageProxyUrlError('无效的 URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ImageProxyUrlError('只允许 http/https 协议');
    }
    if (isBlockedHostname(parsed.hostname)) {
        throw new ImageProxyUrlError('禁止访问内网地址', 403);
    }

    let addresses;
    try {
        addresses = await lookup(parsed.hostname, { all: true });
    } catch (_error) {
        throw new ImageProxyUrlError('DNS 解析失败，无法验证目标地址安全性', 502);
    }
    if (!Array.isArray(addresses) || addresses.length === 0) {
        throw new ImageProxyUrlError('DNS 解析未返回有效地址', 502);
    }
    if (addresses.some((entry) => entry.address && isBlockedHostname(entry.address))) {
        throw new ImageProxyUrlError('禁止访问内网地址（DNS 解析）', 403);
    }
    return parsed;
}

async function fetchPublicImage(url, request = axios.get, lookup = dns.lookup) {
    let currentUrl = String(url);
    for (let redirects = 0; redirects <= MAX_IMAGE_REDIRECTS; redirects += 1) {
        const parsed = await validatePublicImageUrl(currentUrl, lookup);
        const response = await request(parsed.href, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxContentLength: 20 * 1024 * 1024,
            maxBodyLength: 20 * 1024 * 1024,
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400,
        });

        if (response.status < 300) return response;
        const location = response.headers?.location;
        if (!location) throw new ImageProxyUrlError('图片服务返回了无效重定向', 502);
        if (redirects === MAX_IMAGE_REDIRECTS) {
            throw new ImageProxyUrlError('图片重定向次数过多', 502);
        }
        currentUrl = new URL(location, parsed).href;
    }
    throw new ImageProxyUrlError('图片重定向次数过多', 502);
}

/** 包装异步路由处理器，捕获未处理的 Promise 拒绝 */
function wrapAsync(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
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
    const { requireAuth, csrfProtection, isAdminUser, getUserProviderConfig, logApiCall, checkQuota, workspaceDb } =
        deps;

    // ── 文生图 / 图生图 ──────────────────────────────────────────
    router.post(
        '/image-proxy',
        requireAuth,
        csrfProtection,
        imageGenerationLimiter.middleware(),
        wrapAsync(async (req, res) => {
            let historyJobId = null;
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
                } = req.body || {};

                const normalizedProvider = String(provider || '')
                    .trim()
                    .toLowerCase();
                const currentIsAdmin = isAdminUser(req.currentUser);

                if (
                    ['free', 'mock'].includes(normalizedProvider) &&
                    !currentIsAdmin &&
                    process.env.NODE_ENV !== 'test'
                ) {
                    return sendError(res, 403, ERR.FORBIDDEN, '该服务商仅供管理员使用');
                }

                // 即梦尺寸校验
                if (normalizedProvider === 'jimeng') {
                    const sizeCheck = jimengProvider.validateJimengSize(size);
                    if (!sizeCheck.ok) {
                        return sendError(res, 400, ERR.VALIDATION, sizeCheck.message);
                    }
                }

                if (!prompt) {
                    return sendError(res, 400, ERR.VALIDATION, 'prompt参数不能为空');
                }

                // prompt 长度限制，防止超大输入导致下游 API 异常
                if (String(prompt).length > 10000) {
                    return sendError(res, 400, ERR.VALIDATION, 'prompt 过长，最多 10000 字符');
                }

                // 检查配额
                if (typeof checkQuota === 'function') {
                    const quota = checkQuota(req.currentUser.id, normalizedProvider);
                    if (!quota.ok) {
                        return res.status(429).json({
                            error: '调用次数超限',
                            message: `已达到${quota.reason === 'daily' ? '每日' : '每月'}调用上限（${quota.limit}次）`,
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
                            message:
                                '请先在「用户中心」配置你自己的腾讯云 SecretId / SecretKey，再使用腾讯云图片生成。',
                        });
                    }
                }

                const isImg2Img = mode === 'img2img';
                let effectivePrompt = prompt;
                let effectiveImageDataUrl = imageDataUrl;
                let effectiveStrength = strength;
                let onJimengFrameSuccess = null;

                // 图生图：如果没有 image 但有 styleReferenceImage，用后者
                if (
                    isImg2Img &&
                    !effectiveImageDataUrl &&
                    styleReferenceImage &&
                    typeof styleReferenceImage === 'string'
                ) {
                    effectiveImageDataUrl = styleReferenceImage;
                }
                if (isImg2Img && !effectiveImageDataUrl) {
                    return res.status(400).json({
                        error: '参数错误',
                        message: '图生图模式需要上传线稿/草图（image 参数），或选择带参考图的风格预设',
                    });
                }

                // 即梦文生图：可选携带风格参考图
                if (
                    normalizedProvider === 'jimeng' &&
                    !isImg2Img &&
                    styleReferenceImage &&
                    typeof styleReferenceImage === 'string'
                ) {
                    const j = req.body.jimeng && typeof req.body.jimeng === 'object' ? { ...req.body.jimeng } : {};
                    const eb = j.extra_body && typeof j.extra_body === 'object' ? { ...j.extra_body } : {};
                    eb.reference_image = styleReferenceImage;
                    eb.image = styleReferenceImage;
                    j.extra_body = eb;
                    req.body.jimeng = j;
                }

                // 调用对应 provider
                const startTime = Date.now();
                if (workspaceDb) {
                    const job = workspaceDb.createGenerationJob(req.currentUser.id, {
                        provider: normalizedProvider,
                        mode: isImg2Img ? 'img2img' : 'text2img',
                        prompt: effectivePrompt,
                        params: {
                            size,
                            strength: effectiveStrength,
                            imageModel,
                        },
                        status: 'running',
                    });
                    historyJobId = job.id;
                }
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
                        setOnJimengFrameSuccess: (fn) => {
                            onJimengFrameSuccess = fn;
                        },
                    });

                    // 即梦图生图回调
                    if (normalizedProvider === 'jimeng' && isImg2Img && typeof onJimengFrameSuccess === 'function') {
                        onJimengFrameSuccess(imageUrl);
                    }

                    // 记录用量
                    if (typeof logApiCall === 'function') {
                        logApiCall(
                            req.currentUser.id,
                            normalizedProvider,
                            isImg2Img ? 'img2img' : 'text2img',
                            'success',
                            Date.now() - startTime
                        );
                    }

                    if (historyJobId) {
                        workspaceDb.updateGenerationJob(req.currentUser.id, historyJobId, {
                            status: 'completed',
                            outputs: [{ url: imageUrl }],
                        });
                    }

                    // 记录活动日志
                    try {
                        usersDbForActivity.addActivity(
                            req.currentUser.id,
                            'AI 生成',
                            'image',
                            null,
                            normalizedProvider
                        );
                    } catch (_) {
                        /* 活动日志非关键 */
                    }

                    res.json({
                        image_url: imageUrl,
                        provider: normalizedProvider,
                        prompt: effectivePrompt,
                        size,
                        mode: isImg2Img ? 'img2img' : 'text2img',
                    });
                } catch (err) {
                    // 记录失败
                    if (typeof logApiCall === 'function') {
                        logApiCall(
                            req.currentUser.id,
                            normalizedProvider,
                            isImg2Img ? 'img2img' : 'text2img',
                            'error',
                            Date.now() - startTime
                        );
                    }
                    if (historyJobId) {
                        workspaceDb.updateGenerationJob(req.currentUser.id, historyJobId, {
                            status: 'failed',
                            error: String(err?.message || err).slice(0, 2000),
                        });
                    }
                    throw err;
                }
            } catch (apiError) {
                const provider = String(req.body?.provider || 'unknown').toLowerCase();
                const mode = req.body?.mode === 'img2img' ? '(图生图)' : '';
                logger.error(`${provider}${mode} API调用失败:`, apiError.message || apiError);
                res.status(502).json({
                    error: '图片生成失败',
                    message: `${provider}: ${apiError.message || 'API调用失败'}`,
                });
            }
        })
    );

    // ── 图片代理（拉取远程图片） ─────────────────────────────────
    router.get(
        '/proxy-image',
        requireAuth,
        wrapAsync(async (req, res) => {
            const url = req.query.url;
            if (!url || typeof url !== 'string') {
                return sendError(res, 400, ERR.VALIDATION, '缺少 url 参数');
            }

            try {
                // 禁用 axios 自动重定向，并对每一跳重新执行协议、主机名和 DNS 校验。
                const response = await fetchPublicImage(url);
                const contentType = (response.headers['content-type'] || 'image/png')
                    .split(';')[0]
                    .trim()
                    .toLowerCase();
                // SVG 可携带脚本，不能作为同源主动内容从该代理返回。
                if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
                    return sendError(res, 403, ERR.FORBIDDEN, `不支持的内容类型: ${contentType}`);
                }
                res.set('Content-Type', contentType);
                // 缓存 1 小时，减少重复请求
                res.set('Cache-Control', 'public, max-age=3600');
                res.send(response.data);
            } catch (error) {
                if (error instanceof ImageProxyUrlError) {
                    const code = error.statusCode === 403 ? ERR.FORBIDDEN : ERR.VALIDATION;
                    return sendError(res, error.statusCode, code, error.message);
                }
                const upstreamStatus = error?.response?.status || 502;
                return sendError(res, upstreamStatus, ERR.PROVIDER_ERROR, '图片拉取失败');
            }
        })
    );

    // ── 全局错误处理（捕获 wrapAsync 未处理的异步错误） ──
    router.use((err, req, res, _next) => {
        logger.error('[image-proxy] 未处理的路由错误:', err);
        if (!res.headersSent) {
            sendError(res, 500, ERR.INTERNAL, '服务器内部错误');
        }
    });

    return router;
}

/**
 * 统一调度图片生成 provider
 */
async function dispatchImageGeneration(ctx) {
    const {
        provider,
        prompt,
        imageDataUrl,
        strength,
        size,
        mode,
        imageModel,
        body,
        userId,
        getUserProviderConfig,
        req,
        setOnJimengFrameSuccess,
    } = ctx;

    const isImg2Img = mode === 'img2img';

    // ── 图生图 ──
    if (isImg2Img) {
        switch (provider) {
            case 'tencent':
                return tencentProvider.callTencentImage2ImageAPI(
                    prompt,
                    imageDataUrl,
                    strength,
                    size,
                    getUserProviderConfig(userId, 'tencent')
                );
            case 'sdwebui':
                return sdWebUiProvider.callSDWebUIImage2ImageAPI(
                    prompt,
                    imageDataUrl,
                    strength,
                    size,
                    body.sd || {},
                    getUserProviderConfig(userId, 'sdwebui')
                );
            case 'jimeng': {
                const cfg = getUserProviderConfig(userId, 'jimeng');
                const control = jimengProvider.prepareJimengActionConsistency(
                    req,
                    body || {},
                    prompt,
                    imageDataUrl,
                    strength
                );
                setOnJimengFrameSuccess(control.onSuccess);
                return jimengProvider.callJimengImage2ImageAPI(
                    control.prompt,
                    control.image,
                    control.strength,
                    size,
                    control.jimeng || {},
                    cfg
                );
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
            return alibabaProvider.callAlibabaImageAPI(
                prompt,
                size,
                imageModel,
                getUserProviderConfig(userId, 'alibaba')
            );
        case 'sdwebui':
            return sdWebUiProvider.callSDWebUIText2ImageAPI(
                prompt,
                size,
                body.sd || {},
                getUserProviderConfig(userId, 'sdwebui')
            );
        case 'free':
            return callFreeImageAPI(prompt, size);
        case 'mock':
            return generateMockImage(prompt, size);
        case 'jimeng':
            return jimengProvider.callJimengImageAPI(
                prompt,
                size,
                body.jimeng || {},
                getUserProviderConfig(userId, 'jimeng')
            );
        default:
            throw new Error(`不支持的图片生成服务: ${provider}`);
    }
}

module.exports = {
    createImageRouter,
    dispatchImageGeneration,
    fetchPublicImage,
    validatePublicImageUrl,
    isBlockedHostname: require('../lib/ssrf-guard').isBlockedHostname,
};
