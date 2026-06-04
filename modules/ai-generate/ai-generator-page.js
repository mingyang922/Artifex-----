/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function ensureLocalServerEntry() {
    'use strict';
    try {
        const targetOrigin = 'http://127.0.0.1:3000';
        const isTarget = window.location.origin === targetOrigin;
        const shouldRedirect =
            window.location.protocol === 'file:' ||
            (window.location.hostname === '127.0.0.1' && window.location.port !== '3000');
        if (!isTarget && shouldRedirect) {
            const mark = sessionStorage.getItem('ai_gen_auto_redirected');
            if (mark !== '1') {
                sessionStorage.setItem('ai_gen_auto_redirected', '1');
                const targetUrl =
                    targetOrigin +
                    '/modules/ai-generate/ai-generator-new.html' +
                    (window.location.search || '') +
                    (window.location.hash || '');
                window.location.replace(targetUrl);
            }
        } else {
            sessionStorage.removeItem('ai_gen_auto_redirected');
        }
    } catch (_) {}
})();

// 角色动作组：多动作生成 + LPC 风格导出（Spritesheet / ZIP / Credits）
window.lastActionGroupResult = null;
/** 须通过 http(s) 访问平台（如 http://localhost:3000），勿用 file:// 直接打开；否则回退到本机 Node 端口 */
const API_BASE = (function () {
    const customApiBase = (window.__GAME_API_BASE__ || localStorage.getItem('GAME_API_BASE') || '')
        .trim()
        .replace(/\/$/, '');
    if (customApiBase) return customApiBase;
    const o = window.location.origin;
    if (window.location.protocol === 'file:' || !o || o === 'null') {
        return 'http://127.0.0.1:3000';
    }
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalHost && window.location.port && window.location.port !== '3000') {
        // 本地开发常见：前端在 5500/8080，后端固定 3000
        return 'http://127.0.0.1:3000';
    }
    return o;
})();

const aiPageUtils =
    window.AiPageUtils && typeof window.AiPageUtils.create === 'function'
        ? window.AiPageUtils.create({ apiBase: API_BASE, toast: themedToast })
        : null;
const showApiError = aiPageUtils ? aiPageUtils.showApiError : () => {};
const getProxyImageUrl = aiPageUtils ? aiPageUtils.getProxyImageUrl : (v) => v;
const extractOriginalUrlFromProxy = aiPageUtils ? aiPageUtils.extractOriginalUrlFromProxy : () => null;
const fetchImageAsBlob = aiPageUtils ? aiPageUtils.fetchImageAsBlob : () => Promise.reject(new Error('utils missing'));
const loadImage = aiPageUtils ? aiPageUtils.loadImage : () => Promise.reject(new Error('utils missing'));

let imagePreviewOverlay, imagePreviewModalImg, previewZoomInBtn, previewZoomOutBtn, previewZoomResetBtn, previewCloseBtn;
let imagePreviewScale = 1;

function updatePreviewScale(nextScale) {
    imagePreviewScale = Math.min(4, Math.max(0.4, nextScale));
    if (imagePreviewModalImg) imagePreviewModalImg.style.setProperty('--preview-scale', String(imagePreviewScale));
}

function openImagePreview(src) {
    if (!src || !imagePreviewOverlay || !imagePreviewModalImg) return;
    imagePreviewModalImg.src = src;
    imagePreviewOverlay.classList.add('is-open');
    imagePreviewOverlay.setAttribute('aria-hidden', 'false');
    updatePreviewScale(1);
}

function closeImagePreview() {
    if (!imagePreviewOverlay || !imagePreviewModalImg) return;
    imagePreviewOverlay.classList.remove('is-open');
    imagePreviewOverlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
        if (!imagePreviewOverlay.classList.contains('is-open')) {
            imagePreviewModalImg.src = '';
        }
    }, 220);
}

function initImagePreview() {
    imagePreviewOverlay = document.getElementById('imagePreviewOverlay');
    imagePreviewModalImg = document.getElementById('imagePreviewModalImg');
    previewZoomInBtn = document.getElementById('previewZoomInBtn');
    previewZoomOutBtn = document.getElementById('previewZoomOutBtn');
    previewZoomResetBtn = document.getElementById('previewZoomResetBtn');
    previewCloseBtn = document.getElementById('previewCloseBtn');

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const img = target.closest(
            '#actionThreeViewResult img, #actionGroupPreview img, #result-body img, #generatedAssets img'
        );
        if (img && img instanceof HTMLImageElement && img.src) {
            img.classList.add('previewable-image');
            openImagePreview(img.src);
        }
    });

    if (imagePreviewOverlay) {
        imagePreviewOverlay.addEventListener('click', (event) => {
            if (event.target === imagePreviewOverlay) {
                closeImagePreview();
            }
        });
    }
    if (previewCloseBtn) previewCloseBtn.addEventListener('click', closeImagePreview);
    if (previewZoomInBtn) previewZoomInBtn.addEventListener('click', () => updatePreviewScale(imagePreviewScale + 0.2));
    if (previewZoomOutBtn) previewZoomOutBtn.addEventListener('click', () => updatePreviewScale(imagePreviewScale - 0.2));
    if (previewZoomResetBtn) previewZoomResetBtn.addEventListener('click', () => updatePreviewScale(1));
    if (imagePreviewModalImg) {
        imagePreviewModalImg.addEventListener(
            'wheel',
            (event) => {
                event.preventDefault();
                const delta = event.deltaY > 0 ? -0.12 : 0.12;
                updatePreviewScale(imagePreviewScale + delta);
            },
            { passive: false }
        );
    }
    document.addEventListener('keydown', (event) => {
        if (!imagePreviewOverlay || !imagePreviewOverlay.classList.contains('is-open')) return;
        if (event.key === 'Escape') closeImagePreview();
        if (event.key === '+' || event.key === '=') updatePreviewScale(imagePreviewScale + 0.15);
        if (event.key === '-') updatePreviewScale(imagePreviewScale - 0.15);
        if (event.key === '0') updatePreviewScale(1);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImagePreview);
} else {
    initImagePreview();
}


function aiStorageKey(base) {
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

function readScopedJson(base, fallback) {
    try {
        const raw = localStorage.getItem(aiStorageKey(base));
        return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
        return fallback;
    }
}

function writeScopedJson(base, value) {
    localStorage.setItem(aiStorageKey(base), JSON.stringify(value));
}

function themedToast(kind, message) {
    const wrapId = 'ae-center-toast-wrap';
    let wrap = document.getElementById(wrapId);
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = wrapId;
        wrap.style.cssText =
            'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:99999;';
        document.body.appendChild(wrap);
    }

    const palette = {
        success: {
            border: 'rgba(0,240,255,0.48)',
            glow: 'rgba(0,240,255,0.25)',
            color: '#e9fbff',
        },
        error: {
            border: 'rgba(0,210,255,0.45)',
            glow: 'rgba(0,210,255,0.22)',
            color: '#dff8ff',
        },
        warn: {
            border: 'rgba(0,220,255,0.45)',
            glow: 'rgba(0,220,255,0.2)',
            color: '#ddf7ff',
        },
    };
    const tone = palette[kind] || palette.success;
    const node = document.createElement('div');
    node.textContent = message || '操作成功';
    node.style.cssText = `max-width:min(560px,86vw);padding:12px 18px;border-radius:10px;border:1px solid ${tone.border};background:linear-gradient(165deg,rgba(12,22,40,0.95) 0%,rgba(6,12,24,0.94) 100%);box-shadow:0 16px 44px rgba(0,0,0,0.45),0 0 28px ${tone.glow};color:${tone.color};font-family:"Rajdhani","Segoe UI",sans-serif;font-size:17px;font-weight:600;letter-spacing:0.02em;line-height:1.5;text-align:center;white-space:pre-wrap;opacity:0;transform:translateY(8px) scale(0.98);transition:opacity .18s ease,transform .18s ease;`;
    wrap.appendChild(node);

    requestAnimationFrame(() => {
        node.style.opacity = '1';
        node.style.transform = 'translateY(0) scale(1)';
    });

    const stayMs = kind === 'error' || kind === 'warn' ? 2800 : 1900;
    setTimeout(() => {
        node.style.opacity = '0';
        node.style.transform = 'translateY(-6px) scale(0.98)';
        setTimeout(() => {
            node.remove();
            if (!wrap.children.length) wrap.remove();
        }, 220);
    }, stayMs);
}

function themedSuccess(message) {
    themedToast('success', message || '操作成功');
}

function themedError(message) {
    themedToast('error', message || '操作失败');
}

function themedWarn(message) {
    themedToast('warn', message || '请检查输入后重试');
}

/* ── 保存到素材库的公共辅助 ── */
async function saveAssetToLibrary(entry) {
    try {
        const body = {
            name: entry.name || '',
            type: entry.type || 'image/png',
            content: entry.dataURL || '',
            desc: entry.fileName || '',
            source: entry.source || 'action-group',
            tags: JSON.stringify({ category: entry.category || '角色动作组', fileName: entry.fileName || '' }),
        };
        const resp = await fetchWithCsrf('/api/asset-library', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || '保存失败');
        }
    } catch (e) {
        console.warn('保存到服务器素材库失败，回退到 localStorage：', e);
        // Fallback to localStorage
        let state = { categories: [], assets: [] };
        try {
            state = JSON.parse(localStorage.getItem(aiStorageKey('assetLibrary_v1')) || '{}');
        } catch (_) {}
        state.categories = Array.isArray(state.categories) ? state.categories : [];
        state.assets = Array.isArray(state.assets) ? state.assets : [];
        if (!state.categories.includes('角色动作组')) state.categories.unshift('角色动作组');
        state.assets.unshift(entry);
        localStorage.setItem(aiStorageKey('assetLibrary_v1'), JSON.stringify(state));
    }
}

function imgUrlToDataURL(imageUrl) {
    return new Promise((resolve, reject) => {
        if (imageUrl.startsWith('data:')) {
            resolve(imageUrl);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const cx = c.getContext('2d');
            cx.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('图片转换失败'));
        img.src = getProxyImageUrl(imageUrl);
    });
}

/* 三视图 → 素材库 */
document.getElementById('saveThreeViewToLib').addEventListener('click', async function () {
    if (!window.lastThreeViewImageUrl) {
        themedWarn('请先生成三视图');
        return;
    }
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中…';
    try {
        const dataURL = await imgUrlToDataURL(window.lastThreeViewImageUrl);
        saveAssetToLibrary({
            id: 'tv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: '三视图_' + new Date().toLocaleString('zh-CN'),
            fileName: 'three_view_' + Date.now() + '.png',
            category: '角色动作组',
            type: 'image/png',
            dataURL: dataURL,
            favorite: false,
            createdAt: Date.now(),
            source: 'three-view',
        });
        themedSuccess('三视图已保存到素材库！可在「素材库」或「资产微调」中查看。');
    } catch (e) {
        console.error(e);
        themedError('保存失败：' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> 保存到素材库';
    }
});

/* Spritesheet → 素材库 */
document.getElementById('saveSpritesheetToLib').addEventListener('click', async function () {
    const r = window.lastActionGroupResult;
    if (!r || !r.frames.length) {
        themedWarn('请先完成一次「批量生成动作组」');
        return;
    }
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 拼合并保存中…';
    try {
        const cols = r.framesPer;
        const rows = r.actions.length;
        const c = document.createElement('canvas');
        c.width = cols * r.frameWidth;
        c.height = rows * r.frameHeight;
        const ctx = c.getContext('2d');
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const frame = r.frames.find((f) => f.action === r.actions[row] && f.frameIndex === col);
                if (!frame) continue;
                const img = await loadImage(getProxyImageUrl(frame.imageUrl));
                ctx.drawImage(img, col * r.frameWidth, row * r.frameHeight, r.frameWidth, r.frameHeight);
            }
        }
        const dataURL = c.toDataURL('image/png');
        saveAssetToLibrary({
            id: 'ss_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: 'Spritesheet_' + r.actions.join('+') + '_' + new Date().toLocaleString('zh-CN'),
            fileName: 'spritesheet_' + Date.now() + '.png',
            category: '角色动作组',
            type: 'image/png',
            dataURL: dataURL,
            favorite: false,
            createdAt: Date.now(),
            source: 'action-spritesheet',
            meta: { actions: r.actions, framesPer: r.framesPer, frameWidth: r.frameWidth, frameHeight: r.frameHeight },
        });
        themedSuccess('Spritesheet 已保存到素材库！（' + c.width + '×' + c.height + '）');
    } catch (e) {
        console.error(e);
        themedError('保存失败：' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> Spritesheet → 素材库';
    }
});

/* 全部帧 → 素材库 */
document.getElementById('saveAllFramesToLib').addEventListener('click', async function () {
    const r = window.lastActionGroupResult;
    if (!r || !r.frames.length) {
        themedWarn('请先完成一次「批量生成动作组」');
        return;
    }
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存 0/' + r.frames.length + '…';
    let saved = 0;
    try {
        for (const frame of r.frames) {
            const dataURL = await imgUrlToDataURL(frame.imageUrl);
            saveAssetToLibrary({
                id: 'af_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: frame.action + '_帧' + frame.frameIndex,
                fileName: frame.action + '_' + frame.frameIndex + '.png',
                category: '角色动作组',
                type: 'image/png',
                dataURL: dataURL,
                favorite: false,
                createdAt: Date.now(),
                source: 'action-frame',
                meta: { action: frame.action, frameIndex: frame.frameIndex },
            });
            saved++;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存 ' + saved + '/' + r.frames.length + '…';
        }
        themedSuccess('已将 ' + saved + ' 帧全部保存到素材库！');
    } catch (e) {
        console.error(e);
        themedError('保存了 ' + saved + ' 帧后失败：' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-layer-group"></i> 全部帧 → 素材库';
    }
});

// AIGenerator类 - 负责AI生成功能

function compressDataUrlImage(dataUrl, maxSide, outMime, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const m = Math.max(w, h, 1);
            const scale = Math.min(1, maxSide / m);
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const mime = outMime || 'image/webp';
            try {
                resolve(c.toDataURL(mime, quality !== null ? quality : 0.82));
            } catch (e) {
                resolve(c.toDataURL('image/jpeg', 0.85));
            }
        };
        img.onerror = () => reject(new Error('图片解码失败'));
        img.src = dataUrl;
    });
}

/** 移除 tech-select 包装，便于动态重建 options 后重新 init */
function teardownTechSelectForSelect(selectEl) {
    if (!selectEl) return;
    selectEl.dataset.techSelectReady = '0';
    selectEl.classList.remove('tech-select-native');
    const next = selectEl.nextElementSibling;
    if (next && next.classList.contains('tech-select')) {
        if (typeof next.__closeTechSelect === 'function') {
            next.__closeTechSelect();
        }
        next.remove();
    }
}

/** 当前风格片段（textarea），供动作组等与图片生成共用 */
function getStylePresetSnippetForPrompt() {
    const ta = document.getElementById('styleExtractTextarea');
    return (ta && ta.value.trim()) || '';
}

/** 将风格片段并入一条 Prompt（不重复追加） */
function appendStyleRefToPrompt(basePrompt) {
    const sn = getStylePresetSnippetForPrompt();
    if (!sn) return String(basePrompt || '').trim();
    const p = String(basePrompt || '').trim();
    if (p.includes(sn)) return p;
    return p ? `${p}。画风参考：${sn}` : `画风参考：${sn}`;
}


function initTechSelects() {
    function labelForSelect(sel) {
        const al = sel.getAttribute('aria-label');
        if (al && al.trim()) return al.trim();
        if (sel.id) {
            let safeFor = sel.id;
            try {
                if (typeof CSS !== 'undefined' && CSS.escape) safeFor = CSS.escape(sel.id);
            } catch (_) {
                /* ignore */
            }
            const lab = document.querySelector('label[for="' + safeFor + '"]');
            if (lab && lab.textContent) return lab.textContent.replace(/\s+/g, ' ').trim();
        }
        return '下拉选择';
    }
    if (window.__techSelectGlobalBound !== true) {
        window.__techSelectGlobalBound = true;
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.tech-select.is-open').forEach((wrap) => {
                const portalMenu = wrap.__portalMenu;
                const clickedInside = wrap.contains(e.target) || (portalMenu && portalMenu.contains(e.target));
                if (!clickedInside) {
                    if (typeof wrap.__closeTechSelect === 'function') {
                        wrap.__closeTechSelect();
                    } else {
                        wrap.classList.remove('is-open');
                        const group = wrap.closest('.form-group');
                        if (group) group.classList.remove('tech-select-open');
                    }
                }
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.tech-select.is-open').forEach((wrap) => {
                    const tr = wrap.querySelector('.tech-select-trigger');
                    if (typeof wrap.__closeTechSelect === 'function') {
                        wrap.__closeTechSelect();
                    } else {
                        wrap.classList.remove('is-open');
                        const group = wrap.closest('.form-group');
                        if (group) group.classList.remove('tech-select-open');
                    }
                    if (tr) tr.focus();
                });
            }
        });
    }

    const selects = document.querySelectorAll('select.form-control');
    selects.forEach((select) => {
        if (select.dataset.techSelectReady === '1') return;
        select.dataset.techSelectReady = '1';
        select.classList.add('tech-select-native');

        const wrapper = document.createElement('div');
        wrapper.className = 'tech-select';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'tech-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const value = document.createElement('span');
        value.className = 'tech-select-value';
        trigger.appendChild(value);

        const menu = document.createElement('div');
        menu.className = 'tech-select-menu';
        menu.setAttribute('role', 'listbox');
        window.__artifexTsId = (window.__artifexTsId || 0) + 1;
        const menuId = 'artifex-ts-menu-' + window.__artifexTsId;
        menu.id = menuId;
        trigger.setAttribute('aria-controls', menuId);
        const selLab = labelForSelect(select);
        trigger.setAttribute('aria-label', selLab);
        menu.setAttribute('aria-label', selLab + '，选项列表');
        wrapper.__portalMenu = menu;

        Array.from(select.options).forEach((opt) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'tech-select-option';
            item.setAttribute('role', 'option');
            item.textContent = opt.textContent;
            item.dataset.value = opt.value;
            if (opt.disabled) item.disabled = true;
            if (opt.value === '') item.classList.add('is-placeholder');
            menu.appendChild(item);
        });

        select.insertAdjacentElement('afterend', wrapper);
        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);

        const syncUI = () => {
            const current = select.options[select.selectedIndex];
            const currentText = current ? current.textContent : '请选择';
            value.textContent = currentText;
            value.classList.toggle('is-placeholder', !select.value);
            menu.querySelectorAll('.tech-select-option').forEach((item) => {
                const on = item.dataset.value === select.value;
                item.classList.toggle('is-selected', on);
                item.setAttribute('aria-selected', on ? 'true' : 'false');
            });
        };

        const positionPortalMenu = () => {
            if (!wrapper.classList.contains('is-open')) return;
            const rect = trigger.getBoundingClientRect();
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const safeLeft = Math.max(8, Math.min(rect.left, viewportW - rect.width - 8));
            const spaceBelow = viewportH - rect.bottom - 10;
            const spaceAbove = rect.top - 10;
            const openDown = spaceBelow >= 180 || spaceBelow >= spaceAbove;
            const maxHeight = Math.max(120, Math.min(280, openDown ? spaceBelow : spaceAbove));
            let top = openDown ? rect.bottom + 6 : rect.top - maxHeight - 6;
            top = Math.max(8, Math.min(top, viewportH - maxHeight - 8));
            menu.style.left = safeLeft + 'px';
            menu.style.top = top + 'px';
            menu.style.width = rect.width + 'px';
            menu.style.maxHeight = maxHeight + 'px';
        };

        const handleViewportChange = () => {
            if (wrapper.classList.contains('is-open')) {
                positionPortalMenu();
            }
        };

        const closeMenu = () => {
            wrapper.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
            const group = wrapper.closest('.form-group');
            if (group) group.classList.remove('tech-select-open');
            window.removeEventListener('resize', handleViewportChange);
            document.removeEventListener('scroll', handleViewportChange, true);
            if (menu.parentElement !== wrapper) {
                wrapper.appendChild(menu);
            }
            menu.classList.remove('tech-select-menu--portal');
            menu.style.left = '';
            menu.style.top = '';
            menu.style.width = '';
            menu.style.maxHeight = '';
            trigger.focus();
        };
        wrapper.__closeTechSelect = closeMenu;

        menu.addEventListener('keydown', (e) => {
            if (!wrapper.classList.contains('is-open')) return;
            const opts = [...menu.querySelectorAll('.tech-select-option:not([disabled])')];
            let i = opts.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                i = i < 0 ? 0 : Math.min(opts.length - 1, i + 1);
                opts[i]?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                i = i < 0 ? opts.length - 1 : Math.max(0, i - 1);
                opts[i]?.focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                opts[0]?.focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                opts[opts.length - 1]?.focus();
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                closeMenu();
            }
        });

        trigger.addEventListener('click', () => {
            const willOpen = !wrapper.classList.contains('is-open');
            document.querySelectorAll('.tech-select.is-open').forEach((el) => {
                if (typeof el.__closeTechSelect === 'function') {
                    el.__closeTechSelect();
                } else {
                    el.classList.remove('is-open');
                }
            });
            if (!willOpen) {
                closeMenu();
                return;
            }
            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            const group = wrapper.closest('.form-group');
            if (group) group.classList.add('tech-select-open');
            if (menu.parentElement !== document.body) {
                document.body.appendChild(menu);
            }
            menu.classList.add('tech-select-menu--portal');
            positionPortalMenu();
            window.addEventListener('resize', handleViewportChange);
            document.addEventListener('scroll', handleViewportChange, true);
            setTimeout(() => {
                const opts = [...menu.querySelectorAll('.tech-select-option:not([disabled])')];
                const cur = opts.find((o) => o.classList.contains('is-selected'));
                (cur || opts[0])?.focus();
            }, 0);
        });

        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.tech-select-option');
            if (!item || item.disabled) return;
            const nextValue = item.dataset.value || '';
            if (select.value !== nextValue) {
                select.value = nextValue;
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            syncUI();
            closeMenu();
        });

        select.addEventListener('change', syncUI);

        const parentForm = select.closest('form');
        if (parentForm && parentForm.dataset.techSelectResetBound !== '1') {
            parentForm.dataset.techSelectResetBound = '1';
            parentForm.addEventListener('reset', () => {
                setTimeout(() => {
                    parentForm.querySelectorAll('select.form-control').forEach((s) => {
                        s.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }, 0);
            });
        }

        syncUI();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof GameUiUserScope !== 'undefined' && typeof GameUiUserScope.ensure === 'function') {
        await GameUiUserScope.ensure();
    }
    aiGenerator = new AssetEditor();
    imageGenerator = new ImageGenerator();

    window.addEventListener('storage', (e) => {
        if (!e.key || e.key !== aiStorageKey(STYLE_PRESETS_KEY) || !imageGenerator) return;
        const sel = document.getElementById('stylePresetSelect');
        imageGenerator.refreshStylePresetSelect(sel ? sel.value : '');
    });
    window.addEventListener('stylePresetsChanged', () => {
        if (!imageGenerator) return;
        const sel = document.getElementById('stylePresetSelect');
        imageGenerator.refreshStylePresetSelect(sel ? sel.value : '');
    });

    // 项目 banner 初始化（原 AIGenerator 职责迁移到此）
    (function initProjectBanner() {
        const banner = document.getElementById('currentProjectBanner');
        if (!banner) return;
        let ctx = null;
        try {
            ctx = JSON.parse(localStorage.getItem(aiStorageKey('currentProjectContext')));
        } catch (_) {}
        if (!ctx || !ctx.id) {
            banner.style.display = 'none';
            return;
        }
        const nameSpan = banner.querySelector('[data-project-name]');
        const extraSpan = banner.querySelector('[data-project-extra]');
        if (nameSpan) nameSpan.textContent = ctx.name || '未命名项目';
        if (extraSpan) extraSpan.textContent = ctx.type || '';
        banner.style.display = 'flex';
        const backBtn = banner.querySelector('[data-back-to-project]');
        if (backBtn)
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '../project-management/project-detail.html?id=' + encodeURIComponent(ctx.id);
            });
    })();

    initTechSelects();

    if (imageGenerator && typeof imageGenerator.checkVisionExtractButton === 'function') {
        imageGenerator.syncProviderAccessControl().catch(() => {});
        imageGenerator.checkVisionExtractButton().catch(() => {});
    }

    // initTechSelects 会为所有 select 创建自定义 wrapper，需要同步隐藏万相/千问的 wrapper
    ['wanxModelSelect', 'qwenModelSelect'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            const w = el.nextElementSibling;
            if (w && w.classList.contains('tech-select')) w.style.display = 'none';
        }
    });

    if (window.PageEffects && typeof window.PageEffects.initPointerGlow === 'function') {
        window.PageEffects.initPointerGlow();
    }

    // 卡片追光：在表单/结果/素材卡上增加鼠标热点
    (function initCardSpotlight() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const selector = '.top-bar, .generator-form, .result-container, .asset-card, #generatorStylePresetStrip';
        const bind = (el) => {
            if (!el || el.dataset.cardGlowBound === '1' || !el.style || typeof el.style.setProperty !== 'function')
                return;
            el.dataset.cardGlowBound = '1';
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                el.style.setProperty('--card-x', x + '%');
                el.style.setProperty('--card-y', y + '%');
            });
            el.addEventListener('mouseleave', () => {
                el.style.setProperty('--card-x', '50%');
                el.style.setProperty('--card-y', '50%');
            });
        };

        const scan = () => {
            document.querySelectorAll(selector).forEach(bind);
        };
        scan();

        const observer = new MutationObserver(() => scan());
        observer.observe(document.body, { childList: true, subtree: true });
    })();

    // 选项卡切换：三个独立"页面"视图 + 丝滑动画
    const tabButtons = document.querySelectorAll('.tab-button');
    const generatorViews = document.querySelectorAll('.generator-view');

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            const currentView = document.querySelector('.generator-view.active');
            const targetView = document.querySelector(`.generator-view[data-tab="${targetTab}"]`);
            if (!targetView || currentView === targetView) return;

            tabButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');

            currentView.classList.add('leaving');
            currentView.classList.remove('active');
            currentView.addEventListener(
                'transitionend',
                function onLeave() {
                    currentView.removeEventListener('transitionend', onLeave);
                    currentView.classList.remove('leaving');
                },
                { once: true }
            );

            targetView.classList.add('active');

            document.body.classList.remove('generator-tab-code', 'generator-tab-image', 'generator-tab-action');
            document.body.classList.add('generator-tab-' + (targetTab === 'action-group' ? 'action' : targetTab));

            const mainContent = document.querySelector('.main-content');
            if (mainContent && typeof mainContent.scrollTo === 'function') {
                mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    document.body.classList.add('generator-tab-code');

    // 移动端菜单切换
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-open');
        });
    }
});