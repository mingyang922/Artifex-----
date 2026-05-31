/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.1 */
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
const arkRestConfig = require('./ark-rest-config');
const {
    getTencentCamCredentials,
    validateTencentCamCredential,
    normalizeJimengApiKey,
} = require('./lib/utils');
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

// ── 环境变量 ──────────────────────────────────────────────────────
const envFiles = [path.join(__dirname, '.env'), path.join(__dirname, '../config/.env')];
envFiles.forEach((envPath) => dotenv.config({ path: envPath, override: false }));

const isProd = (process.env.NODE_ENV || 'development') === 'production';

if (!isProd) {
    console.log('环境变量加载状态:');
    console.log('HUNYUAN_SECRET_ID:', process.env.HUNYUAN_SECRET_ID ? '已加载' : '未加载');
    console.log('HUNYUAN_SECRET_KEY:', process.env.HUNYUAN_SECRET_KEY ? '已加载' : '未加载');
    console.log('DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? '已加载' : '未加载');
    console.log('IMAGE_API_KEY:', process.env.IMAGE_API_KEY ? '已加载' : '未加载');
} else {
    console.log('[artifex] production mode: API key presence logs suppressed');
}

function resolveSessionSecret() {
    const v = process.env.SESSION_SECRET;
    if (v && String(v).trim()) return String(v).trim();
    if (isProd) return null;
    return 'gameui-demo-session-change-me';
}
const resolvedSessionSecret = resolveSessionSecret();
if (!resolvedSessionSecret) {
    console.error('FATAL: NODE_ENV=production requires SESSION_SECRET to be set to a non-empty value.');
    process.exit(1);
}

// ── Express 应用 ──────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

// 安全响应头（CSP 允许 Google Fonts 和 CDN）
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: null,
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Gzip 压缩
app.use(compression());

app.use(express.json({ limit: '48mb' }));

// 禁用本机代理
axios.defaults.proxy = false;

function normalizeNoProxy(existing, hosts) {
    const items = String(existing || '').split(',').map((v) => v.trim()).filter(Boolean);
    for (const host of hosts) {
        if (!items.includes(host)) items.push(host);
    }
    return items.join(',');
}

function disableDeadLocalProxyIfPresent() {
    const proxyVars = ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy'];
    const proxyValue = proxyVars.map((key) => process.env[key]).filter(Boolean).join(' ');
    if (!/127\.0\.0\.1:7897|localhost:7897/i.test(proxyValue)) return;

    for (const key of proxyVars) delete process.env[key];

    const hosts = [
        'localhost', '127.0.0.1', 'dashscope.aliyuncs.com',
        'ark.cn-beijing.volces.com', 'api.openai.com',
        'aiart.tencentcloudapi.com', 'tencentcloudapi.com',
    ];
    const mergedNoProxy = normalizeNoProxy(process.env.NO_PROXY || process.env.no_proxy || '', hosts);
    process.env.NO_PROXY = mergedNoProxy;
    process.env.no_proxy = mergedNoProxy;
    console.warn('[proxy] 已检测到失效的本机代理 127.0.0.1:7897，外部 AI 请求将改为直连。');
}
disableDeadLocalProxyIfPresent();

// ── CORS ──────────────────────────────────────────────────────────
const corsAllowedList = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean)
    : isProd ? [] : ['*'];

if (isProd && corsAllowedList.length === 0) {
    console.error('FATAL: NODE_ENV=production requires ALLOWED_ORIGINS (comma-separated origins), e.g. https://your-host');
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TC-Timestamp, X-TC-Version, X-TC-Action');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// ── 用户库 + Session ─────────────────────────────────────────────
const session = require('express-session');
const usersDb = require('./db/users-db');
const { createAuthPolicy } = require('./lib/auth-policy');
const { createUserApiSettingsHelpers } = require('./lib/user-api-settings');
usersDb.init();
const { requireAuth, isAdminUser } = createAuthPolicy(usersDb);
const { sanitizeApiSettingsPayload, getUserProviderConfig } = createUserApiSettingsHelpers(usersDb);

app.use(session({
    secret: resolvedSessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
    },
}));

// ── CSRF ──────────────────────────────────────────────────────────
function generateCsrfToken() { return crypto.randomBytes(32).toString('hex'); }

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
    res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'lax', maxAge: 3600 * 1000 });
    res.json({ csrfToken: token });
});

// ── 全局 API 限流 ────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ── 认证路由 ─────────────────────────────────────────────────────
app.use('/api', createAuthRouter({
    usersDb, requireAuth, isAdminUser, csrfProtection, sanitizeApiSettingsPayload,
}));

// ── 静态文件 ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));
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
    console.log('运行时配置状态:');
    console.log('hunyuan secretId:', runtimeConfig.hunyuan.secretId ? '已配置' : '未配置');
    console.log('hunyuan secretKey:', runtimeConfig.hunyuan.secretKey ? '已配置' : '未配置');
    console.log('alibaba apiKey:', runtimeConfig.alibaba.apiKey ? '已配置' : '未配置');
    console.log('tencent secretId:', runtimeConfig.tencent.secretId ? '已配置' : '未配置');
    console.log('tencent secretKey:', runtimeConfig.tencent.secretKey ? '已配置' : '未配置');
    console.log('imageApiKey:', runtimeConfig.image.apiKey ? '已配置' : '未配置');
}
const _tencentCam = getTencentCamCredentials();
const _tencentCamValid = validateTencentCamCredential(_tencentCam.secretId, _tencentCam.secretKey);
if (!isProd) {
    console.log('hunyuan configured:', _tencentCamValid.ok);
    console.log('alibaba configured:', runtimeConfig.alibaba.apiKey !== 'YOUR_ALIBABA_API_KEY');
    console.log('tencent image configured:', _tencentCamValid.ok, _tencentCamValid.ok ? '' : `(${_tencentCamValid.code})`);
}
if (!_tencentCamValid.ok && _tencentCam.secretId) {
    console.warn('[腾讯云] 密钥校验未通过:', _tencentCamValid.message);
}
if (!isProd) {
    console.log('SD_WEBUI_URL:', process.env.SD_WEBUI_URL || '(默认 http://127.0.0.1:7860)');
    console.log(
        'SD_WEBUI_LORA 自动前缀:',
        process.env.SD_WEBUI_LORA_DISABLED === '1'
            ? '已关闭'
            : `${process.env.SD_WEBUI_LORA || 'last'} (权重 ${process.env.SD_WEBUI_LORA_WEIGHT || '1'})`
    );
    jimengProvider.logJimengConfig();
}

// ── 业务路由（按模块拆分） ──────────────────────────────────────

// AI 服务商路由（即梦/SD/混元/阿里云）
app.use('/api', createAiProviderRouter({
    requireAuth, runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser,
    tencentProvider, alibabaProvider, jimengProvider, sdWebUiProvider,
}));

// 图片生成路由
app.use('/api', createImageRouter({
    requireAuth, csrfProtection, isAdminUser, getUserProviderConfig,
    logApiCall: usersDb.logApiCall,
    checkQuota: usersDb.checkQuota,
}));

// 项目管理路由
app.use('/api', createProjectRouter({ usersDb, requireAuth, csrfProtection }));

// 素材库路由
app.use('/api', createAssetLibraryRouter({ usersDb, requireAuth, csrfProtection }));

// 管理员路由（用量统计/用户管理）
app.use('/api', createAdminRouter({ usersDb, requireAuth, isAdminUser }));

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
            jimeng: !!jimengKey ? 'configured' : 'not_configured',
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
const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.json');
if (fs.existsSync(openapiPath)) {
    app.get('/api/docs', (req, res) => {
        res.json(JSON.parse(fs.readFileSync(openapiPath, 'utf-8')));
    });
}

// ── 启动服务器 ───────────────────────────────────────────────────
const PORT = process.env.PORT || API_CONFIG.proxy.port;
const server = app.listen(PORT, () => {
    console.log(`\n  Artifex API Server`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`  Docs:   http://localhost:${PORT}/api/docs\n`);
});

server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
        console.error(`\n[端口占用] ${PORT} 已被占用。可选：`);
        console.error(`  1) 关掉占用端口的进程`);
        console.error(`  2) 换端口启动：PORT=3001 node backend/proxy.js\n`);
        process.exit(1);
    }
    console.error(err);
    process.exit(1);
});
