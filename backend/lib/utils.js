/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 共享工具函数（从 proxy.js 提取）
 */

// —— 腾讯云 CAM 密钥工具 ——

/** 腾讯云 CAM 密钥：SecretId 须为 AKID 开头（非 ak-/sk- 等其它平台格式） */
function getTencentCamCredentials(userConfig) {
    const cfg = userConfig && typeof userConfig === 'object' ? userConfig : {};
    return {
        secretId: String(cfg.secretId || process.env.TENCENT_SECRET_ID || process.env.HUNYUAN_SECRET_ID || '').trim(),
        secretKey: String(
            cfg.secretKey || process.env.TENCENT_SECRET_KEY || process.env.HUNYUAN_SECRET_KEY || ''
        ).trim(),
    };
}

function validateTencentCamCredential(secretId, secretKey) {
    const placeholders = new Set([
        'YOUR_SECRET_ID',
        'YOUR_SECRET_KEY',
        'YOUR_TENCENT_SECRET_ID',
        'YOUR_TENCENT_SECRET_KEY',
        'YOUR_HUNYUAN_SECRET_ID',
        'YOUR_HUNYUAN_SECRET_KEY',
    ]);
    if (!secretId || !secretKey || placeholders.has(secretId) || placeholders.has(secretKey)) {
        return {
            ok: false,
            code: 'not_configured',
            message:
                '未配置腾讯云密钥。请在 backend/.env 填写 TENCENT_SECRET_ID、TENCENT_SECRET_KEY（与 HUNYUAN_* 可相同），并重启后端。',
        };
    }
    if (!/^AKID/i.test(secretId)) {
        return {
            ok: false,
            code: 'invalid_format',
            message:
                '当前 SecretId 不是腾讯云 CAM 格式（应以 AKID 开头）。ak-/sk- 密钥无法用于混元生图 SDK。请到「访问管理 → API 密钥」https://console.cloud.tencent.com/cam/capi 新建密钥，复制 SecretId（AKID…）与 SecretKey 填入 .env 后重启。',
        };
    }
    return { ok: true };
}

function assertTencentCamCredential(secretId, secretKey) {
    const v = validateTencentCamCredential(secretId, secretKey);
    if (!v.ok) {
        const err = new Error(v.message);
        err.tencentValidationCode = v.code;
        throw err;
    }
}

// —— 完整的腾讯云 TC3-HMAC-SHA256 签名算法 ——

function generateSignature(
    secretId,
    secretKey,
    timestamp,
    payload,
    service = 'hunyuan',
    endpoint = 'hunyuan.tencentcloudapi.com'
) {
    const crypto = require('crypto');
    const method = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json\nhost:${endpoint}\n`;
    const signedHeaders = 'content-type;host';

    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

    const algorithm = 'TC3-HMAC-SHA256';
    const date = new Date(timestamp * 1000).toISOString().split('T')[0].replace(/-/g, '');
    const credentialScope = `${date}/${service}/tc3_request`;

    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const secretDate = crypto
        .createHmac('sha256', 'TC3' + secretKey)
        .update(date)
        .digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();

    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// —— 即梦 / 图片通用工具 ——

/** 规范化 .env 中的方舟 API Key（去 BOM、首尾空白、成对引号） */
function normalizeJimengApiKey(raw) {
    if (raw === null || raw === '') return '';
    let s = String(raw)
        .trim()
        .replace(/^\uFEFF/, '');
    s = s.replace(/^Authorization\s*:\s*/i, '').replace(/^Bearer\s+/i, '');
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    if (s && !/^sk-/i.test(s)) {
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidLike.test(s) && process.env.JIMENG_BEARER_WITHOUT_SK_PREFIX !== '1') {
            s = `sk-${s}`;
        }
    }
    if (/^sk-sk-/i.test(s)) {
        s = `sk-${s.slice(6)}`;
    }
    return s;
}

function normalizePixelSize(sizeStr) {
    const s = String(sizeStr || '')
        .toLowerCase()
        .replace(/:/g, 'x')
        .replace(/\*/g, 'x');
    const m = s.match(/(\d+)\s*x\s*(\d+)/);
    if (!m) return null;
    return `${parseInt(m[1], 10)}x${parseInt(m[2], 10)}`;
}

/**
 * 解析方舟 / 即梦图片接口返回（OpenAI 兼容 + 部分任务态字段）。
 */
function parseJimengImageResponse(data) {
    if (!data) return null;
    const ts = data.task_status;
    if (ts === 'failed' || ts === 'FAILED') {
        const msg = (data.error && (data.error.message || data.error.message_cn)) || data.message || '即梦任务失败';
        throw new Error(String(msg));
    }
    if (ts && !['succeed', 'SUCCEEDED', 'Success', 'success'].includes(ts)) {
        const t = String(ts).toLowerCase();
        if (['queued', 'running', 'pending', 'in_progress', 'submitted'].includes(t)) {
            throw new Error(
                '即梦返回异步处理中，请稍后重试；若持续出现，请对照方舟「图片生成 API」文档检查是否需 task 轮询'
            );
        }
    }
    if (Array.isArray(data.data) && data.data.length) {
        const first = data.data[0];
        if (typeof first === 'string' && /^https?:\/\//.test(first)) return first;
        if (first && typeof first.url === 'string') return first.url;
        if (first && first.b64_json) return `data:image/png;base64,${first.b64_json}`;
    }
    if (data.data && typeof data.data.url === 'string') return data.data.url;
    if (data.output && Array.isArray(data.output.images) && data.output.images[0]) {
        const im = data.output.images[0];
        if (im.url) return im.url;
        if (im.base64) return `data:image/png;base64,${im.base64}`;
    }
    if (data.images && data.images[0]) {
        const im = data.images[0];
        if (im.url) return im.url;
        if (im.b64_json) return `data:image/png;base64,${im.b64_json}`;
    }
    if (typeof data.url === 'string') return data.url;
    return null;
}

function extractJimengOutputSize(data) {
    if (!data || typeof data !== 'object') return null;

    const fromDataArr = Array.isArray(data.data) && data.data[0] && data.data[0].size;
    if (fromDataArr) return normalizePixelSize(fromDataArr);
    if (data.data && data.data.size) return normalizePixelSize(data.data.size);
    if (data.output && Array.isArray(data.output.images) && data.output.images[0] && data.output.images[0].size) {
        return normalizePixelSize(data.output.images[0].size);
    }
    if (Array.isArray(data.images) && data.images[0] && data.images[0].size) {
        return normalizePixelSize(data.images[0].size);
    }
    return null;
}

function clamp01Range(v, min, max, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

// —— 模拟 / 免费图片 ——

function generateMockImage(prompt, size) {
    const colors = ['667eea', '764ba2', 'f093fb', 'f5576c', '4facfe', '00f2fe'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const sizeStr = size || '512x512';
    const promptText = encodeURIComponent(prompt.substring(0, 20));
    return `https://via.placeholder.com/${sizeStr}/${color}/ffffff?text=${promptText}`;
}

async function callFreeImageAPI(prompt, size) {
    const axios = require('axios');
    try {
        const rawW = size ? size.split('x')[0] : '512';
        const rawH = size ? size.split('x')[1] : '512';
        // 限制图片尺寸上限，防止内存耗尽
        const width = String(Math.min(2048, Math.max(64, parseInt(rawW, 10) || 512)));
        const height = String(Math.min(2048, Math.max(64, parseInt(rawH, 10) || 512)));
        const imageId =
            Math.abs(
                prompt.split('').reduce((a, b) => {
                    a = (a << 5) - a + b.charCodeAt(0);
                    return a & a;
                }, 0)
            ) % 1000;

        try {
            const remoteUrl = `https://picsum.photos/seed/${imageId}/${width}/${height}`;
            const r = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 12000 });
            const contentType = r.headers['content-type'] || 'image/jpeg';
            const b64 = Buffer.from(r.data).toString('base64');
            return `data:${contentType};base64,${b64}`;
        } catch (e) {
            const w = Math.max(256, parseInt(width, 10) || 512);
            const h = Math.max(256, parseInt(height, 10) || 512);
            const safePrompt = String(prompt || 'FREE').slice(0, 36);
            const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect x="16" y="16" width="${w - 32}" height="${h - 32}" rx="14" fill="rgba(10,16,30,0.45)" stroke="rgba(255,255,255,0.24)"/>
  <text x="50%" y="44%" text-anchor="middle" fill="#e0f2fe" font-size="${Math.max(24, Math.round(w / 22))}" font-family="Segoe UI, Arial">FREE IMAGE</text>
  <text x="50%" y="57%" text-anchor="middle" fill="#dbeafe" font-size="${Math.max(14, Math.round(w / 48))}" font-family="Segoe UI, Arial">${safePrompt}</text>
</svg>`;
            return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
        }
    } catch (error) {
        throw new Error(`免费API调用失败: ${error.message}`);
    }
}

// —— DashScope 多模态解析 ——

function extractDashscopeMultimodalText(data) {
    if (!data || typeof data !== 'object') return null;
    const choices = data.output && data.output.choices;
    const first = Array.isArray(choices) && choices.length ? choices[0] : null;
    const msg = first && first.message;
    if (msg && msg.content) {
        if (Array.isArray(msg.content)) {
            const part = msg.content.find((x) => x && (x.text || x.type === 'text'));
            if (part && part.text) return String(part.text).trim();
        }
        if (typeof msg.content === 'string') return msg.content.trim();
    }
    if (data.output && typeof data.output.text === 'string') return data.output.text.trim();
    return null;
}

// ─── API 密钥加密 ───

const crypto = require('crypto');

// 加密密钥（优先使用 ENCRYPTION_KEY，否则使用 SESSION_SECRET）
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    if (!key && isProd) {
        console.error('FATAL: NODE_ENV=production requires ENCRYPTION_KEY or SESSION_SECRET for API key encryption.');
        process.exit(1);
    }
    if (!key) {
        console.warn('[utils] 警告: 未设置 ENCRYPTION_KEY 或 SESSION_SECRET，API 密钥加密使用默认值（仅限开发环境）');
    }
    // 确保密钥为 32 字节
    return crypto.createHash('sha256').update(key || 'artifex-dev-only-default-key').digest();
}

/**
 * 加密文本（AES-256-GCM，带认证标签，防篡改）
 * @param {string} text - 要加密的文本
 * @returns {string} 加密后的文本（IV:AuthTag:密文 格式）
 */
function encryptText(text) {
    if (!text) return '';
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * 解密文本（兼容 AES-256-GCM 和旧版 AES-256-CBC）
 * @param {string} encryptedText - 加密的文本
 * @returns {string} 解密后的文本，解密失败返回空字符串
 */
function decryptText(encryptedText) {
    if (!encryptedText) return '';
    try {
        const key = getEncryptionKey();
        const parts = encryptedText.split(':');
        // 新格式：IV:AuthTag:密文（AES-256-GCM）
        if (parts.length === 3) {
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        // 旧格式：IV:密文（AES-256-CBC，向后兼容）
        if (parts.length === 2) {
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        // 未加密的旧数据
        return encryptedText;
    } catch (e) {
        // 解密失败（密钥轮换等）返回空字符串，避免使用错误数据
        console.warn('[utils] decryptText 解密失败，可能密钥已变更:', e.message);
        return '';
    }
}

/**
 * 加密 JSON 对象中的敏感字段
 * @param {object} obj - 要加密的对象
 * @param {string[]} fields - 要加密的字段名
 * @returns {object} 加密后的对象
 */
function encryptSensitiveFields(obj, fields = ['apiKey', 'secretKey', 'secretId']) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = { ...obj };
    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string') {
            result[field] = encryptText(result[field]);
        }
    }
    return result;
}

/**
 * 解密 JSON 对象中的敏感字段
 * @param {object} obj - 要解密的对象
 * @param {string[]} fields - 要解密的字段名
 * @returns {object} 解密后的对象
 */
function decryptSensitiveFields(obj, fields = ['apiKey', 'secretKey', 'secretId']) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = { ...obj };
    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string') {
            result[field] = decryptText(result[field]);
        }
    }
    return result;
}

module.exports = {
    getTencentCamCredentials,
    validateTencentCamCredential,
    assertTencentCamCredential,
    generateSignature,
    normalizeJimengApiKey,
    normalizePixelSize,
    parseJimengImageResponse,
    extractJimengOutputSize,
    clamp01Range,
    generateMockImage,
    callFreeImageAPI,
    extractDashscopeMultimodalText,
    encryptText,
    decryptText,
    encryptSensitiveFields,
    decryptSensitiveFields,
};
