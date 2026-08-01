/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
'use strict';

const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

// —— 本地模块 ——
const logger = require('./lib/logger');
const { WsServer } = require('./lib/ws-server');
const arkRestConfig = require('./ark-rest-config');
const { getTencentCamCredentials, validateTencentCamCredential, normalizeJimengApiKey } = require('./lib/utils');
const tencentProvider = require('./providers/tencent');
const alibabaProvider = require('./providers/alibaba');
const jimengProvider = require('./providers/jimeng');
const sdWebUiProvider = require('./providers/sd-webui');
const { createAuthRouter } = require('./routes/auth');
const { createImageRouter } = require('./routes/image-proxy');
const { createProjectRouter } = require('./routes/projects');
const { createAssetLibraryRouter } = require('./routes/asset-library');
const { createAdminRouter } = require('./routes/admin');
const { createAiProviderRouter } = require('./routes/ai-providers');
const { createWorkspaceRouter } = require('./routes/workspace');
const { createProductionInsightsRouter } = require('./routes/production-insights');
const { createWorkspaceDb } = require('./db/workspace-db');

// ── 环境变量 ──────────────────────────────────────────────────────
const envFiles = [path.join(__dirname, '.env'), path.join(__dirname, '../config/.env')];
envFiles.forEach((envPath) => dotenv.config({ path: envPath, override: false }));

const isProd = (process.env.NODE_ENV || 'development') === 'production';

if (!isProd) {
    logger.info('环境变量加载状态:');
    logger.info('HUNYUAN_SECRET_ID:', process.env.HUNYUAN_SECRET_ID ? '已加载' : '未加载');
    logger.info('HUNYUAN_SECRET_KEY:', process.env.HUNYUAN_SECRET_KEY ? '已加载' : '未加载');
    logger.info('DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? '已加载' : '未加载');
    logger.info('IMAGE_API_KEY:', process.env.IMAGE_API_KEY ? '已加载' : '未加载');
} else {
    logger.info('[artifex] production mode: API key presence logs suppressed');
}

function resolveSessionSecret() {
    const v = process.env.SESSION_SECRET;
    if (v && String(v).trim()) return String(v).trim();
    if (isProd) return null;
    return 'gameui-demo-session-change-me';
}
const resolvedSessionSecret = resolveSessionSecret();
if (!resolvedSessionSecret) {
    logger.error('FATAL: NODE_ENV=production requires SESSION_SECRET to be set to a non-empty value.');
    process.exit(1);
}
if (isProd && resolvedSessionSecret.length < 32) {
    logger.error('FATAL: SESSION_SECRET must contain at least 32 characters in production.');
    process.exit(1);
}
const resolvedEncryptionSecret = process.env.ENCRYPTION_KEY || resolvedSessionSecret;
if (isProd && resolvedEncryptionSecret.length < 32) {
    logger.error('FATAL: ENCRYPTION_KEY must contain at least 32 characters in production.');
    process.exit(1);
}

// ── Express 应用 ──────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

// 安全响应头（CSP 允许 Google Fonts 和 CDN）
// 生成 CSP nonce 用于内联脚本（替代 unsafe-inline）
const cspNonce = () => crypto.randomBytes(16).toString('base64');
app.use((req, res, next) => {
    res.locals.cspNonce = cspNonce();
    next();
});
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
                scriptSrcAttr: ["'unsafe-inline'"], // HTML 内联事件处理器暂无法用 nonce 替代
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:', 'blob:'],
                mediaSrc: ["'self'", 'data:'],
                connectSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
                workerSrc: ["'self'"],
                upgradeInsecureRequests: null,
            },
        },
        // 移除已废弃的 x-xss-protection（现代浏览器已弃用，且可能被利用）
        xssFilter: false,
        // 移除已废弃的 Pragma 头
        noSniff: true,
        crossOriginEmbedderPolicy: false,
        // 不发送不必要的 X-Download-Options（仅 IE8 需要）
        ieNoOpen: false,
    })
);

// Gzip 压缩（跳过已压缩的图片格式）
app.use(
    compression({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            const type = res.getHeader('Content-Type') || '';
            if (/image\/(jpeg|png|webp|gif)/.test(type)) return false;
            return compression.filter(req, res);
        },
    })
);

app.use(express.json({ limit: '48mb' }));

// 禁用本机代理
axios.defaults.proxy = false;

function normalizeNoProxy(existing, hosts) {
    const items = String(existing || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    for (const host of hosts) {
        if (!items.includes(host)) items.push(host);
    }
    return items.join(',');
}

function disableDeadLocalProxyIfPresent() {
    const proxyVars = ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy'];
    const proxyValue = proxyVars
        .map((key) => process.env[key])
        .filter(Boolean)
        .join(' ');
    if (!/127\.0\.0\.1:7897|localhost:7897/i.test(proxyValue)) return;

    for (const key of proxyVars) delete process.env[key];

    const hosts = [
        'localhost',
        '127.0.0.1',
        'dashscope.aliyuncs.com',
        'ark.cn-beijing.volces.com',
        'api.openai.com',
        'aiart.tencentcloudapi.com',
        'tencentcloudapi.com',
    ];
    const mergedNoProxy = normalizeNoProxy(process.env.NO_PROXY || process.env.no_proxy || '', hosts);
    process.env.NO_PROXY = mergedNoProxy;
    process.env.no_proxy = mergedNoProxy;
    logger.warn('[proxy] 已检测到失效的本机代理 127.0.0.1:7897，外部 AI 请求将改为直连。');
}
disableDeadLocalProxyIfPresent();

// ── CORS ──────────────────────────────────────────────────────────
const corsAllowedList = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
          .map((v) => v.trim())
          .filter(Boolean)
    : isProd
      ? []
      : ['*'];

if (isProd && corsAllowedList.length === 0) {
    logger.error(
        'FATAL: NODE_ENV=production requires ALLOWED_ORIGINS (comma-separated origins), e.g. https://your-host'
    );
    process.exit(1);
}

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowWildcard = corsAllowedList.includes('*');
    const allowed = allowWildcard || (!!origin && corsAllowedList.includes(origin));

    if (allowed) {
        if (allowWildcard) {
            res.header('Access-Control-Allow-Origin', origin || '*');
        } else {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Vary', 'Origin');
        }
        if (!(allowWildcard && !origin)) {
            res.header('Access-Control-Allow-Credentials', 'true');
        }
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-XSRF-Token, X-TC-Timestamp, X-TC-Version, X-TC-Action'
    );
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// ── 用户库 + Session ─────────────────────────────────────────────
const session = require('express-session');
const SqliteSessionStore = require('./lib/sqlite-session-store');
const usersDb = require('./db/users-db');
const { createAuthPolicy } = require('./lib/auth-policy');
const { createUserApiSettingsHelpers } = require('./lib/user-api-settings');
usersDb.init();
const workspaceDb = createWorkspaceDb(usersDb.getDb());
const { requireAuth, isAdminUser } = createAuthPolicy(usersDb);
const { sanitizeApiSettingsPayload, getUserProviderConfig } = createUserApiSettingsHelpers(usersDb);

const sessionStore = new SqliteSessionStore({
    dbPath: path.join(__dirname, 'data', 'sessions.sqlite'),
    ttl: 24 * 60 * 60, // 24 小时
    cleanupInterval: 30 * 60 * 1000, // 30 分钟清理过期会话
});

app.use(
    session({
        store: sessionStore,
        secret: resolvedSessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
            secure: isProd,
        },
    })
);

// ── CSRF ──────────────────────────────────────────────────────────
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req, res, next) {
    const cookieToken = (req.headers.cookie || '').match(/XSRF-TOKEN=([^;]+)/);
    const cookieVal = cookieToken ? decodeURIComponent(cookieToken[1]) : '';
    const headerVal = req.headers['x-xsrf-token'] || (req.body && req.body._csrf) || '';
    if (!cookieVal || !headerVal || cookieVal !== headerVal) {
        return res.status(403).json({ error: 'CSRF 令牌无效，请刷新页面重试' });
    }
    next();
}

app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken();
    res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', secure: isProd, maxAge: 3600 * 1000 });
    res.json({ csrfToken: token });
});

// ── 全局 API 限流 ────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10000 : 120,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ── 认证路由 ─────────────────────────────────────────────────────
app.use(
    '/api',
    createAuthRouter({
        usersDb,
        requireAuth,
        isAdminUser,
        csrfProtection,
        sanitizeApiSettingsPayload,
        workspaceDb,
    })
);

// 生产洞察：一致性评估、模板、指标、示例工作区与服务端备份。
app.use('/api', createProductionInsightsRouter({ workspaceDb, usersDb, requireAuth, csrfProtection }));

// ── 静态文件 ─────────────────────────────────────────────────────
// Docker 生产镜像只包含 Vite 的 dist 产物；开发环境仍直接服务源码目录。
const staticRoot = isProd ? path.join(__dirname, '..', 'dist') : path.join(__dirname, '..');
app.use(
    express.static(staticRoot, {
        maxAge: isProd ? '7d' : 0,
        etag: true,
        setHeaders: (res, filePath) => {
            // HTML 文件不长缓存（含会话状态）
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        },
    })
);
app.get('/', (req, res) => res.redirect('/login.html'));

// ── 运行时配置 ───────────────────────────────────────────────────
const API_CONFIG = require('../config/api-config');

const runtimeConfig = {
    hunyuan: {
        secretId: process.env.HUNYUAN_SECRET_ID || API_CONFIG.hunyuan.secretId,
        secretKey: process.env.HUNYUAN_SECRET_KEY || API_CONFIG.hunyuan.secretKey,
        endpoint: API_CONFIG.hunyuan.endpoint,
        version: API_CONFIG.hunyuan.version,
        model: API_CONFIG.hunyuan.model,
    },
    alibaba: {
        apiKey: process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_API_KEY || API_CONFIG.alibaba.apiKey,
        endpoint: API_CONFIG.alibaba.endpoint,
        imageEndpoint: API_CONFIG.alibaba.imageEndpoint,
        model: API_CONFIG.alibaba.model,
        visionModel: API_CONFIG.alibaba.visionModel || process.env.DASHSCOPE_VL_MODEL || 'qwen-vl-plus',
    },
    image: {
        apiKey: process.env.IMAGE_API_KEY || 'YOUR_IMAGE_API_KEY',
        endpoint: 'https://api.openai.com/v1/images/generations',
    },
    tencent: {
        secretId: process.env.TENCENT_SECRET_ID || 'YOUR_TENCENT_SECRET_ID',
        secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_TENCENT_SECRET_KEY',
        endpoint: 'https://tiia.tencentcloudapi.com',
        version: '2020-05-26',
    },
};

// ── 启动日志 ─────────────────────────────────────────────────────
if (!isProd) {
    logger.info('运行时配置状态:');
    logger.info('hunyuan secretId:', runtimeConfig.hunyuan.secretId ? '已配置' : '未配置');
    logger.info('hunyuan secretKey:', runtimeConfig.hunyuan.secretKey ? '已配置' : '未配置');
    logger.info('alibaba apiKey:', runtimeConfig.alibaba.apiKey ? '已配置' : '未配置');
    logger.info('tencent secretId:', runtimeConfig.tencent.secretId ? '已配置' : '未配置');
    logger.info('tencent secretKey:', runtimeConfig.tencent.secretKey ? '已配置' : '未配置');
    logger.info('imageApiKey:', runtimeConfig.image.apiKey ? '已配置' : '未配置');
}
const _tencentCam = getTencentCamCredentials();
const _tencentCamValid = validateTencentCamCredential(_tencentCam.secretId, _tencentCam.secretKey);
if (!isProd) {
    logger.info('hunyuan configured:', _tencentCamValid.ok);
    logger.info('alibaba configured:', runtimeConfig.alibaba.apiKey !== 'YOUR_ALIBABA_API_KEY');
    logger.info(
        'tencent image configured:',
        _tencentCamValid.ok,
        _tencentCamValid.ok ? '' : `(${_tencentCamValid.code})`
    );
}
if (!_tencentCamValid.ok && _tencentCam.secretId) {
    logger.warn('[腾讯云] 密钥校验未通过:', _tencentCamValid.message);
}
if (!isProd) {
    logger.info('SD_WEBUI_URL:', process.env.SD_WEBUI_URL || '(默认 http://127.0.0.1:7860)');
    logger.info(
        'SD_WEBUI_LORA 自动前缀:',
        process.env.SD_WEBUI_LORA_DISABLED === '1'
            ? '已关闭'
            : `${process.env.SD_WEBUI_LORA || 'last'} (权重 ${process.env.SD_WEBUI_LORA_WEIGHT || '1'})`
    );
    jimengProvider.logJimengConfig();
}

// ── 业务路由（按模块拆分） ──────────────────────────────────────

// AI 服务商路由（即梦/SD/混元/阿里云）
app.use(
    '/api',
    createAiProviderRouter({
        requireAuth,
        csrfProtection,
        runtimeConfig,
        API_CONFIG,
        getUserProviderConfig,
        isAdminUser,
        tencentProvider,
        alibabaProvider,
        jimengProvider,
        sdWebUiProvider,
    })
);

// 图片生成路由
app.use(
    '/api',
    createImageRouter({
        requireAuth,
        csrfProtection,
        isAdminUser,
        getUserProviderConfig,
        logApiCall: usersDb.logApiCall,
        checkQuota: usersDb.checkQuota,
        workspaceDb,
    })
);

// 项目管理路由
app.use('/api', createProjectRouter({ usersDb, workspaceDb, requireAuth, csrfProtection }));

// 素材库路由
app.use('/api', createAssetLibraryRouter({ usersDb, requireAuth, csrfProtection }));

// 管理员路由（用量统计/用户管理）
app.use('/api', createAdminRouter({ usersDb, requireAuth, isAdminUser }));

// 生成历史、协作、审核、通知、角色档案与 LoRA 任务
app.use(
    '/api',
    createWorkspaceRouter({
        workspaceDb,
        usersDb,
        requireAuth,
        csrfProtection,
        notifyUser: (userId, data) => app.get('wsServer')?.notify(userId, data),
    })
);

// ── 活动日志 API ───────────────────────────────────────────────

// 当前用户的活动日志
app.get('/api/activity-log', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const total = usersDb.getActivityLogCount(req.currentUser.id);
    const logs = usersDb.getActivityLog(req.currentUser.id, limit, offset);
    res.json({ ok: true, logs, total, page, limit });
});

// 管理员：所有用户的活动日志
app.get('/api/admin/activity-log', requireAuth, (req, res) => {
    if (!isAdminUser(req.currentUser)) {
        return res.status(403).json({ error: '权限不足' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const total = usersDb.getRecentActivityCount();
    const logs = usersDb.getRecentActivity(limit, offset);
    res.json({ ok: true, logs, total, page, limit });
});

// ── 配置状态（保留在此，依赖 runtimeConfig） ───────────────────

// 用户级 API 配置状态（兼容旧路径）
app.get('/api/config', requireAuth, (req, res) => {
    const status = usersDb.getUserApiCredentialStatus(req.currentUser.id);
    res.json({
        status: 'ok',
        isAdmin: isAdminUser(req.currentUser),
        config: {
            alibaba: {
                configured: !!status.alibaba,
                model: runtimeConfig.alibaba.model,
                visionModel: runtimeConfig.alibaba.visionModel,
            },
            jimeng: { configured: !!status.jimeng },
            tencent: { configured: !!status.tencent },
            sdwebui: { configured: !!status.sdwebui },
            proxy: API_CONFIG.proxy,
            frontend: API_CONFIG.frontend,
        },
    });
});

// 已停用的旧接口
for (const action of ['update', 'validate', 'reset']) {
    app.all(`/api/config/${action}`, requireAuth, (req, res) => {
        res.status(410).json({ error: '接口已停用', message: '请改用 /api/me/api-settings（用户级配置）' });
    });
}

// ── 健康检查 ───────────────────────────────────────────────────

// 基础健康检查（公开，不暴露配置细节）
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Artifex AI Platform',
        version: API_CONFIG.version || '1.4.0',
        timestamp: new Date().toISOString(),
    });
});

// 详细健康检查（需要鉴权，暴露配置状态）
app.get('/api/health/detail', requireAuth, (req, res) => {
    if (!isAdminUser(req.currentUser)) {
        return res.status(403).json({ error: '权限不足' });
    }
    const tencentCam = getTencentCamCredentials();
    const tencentValidation = validateTencentCamCredential(tencentCam.secretId, tencentCam.secretKey);
    const restCfg = arkRestConfig.loadArkRestConfig();
    const jimengKey = normalizeJimengApiKey(
        (restCfg && restCfg.apiKey) || process.env.JIMENG_API_KEY || process.env.ARK_API_KEY || ''
    );

    res.json({
        status: 'ok',
        service: 'AI API代理服务',
        config_status: {
            hunyuan: tencentValidation.ok ? 'configured' : 'not_configured',
            tencent_image: tencentValidation.ok ? 'configured' : tencentValidation.code || 'not_configured',
            alibaba: runtimeConfig.alibaba.apiKey !== 'YOUR_ALIBABA_API_KEY' ? 'configured' : 'not_configured',
            image: runtimeConfig.image.apiKey !== 'YOUR_IMAGE_API_KEY' ? 'configured' : 'not_configured',
            jimeng: jimengKey ? 'configured' : 'not_configured',
        },
        tencent_hint: tencentValidation.ok ? undefined : tencentValidation.message,
        providers: {
            code_generation: ['tencent(hunyuan)', 'alibaba(qwen)'],
            image_generation: ['jimeng(seedream)', 'tencent', 'alibaba(wanx)', 'free', 'mock'],
            action_group: ['jimeng(seedream)'],
        },
        timestamp: new Date().toISOString(),
    });
});

// ── API 文档 ─────────────────────────────────────────────────────
const openapiPath = path.join(staticRoot, 'docs', 'openapi.json');
let _openapiCache = null;
if (fs.existsSync(openapiPath)) {
    try {
        _openapiCache = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'));
    } catch (e) {
        logger.warn('[openapi] 预加载文档失败:', e.message);
    }
    app.get('/api/docs', (_req, res) => {
        if (!_openapiCache) return res.status(500).json({ error: 'API 文档加载失败' });
        res.json(_openapiCache);
    });
}

// ── 启动服务器 ───────────────────────────────────────────────────
const PORT = process.env.PORT || API_CONFIG.proxy.port;
const server = app.listen(PORT, () => {
    logger.info(`\n  Artifex API Server`);
    logger.info(`  Port: ${PORT}`);
    logger.info(`  Health: http://localhost:${PORT}/api/health`);
    logger.info(`  Docs:   http://localhost:${PORT}/api/docs\n`);
});

// ── WebSocket 实时通知 ──────────────────────────────────────────
const wsServer = new WsServer(server, {
    sessionStore,
    sessionSecret: resolvedSessionSecret,
});
// 暴露给路由使用
app.set('wsServer', wsServer);

server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
        logger.error(`\n[端口占用] ${PORT} 已被占用。可选：`);
        logger.error(`  1) 关掉占用端口的进程`);
        logger.error(`  2) 换端口启动：PORT=3001 node backend/proxy.js\n`);
        process.exit(1);
    }
    logger.error(err);
    process.exit(1);
});

// ── 优雅关闭 ───────────────────────────────────────────────────
function gracefulShutdown(signal) {
    logger.info(`\n[artifex] 收到 ${signal}，正在优雅关闭...`);
    server.close(() => {
        logger.info('[artifex] HTTP 服务器已关闭');
        try {
            wsServer.close?.();
        } catch (_) {
            /* ignore */
        }
        try {
            usersDb.close();
        } catch (_) {
            /* ignore */
        }
        try {
            sessionStore.close?.();
        } catch (_) {
            /* ignore */
        }
        logger.info('[artifex] 资源清理完成');
        process.exit(0);
    });
    // 强制退出兜底（10秒超时）
    setTimeout(() => {
        logger.error('[artifex] 优雅关闭超时，强制退出');
        process.exit(1);
    }, 10000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
