/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function () {
    'use strict';

    var PMSharedLib = window.PMShared || {};

    // ── Custom select component ──

    function initModalTechSelects() {
        if (window.__pmTechSelectGlobalBound !== true) {
            window.__pmTechSelectGlobalBound = true;
            document.addEventListener('click', function (e) {
                document.querySelectorAll('.pm-tech-select.is-open').forEach(function (wrap) {
                    var portalMenu = wrap.__portalMenu;
                    var clickedInside = wrap.contains(e.target) || (portalMenu && portalMenu.contains(e.target));
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

        var selector =
            '#edit-project-modal select, #project-assets-modal select, #sketch-to-asset-modal select, #desc-to-asset-modal select, #unify-style-modal select';
        document.querySelectorAll(selector).forEach(function (select) {
            var oldWrap =
                select.nextElementSibling && select.nextElementSibling.classList.contains('pm-tech-select')
                    ? select.nextElementSibling
                    : null;
            if (oldWrap) {
                if (typeof oldWrap.__closePmTechSelect === 'function') oldWrap.__closePmTechSelect();
                oldWrap.remove();
            }

            select.classList.add('pm-tech-select-native');

            var wrapper = document.createElement('div');
            wrapper.className = 'pm-tech-select';
            var computed = window.getComputedStyle(select);
            if (computed.display === 'inline-flex' || computed.display === 'flex' || computed.flexGrow !== '0') {
                wrapper.style.flex =
                    computed.flexGrow && computed.flexGrow !== '0'
                        ? computed.flexGrow + ' ' + computed.flexShrink + ' auto'
                        : '1 1 auto';
                wrapper.style.minWidth = computed.minWidth;
            }
            if (select.style.width) wrapper.style.width = select.style.width;

            var trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'pm-tech-select-trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');

            var value = document.createElement('span');
            value.className = 'pm-tech-select-value';
            trigger.appendChild(value);

            var menu = document.createElement('div');
            menu.className = 'pm-tech-select-menu';
            menu.setAttribute('role', 'listbox');
            wrapper.__portalMenu = menu;

            Array.from(select.options).forEach(function (opt) {
                var item = document.createElement('button');
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

            var syncUI = function () {
                var current = select.options[select.selectedIndex];
                value.textContent = current ? current.textContent : '请选择';
                value.classList.toggle('is-placeholder', !select.value || select.value === 'all');
                menu.querySelectorAll('.pm-tech-select-option').forEach(function (item) {
                    item.classList.toggle('is-selected', item.dataset.value === select.value);
                });
            };

            var positionPortalMenu = function () {
                if (!wrapper.classList.contains('is-open')) return;
                var rect = trigger.getBoundingClientRect();
                var viewportW = window.innerWidth;
                var viewportH = window.innerHeight;
                var safeLeft = Math.max(8, Math.min(rect.left, viewportW - rect.width - 8));
                var spaceBelow = viewportH - rect.bottom - 10;
                var spaceAbove = rect.top - 10;
                var openDown = spaceBelow >= 180 || spaceBelow >= spaceAbove;
                var maxHeight = Math.max(120, Math.min(280, openDown ? spaceBelow : spaceAbove));
                var top = openDown ? rect.bottom + 6 : rect.top - maxHeight - 6;
                top = Math.max(8, Math.min(top, viewportH - maxHeight - 8));
                menu.style.left = safeLeft + 'px';
                menu.style.top = top + 'px';
                menu.style.width = rect.width + 'px';
                menu.style.maxHeight = maxHeight + 'px';
            };

            var handleViewportChange = function () {
                if (wrapper.classList.contains('is-open')) positionPortalMenu();
            };

            var closeMenu = function () {
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
                var willOpen = !wrapper.classList.contains('is-open');
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
                var item = e.target.closest('.pm-tech-select-option');
                if (!item || item.disabled) return;
                var nextValue = item.dataset.value || '';
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
        var projectListEl = document.getElementById('project-list');
        var emptyStateEl = document.getElementById('project-empty-state');

        if (projects.length === 0) {
            projectListEl.innerHTML = '';
            emptyStateEl.classList.remove('hidden');
            return;
        }

        emptyStateEl.classList.add('hidden');

        var fragment = document.createDocumentFragment();

        projects.forEach(function (project) {
            var card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.id = project.id;

            var isInDashboard = window.location.pathname.includes('dashboard.html');
            var detailPagePath = isInDashboard ? 'modules/project-management/project-detail.html' : 'project-detail.html';

            var esc = PMSharedLib.escapeHtml;
            card.innerHTML =
                '<h4>' + esc(project.name) + '</h4>' +
                '<span class="project-type">' + esc(PMSharedLib.getProjectTypeName(project.type)) + '</span>' +
                '<p class="project-desc">' + esc(project.desc || project.description || '无描述') + '</p>' +
                '<div class="project-meta">' +
                '<span>创建时间: ' + esc(PMSharedLib.formatDate(project.createTime || project.created_at)) + '</span>' +
                '<span>版本: v' + esc(project.version) + '</span>' +
                '<span>素材数: ' + (project.assets ? project.assets.length : 0) + '</span>' +
                '</div>' +
                '<div class="project-card-actions">' +
                '<button class="icon-btn edit-project" title="编辑项目"><i class="fas fa-edit"></i><span class="action-label">编辑</span></button>' +
                '<button class="icon-btn delete-project" title="删除项目"><i class="fas fa-trash"></i><span class="action-label">删除</span></button>' +
                '<button class="icon-btn version-history" title="查看版本历史"><i class="fas fa-history"></i><span class="action-label">版本</span></button>' +
                '<button class="icon-btn share-project" title="分享项目"><i class="fas fa-share-alt"></i><span class="action-label">分享</span></button>' +
                '<button class="icon-btn manage-assets" title="管理素材"><i class="fas fa-images"></i><span class="action-label">素材</span></button>' +
                '</div>';

            card.addEventListener('click', function (e) {
                if (e.target.closest('.icon-btn')) {
                    return;
                }
                setActiveProjectCard(project.id);
                window.location.href = detailPagePath + '?id=' + project.id;
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
        var openCreateProjectForm = function () {
            var form = document.getElementById('create-project-form');
            if (form) {
                form.classList.remove('hidden');
                var nameInput = document.getElementById('project-name');
                if (nameInput) {
                    nameInput.focus();
                }
            }
        };

        var createBtn = document.getElementById('create-project-btn');
        if (createBtn) {
            createBtn.addEventListener('click', openCreateProjectForm);
        }

        var emptyStateEl = document.getElementById('project-empty-state');
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

        var cancelBtn = document.getElementById('cancel-create-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                document.getElementById('create-project-form').classList.add('hidden');
                resetForm('create');
            });
        }

        var submitBtn = document.getElementById('submit-project-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', createProject);
        }

        var sketchToAssetBtn = document.getElementById('sketch-to-asset-btn');
        if (sketchToAssetBtn) {
            sketchToAssetBtn.addEventListener('click', function () {
                document.getElementById('sketch-to-asset-modal').classList.remove('hidden');
            });
        }

        var descToAssetBtn = document.getElementById('desc-to-asset-btn');
        if (descToAssetBtn) {
            descToAssetBtn.addEventListener('click', function () {
                document.getElementById('desc-to-asset-modal').classList.remove('hidden');
            });
        }

        var confirmSketchBtn = document.getElementById('confirm-sketch-btn');
        if (confirmSketchBtn) {
            confirmSketchBtn.addEventListener('click', async function () {
                var sketchUrlInput = document.getElementById('sketch-url');
                var sketchStyleInput = document.getElementById('sketch-style');
                var sketchOutputTypeInput = document.getElementById('sketch-output-type');
                var sketchUrl = (sketchUrlInput && sketchUrlInput.value ? sketchUrlInput.value : '').trim();
                if (!sketchUrl) {
                    await PMSharedLib.showTechPrompt({
                        title: '输入有误',
                        message: '请先填写线稿图片 URL。',
                        confirmText: '知道了',
                    });
                    return;
                }
                var style = sketchStyleInput ? sketchStyleInput.value : '';
                var outputType = sketchOutputTypeInput ? sketchOutputTypeInput.value : '';
                var aiPagePath = getAIGeneratePath();
                window.location.href = aiPagePath + '?from=project-management&mode=sketch&sourceUrl=' + encodeURIComponent(sketchUrl) + '&style=' + encodeURIComponent(style) + '&outputType=' + encodeURIComponent(outputType);
            });
        }

        var confirmDescBtn = document.getElementById('confirm-desc-btn');
        if (confirmDescBtn) {
            confirmDescBtn.addEventListener('click', async function () {
                var descriptionInput = document.getElementById('asset-description');
                var descStyleInput = document.getElementById('desc-style');
                var descOutputTypeInput = document.getElementById('desc-output-type');
                var description = (descriptionInput && descriptionInput.value ? descriptionInput.value : '').trim();
                if (!description) {
                    await PMSharedLib.showTechPrompt({
                        title: '输入有误',
                        message: '请先填写素材描述。',
                        confirmText: '知道了',
                    });
                    return;
                }
                var style = descStyleInput ? descStyleInput.value : '';
                var outputType = descOutputTypeInput ? descOutputTypeInput.value : '';
                var aiPagePath = getAIGeneratePath();
                window.location.href = aiPagePath + '?from=project-management&mode=description&prompt=' + encodeURIComponent(description) + '&style=' + encodeURIComponent(style) + '&outputType=' + encodeURIComponent(outputType);
            });
        }

        document.querySelectorAll('.close-modal').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.modal').forEach(function (modal) {
                    modal.classList.add('hidden');
                });
            });
        });

        var saveEditBtn = document.getElementById('save-edit-btn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', saveEditProject);
        }

        var copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', function () {
                var linkInput = document.getElementById('share-link');
                linkInput.select();
                document.execCommand('copy');
                PMSharedLib.uiToast('分享链接已复制！', 'success');
            });
        }

        var addAssetBtn = document.getElementById('add-asset-btn');
        if (addAssetBtn) {
            addAssetBtn.addEventListener('click', addProjectAsset);
        }

        var assetFileInput = document.getElementById('asset-file');
        var assetFileName = document.getElementById('asset-file-name');
        if (assetFileInput && assetFileName) {
            assetFileInput.addEventListener('change', function () {
                var file = assetFileInput.files && assetFileInput.files[0];
                assetFileName.textContent = file ? file.name : '未选择本地文件';
                var assetNameInput = document.getElementById('asset-name');
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
                var projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openEditModal(projectId);
            });
        });

        document.querySelectorAll('.delete-project').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                var projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                var ok = await PMSharedLib.showTechPrompt({
                    title: '删除项目',
                    message: '确定删除该项目？此操作不可恢复！',
                    confirmText: '删除',
                    cancelText: '取消',
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
                var projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openVersionHistoryModal(projectId);
            });
        });

        document.querySelectorAll('.share-project').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openShareModal(projectId);
            });
        });

        document.querySelectorAll('.manage-assets').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var projectId = e.target.closest('.project-card').dataset.id;
                setActiveProjectCard(projectId);
                openAssetsModal(projectId);
            });
        });
    }

    // ── Asset events ──

    function bindAssetEvents() {
        document.querySelectorAll('.delete-asset').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                var index = parseInt(e.target.closest('.delete-asset').dataset.index);
                var projectId = e.target.closest('.delete-asset').dataset.projectId;

                var ok = await PMSharedLib.showTechPrompt({
                    title: '删除素材',
                    message: '确定删除此素材？',
                    confirmText: '删除',
                    cancelText: '取消',
                    showCancel: true,
                });
                if (!ok) return;

                var project = projects.find(function (p) { return p.id === projectId; });
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
        var project = projects.find(function (p) { return p.id === projectId; });
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
        var project = projects.find(function (p) { return p.id === projectId; });
        if (!project) return;

        document.getElementById('history-project-id').value = projectId;
        var versionListEl = document.getElementById('version-list');

        if (!project.versionHistory || project.versionHistory.length === 0) {
            versionListEl.innerHTML = '<p class="no-versions">暂无版本历史记录</p>';
        } else {
            var fragment = document.createDocumentFragment();
            var sortedHistory = project.versionHistory.slice().sort(function (a, b) {
                return new Date(b.time) - new Date(a.time);
            });

            sortedHistory.forEach(function (version, index) {
                var versionItem = document.createElement('div');
                versionItem.className = 'version-item';
                versionItem.innerHTML =
                    '<div class="version-header">' +
                    '<span class="version-index">' + (index + 1) + '</span>' +
                    '<span class="version-time">' + PMSharedLib.formatDate(version.time) + '</span>' +
                    '</div>' +
                    '<div class="version-desc">' + PMSharedLib.escapeHtml(version.desc || '') + '</div>';
                fragment.appendChild(versionItem);
            });

            versionListEl.innerHTML = '';
            versionListEl.appendChild(fragment);
        }

        initModalTechSelects();
        document.getElementById('version-history-modal').classList.remove('hidden');
    }

    function openShareModal(projectId) {
        var project = projects.find(function (p) { return p.id === projectId; });
        if (!project) return;

        document.getElementById('share-project-id').value = projectId;

        var isInDashboard = window.location.pathname.includes('dashboard.html');
        var detailPagePath = isInDashboard ? 'modules/project-management/project-detail.html' : 'project-detail.html';

        var shareLink = window.location.origin + window.location.pathname.replace(/[^/]+$/, detailPagePath) + '?id=' + projectId;
        document.getElementById('share-link').value = shareLink;

        initModalTechSelects();
        document.getElementById('share-project-modal').classList.remove('hidden');
    }

    function openAssetsModal(projectId) {
        var project = projects.find(function (p) { return p.id === projectId; });
        if (!project) return;

        var assetsListEl = document.getElementById('assets-list');

        if (!project.assets || project.assets.length === 0) {
            assetsListEl.innerHTML =
                '<div class="empty-state"><i class="fas fa-image"></i><p>暂无素材，点击添加素材按钮开始添加</p></div>';
        } else {
            var fragment = document.createDocumentFragment();
            var esc = PMSharedLib.escapeHtml;

            project.assets.forEach(function (asset, index) {
                var assetItem = document.createElement('div');
                assetItem.className = 'asset-item';
                assetItem.innerHTML =
                    '<div class="asset-info">' +
                    '<div class="asset-name">' + esc(asset.name) + '</div>' +
                    '<div class="asset-type">' + esc(PMSharedLib.getAssetTypeName(asset.type)) + '</div>' +
                    '<div class="asset-content">' + esc(asset.content.substring(0, 50)) + (asset.content.length > 50 ? '...' : '') + '</div>' +
                    '</div>' +
                    '<div class="asset-actions">' +
                    '<button class="icon-btn edit-asset" data-index="' + index + '" data-project-id="' + projectId + '"><i class="fas fa-edit"></i></button>' +
                    '<button class="icon-btn delete-asset" data-index="' + index + '" data-project-id="' + projectId + '"><i class="fas fa-trash"></i></button>' +
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
            var openAiInput = document.getElementById('open-ai-after-create');
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
        resetForm: resetForm
    };
})();
