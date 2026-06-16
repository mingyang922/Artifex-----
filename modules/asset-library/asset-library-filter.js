/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * 素材库 - 搜索、筛选与排序模块
 */
(function () {
    'use strict';

    // ── 模块内部状态 ──
    var state = null;       // 引用 AssetLibraryState
    var els = {};           // DOM 元素引用
    var activeTagFilter = null;

    // ── 筛选核心 ──
    function filterAssets(assetsOverride, elsOverride) {
        var assets = assetsOverride || (state ? state.assets : []);
        var e = elsOverride || els || {};
        var q = (e.assetSearchEl ? e.assetSearchEl.value : '').trim().toLowerCase();
        var cat = e.categoryFilterEl ? e.categoryFilterEl.value : 'all';
        var type = e.typeFilterEl ? e.typeFilterEl.value : 'all';
        var sort = e.sortOrderEl ? e.sortOrderEl.value : 'newest';

        var filtered = assets.filter(function (a) {
            if (cat !== 'all' && a.category !== cat) return false;
            if (type !== 'all') {
                var at = (a.type || '').toLowerCase();
                if (at !== type && !at.startsWith(type + '/')) return false;
            }
            if (q) {
                var nameMatch = (a.name || '').toLowerCase().includes(q);
                var descMatch = (a.fileName || '').toLowerCase().includes(q);
                if (!nameMatch && !descMatch) return false;
            }
            return true;
        });

        // 按标签筛选
        if (activeTagFilter) {
            filtered = filtered.filter(function (a) {
                return Array.isArray(a.tags) && a.tags.indexOf(activeTagFilter) !== -1;
            });
        }

        if (sort === 'newest') {
            filtered.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        } else if (sort === 'oldest') {
            filtered.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
        } else if (sort === 'name') {
            filtered.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        }

        return filtered;
    }

    // ── 标签系统 ──
    function getAllTags() {
        var tagSet = new Set();
        state.assets.forEach(function (a) {
            if (Array.isArray(a.tags)) {
                a.tags.forEach(function (t) { if (t) tagSet.add(t); });
            }
        });
        return Array.from(tagSet).sort();
    }

    function renderTagFilterBar() {
        var bar = document.getElementById('tagFilterBar');
        var chips = document.getElementById('tagFilterChips');
        if (!bar || !chips) return;
        var allTags = getAllTags();
        if (allTags.length === 0) { bar.style.display = 'none'; return; }
        bar.style.display = 'flex';
        chips.innerHTML = '';
        allTags.forEach(function (tag) {
            var chip = document.createElement('span');
            chip.className = 'tag-filter-chip' + (activeTagFilter === tag ? ' is-active' : '');
            chip.textContent = tag;
            chip.addEventListener('click', function () {
                activeTagFilter = (activeTagFilter === tag) ? null : tag;
                renderTagFilterBar();
                state.renderAssets();
            });
            chips.appendChild(chip);
        });
    }

    // 为渲染后的卡片追加标签芯片与"更多"按钮
    function enhanceRenderedCards() {
        renderTagFilterBar();
        var assetGrid = document.getElementById('assetGrid');
        if (!assetGrid) return;
        var cards = assetGrid.querySelectorAll('.asset-card');
        var filtered = filterAssets();
        cards.forEach(function (card, idx) {
            var a = filtered[idx];
            if (!a) return;
            if (Array.isArray(a.tags) && a.tags.length > 0) {
                var tagsDiv = document.createElement('div');
                tagsDiv.className = 'asset-tags';
                a.tags.forEach(function (tag) {
                    var chip = document.createElement('span');
                    chip.className = 'tag-chip';
                    chip.textContent = tag;
                    tagsDiv.appendChild(chip);
                });
                var meta = card.querySelector('.meta');
                if (meta) meta.insertAdjacentElement('afterend', tagsDiv);
            }
            var actions = card.querySelector('.card-actions');
            if (actions) {
                var moreBtn = document.createElement('button');
                moreBtn.className = 'btn btn-small card-more-btn';
                moreBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
                moreBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showCardContextMenu(a, moreBtn);
                });
                actions.appendChild(moreBtn);
            }
        });
    }

    // ── 右键上下文菜单 ──
    function showCardContextMenu(asset, anchorEl) {
        document.querySelectorAll('.card-context-menu.is-open').forEach(function (m) { m.remove(); });
        var menu = document.createElement('div');
        menu.className = 'card-context-menu is-open';
        var btnCopy = document.createElement('button');
        btnCopy.innerHTML = '<i class="fas fa-copy"></i> 复制到项目';
        btnCopy.addEventListener('click', function (e) { e.stopPropagation(); menu.remove(); showProjectSelector(asset); });
        var btnTags = document.createElement('button');
        btnTags.innerHTML = '<i class="fas fa-tags"></i> 编辑标签';
        btnTags.addEventListener('click', function (e) { e.stopPropagation(); menu.remove(); showTagEditor(asset); });
        menu.appendChild(btnCopy);
        menu.appendChild(btnTags);
        document.body.appendChild(menu);
        var rect = anchorEl.getBoundingClientRect();
        menu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';
        setTimeout(function () {
            document.addEventListener('click', function closeMenu() { menu.remove(); document.removeEventListener('click', closeMenu); });
        }, 10);
    }

    // ── 跨项目复制 ──
    function showProjectSelector(asset) {
        var dialog = document.createElement('div'); dialog.className = 'project-selector-dialog';
        var box = document.createElement('div'); box.className = 'project-selector-box';
        var title = document.createElement('h3'); title.textContent = '选择目标项目'; box.appendChild(title);
        var listDiv = document.createElement('div'); listDiv.innerHTML = '<div class="project-selector-empty">加载中...</div>'; box.appendChild(listDiv);
        var closeBtn = document.createElement('button'); closeBtn.className = 'project-selector-close'; closeBtn.textContent = '取消';
        closeBtn.addEventListener('click', function () { dialog.remove(); });
        box.appendChild(closeBtn); dialog.appendChild(box);
        dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.remove(); });
        document.body.appendChild(dialog);
        fetch('/api/projects', { credentials: 'include' }).then(function (r) { return r.json(); })
            .then(function (data) {
                listDiv.innerHTML = '';
                if (!data.ok || !Array.isArray(data.projects) || data.projects.length === 0) {
                    listDiv.innerHTML = '<div class="project-selector-empty">暂无项目，请先创建项目</div>'; return;
                }
                data.projects.forEach(function (proj) {
                    var item = document.createElement('div'); item.className = 'project-list-item';
                    var nameSpan = document.createElement('span'); nameSpan.className = 'project-item-name'; nameSpan.textContent = proj.name;
                    var typeSpan = document.createElement('span'); typeSpan.className = 'project-item-type'; typeSpan.textContent = proj.type || '';
                    item.appendChild(nameSpan); item.appendChild(typeSpan);
                    item.addEventListener('click', function () { copyAssetToProject(asset, proj, dialog); });
                    listDiv.appendChild(item);
                });
            }).catch(function () { listDiv.innerHTML = '<div class="project-selector-empty">加载失败</div>'; });
    }

    function copyAssetToProject(asset, project, dialog) {
        var assetName = asset.name || asset.fileName || '未命名';
        fetchWithCsrf('/api/projects/' + project.id + '/assets', {
            method: 'POST', body: JSON.stringify({ name: assetName, type: asset.type || 'image', content: asset.dataURL || '' }),
        }).then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) { uiToast('已复制到项目: ' + project.name, 'success'); if (dialog) dialog.remove(); }
                else { uiToast('复制失败: ' + (data.error || '未知错误'), 'warn'); }
            }).catch(function (e) { uiToast('复制失败: ' + (e.message || '网络错误'), 'warn'); });
    }

    // ── 标签编辑器 ──
    function showTagEditor(asset) {
        var modalRoot = document.getElementById('modalRoot');
        modalRoot.innerHTML = '';
        var modal = document.createElement('div'); modal.className = 'modal';
        var box = document.createElement('div'); box.className = 'box'; box.style.width = '400px';
        var title = document.createElement('div'); title.style.marginBottom = '12px';
        title.innerHTML = '<strong>编辑标签 - ' + escapeHtml(asset.name || asset.fileName) + '</strong>';
        box.appendChild(title);
        var currentTags = Array.isArray(asset.tags) ? asset.tags.slice() : [];
        var tagInputWrap = document.createElement('div'); tagInputWrap.className = 'tag-input-wrap'; tagInputWrap.style.position = 'relative';
        var input = document.createElement('input'); input.type = 'text'; input.placeholder = '输入标签后按回车...';
        var autocomplete = document.createElement('div'); autocomplete.className = 'tag-autocomplete';
        function renderTagChips() {
            tagInputWrap.querySelectorAll('.tag-chip').forEach(function (c) { c.remove(); });
            currentTags.forEach(function (tag, tidx) {
                var chip = document.createElement('span'); chip.className = 'tag-chip'; chip.textContent = tag;
                var removeBtn = document.createElement('span'); removeBtn.className = 'tag-remove'; removeBtn.textContent = '×';
                removeBtn.addEventListener('click', function () { currentTags.splice(tidx, 1); renderTagChips(); });
                chip.appendChild(removeBtn); tagInputWrap.insertBefore(chip, input);
            });
        }
        function showAutocomplete(query) {
            var allTags = getAllTags().filter(function (t) { return currentTags.indexOf(t) === -1 && t.toLowerCase().indexOf(query.toLowerCase()) !== -1; });
            autocomplete.innerHTML = '';
            if (allTags.length === 0 || !query) { autocomplete.classList.remove('is-open'); return; }
            allTags.slice(0, 8).forEach(function (tag) {
                var btn = document.createElement('button'); btn.className = 'tag-autocomplete-item'; btn.textContent = tag;
                btn.addEventListener('click', function () {
                    if (currentTags.indexOf(tag) === -1) currentTags.push(tag);
                    input.value = ''; autocomplete.classList.remove('is-open'); renderTagChips();
                });
                autocomplete.appendChild(btn);
            });
            autocomplete.classList.add('is-open'); autocomplete.style.left = '0'; autocomplete.style.bottom = '100%';
        }
        input.addEventListener('input', function () { showAutocomplete(input.value); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && input.value.trim()) {
                e.preventDefault(); var val = input.value.trim();
                if (currentTags.indexOf(val) === -1) currentTags.push(val);
                input.value = ''; autocomplete.classList.remove('is-open'); renderTagChips();
            }
        });
        tagInputWrap.appendChild(input); tagInputWrap.appendChild(autocomplete); renderTagChips();
        box.appendChild(tagInputWrap);
        var actionsDiv = document.createElement('div'); actionsDiv.style.marginTop = '16px'; actionsDiv.style.display = 'flex'; actionsDiv.style.gap = '8px'; actionsDiv.style.justifyContent = 'flex-end';
        var saveBtn = document.createElement('button'); saveBtn.className = 'btn btn-primary'; saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', function () { saveAssetTags(asset, currentTags); modalRoot.style.display = 'none'; modalRoot.innerHTML = ''; });
        var cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', function () { modalRoot.style.display = 'none'; modalRoot.innerHTML = ''; });
        actionsDiv.appendChild(cancelBtn); actionsDiv.appendChild(saveBtn); box.appendChild(actionsDiv);
        modal.appendChild(box); modalRoot.appendChild(modal); modalRoot.style.display = 'block';
        modal.addEventListener('click', function (e) { if (e.target === modal) { modalRoot.style.display = 'none'; modalRoot.innerHTML = ''; } });
    }

    function saveAssetTags(asset, newTags) {
        var existingTags = {};
        try { existingTags = JSON.parse(asset._rawTags || '{}'); } catch (_) {}
        existingTags.customTags = newTags;
        fetchWithCsrf('/api/asset-library/' + encodeURIComponent(asset.id), {
            method: 'PUT', body: JSON.stringify({ tags: JSON.stringify(existingTags) }),
        }).then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) { asset.tags = newTags; state.renderAssets(); uiToast('标签已保存', 'success'); }
                else { uiToast('保存失败', 'warn'); }
            }).catch(function () { uiToast('保存失败', 'warn'); });
    }

    // ── 初始化 ──
    function init(sharedState) {
        state = sharedState;

        // 获取 DOM 元素引用
        els.searchEl = document.getElementById('search');
        els.assetSearchEl = document.getElementById('assetSearch');
        els.categoryFilterEl = document.getElementById('categoryFilter');
        els.typeFilterEl = document.getElementById('typeFilter');
        els.sortOrderEl = document.getElementById('sortOrder');

        // 将 filterAssets 挂到共享状态，供 renderAssets 动态调用
        state.filterAssets = filterAssets;

        // 搜索与筛选（搜索框加 300ms 防抖）
        var _searchTimer = null;
        var debouncedRender = function () { clearTimeout(_searchTimer); _searchTimer = setTimeout(state.renderAssets, 300); };
        if (els.searchEl) els.searchEl.addEventListener('input', debouncedRender);
        if (els.categoryFilterEl) els.categoryFilterEl.addEventListener('change', function () { state.renderAssets(); });
        if (els.assetSearchEl) els.assetSearchEl.addEventListener('input', debouncedRender);
        if (els.typeFilterEl) els.typeFilterEl.addEventListener('change', function () { state.renderAssets(); });
        if (els.sortOrderEl) els.sortOrderEl.addEventListener('change', function () { state.renderAssets(); });

        if (els.searchEl) {
            els.searchEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { state.renderAssets(); }
            });
        }
    }

    // ── 导出 ──
    window.AssetLibraryFilter = {
        init: init,
        filterAssets: filterAssets,
        renderTagFilterBar: renderTagFilterBar,
        enhanceRenderedCards: enhanceRenderedCards,
        showCardContextMenu: showCardContextMenu,
        showProjectSelector: showProjectSelector,
        showTagEditor: showTagEditor,
        getAllTags: getAllTags
    };
})();
