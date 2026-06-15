/**
 * Artifex - 全局会话超时拦截器
 * 检测 401 响应并提示用户重新登录
 */
(function () {
    'use strict';

    var _redirecting = false;

    // 静默路径：这些接口返回 401 是正常逻辑，不弹窗
    var SILENT_PATHS = [
        '/api/me',
        '/api/csrf-token',
        '/api/health',
    ];

    function isSilentRequest(url) {
        if (typeof url !== 'string') return false;
        return SILENT_PATHS.some(function (p) { return url.includes(p); });
    }

    // 拦截 fetch，检测 401 响应
    var originalFetch = window.fetch;
    window.fetch = function () {
        var args = arguments;
        return originalFetch.apply(this, args).then(function (response) {
            if (response.status === 401 && !_redirecting) {
                // 静默请求不弹窗
                if (isSilentRequest(args[0])) return response;

                _redirecting = true;
                if (window.TechUI && typeof window.TechUI.toast === 'function') {
                    window.TechUI.toast('会话已过期，请重新登录', 'warn');
                }
                setTimeout(function () {
                    window.location.href = '/login.html';
                }, 1500);
            }
            return response;
        });
    };

    // 监听网络状态变化
    window.addEventListener('offline', function () {
        if (window.TechUI && typeof window.TechUI.toast === 'function') {
            window.TechUI.toast('网络已断开，请检查网络连接', 'warn');
        }
    });

    window.addEventListener('online', function () {
        if (window.TechUI && typeof window.TechUI.toast === 'function') {
            window.TechUI.toast('网络已恢复', 'success');
        }
    });
})();
