/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * 素材库 - 右键菜单、项目复制、标签编辑器
 * 从 asset-library.js 拆分，通过 AssetLibraryContextMenu 暴露
 */
(function () {
    'use strict';

    // ── 依赖注入（由 asset-library.js init 时调用 setDeps 传入） ──
    let _getAllTags = null;
    let _fetchWithCsrf = null;
    let _uiToast = null;
    let _escapeHtml = null;
    let _getModalRoot = null;

    function setDeps(deps) {
        _getAllTags = deps.getAllTags;
        _fetchWithCsrf = deps.fetchWithCsrf;
        _uiToast = deps.uiToast;
        _escapeHtml = deps.escapeHtml;
        _getModalRoot = deps.getModalRoot;
    }

    // ── 右键上下文菜单 ──
    function showCardContextMenu(asset, anchorEl, callbacks) {
        document.querySelectorAll('.card-context-menu.is-open').forEach(function (m) { m.remove(); });
        const menu = document.createElement('div');
        menu.className = 'card-context-menu is-open';

        const btnCopy = document.createElement('button');
        btnCopy.innerHTML = '<i class="fas fa-copy"></i> 复制到项目';
        btnCopy.addEventListener('click', function (e) {
            e.stopPropagation(); menu.remove();
            showProjectSelector(asset, callbacks);
        });

        const btnTags = document.createElement('button');
        btnTags.innerHTML = '<i class="fas fa-tags"></i> 编辑标签';
        btnTags.addEventListener('click', function (e) {
            e.stopPropagation(); menu.remove();
            showTagEditor(asset, callbacks);
        });

        menu.appendChild(btnCopy);
        menu.appendChild(btnTags);
        document.body.appendChild(menu);

        const rect = anchorEl.getBoundingClientRect();
        menu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';

        setTimeout(function () {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 10);
    }

    // ── 跨项目复制 ──
    function showProjectSelector(asset, _callbacks) {
        const dialog = document.createElement('div');
        dialog.className = 'project-selector-dialog';
        const box = document.createElement('div');
        box.className = 'project-selector-box';
        const title = document.createElement('h3');
        title.textContent = '选择目标项目';
        box.appendChild(title);

        const listDiv = document.createElement('div');
        listDiv.innerHTML = '<div class="project-selector-empty">加载中...</div>';
        box.appendChild(listDiv);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'project-selector-close';
        closeBtn.textContent = '取消';
        closeBtn.addEventListener('click', function () { dialog.remove(); });
        box.appendChild(closeBtn);
        dialog.appendChild(box);
        dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.remove(); });
        document.body.appendChild(dialog);

        fetch('/api/projects', { credentials: 'include' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                listDiv.innerHTML = '';
                if (!data.ok || !Array.isArray(data.projects) || data.projects.length === 0) {
                    listDiv.innerHTML = '<div class="project-selector-empty">暂无项目，请先创建项目</div>';
                    return;
                }
                data.projects.forEach(function (proj) {
                    const item = document.createElement('div');
                    item.className = 'project-list-item';
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'project-item-name';
                    nameSpan.textContent = proj.name;
                    const typeSpan = document.createElement('span');
                    typeSpan.className = 'project-item-type';
                    typeSpan.textContent = proj.type || '';
                    item.appendChild(nameSpan);
                    item.appendChild(typeSpan);
                    item.addEventListener('click', function () { copyAssetToProject(asset, proj, dialog); });
                    listDiv.appendChild(item);
                });
            })
            .catch(function () { listDiv.innerHTML = '<div class="project-selector-empty">加载失败</div>'; });
    }

    function copyAssetToProject(asset, project, dialog) {
        const assetName = asset.name || asset.fileName || '未命名';
        _fetchWithCsrf('/api/projects/' + project.id + '/assets', {
            method: 'POST',
            body: JSON.stringify({ name: assetName, type: asset.type || 'image', content: asset.dataURL || '' }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    _uiToast('已复制到项目: ' + project.name, 'success');
                    if (dialog) dialog.remove();
                } else {
                    _uiToast('复制失败: ' + (data.error || '未知错误'), 'warn');
                }
            })
            .catch(function (e) { _uiToast('复制失败: ' + (e.message || '网络错误'), 'warn'); });
    }

    // ── 标签编辑器 ──
    function showTagEditor(asset, callbacks) {
        const modalRoot = _getModalRoot();
        if (!modalRoot) return;
        modalRoot.innerHTML = '';

        const modal = document.createElement('div');
        modal.className = 'modal';
        const box = document.createElement('div');
        box.className = 'box';
        box.style.width = '400px';

        const titleEl = document.createElement('div');
        titleEl.style.marginBottom = '12px';
        titleEl.innerHTML = '<strong>编辑标签 - ' + _escapeHtml(asset.name || asset.fileName) + '</strong>';
        box.appendChild(titleEl);

        const currentTags = Array.isArray(asset.tags) ? asset.tags.slice() : [];
        const tagInputWrap = document.createElement('div');
        tagInputWrap.className = 'tag-input-wrap';
        tagInputWrap.style.position = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入标签后按回车...';

        const autocomplete = document.createElement('div');
        autocomplete.className = 'tag-autocomplete';

        function renderTagChips() {
            tagInputWrap.querySelectorAll('.tag-chip').forEach(function (c) { c.remove(); });
            currentTags.forEach(function (tag, tidx) {
                const chip = document.createElement('span');
                chip.className = 'tag-chip';
                chip.textContent = tag;
                const removeBtn = document.createElement('span');
                removeBtn.className = 'tag-remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', function () {
                    currentTags.splice(tidx, 1);
                    renderTagChips();
                });
                chip.appendChild(removeBtn);
                tagInputWrap.insertBefore(chip, input);
            });
        }

        function showAutocomplete(query) {
            const allTags = _getAllTags().filter(function (t) {
                return currentTags.indexOf(t) === -1 && t.toLowerCase().indexOf(query.toLowerCase()) !== -1;
            });
            autocomplete.innerHTML = '';
            if (allTags.length === 0 || !query) { autocomplete.classList.remove('is-open'); return; }
            allTags.slice(0, 8).forEach(function (tag) {
                const btn = document.createElement('button');
                btn.className = 'tag-autocomplete-item';
                btn.textContent = tag;
                btn.addEventListener('click', function () {
                    if (currentTags.indexOf(tag) === -1) currentTags.push(tag);
                    input.value = '';
                    autocomplete.classList.remove('is-open');
                    renderTagChips();
                });
                autocomplete.appendChild(btn);
            });
            autocomplete.classList.add('is-open');
            autocomplete.style.left = '0';
            autocomplete.style.bottom = '100%';
        }

        input.addEventListener('input', function () { showAutocomplete(input.value); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && input.value.trim()) {
                e.preventDefault();
                const val = input.value.trim();
                if (currentTags.indexOf(val) === -1) currentTags.push(val);
                input.value = '';
                autocomplete.classList.remove('is-open');
                renderTagChips();
            }
        });

        tagInputWrap.appendChild(input);
        tagInputWrap.appendChild(autocomplete);
        renderTagChips();
        box.appendChild(tagInputWrap);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.marginTop = '16px';
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '8px';
        actionsDiv.style.justifyContent = 'flex-end';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', function () {
            saveAssetTags(asset, currentTags, callbacks);
            modalRoot.style.display = 'none';
            modalRoot.innerHTML = '';
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', function () {
            modalRoot.style.display = 'none';
            modalRoot.innerHTML = '';
        });

        actionsDiv.appendChild(cancelBtn);
        actionsDiv.appendChild(saveBtn);
        box.appendChild(actionsDiv);
        modal.appendChild(box);
        modalRoot.appendChild(modal);
        modalRoot.style.display = 'block';

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                modalRoot.style.display = 'none';
                modalRoot.innerHTML = '';
            }
        });
    }

    function saveAssetTags(asset, newTags, callbacks) {
        let existingTags = {};
        try { existingTags = JSON.parse(asset._rawTags || '{}'); } catch (_) { /* ignore */ }
        existingTags.customTags = newTags;

        _fetchWithCsrf('/api/asset-library/' + encodeURIComponent(asset.id), {
            method: 'PUT',
            body: JSON.stringify({ tags: JSON.stringify(existingTags) }),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    asset.tags = newTags;
                    if (callbacks && typeof callbacks.onTagsUpdated === 'function') {
                        callbacks.onTagsUpdated();
                    }
                    _uiToast('标签已保存', 'success');
                } else {
                    _uiToast('保存失败', 'warn');
                }
            })
            .catch(function () { _uiToast('保存失败', 'warn'); });
    }

    // ── 导出 ──
    window.AssetLibraryContextMenu = {
        setDeps: setDeps,
        showCardContextMenu: showCardContextMenu,
        showProjectSelector: showProjectSelector,
        showTagEditor: showTagEditor
    };
})();
