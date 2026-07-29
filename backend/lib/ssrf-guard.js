/**
 * Artifex — SSRF 防护：内网/保留地址检测
 * 从 image-proxy.js 提取，供 jimeng.js 等模块复用，避免循环依赖
 */
'use strict';

/** 内网/保留地址匹配模式 */
const BLOCKED_HOSTNAME_PATTERNS = [
    /^127\./,           // 127.x.x.x
    /^10\./,            // 10.x.x.x
    /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16-31.x.x
    /^192\.168\./,      // 192.168.x.x
    /^169\.254\./,      // 169.254.x.x (云元数据)
    /^0\./,             // 0.x.x.x
    /^0\.0\.0\.0$/,     // 0.0.0.0
    /^localhost$/i,     // localhost
    /^::1$/,            // IPv6 localhost
    /^::ffff:/i,        // IPv4-mapped IPv6 地址（防 SSRF 绕过）
    /^::$/,             // IPv6 未指定地址
];

/**
 * 检查主机名是否为内网/保留地址（SSRF 防护）
 * @param {string} hostname
 * @returns {boolean}
 */
function isBlockedHostname(hostname) {
    const normalized = String(hostname || '')
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '')
        .toLowerCase();
    if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

    // IPv6 ULA 为 fc00::/7，链路本地地址为 fe80::/10。只匹配
    // fc00/fd00/fe80 会遗漏这些网段中的大多数合法文本表示。
    if (normalized.includes(':')) {
        const firstHextet = Number.parseInt(normalized.split(':', 1)[0] || '0', 16);
        if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true;
        if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
    }
    return false;
}

module.exports = { isBlockedHostname, BLOCKED_HOSTNAME_PATTERNS };
