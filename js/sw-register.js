/**
 * Artifex - Service Worker 注册
 * 在生产环境注册 Service Worker，支持更新检测
 */
'use strict';

if (
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.debug('[SW] 注册成功:', registration.scope);

                // 检测 Service Worker 更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 新版本已安装，提示用户刷新
                            console.info('[SW] 新版本可用，建议刷新页面');
                            if (window.TechUI && typeof window.TechUI.toast === 'function') {
                                window.TechUI.toast('应用已更新，刷新页面以获取最新版本', 'info');
                            }
                        }
                    });
                });

                // 定期检查更新（每 30 分钟）
                setInterval(
                    () => {
                        registration.update().catch(() => {});
                    },
                    30 * 60 * 1000
                );
            })
            .catch((error) => {
                console.debug('[SW] 注册失败:', error);
            });
    });
}
