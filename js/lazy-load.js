/**
 * Artifex - 前端懒加载工具
 * 按需加载 JS 模块，减少首屏加载时间
 */
'use strict';

const _cache = {};

/**
 * 懒加载 JS 脚本
 * @param {string} src - 脚本路径
 * @param {object} options - 选项
 * @param {boolean} options.cache - 是否缓存，默认 true
 * @returns {Promise<void>}
 */
function loadScript(src, options) {
    const opts = options || {};
    const useCache = opts.cache !== false;

    if (useCache && _cache[src]) {
        return _cache[src];
    }

    const promise = new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = function () {
            resolve();
        };
        script.onerror = function () {
            reject(new Error('加载失败: ' + src));
        };
        document.head.appendChild(script);
    });

    if (useCache) {
        _cache[src] = promise;
    }
    return promise;
}

/**
 * 批量加载脚本（并行）
 * @param {string[]} srcs - 脚本路径数组
 * @returns {Promise<void[]>}
 */
function loadScripts(srcs) {
    return Promise.all(
        srcs.map(function (src) {
            return loadScript(src);
        })
    );
}

/**
 * 条件加载：仅在元素存在时加载脚本
 * @param {string} selector - CSS 选择器
 * @param {string|string[]} srcs - 脚本路径
 * @returns {Promise<void>}
 */
function loadIfPresent(selector, srcs) {
    if (!document.querySelector(selector)) {
        return Promise.resolve();
    }
    const arr = Array.isArray(srcs) ? srcs : [srcs];
    return loadScripts(arr);
}

window.LazyLoad = {
    load: loadScript,
    loadMany: loadScripts,
    loadIfPresent: loadIfPresent,
};
