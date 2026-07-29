/** IndexedDB storage for large transient image payloads. */
'use strict';

(function () {
    const DB_NAME = 'artifex-image-state';
    const STORE_NAME = 'images';
    let dbPromise = null;

    function open() {
        if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB 不可用'));
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                        request.result.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'));
            });
        }
        return dbPromise;
    }

    async function run(mode, operation) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const request = operation(tx.objectStore(STORE_NAME));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB 操作失败'));
        });
    }

    const get = (key) => run('readonly', (store) => store.get(key));
    const set = (key, value) => run('readwrite', (store) => store.put(value, key));
    const remove = (key) => run('readwrite', (store) => store.delete(key));

    window.ImageStateStore = { get, set, remove };
})();
