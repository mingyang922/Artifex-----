/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

let _csrfToken = null;
let _csrfTokenTime = 0;
const CSRF_TOKEN_TTL = 50 * 60 * 1000; // 50 分钟

/**
 * 获取 CSRF Token（带缓存）
 * @returns {Promise<string>} CSRF Token
 */
async function getCsrfToken() {
    const now = Date.now();
    if (_csrfToken && (now - _csrfTokenTime) < CSRF_TOKEN_TTL) {
        return _csrfToken;
    }
    try {
        const r = await fetch('/api/csrf-token', { credentials: 'include' });
        const data = await r.json();
        _csrfToken = data.csrfToken || '';
        _csrfTokenTime = now;
        return _csrfToken;
    } catch (e) {
        console.warn('[Artifex] 获取 CSRF Token 失败:', e);
        return '';
    }
}

/**
 * 发送带 CSRF Token 的请求
 * @param {string} url - 请求 URL
 * @param {object} options - fetch 选项
 * @returns {Promise<Response>}
 */
async function fetchWithCsrf(url, options = {}) {
    const csrfToken = await getCsrfToken();
    const headers = {
        'X-XSRF-Token': csrfToken,
        ...(options.headers || {}),
    };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers,
    });
}

window.getCsrfToken = getCsrfToken;
window.fetchWithCsrf = fetchWithCsrf;

// 全局错误监控
window.addEventListener('error', function(event) {
    console.error('[Artifex Error]', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
    });
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('[Artifex Unhandled Promise]', {
        reason: event.reason ? String(event.reason) : 'Unknown',
        timestamp: new Date().toISOString(),
    });
});
