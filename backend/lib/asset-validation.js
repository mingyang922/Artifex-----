'use strict';

const MAX_ASSET_CONTENT_LENGTH = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']);

function validateImageDataUrl(content) {
    const mimeMatch = content.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) return '无效的 data URL 格式';
    const claimedMime = mimeMatch[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(claimedMime)) return `不支持的图片格式: ${claimedMime}`;
    if (claimedMime === 'image/svg+xml') return null;

    const buf = Buffer.from(content.substring(mimeMatch[0].length, mimeMatch[0].length + 20), 'base64');
    const validMagic =
        (claimedMime === 'image/png' && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) ||
        (claimedMime === 'image/jpeg' && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
        (claimedMime === 'image/gif' && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) ||
        (claimedMime === 'image/webp' &&
            buf[0] === 0x52 &&
            buf[1] === 0x49 &&
            buf[2] === 0x46 &&
            buf[3] === 0x46 &&
            buf[8] === 0x57 &&
            buf[9] === 0x45 &&
            buf[10] === 0x42 &&
            buf[11] === 0x50);
    return validMagic ? null : '图片文件头与声明的格式不匹配';
}

function validateAssetPayload(payload, options = {}) {
    const { requireContent = false } = options;
    const value = payload && typeof payload === 'object' ? payload : {};
    if (value.name !== undefined) {
        const name = String(value.name).trim();
        if (!name) return '素材名称不能为空';
        if (name.length > 200) return '素材名称最多 200 字符';
    }
    if (requireContent && !value.content) return '素材内容不能为空';
    if (value.content !== undefined) {
        if (typeof value.content !== 'string') return '素材内容必须为字符串';
        if (value.content.length > MAX_ASSET_CONTENT_LENGTH) return '素材内容过大，最大允许 10MB';
        if ((value.type || 'image') === 'image' && value.content.startsWith('data:')) {
            const imageError = validateImageDataUrl(value.content);
            if (imageError) return imageError;
        }
    }
    if (value.desc !== undefined && String(value.desc).length > 5000) return '素材描述最多 5000 字符';
    if (value.source !== undefined && String(value.source).length > 500) return '素材来源最多 500 字符';
    if (value.tags !== undefined) {
        const tags = Array.isArray(value.tags) ? value.tags : String(value.tags).split(',');
        if (tags.length > 100 || tags.some((tag) => String(tag).length > 80)) return '素材标签数量或长度超限';
    }
    if (value.metadata !== undefined && JSON.stringify(value.metadata).length > 64 * 1024) {
        return '素材元数据最大允许 64KB';
    }
    if (
        value.status !== undefined &&
        !['draft', 'pending', 'approved', 'delivered', 'archived'].includes(value.status)
    ) {
        return '无效的素材状态';
    }
    return null;
}

module.exports = { MAX_ASSET_CONTENT_LENGTH, validateAssetPayload, validateImageDataUrl };
