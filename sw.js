/**
 * Artifex - Service Worker
 * 提供静态资源缓存和离线支持
 */

const CACHE_NAME = 'artifex-v1.3.3';
const MAX_CACHE_SIZE = 200; // 最大缓存条目数
const STATIC_ASSETS = [
    '/',
    '/login.html',
    '/dashboard.html',
    '/styles/ui-kit.css',
    '/styles/dashboard.css',
    '/styles/app-shell.css',
    '/vendor/css/font-awesome.min.css',
    '/vendor/css/google-fonts.css',
    '/vendor/jszip.min.js',
    '/manifest.json',
    '/vendor/images/app-icon.svg',
];

/**
 * 加载构建时生成的预缓存清单
 * 优先使用 sw-manifest.json（由 scripts/generate-sw-manifest.js 生成），
 * 若不存在则回退到上方的 STATIC_ASSETS 硬编码列表。
 */
async function loadPrecacheList() {
    try {
        const resp = await fetch('/sw-manifest.json', { cache: 'no-store' });
        if (resp.ok) {
            const manifest = await resp.json();
            console.log('[SW] Loaded manifest with', manifest.assets.length, 'assets');
            return manifest.assets;
        }
    } catch (_) {
        // manifest 文件不存在或网络异常，使用静态列表
    }
    console.log('[SW] Using hardcoded STATIC_ASSETS fallback');
    return STATIC_ASSETS;
}

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        loadPrecacheList().then((assets) => {
            return caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll(assets);
            });
        })
    );
    self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

/**
 * 限制缓存条目数量，防止无限增长
 */
async function trimCache(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxSize) {
        // 删除最旧的条目（FIFO）
        const toDelete = keys.slice(0, keys.length - maxSize);
        await Promise.all(toDelete.map((key) => cache.delete(key)));
    }
}

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳过 API 请求（需要实时数据）
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // 跳过非 GET 请求
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // 返回缓存，同时后台更新（stale-while-revalidate）
                fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse.ok) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseClone);
                                trimCache(CACHE_NAME, MAX_CACHE_SIZE);
                            });
                        }
                    })
                    .catch(() => {});

                return cachedResponse;
            }

            // 没有缓存，从网络获取
            return fetch(request)
                .then((networkResponse) => {
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                            trimCache(CACHE_NAME, MAX_CACHE_SIZE);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // 网络失败且无缓存，返回离线页面
                    if (request.destination === 'document') {
                        // 优先返回 dashboard（已认证用户更可能在 dashboard），其次 login
                        return caches.match('/dashboard.html')
                            .then((resp) => resp || caches.match('/login.html'));
                    }
                    return new Response('Offline', { status: 503 });
                });
        })
    );
});
