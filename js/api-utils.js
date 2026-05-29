/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 Artifex Team
 * 版本: 1.0.0 */

/**
 * API 工具函数
 * 提供 CSRF Token 获取和其他 API 辅助功能
 */

// CSRF Token 缓存
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
        'Content-Type': 'application/json',
        'X-XSRF-Token': csrfToken,
        ...(options.headers || {}),
    };
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers,
    });
}

// 导出到全局
window.getCsrfToken = getCsrfToken;
window.fetchWithCsrf = fetchWithCsrf;
