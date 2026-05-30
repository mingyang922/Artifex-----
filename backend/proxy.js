/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
'use strict';

const express = require('express');
const axios = require('axios');
const path = require('path');
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
        secure: isProd, // 生产环境强制 HTTPS
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

// ── 业务路由 ─────────────────────────────────────────────────────

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

// 腾讯混元
const _tencentDeps = { runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser };
app.post('/api/hunyuan-proxy', requireAuth, (req, res) => tencentProvider.handleHunyuanProxy(req, res, _tencentDeps));

// 图片生成路由
app.use('/api', createImageRouter({
    requireAuth, csrfProtection, isAdminUser, getUserProviderConfig,
    logApiCall: usersDb.logApiCall,
    checkQuota: usersDb.checkQuota,
}));

// SD Web UI / 即梦状态
app.get('/api/sd-webui/status', requireAuth, (req, res) => sdWebUiProvider.handleSdWebUiStatus(req, res, { getUserProviderConfig }));
app.get('/api/jimeng/status', requireAuth, (req, res) => jimengProvider.handleJimengStatus(req, res, { getUserProviderConfig }));
app.get('/api/jimeng/live-test', requireAuth, (req, res) => jimengProvider.handleJimengLiveTest(req, res, { getUserProviderConfig }));
app.post('/api/sd-webui/txt2img', requireAuth, (req, res) => sdWebUiProvider.handleSdWebUiTxt2Img(req, res, { getUserProviderConfig }));

// 阿里云
app.post('/api/alibaba-proxy', requireAuth, (req, res) =>
    alibabaProvider.handleAlibabaProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig })
);
app.post('/api/alibaba-vision-proxy', requireAuth, (req, res) =>
    alibabaProvider.handleAlibabaVisionProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig })
);

// 腾讯云状态
app.get('/api/tencent/status', requireAuth, (req, res) => tencentProvider.handleTencentStatus(req, res, { getUserProviderConfig }));

// ─── 用量统计 API ───

// 用户自己的用量
app.get('/api/me/usage', requireAuth, (req, res) => {
    const stats = usersDb.getUserUsageStats(req.currentUser.id);
    const today = usersDb.getUserUsageToday(req.currentUser.id);
    res.json({ ok: true, stats, today });
});

// 管理员：全局用量
app.get('/api/admin/usage', requireAuth, (req, res) => {
    if (!isAdminUser(req.currentUser)) {
        return res.status(403).json({ error: '权限不足' });
    }
    const summary = usersDb.getGlobalUsageSummary();
    const details = usersDb.getGlobalUsageStats();
    res.json({ ok: true, summary, details });
});

// 管理员：用户列表
app.get('/api/admin/users', requireAuth, (req, res) => {
    if (!isAdminUser(req.currentUser)) {
        return res.status(403).json({ error: '权限不足' });
    }
    const users = usersDb.getAllUsers();
    res.json({ ok: true, users });
});

// ─── 项目管理 API ───

// 获取用户所有项目（支持分页）
app.get('/api/projects', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const total = usersDb.getProjectCount(req.currentUser.id);
    const projects = usersDb.getUserProjects(req.currentUser.id, limit, offset);
    res.json({ ok: true, projects, total, page, limit });
});

// 创建项目
app.post('/api/projects', requireAuth, csrfProtection, (req, res) => {
    const { name, description, type } = req.body || {};
    if (!name || !name.trim()) {
        return res.status(400).json({ error: '项目名称不能为空' });
    }
    const project = usersDb.createProject(req.currentUser.id, name.trim(), description, type);
    res.json({ ok: true, project });
});

// 更新项目
app.put('/api/projects/:id', requireAuth, csrfProtection, (req, res) => {
    const { name, description, type, versionDesc } = req.body || {};
    const project = usersDb.updateProject(req.params.id, req.currentUser.id, { name, description, type, versionDesc });
    if (!project) {
        return res.status(404).json({ error: '项目不存在' });
    }
    res.json({ ok: true, project });
});

// 删除项目
app.delete('/api/projects/:id', requireAuth, csrfProtection, (req, res) => {
    usersDb.deleteProject(req.params.id, req.currentUser.id);
    res.json({ ok: true });
});

// ─── 项目素材 API ───

// 添加素材
app.post('/api/projects/:id/assets', requireAuth, csrfProtection, (req, res) => {
    const { name, type, content } = req.body || {};
    if (!name || !content) {
        return res.status(400).json({ error: '素材名称和内容不能为空' });
    }
    // 限制单个素材内容大小不超过 10MB
    const MAX_ASSET_SIZE = 10 * 1024 * 1024;
    if (typeof content === 'string' && content.length > MAX_ASSET_SIZE) {
        return res.status(413).json({ error: '素材内容过大，最大允许 10MB' });
    }

    // 图片格式验证
    if (typeof content === 'string' && content.startsWith('data:')) {
        const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
        const mimeMatch = content.match(/^data:([^;]+);base64,/);
        if (!mimeMatch) {
            return res.status(400).json({ error: '无效的 data URL 格式' });
        }
        const claimedMime = mimeMatch[1].toLowerCase();
        if (!ALLOWED_MIME.includes(claimedMime)) {
            return res.status(400).json({ error: `不支持的图片格式: ${claimedMime}，允许: ${ALLOWED_MIME.join(', ')}` });
        }
        // SVG 无需 magic bytes 验证
        if (claimedMime !== 'image/svg+xml') {
            const base64Data = content.substring(mimeMatch[0].length);
            const buf = Buffer.from(base64Data.substring(0, 12), 'base64');
            if (buf.length < 4) {
                return res.status(400).json({ error: '图片数据过短，无法验证格式' });
            }
            const validMagic =
                (claimedMime === 'image/png'  && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) ||
                (claimedMime === 'image/jpeg' && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) ||
                (claimedMime === 'image/gif'  && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) ||
                (claimedMime === 'image/webp' && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
                    buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50);
            if (!validMagic) {
                return res.status(400).json({ error: '图片文件头(magic bytes)与声明的格式不匹配' });
            }
        }
    }

    const asset = usersDb.addProjectAsset(req.params.id, req.currentUser.id, name, type, content);
    res.json({ ok: true, asset });
});

// 删除素材
app.delete('/api/assets/:id', requireAuth, csrfProtection, (req, res) => {
    usersDb.deleteProjectAsset(req.params.id, req.currentUser.id);
    res.json({ ok: true });
});

// ─── 素材库 API ───

// 获取用户素材库（支持分页）
app.get('/api/asset-library', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const total = usersDb.getAssetLibraryCount(req.currentUser.id);
    const assets = usersDb.getAssetLibrary(req.currentUser.id, limit, offset);
    res.json({ ok: true, assets, total, page, limit });
});

// 添加素材
app.post('/api/asset-library', requireAuth, csrfProtection, (req, res) => {
    const { name, type, content, desc, source, tags } = req.body || {};
    if (!name || !content) {
        return res.status(400).json({ error: '素材名称和内容不能为空' });
    }
    const MAX_ASSET_SIZE = 10 * 1024 * 1024;
    if (typeof content === 'string' && content.length > MAX_ASSET_SIZE) {
        return res.status(413).json({ error: '素材内容过大，最大允许 10MB' });
    }
    const item = usersDb.addAssetLibraryItem(req.currentUser.id, { name, type, content, desc, source, tags });
    res.json({ ok: true, item });
});

// 更新素材
app.put('/api/asset-library/:id', requireAuth, csrfProtection, (req, res) => {
    const updates = req.body || {};
    const item = usersDb.updateAssetLibraryItem(req.currentUser.id, req.params.id, updates);
    if (!item) {
        return res.status(404).json({ error: '素材不存在' });
    }
    res.json({ ok: true, item });
});

// 删除素材
app.delete('/api/asset-library/:id', requireAuth, csrfProtection, (req, res) => {
    usersDb.deleteAssetLibraryItem(req.currentUser.id, req.params.id);
    res.json({ ok: true });
});

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
const fs = require('fs');
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
