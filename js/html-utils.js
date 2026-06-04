/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * HTML 工具函数 - 共享模块
 * 提供统一的 HTML 转义等工具函数，避免多文件重复定义
 */
(function () {
    var HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    /**
     * 转义 HTML 特殊字符，防止 XSS
     * @param {*} str - 要转义的值（会先转为字符串）
     * @returns {string} 转义后的安全字符串
     */
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, function (ch) { return HTML_ESCAPE_MAP[ch]; });
    }

    /**
     * 转义 JS 字符串中的特殊字符（用于 onclick 等内联事件处理器）
     * @param {string} str - 要转义的字符串
     * @returns {string} 转义后的安全字符串
     */
    function escapeJsStr(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/</g, '\\x3c').replace(/>/g, '\\x3e');
    }

    // 暴露到全局
    window.HtmlUtils = { escapeHtml: escapeHtml, escapeJsStr: escapeJsStr };

    // 兼容：如果全局还没有 escapeHtml 函数，自动注册
    if (typeof window.escapeHtml !== 'function') {
        window.escapeHtml = escapeHtml;
    }
})();
