/**
 * Artifex - 全局会话超时拦截器
 * 检测 401 响应并提示用户重新登录
 */
(function () {
    'use strict';

    let _redirecting = false;

    // 拦截 fetch，检测 401 响应
    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(function (response) {
            if (response.status === 401 && !_redirecting) {
                _redirecting = true;
                // 静默 401（如 /api/me 初始检查）不弹窗，只在用户操作时弹窗
                const url = arguments[0];
                const isSilent = typeof url === 'string' && url.includes('/api/me') && !arguments[1];
                if (!isSilent) {
                    if (window.TechUI && typeof window.TechUI.toast === 'function') {
                        window.TechUI.toast('会话已过期，请重新登录', 'warn');
                    }
                    setTimeout(function () {
                        window.location.href = '/login.html';
                    }, 1500);
                }
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
