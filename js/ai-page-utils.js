/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function exposeAiPageUtils() {
    'use strict';
    function showApiErrorFactory(toastFn) {
        return function showApiError(err, httpStatus, context) {
            const msg = typeof err === 'string' ? err : err && (err.message || err.error || JSON.stringify(err));
            let title = '操作失败';
            if (httpStatus === 400) title = '参数错误';
            else if (httpStatus === 401 || httpStatus === 403) title = '权限错误';
            else if (httpStatus === 408 || httpStatus === 504) title = '请求超时';
            else if (httpStatus === 502 || httpStatus === 503) title = '服务不可用';
            else if (httpStatus >= 500) title = '服务器错误';
            else if (!httpStatus || httpStatus === 0) title = '网络错误';

            const full = `${title}${context ? '（' + context + '）' : ''}\n${msg || '未知错误'}`;
            if (typeof toastFn === 'function') {
                toastFn('error', full);
            }
            console.error(`[api-error] ${context || ''}:`, httpStatus, err);
        };
    }

    function getProxyImageUrlFactory(apiBase) {
        return function getProxyImageUrl(imageUrl) {
            if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
            if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) return imageUrl;
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                return apiBase + '/api/proxy-image?url=' + encodeURIComponent(imageUrl);
            }
            return imageUrl;
        };
    }

    function extractOriginalUrlFromProxy(proxyUrl) {
        if (!proxyUrl || typeof proxyUrl !== 'string') return null;
        try {
            const u = new URL(proxyUrl, window.location.href);
            if (!/\/api\/proxy-image$/i.test(u.pathname)) return null;
            return u.searchParams.get('url');
        } catch (_) {
            const marker = '/api/proxy-image?url=';
            const idx = proxyUrl.indexOf(marker);
            if (idx < 0) return null;
            try {
                return decodeURIComponent(proxyUrl.slice(idx + marker.length));
            } catch (_) {
                return proxyUrl.slice(idx + marker.length);
            }
        }
    }

    function fetchImageAsBlobFactory(getProxyImageUrl) {
        return function fetchImageAsBlob(imageUrl) {
            if (imageUrl.startsWith('data:')) {
                const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (!m) return Promise.reject(new Error('invalid data url'));
                const bin = atob(m[2]);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                return Promise.resolve(new Blob([arr], { type: m[1] || 'image/png' }));
            }
            const url = imageUrl.startsWith('http') ? getProxyImageUrl(imageUrl) : imageUrl;
            return fetch(url, { credentials: 'include' }).then((r) =>
                r.ok ? r.blob() : Promise.reject(new Error('fetch image failed'))
            );
        };
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    window.AiPageUtils = {
        create(options) {
            const apiBase = (options && options.apiBase) || '';
            const toast = options && options.toast;
            const getProxyImageUrl = getProxyImageUrlFactory(apiBase);
            return {
                showApiError: showApiErrorFactory(toast),
                getProxyImageUrl,
                extractOriginalUrlFromProxy,
                fetchImageAsBlob: fetchImageAsBlobFactory(getProxyImageUrl),
                loadImage,
            };
        },
    };
})();
