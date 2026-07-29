/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
if (window.PageEffects) {
    window.PageEffects.initPointerGlow();
    window.PageEffects.initCardSpotlight('.top-bar, .asset-wrap, .asset-card');
}

function buildTechSelect(select) {
    if (!select) return;
    const oldWrap =
        select.nextElementSibling && select.nextElementSibling.classList.contains('tech-select')
            ? select.nextElementSibling
            : null;
    if (oldWrap) {
        if (typeof oldWrap.__closeTechSelect === 'function') oldWrap.__closeTechSelect();
        oldWrap.remove();
    }

    select.classList.add('tech-select-native');

    const wrapper = document.createElement('div');
    wrapper.className = 'tech-select';
    if (select.style.width) wrapper.style.width = select.style.width;

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
    wrapper.__portalMenu = menu;

    Array.from(select.options).forEach((opt) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'tech-select-option';
        item.textContent = opt.textContent;
        item.dataset.value = opt.value;
        if (opt.disabled) item.disabled = true;
        if (opt.value === '' || opt.value === 'all') item.classList.add('is-placeholder');
        menu.appendChild(item);
    });

    select.insertAdjacentElement('afterend', wrapper);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    const syncUI = () => {
        const current = select.options[select.selectedIndex];
        const currentText = current ? current.textContent : '请选择';
        value.textContent = currentText;
        value.classList.toggle('is-placeholder', !select.value || select.value === 'all');
        menu.querySelectorAll('.tech-select-option').forEach((item) => {
            item.classList.toggle('is-selected', item.dataset.value === select.value);
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
    };
    wrapper.__closeTechSelect = closeMenu;

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
        if (menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        }
        menu.classList.add('tech-select-menu--portal');
        positionPortalMenu();
        window.addEventListener('resize', handleViewportChange);
        document.addEventListener('scroll', handleViewportChange, true);
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
    syncUI();
}

function initTechSelects() {
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
                    }
                }
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.tech-select.is-open').forEach((wrap) => {
                    if (typeof wrap.__closeTechSelect === 'function') {
                        wrap.__closeTechSelect();
                    } else {
                        wrap.classList.remove('is-open');
                    }
                });
            }
        });
    }

    document.querySelectorAll('.asset-wrap select.input-group').forEach((select) => buildTechSelect(select));
}

function uiToast(message, type = 'success') {
    if (window.TechUI && typeof window.TechUI.toast === 'function') {
        window.TechUI.toast(message, type);
    }
}

function uiConfirm(message, title) {
    return window.TechUI.confirm(message, title || '请确认', '确定', '取消');
}

function uiPrompt(title, label, value) {
    return window.TechUI.prompt(title, label, value || '', '确定', '取消');
}

// 本地存储键（登录后 bootAssetLibrary 中设为按用户隔离）
let STORAGE_KEY = 'assetLibrary_v1';

// 默认分类
const DEFAULT_CATEGORIES = ['图片', '图标', '背景', '音频', '其他'];

// 页面元素
const searchEl = document.getElementById('search');
const categoryFilterEl = document.getElementById('categoryFilter');
const assetGrid = document.getElementById('assetGrid');
const modalRoot = document.getElementById('modalRoot');
const noAssets = document.getElementById('noAssets');
const btnAddCategory = document.getElementById('btnAddCategory');
const btnClearAll = document.getElementById('btnClearAll');
const assetSearchEl = document.getElementById('assetSearch');
const typeFilterEl = document.getElementById('typeFilter');
const sortOrderEl = document.getElementById('sortOrder');
// 导航元素引用已移除，因为现在使用与dashboard.html一致的导航结构

// 初始化上下文菜单模块（从 asset-library-context-menu.js 拆分）
if (window.AssetLibraryContextMenu && typeof window.AssetLibraryContextMenu.setDeps === 'function') {
    window.AssetLibraryContextMenu.setDeps({
        getAllTags: getAllTags,
        fetchWithCsrf: fetchWithCsrf,
        uiToast: uiToast,
        escapeHtml: escapeHtml,
        getModalRoot: function () {
            return modalRoot;
        },
    });
}

// 运行初始化
let categories = [];
let assets = [];
const selectedAssets = new Set();

// 初始化渲染模块（从 asset-library-render.js 拆分）
if (window.AssetLibraryRender && typeof window.AssetLibraryRender.setDeps === 'function') {
    window.AssetLibraryRender.setDeps({
        assetGrid: assetGrid,
        noAssets: noAssets,
        modalRoot: modalRoot,
        assets: assets,
        selectedAssets: selectedAssets,
        categories: categories,
        filterAssets: function () {
            return assets;
        },
        uiToast: uiToast,
        uiConfirm: uiConfirm,
        fetchWithCsrf: fetchWithCsrf,
        saveState: saveState,
        dbItemToFrontend: dbItemToFrontend,
        initTechSelects: initTechSelects,
    });
    window.AssetLibraryRender.init();
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY + '_categories');
        categories = raw ? JSON.parse(raw) : DEFAULT_CATEGORIES.slice();
    } catch (_e) {
        categories = DEFAULT_CATEGORIES.slice();
    }
    if (!Array.isArray(categories) || categories.length === 0) {
        categories = DEFAULT_CATEGORIES.slice();
    }
    // assets will be loaded from server via loadAssetsFromServer()
    assets.length = 0;

    // 读取当前项目上下文，用于提示与返回
    try {
        const ctxRaw = localStorage.getItem(GameUiUserScope.key('currentProjectContext'));
        const ctx = ctxRaw ? JSON.parse(ctxRaw) : null;
        const hint = document.getElementById('currentProjectHint');
        if (hint && ctx && ctx.id) {
            const nameSpan = hint.querySelector('[data-project-name]');
            if (nameSpan) {
                nameSpan.textContent = ctx.name || '未命名项目';
            }
            hint.style.display = 'block';
            const backBtn = hint.querySelector('[data-back-to-project]');
            if (backBtn) {
                backBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    window.location.href = '../project-management/project-detail.html?id=' + encodeURIComponent(ctx.id);
                });
            }
        }
    } catch (e) {
        console.warn('读取 currentProjectContext 失败：', e);
    }
}

function saveState() {
    // Save categories to localStorage (lightweight user preference)
    try {
        localStorage.setItem(STORAGE_KEY + '_categories', JSON.stringify(categories));
    } catch (e) {
        console.debug('[asset-library] 保存分类失败', e);
    }
    return true;
}

// populateCategorySelectors / filterAssets 已拆分至 asset-library-render.js

// renderAssets / openPreview / downloadAsset / deleteAsset 已拆分至 asset-library-render.js

// persistAssetItem 保留在主文件（需要访问 assets 和 renderAssets）
async function persistAssetItem(item) {
    try {
        const body = {
            name: item.name || '',
            type: item.type || 'image',
            content: item.dataURL || '',
            desc: item.fileName || '',
            source: item.source || '',
            tags: JSON.stringify({
                category: item.category || '其他',
                fileName: item.fileName || '',
                customTags: item.tags || [],
            }),
        };
        const resp = await fetchWithCsrf('/api/asset-library', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || '保存失败');
        }
        const data = await resp.json();
        // Convert server item back to frontend format for local array
        const serverItem = dbItemToFrontend(data.item);
        assets.unshift(serverItem);
        renderAssets();
        return true;
    } catch (e) {
        console.error('保存素材到服务器失败', e);
        uiToast('保存失败：' + (e.message || '请重试'), 'warn');
        return false;
    }
}

// 初始化上传模块（从 asset-library-upload.js 拆分）
if (window.AssetLibraryUpload && typeof window.AssetLibraryUpload.setDeps === 'function') {
    window.AssetLibraryUpload.setDeps({
        assets: assets,
        persistAssetItem: persistAssetItem,
        uiToast: uiToast,
        escapeHtml: escapeHtml,
    });
    window.AssetLibraryUpload.init();
}

// 搜索与筛选（搜索框加 300ms 防抖，避免大量素材时输入卡顿）
let _searchTimer = null;
const debouncedRender = () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(renderAssets, 300);
};
if (searchEl) searchEl.addEventListener('input', debouncedRender);
if (categoryFilterEl) categoryFilterEl.addEventListener('change', () => renderAssets());
if (assetSearchEl) assetSearchEl.addEventListener('input', debouncedRender);
if (typeFilterEl) typeFilterEl.addEventListener('change', () => renderAssets());
if (sortOrderEl) sortOrderEl.addEventListener('change', () => renderAssets());

if (btnAddCategory)
    btnAddCategory.addEventListener('click', async () => {
        const v = await uiPrompt('新增分类', '输入新分类名称：', '');
        if (v && v.trim()) {
            categories.unshift(v.trim());
            window.AssetLibraryRender.populateCategorySelectors();
            saveState();
        }
    });

if (btnClearAll)
    btnClearAll.addEventListener('click', async () => {
        const ok = await uiConfirm('确定要删除所有素材并清空吗？此操作不可撤销', '清空素材库');
        if (ok) {
            // Delete all assets from server
            const deletePromises = assets.map((a) =>
                fetchWithCsrf('/api/asset-library/' + encodeURIComponent(a.id), { method: 'DELETE' }).catch(() => {})
            );
            await Promise.all(deletePromises);
            assets.length = 0;
            saveState();
            renderAssets();
        }
    });

// 批量操作、导出功能已拆分至 asset-library-render.js

// Convert database item to frontend format
function dbItemToFrontend(item) {
    let category = '其他';
    let fileName = item.desc || '';
    let customTags = [];
    try {
        const tagsObj = JSON.parse(item.tags || '{}');
        if (tagsObj.category) category = tagsObj.category;
        if (tagsObj.fileName) fileName = tagsObj.fileName;
        if (Array.isArray(tagsObj.customTags)) customTags = tagsObj.customTags;
    } catch (_) {}
    return {
        id: item.id,
        name: item.name || '',
        fileName: fileName,
        category: category,
        type: item.type || 'image',
        dataURL: item.content || '',
        source: item.source || '',
        tags: customTags,
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
    };
}

// Load assets from server API
async function loadAssetsFromServer() {
    try {
        const resp = await fetch('/api/asset-library', { credentials: 'include' });
        if (resp.status === 401) {
            window.location.href = loginHtmlPath();
            return;
        }
        if (!resp.ok) throw new Error('加载失败');
        const data = await resp.json();
        if (data.ok && Array.isArray(data.items)) {
            assets.length = 0;
            data.items.forEach(function (item) {
                assets.push(dbItemToFrontend(item));
            });
        }
    } catch (e) {
        console.error('从服务器加载素材失败', e);
        uiToast('加载素材库失败，将使用本地备份', 'warn');
        // Fallback to localStorage backup
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                assets.length = 0;
                if (Array.isArray(parsed.assets))
                    parsed.assets.forEach(function (a) {
                        assets.push(a);
                    });
            }
        } catch (_) {}
    }
    // Derive categories from loaded assets
    const derivedCats = new Set(categories);
    assets.forEach((a) => {
        if (a.category && !derivedCats.has(a.category)) derivedCats.add(a.category);
    });
    categories.length = 0;
    derivedCats.forEach(function (c) {
        categories.push(c);
    });
    saveState();
}

// Migrate localStorage assets to server (one-time)
async function migrateLocalStorageToServer() {
    let localData = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) localData = JSON.parse(raw);
    } catch (_) {}
    if (!localData || !Array.isArray(localData.assets) || localData.assets.length === 0) return;

    // Check if server already has data (avoid duplicate migration)
    try {
        const checkResp = await fetch('/api/asset-library', { credentials: 'include' });
        if (checkResp.ok) {
            const checkData = await checkResp.json();
            if (checkData.ok && Array.isArray(checkData.items) && checkData.items.length > 0) {
                // Server already has data, skip migration
                localStorage.removeItem(STORAGE_KEY);
                return;
            }
        }
    } catch (_) {}

    uiToast('正在迁移本地素材到服务器...', 'success');
    let migrated = 0;
    for (const item of localData.assets) {
        try {
            const body = {
                name: item.name || '',
                type: item.type || 'image',
                content: item.dataURL || '',
                desc: item.fileName || '',
                source: item.source || '',
                tags: JSON.stringify({ category: item.category || '其他', fileName: item.fileName || '' }),
            };
            const resp = await fetchWithCsrf('/api/asset-library', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            if (resp.ok) migrated++;
        } catch (_) {}
    }
    if (migrated > 0) {
        uiToast(`已迁移 ${migrated} 个素材到服务器`, 'success');
    }
    // Clean up old localStorage data
    localStorage.removeItem(STORAGE_KEY);
    // Reload from server
    await loadAssetsFromServer();
}

// 提供一组初始示例素材（从工作区的 ./素材库图片 文件夹读取，作为初始资源）
function sampleAssets() {
    // 请确保目录名与工作区中文件夹一致：./素材库图片
    const files = [
        '叶片.png',
        '山水.png',
        '星空.png',
        '油画背景.png',
        '海洋纹.png',
        '海洋纹2.png',
        '灯笼.webp',
        '科技.webp',
        '花朵.webp',
        '花枝.webp',
        '漫画风.webp',
        '漫画风1.webp',
    ];

    const samples = files.map((fname, idx) => {
        const ext = (fname.split('.').pop() || '').toLowerCase();
        let mime = 'application/octet-stream';
        if (ext === 'png') mime = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'gif') mime = 'image/gif';
        else if (ext === 'svg') mime = 'image/svg+xml';
        else if (ext === 'webp') mime = 'image/webp';

        return {
            id: 'sample_' + idx + '_' + Date.now(),
            name: fname.replace(/\.[^/.]+$/, ''),
            fileName: fname,
            category: '图片',
            type: mime,
            // 使用相对路径引用工作区内的图片文件（直接使用原始文件名以避免重复编码导致的问题）
            dataURL: './素材库图片/' + fname,
            thumbnailURL: './素材库图片/thumbs/' + fname.replace(/\.[^/.]+$/, '.webp'),
            favorite: false,
            createdAt: Date.now() - idx * 1000,
        };
    });

    return samples;
}

// 加载并初始化
function _init() {
    loadState();
    // 如果当前没有素材，则写入示例素材以便用户能快速看到效果
    if (!assets || assets.length === 0) {
        const samples = sampleAssets();
        // 将示例素材放在前面
        assets.unshift.apply(assets, samples);
        // 如果 categories 中尚未包含示例的分类，则合并
        const sampleCats = Array.from(new Set(samples.map((s) => s.category)));
        sampleCats.forEach((c) => {
            if (!categories.includes(c)) categories.push(c);
        });
        saveState();
    }
    window.AssetLibraryRender.populateCategorySelectors();
    renderAssets();
}

function mergeLegacyLibraryData() {
    // 兼容历史未分用户键：首次进入分用户键时自动合并一次，避免"显示成功但看不到"
    try {
        const scopedKey = STORAGE_KEY;
        const legacyKey = 'assetLibrary_v1';
        if (scopedKey === legacyKey) return;

        const scopedRaw = localStorage.getItem(scopedKey);
        const legacyRaw = localStorage.getItem(legacyKey);
        if (!legacyRaw) return;

        const scopedState = scopedRaw ? JSON.parse(scopedRaw) : { categories: [], assets: [] };
        const legacyState = JSON.parse(legacyRaw);
        const scopedCategories = Array.isArray(scopedState.categories) ? scopedState.categories : [];
        const scopedAssets = Array.isArray(scopedState.assets) ? scopedState.assets : [];
        const legacyCategories = Array.isArray(legacyState.categories) ? legacyState.categories : [];
        const legacyAssets = Array.isArray(legacyState.assets) ? legacyState.assets : [];

        const seen = new Set(scopedAssets.map((a) => (a && (a.id || a.fileName + '|' + a.createdAt)) || ''));
        legacyAssets.forEach((a) => {
            const k = (a && (a.id || a.fileName + '|' + a.createdAt)) || '';
            if (k && !seen.has(k)) {
                scopedAssets.push(a);
                seen.add(k);
            }
        });
        legacyCategories.forEach((c) => {
            if (c && !scopedCategories.includes(c)) scopedCategories.push(c);
        });

        localStorage.setItem(scopedKey, JSON.stringify({ categories: scopedCategories, assets: scopedAssets }));
    } catch (e) {
        console.warn('迁移旧素材库数据失败：', e);
    }
}

async function bootAssetLibrary() {
    try {
        await GameUiUserScope.ensure();
    } catch (e) {
        console.warn('用户态校验失败，继续初始化素材库：', e);
    }
    if (typeof GameUiUserScope !== 'undefined' && typeof GameUiUserScope.key === 'function') {
        STORAGE_KEY = GameUiUserScope.key('assetLibrary_v1');
    }
    mergeLegacyLibraryData();
    loadState();
    // Migrate localStorage assets to server if any exist
    await migrateLocalStorageToServer();
    // Load assets from server
    await loadAssetsFromServer();
    // If still no assets, load sample assets
    if (!assets || assets.length === 0) {
        const samples = sampleAssets();
        // Upload samples to server
        for (const s of samples) {
            try {
                const body = {
                    name: s.name || '',
                    type: s.type || 'image',
                    content: s.dataURL || '',
                    desc: s.fileName || '',
                    source: '',
                    tags: JSON.stringify({ category: s.category || '图片', fileName: s.fileName || '' }),
                };
                await fetchWithCsrf('/api/asset-library', {
                    method: 'POST',
                    body: JSON.stringify(body),
                });
            } catch (_) {}
        }
        await loadAssetsFromServer();
    }
    window.AssetLibraryRender.populateCategorySelectors();
    renderAssets();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAssetLibrary);
} else {
    bootAssetLibrary();
}

// 额外：支持按回车上传当前选中文件名（不实际选文件）——保留轻量交互

// 声明 filterAssets / renderAssets 变量（实现由 tag system override 提供）
let filterAssets, renderAssets;

// --- tag system ---
function getAllTags() {
    const tagSet = new Set();
    assets.forEach(function (a) {
        if (Array.isArray(a.tags)) {
            a.tags.forEach(function (t) {
                if (t) tagSet.add(t);
            });
        }
    });
    return Array.from(tagSet).sort();
}
let activeTagFilter = null;
function renderTagFilterBar() {
    const bar = document.getElementById('tagFilterBar');
    const chips = document.getElementById('tagFilterChips');
    if (!bar || !chips) return;
    const allTags = getAllTags();
    if (allTags.length === 0) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';
    chips.innerHTML = '';
    allTags.forEach(function (tag) {
        const chip = document.createElement('span');
        chip.className = 'tag-filter-chip' + (activeTagFilter === tag ? ' is-active' : '');
        chip.textContent = tag;
        chip.addEventListener('click', function () {
            activeTagFilter = activeTagFilter === tag ? null : tag;
            renderTagFilterBar();
            renderAssets();
        });
        chips.appendChild(chip);
    });
}
// ── filterAssets / renderAssets 包装（标签筛选 + 更多按钮） ──
filterAssets = function () {
    let filtered = window.AssetLibraryRender.filterAssetsBase();
    if (activeTagFilter) {
        filtered = filtered.filter(function (a) {
            return Array.isArray(a.tags) && a.tags.indexOf(activeTagFilter) !== -1;
        });
    }
    return filtered;
};
renderAssets = function () {
    window.AssetLibraryRender.renderAssetsBase();
    renderTagFilterBar();
    const cards = assetGrid.querySelectorAll('.asset-card');
    const filtered = filterAssets();
    cards.forEach(function (card, idx) {
        const a = filtered[idx];
        if (!a) return;
        if (Array.isArray(a.tags) && a.tags.length > 0) {
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'asset-tags';
            a.tags.forEach(function (tag) {
                const chip = document.createElement('span');
                chip.className = 'tag-chip';
                chip.textContent = tag;
                tagsDiv.appendChild(chip);
            });
            const meta = card.querySelector('.meta');
            if (meta) meta.insertAdjacentElement('afterend', tagsDiv);
        }
        const actions = card.querySelector('.card-actions');
        if (actions) {
            const moreBtn = document.createElement('button');
            moreBtn.className = 'btn btn-small card-more-btn';
            moreBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
            moreBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.AssetLibraryContextMenu) {
                    window.AssetLibraryContextMenu.showCardContextMenu(a, moreBtn, { onTagsUpdated: renderAssets });
                }
            });
            actions.appendChild(moreBtn);
        }
    });
};
// --- URL import 已拆分至 asset-library-upload.js ---

// --- 相似度检测 ---
const btnFindSimilar = document.getElementById('btnFindSimilar');
if (btnFindSimilar) {
    btnFindSimilar.addEventListener('click', function () {
        findSimilarAssets();
    });
}

function perceptualHash(dataUrl) {
    return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = 8;
            canvas.height = 8;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 8, 8);
            const data = ctx.getImageData(0, 0, 8, 8).data;
            const gray = [];
            for (let i = 0; i < data.length; i += 4) {
                gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            }
            const avg =
                gray.reduce(function (a, b) {
                    return a + b;
                }, 0) / gray.length;
            const hash = gray
                .map(function (g) {
                    return g > avg ? 1 : 0;
                })
                .join('');
            resolve(hash);
        };
        img.onerror = function () {
            resolve(null);
        };
        img.src = dataUrl;
    });
}

function hammingDistance(h1, h2) {
    if (!h1 || !h2 || h1.length !== h2.length) return 999;
    let dist = 0;
    for (let i = 0; i < h1.length; i++) {
        if (h1[i] !== h2[i]) dist++;
    }
    return dist;
}

async function findSimilarAssets() {
    const imageAssets = assets.filter(function (a) {
        return a.type && a.type.startsWith('image') && a.dataURL;
    });
    if (imageAssets.length < 2) {
        uiToast('至少需要 2 张图片素材才能检测相似度', 'warn');
        return;
    }

    btnFindSimilar.disabled = true;
    btnFindSimilar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';

    const hashes = [];
    for (let i = 0; i < imageAssets.length; i++) {
        const h = await perceptualHash(imageAssets[i].dataURL);
        hashes.push({ asset: imageAssets[i], hash: h });
    }

    const groups = [];
    const used = new Set();
    for (let i = 0; i < hashes.length; i++) {
        if (used.has(i) || !hashes[i].hash) continue;
        const group = [hashes[i]];
        used.add(i);
        for (let j = i + 1; j < hashes.length; j++) {
            if (used.has(j) || !hashes[j].hash) continue;
            if (hammingDistance(hashes[i].hash, hashes[j].hash) < 10) {
                group.push(hashes[j]);
                used.add(j);
            }
        }
        if (group.length > 1) groups.push(group);
    }

    btnFindSimilar.disabled = false;
    btnFindSimilar.innerHTML = '<i class="fas fa-copy"></i> 检测相似素材';

    if (groups.length === 0) {
        uiToast('未发现相似素材', 'success');
        return;
    }
    showSimilarResults(groups);
}

function showSimilarResults(groups) {
    const dialog = document.createElement('div');
    dialog.style.cssText =
        'position:fixed;inset:0;background:rgba(2,8,20,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
    const box = document.createElement('div');
    box.style.cssText =
        'width:min(900px,95vw);max-height:85vh;overflow:auto;background:linear-gradient(165deg,#121a2e 0%,#0c1220 100%);border:1px solid rgba(0,240,255,0.2);border-radius:16px;padding:24px;color:#e8ecf4;font-family:"Rajdhani","Segoe UI",sans-serif;';
    const totalSimilar = groups.reduce(function (s, g) {
        return s + g.length;
    }, 0);
    box.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0;font-family:Orbitron,sans-serif;color:#00f0ff;font-size:16px;letter-spacing:1px">发现 ' +
        groups.length +
        ' 组相似素材（共 ' +
        totalSimilar +
        ' 张）</h3><button class="close-similar" style="background:none;border:none;color:#b0b0c0;font-size:20px;cursor:pointer">×</button></div>';
    const content = document.createElement('div');
    groups.forEach(function (group, gi) {
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText =
            'margin-bottom:20px;padding:16px;background:rgba(0,240,255,0.03);border:1px solid rgba(0,240,255,0.1);border-radius:12px;';
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size:13px;color:#00f0ff;margin-bottom:12px;font-weight:600;';
        titleDiv.textContent = '第 ' + (gi + 1) + ' 组（' + group.length + ' 张相似）';
        groupDiv.appendChild(titleDiv);
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;';
        group.forEach(function (item) {
            const card = document.createElement('div');
            card.style.cssText =
                'position:relative;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);';
            const img = document.createElement('img');
            img.src = item.asset.dataURL || '';
            img.style.cssText = 'width:100%;height:100px;object-fit:cover;display:block';
            img.alt = item.asset.name || '';
            card.appendChild(img);
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText =
                'padding:6px;font-size:11px;color:#b0b0c0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
            nameDiv.textContent = item.asset.name || '';
            card.appendChild(nameDiv);
            grid.appendChild(card);
        });
        groupDiv.appendChild(grid);
        content.appendChild(groupDiv);
    });
    box.appendChild(content);
    dialog.appendChild(box);
    document.body.appendChild(dialog);
    box.querySelector('.close-similar').addEventListener('click', function () {
        dialog.remove();
    });
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.remove();
    });
}

searchEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        renderAssets();
    }
});
