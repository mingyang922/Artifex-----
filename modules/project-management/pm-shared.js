/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
(function exposePmShared() {
    'use strict';
    function tr(key, fallback) {
        if (!window.i18n) return fallback;
        const translated = window.i18n.t(key);
        return translated === key ? fallback : translated;
    }
    function pmStorageKey(base) {
        if (typeof GameUiUserScope !== 'undefined' && typeof GameUiUserScope.key === 'function') {
            return GameUiUserScope.key(base);
        }
        try {
            const id = localStorage.getItem('gameui-session-user-id');
            return id ? base + ':u' + id : base;
        } catch (_) {
            return base;
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function debounced() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    function showTechPrompt(options) {
        if (window.TechUI) {
            const opts = Object.assign(
                {
                    title: tr('common.prompt', '操作提示'),
                    message: '',
                    confirmText: tr('common.confirm', '确定'),
                    cancelText: tr('common.cancel', '取消'),
                    showCancel: false,
                },
                options || {}
            );
            if (opts.showCancel) {
                return window.TechUI.confirm(opts.message, opts.title, opts.confirmText, opts.cancelText);
            }
            return window.TechUI.alert(opts.message, opts.title);
        }

        const opts = Object.assign(
            {
                title: tr('common.prompt', '操作提示'),
                message: '',
                confirmText: tr('common.confirm', '确定'),
                cancelText: tr('common.cancel', '取消'),
                showCancel: false,
            },
            options || {}
        );

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText =
                'position:fixed;inset:0;background:rgba(2,8,20,0.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
            const box = document.createElement('div');
            box.style.cssText =
                'width:min(520px,92vw);background:linear-gradient(165deg,#121a2e 0%,#0c1220 100%);border:1px solid rgba(0,240,255,0.25);border-radius:10px;box-shadow:0 24px 64px rgba(0,0,0,0.55),0 0 36px rgba(0,240,255,0.1);color:#e8ecf4;font-family:"Rajdhani","Segoe UI",sans-serif;';

            const header = document.createElement('div');
            header.style.cssText =
                'padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08);font-family:"Orbitron","Segoe UI",sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#00f0ff;';
            header.textContent = opts.title;

            const body = document.createElement('div');
            body.style.cssText = 'padding:14px 16px;line-height:1.55;font-size:16px;white-space:normal;';
            String(opts.message || '')
                .split('\n')
                .forEach((line) => {
                    const p = document.createElement('div');
                    p.textContent = line;
                    body.appendChild(p);
                });

            const footer = document.createElement('div');
            footer.style.cssText =
                'padding:14px 16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:10px;justify-content:flex-end;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = opts.cancelText;
            cancelBtn.style.cssText =
                'display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:6px;border:1px solid rgba(0,240,255,0.2);background:rgba(255,255,255,0.04);color:#e8ecf4;cursor:pointer;font-family:"Rajdhani","Segoe UI",sans-serif;font-size:14px;font-weight:600;';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = opts.confirmText;
            confirmBtn.style.cssText =
                'display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:6px;border:1px solid rgba(0,240,255,0.45);background:linear-gradient(135deg,#00f0ff 0%,#0099cc 100%);color:#050810;cursor:pointer;font-family:"Orbitron","Segoe UI",sans-serif;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;';

            let done = false;
            const close = (result) => {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKeydown);
                overlay.remove();
                resolve(result);
            };
            const onKeydown = (e) => {
                if (e.key === 'Escape') close(false);
            };
            document.addEventListener('keydown', onKeydown);

            confirmBtn.addEventListener('click', () => close(true));
            cancelBtn.addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });

            if (opts.showCancel) {
                footer.appendChild(cancelBtn);
            }
            footer.appendChild(confirmBtn);
            box.appendChild(header);
            box.appendChild(body);
            box.appendChild(footer);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        });
    }

    function uiToast(message, type = 'success') {
        if (window.TechUI && typeof window.TechUI.toast === 'function') {
            window.TechUI.toast(message, type);
            return;
        }
        // 简单 DOM toast 回退
        const el = document.createElement('div');
        el.textContent = message;
        el.style.cssText =
            'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;z-index:10000;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
            (type === 'error' ? 'background:#e74c3c;' : 'background:#52c41a;');
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function formatDate(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return '-';
        const locales = { zh: 'zh-CN', zht: 'zh-TW', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };
        const lang = window.i18n ? window.i18n.getLanguage() : 'zh';
        return new Intl.DateTimeFormat(locales[lang] || 'zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }

    function getProjectTypeName(type) {
        const map = {
            ui: tr('pm.typeUi', 'UI设计'),
            game: tr('pm.typeGame', '游戏界面'),
            character: tr('pm.typeCharacter', '角色设计'),
            environment: tr('pm.typeEnvironment', '场景设计'),
            action: tr('pm.typeAction', '动作游戏'),
            roleplay: tr('pm.typeRoleplay', '角色扮演'),
            strategy: tr('pm.typeStrategy', '策略游戏'),
            simulation: tr('pm.typeSimulation', '模拟经营'),
            puzzle: tr('pm.typePuzzle', '益智解谜'),
            other: tr('pm.typeOther', '其他'),
        };
        return map[type] || type || tr('pm.uncategorized', '未分类');
    }

    function getAssetTypeName(type) {
        const map = {
            image: tr('pm.assetImage', '图片'),
            icon: tr('pm.assetIcon', '图标'),
            button: tr('pm.assetButton', '按钮'),
            component: tr('pm.assetComponent', '组件'),
            character: tr('pm.assetCharacter', '角色'),
            scene: tr('pm.assetEnvironment', '场景'),
            environment: tr('pm.assetEnvironment', '场景'),
            prop: tr('pm.assetProp', '道具'),
            ui: 'UI',
            effect: tr('pm.assetEffect', '特效'),
            animation: tr('pm.assetAnimation', '动画'),
            other: tr('pm.typeOther', '其他'),
        };
        return map[type] || type || tr('pm.uncategorized', '未分类');
    }

    // escapeHtml 由 js/html-utils.js 提供（全局函数）
    function escapeHtml(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.PMShared = {
        pmStorageKey,
        debounce,
        showTechPrompt,
        uiToast,
        formatDate,
        getProjectTypeName,
        getAssetTypeName,
        escapeHtml,
    };
})();
