/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
(function () {
    'use strict';

    const PMSharedLib = window.PMShared || {};

    function tr(key, fallback) {
        if (!window.i18n) return fallback;
        const translated = window.i18n.t(key);
        return translated === key ? fallback : translated;
    }

    // ── Custom select component ──

    function initModalTechSelects() {
        if (window.__pmTechSelectGlobalBound !== true) {
            window.__pmTechSelectGlobalBound = true;
            document.addEventListener('click', function (e) {
                document.querySelectorAll('.pm-tech-select.is-open').forEach(function (wrap) {
                    const portalMenu = wrap.__portalMenu;
                    const clickedInside = wrap.contains(e.target) || (portalMenu && portalMenu.contains(e.target));
                    if (!clickedInside) {
                        if (typeof wrap.__closePmTechSelect === 'function') {
                            wrap.__closePmTechSelect();
                        } else {
                            wrap.classList.remove('is-open');
                        }
                    }
                });
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    document.querySelectorAll('.pm-tech-select.is-open').forEach(function (wrap) {
                        if (typeof wrap.__closePmTechSelect === 'function') {
                            wrap.__closePmTechSelect();
                        } else {
                            wrap.classList.remove('is-open');
                        }
                    });
                }
            });
        }

        const selector =
            '#edit-project-modal select, #project-assets-modal select, #sketch-to-asset-modal select, #desc-to-asset-modal select, #unify-style-modal select';
        document.querySelectorAll(selector).forEach(function (select) {
            const oldWrap =
                select.nextElementSibling && select.nextElementSibling.classList.contains('pm-tech-select')
                    ? select.nextElementSibling
                    : null;
            if (oldWrap) {
                if (typeof oldWrap.__closePmTechSelect === 'function') oldWrap.__closePmTechSelect();
                oldWrap.remove();
            }

            select.classList.add('pm-tech-select-native');

            const wrapper = document.createElement('div');
            wrapper.className = 'pm-tech-select';
            const computed = window.getComputedStyle(select);
            if (computed.display === 'inline-flex' || computed.display === 'flex' || computed.flexGrow !== '0') {
                wrapper.style.flex =
                    computed.flexGrow && computed.flexGrow !== '0'
                        ? computed.flexGrow + ' ' + computed.flexShrink + ' auto'
                        : '1 1 auto';
                wrapper.style.minWidth = computed.minWidth;
            }
            if (select.style.width) wrapper.style.width = select.style.width;

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'pm-tech-select-trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');

            const value = document.createElement('span');
            value.className = 'pm-tech-select-value';
            trigger.appendChild(value);

            const menu = document.createElement('div');
            menu.className = 'pm-tech-select-menu';
            menu.setAttribute('role', 'listbox');
            wrapper.__portalMenu = menu;

            Array.from(select.options).forEach(function (opt) {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'pm-tech-select-option';
                item.textContent = opt.textContent;
                item.dataset.value = opt.value;
                if (opt.disabled) item.disabled = true;
                if (opt.value === '' || opt.value === 'all') item.classList.add('is-placeholder');
                menu.appendChild(item);
            });

            select.insertAdjacentElement('afterend', wrapper);
            wrapper.appendChild(trigger);
            wrapper.appendChild(menu);

            const syncUI = function () {
                const current = select.options[select.selectedIndex];
                value.textContent = current ? current.textContent : tr('common.select', '请选择');
                value.classList.toggle('is-placeholder', !select.value || select.value === 'all');
                menu.querySelectorAll('.pm-tech-select-option').forEach(function (item) {
                    item.classList.toggle('is-selected', item.dataset.value === select.value);
                });
            };

            const positionPortalMenu = function () {
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

            const handleViewportChange = function () {
                if (wrapper.classList.contains('is-open')) positionPortalMenu();
            };

            const closeMenu = function () {
                wrapper.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
                window.removeEventListener('resize', handleViewportChange);
                document.removeEventListener('scroll', handleViewportChange, true);
                if (menu.parentElement !== wrapper) wrapper.appendChild(menu);
                menu.classList.remove('pm-tech-select-menu--portal');
                menu.style.left = '';
                menu.style.top = '';
                menu.style.width = '';
                menu.style.maxHeight = '';
            };
            wrapper.__closePmTechSelect = closeMenu;

            trigger.addEventListener('click', function () {
                const willOpen = !wrapper.classList.contains('is-open');
                document.querySelectorAll('.pm-tech-select.is-open').forEach(function (el) {
                    if (typeof el.__closePmTechSelect === 'function') el.__closePmTechSelect();
                    else el.classList.remove('is-open');
                });
                if (!willOpen) {
                    closeMenu();
                    return;
                }
                wrapper.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                if (menu.parentElement !== document.body) document.body.appendChild(menu);
                menu.classList.add('pm-tech-select-menu--portal');
                positionPortalMenu();
                window.addEventListener('resize', handleViewportChange);
                document.addEventListener('scroll', handleViewportChange, true);
            });

            menu.addEventListener('click', function (e) {
                const item = e.target.closest('.pm-tech-select-option');
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
        });
    }

    // ── Project list rendering ──

    function renderProjectList() {
        const projectListEl = document.getElementById('project-list');
        const emptyStateEl = document.getElementById('project-empty-state');

        if (projects.length === 0) {
            projectListEl.innerHTML = '';
            emptyStateEl.classList.remove('hidden');
            return;
        }

        emptyStateEl.classList.add('hidden');

        const fragment = document.createDocumentFragment();

        projects.forEach(function (project) {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.id = project.id;

            const isInDashboard = window.location.pathname.includes('dashboard.html');
            const detailPagePath = isInDashboard
                ? 'modules/project-management/project-detail.html'
                : 'project-detail.html';

            const esc = PMSharedLib.escapeHtml;
            card.innerHTML =
                '<h4>' +
                esc(project.name) +
                '</h4>' +
                '<span class="project-type">' +
                esc(PMSharedLib.getProjectTypeName(project.type)) +
                '</span>' +
                '<p class="project-desc">' +
                esc(project.desc || project.description || tr('pm.noDescription', '无描述')) +
                '</p>' +
                '<div class="project-meta">' +
                '<span>' +
                esc(tr('pm.createdAt', '创建时间')) +
                ': ' +
                esc(PMSharedLib.formatDate(project.createTime || project.created_at)) +
                '</span>' +
                '<span>' +
                esc(tr('pm.version', '版本')) +
                ': v' +
                esc(project.version) +
                '</span>' +
                '<span>' +
                esc(tr('pm.assetCount', '素材数')) +
                ': ' +
                (project.assets ? project.assets.length : 0) +
                '</span>' +
                '</div>' +
                '<div class="project-card-actions">' +
                '<button class="icon-btn edit-project" title="' +
                esc(tr('pm.editProject', '编辑项目')) +
                '"><i class="fas fa-edit"></i><span class="action-label">' +
                esc(tr('pm.edit', '编辑')) +
                '</span></button>' +
                '<button class="icon-btn delete-project" title="' +
                esc(tr('pm.deleteProject', '删除项目')) +
                '"><i class="fas fa-trash"></i><span class="action-label">' +
                esc(tr('common.delete', '删除')) +
                '</span></button>' +
                '<button class="icon-btn version-history" title="' +
                esc(tr('pm.versionHistory', '查看版本历史')) +
                '"><i class="fas fa-history"></i><span class="action-label">' +
                esc(tr('pm.history', '版本')) +
                '</span></button>' +
                '<button class="icon-btn share-project" title="' +
                esc(tr('pm.shareProject', '分享项目')) +
                '"><i class="fas fa-share-alt"></i><span class="action-label">' +
                esc(tr('pm.share', '分享')) +
                '</span></button>' +
                '<button class="icon-btn manage-assets" title="' +
                esc(tr('pm.manageAssets', '管理素材')) +
                '"><i class="fas fa-images"></i><span class="action-label">' +
                esc(tr('pm.assets', '素材')) +
                '</span></button>' +
                '</div>';

            card.addEventListener('click', function (e) {
                if (e.target.closest('.icon-btn')) {
                    return;
                }
                setActiveProjectCard(project.id);
                window.location.href = detailPagePath + '?id=' + encodeURIComponent(project.id);
            });

            fragment.appendChild(card);
        });

        projectListEl.innerHTML = '';
        projectListEl.appendChild(fragment);
        setActiveProjectCard(currentProjectId);

        bindProjectCardEvents();
    }

    // ── Event binding ──

    function bindEventListeners() {
        const openCreateProjectForm = function () {
            const form = document.getElementById('create-project-form');
            if (form) {
                form.classList.remove('hidden');
                const nameInput = document.getElementById('project-name');
                if (nameInput) {
                    nameInput.focus();
                }
            }
        };

        const createBtn = document.getElementById('create-project-btn');
        if (createBtn) {
            createBtn.addEventListener('click', openCreateProjectForm);
        }

        const emptyStateEl = document.getElementById('project-empty-state');
        if (emptyStateEl) {
            emptyStateEl.style.cursor = 'pointer';
            emptyStateEl.addEventListener('click', openCreateProjectForm);
            emptyStateEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCreateProjectForm();
                }
            });
        }

        const cancelBtn = document.getElementById('cancel-create-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                document.getElementById('create-project-form').classList.add('hidden');
                resetForm('create');
            });
        }

        const submitBtn = document.getElementById('submit-project-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', createProject);
        }

        const sketchToAssetBtn = document.getElementById('sketch-to-asset-btn');
        if (sketchToAssetBtn) {
            sketchToAssetBtn.addEventListener('click', function () {
                document.getElementById('sketch-to-asset-modal').classList.remove('hidden');
            });
        }

        const descToAssetBtn = document.getElementById('desc-to-asset-btn');
        if (descToAssetBtn) {
            descToAssetBtn.addEventListener('click', function () {
                document.getElementById('desc-to-asset-modal').classList.remove('hidden');
            });
        }

        const confirmSketchBtn = document.getElementById('confirm-sketch-btn');
        if (confirmSketchBtn) {
            confirmSketchBtn.addEventListener('click', async function () {
                const sketchUrlInput = document.getElementById('sketch-url');
                const sketchStyleInput = document.getElementById('sketch-style');
                const sketchOutputTypeInput = document.getElementById('sketch-output-type');
                const sketchUrl = (sketchUrlInput && sketchUrlInput.value ? sketchUrlInput.value : '').trim();
                if (!sketchUrl) {
                    await PMSharedLib.showTechPrompt({
                        title: tr('pm.invalidInput', '输入有误'),
                        message: tr('pm.enterSketchUrl', '请先填写线稿图片 URL。'),
                        confirmText: tr('pm.gotIt', '知道了'),
                    });
                    return;
                }
                const style = sketchStyleInput ? sketchStyleInput.value : '';
                const outputType = sketchOutputTypeInput ? sketchOutputTypeInput.value : '';
                const aiPagePath = getAIGeneratePath();
                window.location.href =
                    aiPagePath +
                    '?from=project-management&mode=sketch&sourceUrl=' +
                    encodeURIComponent(sketchUrl) +
                    '&style=' +
                    encodeURIComponent(style) +
                    '&outputType=' +
                    encodeURIComponent(outputType);
            });
        }

        const confirmDescBtn = document.getElementById('confirm-desc-btn');
        if (confirmDescBtn) {
            confirmDescBtn.addEventListener('click', async function () {
                const descriptionInput = document.getElementById('asset-description');
                const descStyleInput = document.getElementById('desc-style');
                const descOutputTypeInput = document.getElementById('desc-output-type');
                const description = (descriptionInput && descriptionInput.value ? descriptionInput.value : '').trim();
                if (!description) {
                    await PMSharedLib.showTechPrompt({
                        title: tr('pm.invalidInput', '输入有误'),
                        message: tr('pm.enterDescription', '请先填写素材描述。'),
                        confirmText: tr('pm.gotIt', '知道了'),
                    });
                    return;
                }
                const style = descStyleInput ? descStyleInput.value : '';
                const outputType = descOutputTypeInput ? descOutputTypeInput.value : '';
                const aiPagePath = getAIGeneratePath();
                window.location.href =
                    aiPagePath +
                    '?from=project-management&mode=description&prompt=' +
                    encodeURIComponent(description) +
                    '&style=' +
                    encodeURIComponent(style) +
                    '&outputType=' +
                    encodeURIComponent(outputType);
            });
        }

        document.querySelectorAll('.close-modal').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.modal').forEach(function (modal) {
                    modal.classList.add('hidden');
                });
            });
        });

        const saveEditBtn = document.getElementById('save-edit-btn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', saveEditProject);
        }

        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', function () {
                const linkInput = document.getElementById('share-link');
                const textToCopy = linkInput.value;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy);
                } else {
                    linkInput.select();
                    document.execCommand('copy');
                }
                PMSharedLib.uiToast(tr('pm.linkCopied', '分享链接已复制！'), 'success');
            });
        }

        const addAssetBtn = document.getElementById('add-asset-btn');
        if (addAssetBtn) {
            addAssetBtn.addEventListener('click', addProjectAsset);
        }

        const assetFileInput = document.getElementById('asset-file');
        const assetFileName = document.getElementById('asset-file-name');
        if (assetFileInput && assetFileName) {
            assetFileInput.addEventListener('change', function () {
                const file = assetFileInput.files && assetFileInput.files[0];
                assetFileName.textContent = file ? file.name : tr('pm.noLocalFile', '未选择本地文件');
                const assetNameInput = document.getElementById('asset-name');
                if (file && assetNameInput && !assetNameInput.value.trim()) {
                    assetNameInput.value = file.name.replace(/\.[^/.]+$/, '');
                }
            });
        }
    }

    // ── Project card events ──

    function bindProjectCardEvents() {
        document.querySelectorAll('.edit-project').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openEditModal(projectId);
            });
        });

        document.querySelectorAll('.delete-project').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                const ok = await PMSharedLib.showTechPrompt({
                    title: tr('pm.deleteProject', '删除项目'),
                    message: tr('pm.deleteProjectConfirm', '确定删除该项目？此操作不可恢复！'),
                    confirmText: tr('common.delete', '删除'),
                    cancelText: tr('common.cancel', '取消'),
                    showCancel: true,
                });
                if (ok) {
                    deleteProject(projectId);
                }
            });
        });

        document.querySelectorAll('.version-history').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openVersionHistoryModal(projectId);
            });
        });

        document.querySelectorAll('.share-project').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openShareModal(projectId);
            });
        });

        document.querySelectorAll('.manage-assets').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openAssetsModal(projectId);
            });
        });
    }

    // ── Asset events ──

    function bindAssetEvents() {
        document.querySelectorAll('.delete-asset').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                const index = parseInt(e.target.closest('.delete-asset').dataset.index);
                const projectId = e.target.closest('.delete-asset').dataset.projectId;

                const ok = await PMSharedLib.showTechPrompt({
                    title: tr('pm.deleteAsset', '删除素材'),
                    message: tr('pm.deleteAssetConfirm', '确定删除此素材？'),
                    confirmText: tr('common.delete', '删除'),
                    cancelText: tr('common.cancel', '取消'),
                    showCancel: true,
                });
                if (!ok) return;

                const project = projects.find(function (p) {
                    return p.id === projectId;
                });
                if (project && project.assets && project.assets[index]) {
                    project.assets.splice(index, 1);
                    saveProjectsToStorage();
                    openAssetsModal(projectId);
                }
            });
        });
    }

    // ── Modal management ──

    function openEditModal(projectId) {
        const project = projects.find(function (p) {
            return p.id === projectId;
        });
        if (!project) return;

        currentProjectId = projectId;
        document.getElementById('edit-project-id').value = projectId;
        document.getElementById('edit-project-name').value = project.name;
        document.getElementById('edit-project-desc').value = project.desc || '';
        document.getElementById('edit-project-type').value = project.type;
        document.getElementById('edit-project-type').dispatchEvent(new Event('change', { bubbles: true }));

        initModalTechSelects();
        document.getElementById('edit-project-modal').classList.remove('hidden');
    }

    function openVersionHistoryModal(projectId) {
        const project = projects.find(function (p) {
            return p.id === projectId;
        });
        if (!project) return;

        document.getElementById('history-project-id').value = projectId;
        const versionListEl = document.getElementById('version-list');

        if (!project.versionHistory || project.versionHistory.length === 0) {
            versionListEl.innerHTML =
                '<p class="no-versions">' + PMSharedLib.escapeHtml(tr('pm.noVersions', '暂无版本历史记录')) + '</p>';
        } else {
            const fragment = document.createDocumentFragment();
            const sortedHistory = project.versionHistory.slice().sort(function (a, b) {
                return new Date(b.time) - new Date(a.time);
            });

            sortedHistory.forEach(function (version, index) {
                const versionItem = document.createElement('div');
                versionItem.className = 'version-item';
                versionItem.innerHTML =
                    '<div class="version-header">' +
                    '<span class="version-index">' +
                    (index + 1) +
                    '</span>' +
                    '<span class="version-time">' +
                    PMSharedLib.formatDate(version.time) +
                    '</span>' +
                    '</div>' +
                    '<div class="version-desc">' +
                    PMSharedLib.escapeHtml(version.desc || '') +
                    '</div>';
                fragment.appendChild(versionItem);
            });

            versionListEl.innerHTML = '';
            versionListEl.appendChild(fragment);
        }

        initModalTechSelects();
        document.getElementById('version-history-modal').classList.remove('hidden');
    }

    function openShareModal(projectId) {
        const project = projects.find(function (p) {
            return p.id === projectId;
        });
        if (!project) return;

        document.getElementById('share-project-id').value = projectId;

        const isInDashboard = window.location.pathname.includes('dashboard.html');
        const detailPagePath = isInDashboard ? 'modules/project-management/project-detail.html' : 'project-detail.html';

        const shareLink =
            window.location.origin + window.location.pathname.replace(/[^/]+$/, detailPagePath) + '?id=' + projectId;
        document.getElementById('share-link').value = shareLink;

        initModalTechSelects();
        document.getElementById('share-project-modal').classList.remove('hidden');
    }

    function openAssetsModal(projectId) {
        const project = projects.find(function (p) {
            return p.id === projectId;
        });
        if (!project) return;

        const assetsListEl = document.getElementById('assets-list');

        if (!project.assets || project.assets.length === 0) {
            assetsListEl.innerHTML =
                '<div class="empty-state"><i class="fas fa-image"></i><p>' +
                PMSharedLib.escapeHtml(tr('pm.noAssetsStart', '暂无素材，点击添加素材按钮开始添加')) +
                '</p></div>';
        } else {
            const fragment = document.createDocumentFragment();
            const esc = PMSharedLib.escapeHtml;

            project.assets.forEach(function (asset, index) {
                const assetItem = document.createElement('div');
                assetItem.className = 'asset-item';
                assetItem.innerHTML =
                    '<div class="asset-info">' +
                    '<div class="asset-name">' +
                    esc(asset.name) +
                    '</div>' +
                    '<div class="asset-type">' +
                    esc(PMSharedLib.getAssetTypeName(asset.type)) +
                    '</div>' +
                    '<div class="asset-content">' +
                    esc(asset.content.substring(0, 50)) +
                    (asset.content.length > 50 ? '...' : '') +
                    '</div>' +
                    '</div>' +
                    '<div class="asset-actions">' +
                    '<button class="icon-btn edit-asset" data-index="' +
                    index +
                    '" data-project-id="' +
                    projectId +
                    '"><i class="fas fa-edit"></i></button>' +
                    '<button class="icon-btn delete-asset" data-index="' +
                    index +
                    '" data-project-id="' +
                    projectId +
                    '"><i class="fas fa-trash"></i></button>' +
                    '</div>';
                fragment.appendChild(assetItem);
            });

            assetsListEl.innerHTML = '';
            assetsListEl.appendChild(fragment);
        }

        document.getElementById('assets-project-id').value = projectId;
        initModalTechSelects();
        document.getElementById('project-assets-modal').classList.remove('hidden');

        bindAssetEvents();
    }

    // ── Form helpers ──

    function resetForm(type) {
        if (type === 'create') {
            document.getElementById('project-name').value = '';
            document.getElementById('project-desc').value = '';
            document.getElementById('project-type').value = 'ui';
            const openAiInput = document.getElementById('open-ai-after-create');
            if (openAiInput) {
                openAiInput.checked = true;
            }
        }
    }

    window.PMUI = {
        initModalTechSelects: initModalTechSelects,
        renderProjectList: renderProjectList,
        bindEventListeners: bindEventListeners,
        bindProjectCardEvents: bindProjectCardEvents,
        bindAssetEvents: bindAssetEvents,
        openEditModal: openEditModal,
        openVersionHistoryModal: openVersionHistoryModal,
        openShareModal: openShareModal,
        openAssetsModal: openAssetsModal,
        resetForm: resetForm,
    };
})();
