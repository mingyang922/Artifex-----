/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
/**
 * 按登录用户隔离 localStorage 键，并在各页启动前拉取 /api/me。
 * 依赖后端 express-session（proxy.js）与 cookie。
 */
'use strict';
const global = typeof window !== 'undefined' ? window : this;

function loginHtmlPath() {
    try {
        const path = String(global.location.pathname || '').replace(/\\/g, '/');
        if (path.includes('/modules/')) return '../../login.html';
        return 'login.html';
    } catch (_e) {
        return 'login.html';
    }
}

// 暴露到全局，供其他模块使用
global.loginHtmlPath = loginHtmlPath;

const GameUiUserScope = {
    userId: null,
    _ensurePromise: null,

    key: function (base) {
        if (base === null || base === '') return base;
        try {
            const id =
                this.userId !== null ? String(this.userId) : global.localStorage.getItem('gameui-session-user-id');
            return id ? base + ':u' + id : base;
        } catch (_e) {
            return base;
        }
    },

    ensure: function () {
        const self = this;
        if (this._ensurePromise) return this._ensurePromise;

        this._ensurePromise = (async function () {
            try {
                const r = await fetch('/api/me', { credentials: 'include' });
                if (r.status === 401) {
                    self.userId = null;
                    global.location.href = loginHtmlPath();
                    return;
                }
                if (!r.ok) {
                    self.userId = null;
                    return;
                }
                const data = await r.json();
                const id = data && data.id !== null ? data.id : null;
                self.userId = id;
                try {
                    if (id !== null) {
                        global.localStorage.setItem('gameui-session-user-id', String(id));
                    }
                } catch (_e) {
                    /* ignore */
                }
            } catch (e) {
                console.warn('[GameUiUserScope] ensure failed:', e);
                self.userId = null;
            }
        })();

        return this._ensurePromise;
    },
};

global.GameUiUserScope = GameUiUserScope;
