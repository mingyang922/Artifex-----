/** Lightweight on-demand loader for optional browser-only dependencies. */
'use strict';

(function () {
    const pending = new Map();

    function loadScript(src, ready) {
        if (ready()) return Promise.resolve();
        if (pending.has(src)) return pending.get(src);
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.addEventListener('load', () => (ready() ? resolve() : reject(new Error(`依赖未正确初始化: ${src}`))), {
                once: true,
            });
            script.addEventListener('error', () => reject(new Error(`依赖加载失败: ${src}`)), { once: true });
            document.head.appendChild(script);
        }).catch((error) => {
            pending.delete(src);
            throw error;
        });
        pending.set(src, promise);
        return promise;
    }

    async function ensureJSZip() {
        await loadScript('/vendor/jszip.min.js', () => typeof window.JSZip !== 'undefined');
        return window.JSZip;
    }

    window.ArtifexVendors = { ensureJSZip };
})();
