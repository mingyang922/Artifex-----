/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
const PMSharedLib = window.PMShared || {};
const pmStorageKey = PMSharedLib.pmStorageKey || ((base) => base);

// 全局变量定义
let projects = []; // 项目列表
let currentProjectId = null;
let projectsCache = null; // 内存缓存

function setActiveProjectCard(projectId) {
    currentProjectId = projectId || null;
    document.querySelectorAll('.project-card').forEach((card) => {
        card.classList.toggle('selected', !!projectId && card.dataset.id === projectId);
    });
}

function initModalTechSelects() {
    if (window.__pmTechSelectGlobalBound !== true) {
        window.__pmTechSelectGlobalBound = true;
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.pm-tech-select.is-open').forEach((wrap) => {
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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.pm-tech-select.is-open').forEach((wrap) => {
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
    document.querySelectorAll(selector).forEach((select) => {
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
                    ? `${computed.flexGrow} ${computed.flexShrink} auto`
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

        Array.from(select.options).forEach((opt) => {
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

        const syncUI = () => {
            const current = select.options[select.selectedIndex];
            value.textContent = current ? current.textContent : '请选择';
            value.classList.toggle('is-placeholder', !select.value || select.value === 'all');
            menu.querySelectorAll('.pm-tech-select-option').forEach((item) => {
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
            if (wrapper.classList.contains('is-open')) positionPortalMenu();
        };

        const closeMenu = () => {
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

        trigger.addEventListener('click', () => {
            const willOpen = !wrapper.classList.contains('is-open');
            document.querySelectorAll('.pm-tech-select.is-open').forEach((el) => {
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

        menu.addEventListener('click', (e) => {
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

// DOM加载完成后执行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 初始化函数
async function init() {
    await loadProjects();
    renderProjectList();
    bindEventListeners();
    initModalTechSelects();
    window.refreshPmTechSelects = initModalTechSelects;
    setTimeout(initModalTechSelects, 0);
}

// 加载项目数据（从服务端 API）
async function loadProjects() {
    // 如果内存中有缓存，直接使用缓存数据
    if (projectsCache) {
        projects = projectsCache;
        return;
    }

    try {
        const res = await fetch('/api/projects', { credentials: 'include' });
        if (res.status === 401) {
            window.location.href = loginHtmlPath();
            return;
        }
        const data = await res.json();
        if (data.ok) {
            // 转换服务端数据格式为前端格式
            projects = (data.projects || []).map(p => ({
                id: p.id.toString(),
                name: p.name,
                desc: p.description,
                type: p.type,
                createTime: p.created_at,
                version: p.version,
                versionHistory: (p.versionHistory || []).map(v => ({
                    time: v.created_at,
                    desc: v.description,
                })),
                assets: (p.assets || []).map(a => ({
                    id: a.id.toString(),
                    name: a.name,
                    type: a.type,
                    content: a.content,
                })),
            }));
            projectsCache = projects;
            syncProjectsToLocalStorage();
        }
    } catch (error) {
        console.error('加载项目数据失败:', error);
        projects = [];
        projectsCache = [];
        uiToast('加载项目列表失败，请刷新重试', 'error');
    }
}

// 防抖函数 - 用于优化频繁的保存操作
function debounce(func, wait) {
    return PMSharedLib.debounce ? PMSharedLib.debounce(func, wait) : func;
}

// 保存项目到服务端（单个项目更新）
async function saveProjectToServer(project, versionDesc) {
    try {
        const csrfToken = await getCsrfToken();
        if (project.id && !project.id.startsWith('new_')) {
            // 更新现有项目
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                body: JSON.stringify({
                    name: project.name,
                    description: project.desc,
                    type: project.type,
                    versionDesc: versionDesc || '项目更新',
                }),
            });
            if (!res.ok) {
                throw new Error('保存项目失败');
            }
            const data = await res.json();
            // 用服务端返回的最新数据同步本地版本号
            if (data.ok && data.project) {
                project.version = data.project.version;
                project.versionHistory = (data.project.versionHistory || []).map(v => ({
                    time: v.created_at,
                    desc: v.description,
                }));
            }
        }
    } catch (error) {
        console.error('保存项目失败:', error);
        uiToast('保存项目失败', 'error');
    }
}

// 同步项目数据到 localStorage（供 Dashboard 等模块读取）
function syncProjectsToLocalStorage() {
    try {
        localStorage.setItem(pmStorageKey('gameui-projects'), JSON.stringify(projects));
    } catch (e) { /* ignore */ }
}

// 批量保存项目到服务端
let saveProjectsToStorage = debounce(function (versionDesc) {
    // 批量保存时，逐个同步到服务端
    projects.forEach(p => saveProjectToServer(p, versionDesc));
    projectsCache = projects;
}, 300);

// 注意：getCsrfToken 已移至 js/api-utils.js

function showTechPrompt(options) {
    if (PMSharedLib.showTechPrompt) return PMSharedLib.showTechPrompt(options);
    return Promise.resolve(false);
}

function uiToast(message, type = 'success') {
    if (PMSharedLib.uiToast) PMSharedLib.uiToast(message, type);
}

// 渲染项目列表
function renderProjectList() {
    const projectListEl = document.getElementById('project-list');
    const emptyStateEl = document.getElementById('project-empty-state');

    if (projects.length === 0) {
        projectListEl.innerHTML = '';
        emptyStateEl.classList.remove('hidden');
        return;
    }

    emptyStateEl.classList.add('hidden');

    // 使用文档片段优化DOM操作性能
    const fragment = document.createDocumentFragment();

    projects.forEach((project) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.id = project.id;

        // 检查当前URL以确定跳转路径
        const isInDashboard = window.location.pathname.includes('dashboard.html');
        const detailPagePath = isInDashboard ? 'modules/project-management/project-detail.html' : 'project-detail.html';

        const esc = PMShared.escapeHtml;
        card.innerHTML = `
            <h4>${esc(project.name)}</h4>
            <span class="project-type">${esc(getProjectTypeName(project.type))}</span>
            <p class="project-desc">${esc(project.desc || project.description || '无描述')}</p>
            <div class="project-meta">
                <span>创建时间: ${esc(formatDate(project.createTime || project.created_at))}</span>
                <span>版本: v${esc(project.version)}</span>
                <span>素材数: ${project.assets ? project.assets.length : 0}</span>
            </div>
            <div class="project-card-actions">
                <button class="icon-btn edit-project" title="编辑项目">
                    <i class="fas fa-edit"></i>
                    <span class="action-label">编辑</span>
                </button>
                <button class="icon-btn delete-project" title="删除项目">
                    <i class="fas fa-trash"></i>
                    <span class="action-label">删除</span>
                </button>
                <button class="icon-btn version-history" title="查看版本历史">
                    <i class="fas fa-history"></i>
                    <span class="action-label">版本</span>
                </button>
                <button class="icon-btn share-project" title="分享项目">
                    <i class="fas fa-share-alt"></i>
                    <span class="action-label">分享</span>
                </button>
                <button class="icon-btn manage-assets" title="管理素材">
                    <i class="fas fa-images"></i>
                    <span class="action-label">素材</span>
                </button>
            </div>
        `;

        // 为整个卡片添加点击事件，跳转到详情页
        card.addEventListener('click', function (e) {
            // 如果点击的是操作按钮，不执行跳转
            if (e.target.closest('.icon-btn')) {
                return;
            }
            setActiveProjectCard(project.id);
            window.location.href = `${detailPagePath}?id=${project.id}`;
        });

        fragment.appendChild(card);
    });

    projectListEl.innerHTML = '';
    projectListEl.appendChild(fragment);
    setActiveProjectCard(currentProjectId);

    // 绑定项目卡片操作事件
    bindProjectCardEvents();
}

// 绑定所有事件监听
function bindEventListeners() {
    const openCreateProjectForm = () => {
        const form = document.getElementById('create-project-form');
        if (form) {
            form.classList.remove('hidden');
            const nameInput = document.getElementById('project-name');
            if (nameInput) {
                nameInput.focus();
            }
        }
    };

    // 新建项目按钮
    const createBtn = document.getElementById('create-project-btn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateProjectForm);
    }

    // 空状态区支持点击和键盘回车，行为与"新建项目"按钮一致
    const emptyStateEl = document.getElementById('project-empty-state');
    if (emptyStateEl) {
        emptyStateEl.style.cursor = 'pointer';
        emptyStateEl.addEventListener('click', openCreateProjectForm);
        emptyStateEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCreateProjectForm();
            }
        });
    }

    // 取消创建按钮
    const cancelBtn = document.getElementById('cancel-create-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('create-project-form').classList.add('hidden');
            resetForm('create');
        });
    }

    // 提交创建项目
    const submitBtn = document.getElementById('submit-project-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', createProject);
    }

    // 从线稿生成入口
    const sketchToAssetBtn = document.getElementById('sketch-to-asset-btn');
    if (sketchToAssetBtn) {
        sketchToAssetBtn.addEventListener('click', () => {
            document.getElementById('sketch-to-asset-modal').classList.remove('hidden');
        });
    }

    // 从描述生成入口
    const descToAssetBtn = document.getElementById('desc-to-asset-btn');
    if (descToAssetBtn) {
        descToAssetBtn.addEventListener('click', () => {
            document.getElementById('desc-to-asset-modal').classList.remove('hidden');
        });
    }

    // 从线稿生成确认
    const confirmSketchBtn = document.getElementById('confirm-sketch-btn');
    if (confirmSketchBtn) {
        confirmSketchBtn.addEventListener('click', async () => {
            const sketchUrlInput = document.getElementById('sketch-url');
            const sketchStyleInput = document.getElementById('sketch-style');
            const sketchOutputTypeInput = document.getElementById('sketch-output-type');
            const sketchUrl = (sketchUrlInput && sketchUrlInput.value ? sketchUrlInput.value : '').trim();
            if (!sketchUrl) {
                await showTechPrompt({
                    title: '输入有误',
                    message: '请先填写线稿图片 URL。',
                    confirmText: '知道了',
                });
                return;
            }
            const style = sketchStyleInput ? sketchStyleInput.value : '';
            const outputType = sketchOutputTypeInput ? sketchOutputTypeInput.value : '';
            const aiPagePath = getAIGeneratePath();
            window.location.href = `${aiPagePath}?from=project-management&mode=sketch&sourceUrl=${encodeURIComponent(sketchUrl)}&style=${encodeURIComponent(style)}&outputType=${encodeURIComponent(outputType)}`;
        });
    }

    // 从描述生成确认
    const confirmDescBtn = document.getElementById('confirm-desc-btn');
    if (confirmDescBtn) {
        confirmDescBtn.addEventListener('click', async () => {
            const descriptionInput = document.getElementById('asset-description');
            const descStyleInput = document.getElementById('desc-style');
            const descOutputTypeInput = document.getElementById('desc-output-type');
            const description = (descriptionInput && descriptionInput.value ? descriptionInput.value : '').trim();
            if (!description) {
                await showTechPrompt({
                    title: '输入有误',
                    message: '请先填写素材描述。',
                    confirmText: '知道了',
                });
                return;
            }
            const style = descStyleInput ? descStyleInput.value : '';
            const outputType = descOutputTypeInput ? descOutputTypeInput.value : '';
            const aiPagePath = getAIGeneratePath();
            window.location.href = `${aiPagePath}?from=project-management&mode=description&prompt=${encodeURIComponent(description)}&style=${encodeURIComponent(style)}&outputType=${encodeURIComponent(outputType)}`;
        });
    }

    // 关闭弹窗按钮（所有弹窗通用）
    document.querySelectorAll('.close-modal').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach((modal) => {
                modal.classList.add('hidden');
            });
        });
    });

    // 保存编辑项目
    const saveEditBtn = document.getElementById('save-edit-btn');
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', saveEditProject);
    }

    // 复制分享链接
    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const linkInput = document.getElementById('share-link');
            linkInput.select();
            document.execCommand('copy');
            uiToast('分享链接已复制！', 'success');
        });
    }

    // 添加素材按钮
    const addAssetBtn = document.getElementById('add-asset-btn');
    if (addAssetBtn) {
        addAssetBtn.addEventListener('click', addProjectAsset);
    }

    // 本地文件选择提示
    const assetFileInput = document.getElementById('asset-file');
    const assetFileName = document.getElementById('asset-file-name');
    if (assetFileInput && assetFileName) {
        assetFileInput.addEventListener('change', () => {
            const file = assetFileInput.files && assetFileInput.files[0];
            assetFileName.textContent = file ? file.name : '未选择本地文件';
            // 若未填素材名，自动用文件名（去掉后缀）填充
            const assetNameInput = document.getElementById('asset-name');
            if (file && assetNameInput && !assetNameInput.value.trim()) {
                assetNameInput.value = file.name.replace(/\.[^/.]+$/, '');
            }
        });
    }
}

// 绑定项目卡片操作事件（编辑/删除/版本/分享/素材）
function bindProjectCardEvents() {
    // 编辑项目
    document.querySelectorAll('.edit-project').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            const projectId = e.target.closest('.project-card').dataset.id;
            setActiveProjectCard(projectId);
            openEditModal(projectId);
        });
    });

    // 删除项目
    document.querySelectorAll('.delete-project').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            const projectId = e.target.closest('.project-card').dataset.id;
            setActiveProjectCard(projectId);
            const ok = await showTechPrompt({
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

    // 版本历史
    document.querySelectorAll('.version-history').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            const projectId = e.target.closest('.project-card').dataset.id;
            setActiveProjectCard(projectId);
            openVersionHistoryModal(projectId);
        });
    });

    // 分享项目
    document.querySelectorAll('.share-project').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            const projectId = e.target.closest('.project-card').dataset.id;
            setActiveProjectCard(projectId);
            openShareModal(projectId);
        });
    });

    // 管理素材
    document.querySelectorAll('.manage-assets').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            const projectId = e.target.closest('.project-card').dataset.id;
            setActiveProjectCard(projectId);
            openAssetsModal(projectId);
        });
    });
}

// 创建项目
async function createProject() {
    const nameInput = document.getElementById('project-name');
    const descInput = document.getElementById('project-desc');
    const typeInput = document.getElementById('project-type');
    const openAiInput = document.getElementById('open-ai-after-create');

    // 表单验证
    if (!nameInput.value.trim()) {
        await showTechPrompt({
            title: '输入有误',
            message: '项目名称不能为空！',
            confirmText: '知道了',
        });
        return;
    }

    // 调用 API 创建项目
    try {
        const csrfToken = await getCsrfToken();
        const res = await fetch('/api/projects', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                description: descInput.value.trim(),
                type: typeInput.value,
            }),
        });
        const data = await res.json();
        if (!data.ok) {
            uiToast(data.error || '创建失败', 'error');
            return;
        }
        // 转换为前端格式并添加到列表
        const newProject = {
            id: data.project.id.toString(),
            name: data.project.name,
            desc: data.project.description,
            type: data.project.type,
            createTime: data.project.created_at,
            version: data.project.version,
            versionHistory: (data.project.versionHistory || []).map(v => ({
                time: v.created_at,
                desc: v.description,
            })),
            assets: [],
        };
        projects.unshift(newProject);
        projectsCache = projects;
    } catch (error) {
        console.error('创建项目失败:', error);
        uiToast('创建项目失败', 'error');
        return;
    }

    renderProjectList();
    resetForm('create');
    document.getElementById('create-project-form').classList.add('hidden');

    // 写入当前项目上下文，供 AI 生成和素材库页面联动使用
    try {
        localStorage.setItem(
            pmStorageKey('currentProjectContext'),
            JSON.stringify({
                id: newProject.id,
                name: newProject.name,
                type: newProject.type,
                createTime: newProject.createTime,
            })
        );
    } catch (e) {
        console.warn('写入 currentProjectContext 失败：', e);
    }

    const shouldOpenAi = !!(openAiInput && openAiInput.checked);
    if (shouldOpenAi) {
        // 即将跳转页面，必须同步写入 localStorage，防抖版会因页面卸载而丢失
        try {
            localStorage.setItem(pmStorageKey('gameui-projects'), JSON.stringify(projects));
            projectsCache = projects;
        } catch (e) {
            console.error('同步保存项目数据失败:', e);
        }
        const aiPagePath = getAIGeneratePath();
        window.location.href = `${aiPagePath}?projectId=${encodeURIComponent(newProject.id)}`;
        return;
    }

    saveProjectsToStorage();
    syncProjectsToLocalStorage();
    uiToast('项目创建成功！', 'success');
}

function getAIGeneratePath() {
    const path = window.location.pathname || '';
    const isInModulePage =
        path.includes('/modules/project-management/') || path.includes('\\modules\\project-management\\');
    if (isInModulePage) {
        return '../ai-generate/ai-generator-new.html';
    }
    return 'modules/ai-generate/ai-generator-new.html';
}

// 编辑项目
function openEditModal(projectId) {
    const project = projects.find((p) => p.id === projectId);
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

// 保存编辑项目
async function saveEditProject() {
    const projectId = document.getElementById('edit-project-id').value;
    const nameInput = document.getElementById('edit-project-name');
    const descInput = document.getElementById('edit-project-desc');
    const typeInput = document.getElementById('edit-project-type');

    if (!nameInput.value.trim()) {
        await showTechPrompt({
            title: '输入有误',
            message: '项目名称不能为空！',
            confirmText: '知道了',
        });
        return;
    }

    // 更新项目信息
    const projectIndex = projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) return;

    // 更新基本信息（版本号由服务端自动递增）
    projects[projectIndex].name = nameInput.value.trim();
    projects[projectIndex].desc = descInput.value.trim();
    projects[projectIndex].type = typeInput.value;

    saveProjectsToStorage('项目信息更新');
    syncProjectsToLocalStorage();
    renderProjectList();
    document.getElementById('edit-project-modal').classList.add('hidden');
    uiToast('项目更新成功！', 'success');
}

// 删除项目
async function deleteProject(projectId) {
    try {
        const csrfToken = await getCsrfToken();
        const res = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-XSRF-Token': csrfToken },
        });
        if (!res.ok) {
            throw new Error('删除项目失败');
        }
        projects = projects.filter((p) => p.id !== projectId);
        projectsCache = projects;
        syncProjectsToLocalStorage();
        renderProjectList();
    } catch (error) {
        console.error('删除项目失败:', error);
        uiToast('删除项目失败，请重试', 'error');
    }
}

// 打开版本历史弹窗
function openVersionHistoryModal(projectId) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    document.getElementById('history-project-id').value = projectId;
    const versionListEl = document.getElementById('version-list');

    if (!project.versionHistory || project.versionHistory.length === 0) {
        versionListEl.innerHTML = '<p class="no-versions">暂无版本历史记录</p>';
    } else {
        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();

        // 按时间倒序排列
        const sortedHistory = [...project.versionHistory].sort((a, b) => new Date(b.time) - new Date(a.time));

        sortedHistory.forEach((version, index) => {
            const versionItem = document.createElement('div');
            versionItem.className = 'version-item';
            versionItem.innerHTML = `
                <div class="version-header">
                    <span class="version-index">${index + 1}</span>
                    <span class="version-time">${formatDate(version.time)}</span>
                </div>
                <div class="version-desc">${PMShared.escapeHtml(version.desc || '')}</div>
            `;
            fragment.appendChild(versionItem);
        });

        versionListEl.innerHTML = '';
        versionListEl.appendChild(fragment);
    }

    initModalTechSelects();
    document.getElementById('version-history-modal').classList.remove('hidden');
}

// 打开分享弹窗
function openShareModal(projectId) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    document.getElementById('share-project-id').value = projectId;

    // 生成分享链接
    const isInDashboard = window.location.pathname.includes('dashboard.html');
    const detailPagePath = isInDashboard ? 'modules/project-management/project-detail.html' : 'project-detail.html';

    const shareLink = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, detailPagePath)}?id=${projectId}`;
    document.getElementById('share-link').value = shareLink;

    initModalTechSelects();
    document.getElementById('share-project-modal').classList.remove('hidden');
}

// 打开素材管理弹窗
function openAssetsModal(projectId) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // 初始化素材列表
    const assetsListEl = document.getElementById('assets-list');

    if (!project.assets || project.assets.length === 0) {
        assetsListEl.innerHTML =
            '<div class="empty-state"><i class="fas fa-image"></i><p>暂无素材，点击添加素材按钮开始添加</p></div>';
    } else {
        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();
        const esc = PMShared.escapeHtml;

        project.assets.forEach((asset, index) => {
            const assetItem = document.createElement('div');
            assetItem.className = 'asset-item';
            assetItem.innerHTML = `
                <div class="asset-info">
                    <div class="asset-name">${esc(asset.name)}</div>
                    <div class="asset-type">${esc(getAssetTypeName(asset.type))}</div>
                    <div class="asset-content">${esc(asset.content.substring(0, 50))}${asset.content.length > 50 ? '...' : ''}</div>
                </div>
                <div class="asset-actions">
                    <button class="icon-btn edit-asset" data-index="${index}" data-project-id="${projectId}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete-asset" data-index="${index}" data-project-id="${projectId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            fragment.appendChild(assetItem);
        });

        assetsListEl.innerHTML = '';
        assetsListEl.appendChild(fragment);
    }

    document.getElementById('assets-project-id').value = projectId;
    initModalTechSelects();
    document.getElementById('project-assets-modal').classList.remove('hidden');

    // 绑定素材操作事件
    bindAssetEvents();
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target && e.target.result ? e.target.result : '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function compressImageFile(file, options = {}) {
    const maxWidth = options.maxWidth || 1600;
    const maxHeight = options.maxHeight || 1600;
    const targetMaxLength = options.targetMaxLength || 700000;
    const minQuality = options.minQuality || 0.45;

    const originalDataUrl = await readFileAsDataURL(file);
    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = originalDataUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.85;
    let result = canvas.toDataURL('image/jpeg', quality);
    while (result.length > targetMaxLength && quality > minQuality) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
    }
    return result;
}

async function optimizeFileForStorage(file) {
    if (!file.type || !file.type.startsWith('image/')) {
        if (file.size > 1024 * 1024) {
            throw new Error('非图片文件过大，超过1MB');
        }
        return readFileAsDataURL(file);
    }

    if (file.size <= 350 * 1024) {
        return readFileAsDataURL(file);
    }

    return compressImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetMaxLength: 700000,
        minQuality: 0.45,
    });
}

function getLibraryCategoryByAssetType(assetType) {
    const map = {
        image: '图片',
        icon: '图标',
        button: '其他',
        component: '其他',
        character: '其他',
        environment: '背景',
        prop: '其他',
    };
    return map[assetType] || '其他';
}

function getLocalStorageUsageBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key) || '';
        total += (key.length + value.length) * 2;
    }
    return total;
}

async function syncProjectAssetToLibrary(project, asset) {
    try {
        const category = getLibraryCategoryByAssetType(asset.type);
        const content = asset.content || '';
        let mime = 'image/png';
        if (typeof content === 'string' && content.startsWith('data:')) {
            const m = content.match(/^data:([^;]+);/);
            if (m && m[1]) mime = m[1];
        }
        const fileExt = mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] || 'png';
        const safeName = (asset.name || 'asset').replace(/[\\/:*?"<>|]/g, '_');
        const sourceId = `project_${project.id}_${asset.id}`;

        // Check for existing asset with same source to deduplicate
        let wasDeduped = false;
        try {
            const listResp = await fetch('/api/asset-library', { credentials: 'include' });
            if (listResp.ok) {
                const listData = await listResp.json();
                if (listData.ok && Array.isArray(listData.items)) {
                    const existing = listData.items.find((item) => item.source === sourceId);
                    if (existing) {
                        await fetchWithCsrf('/api/asset-library/' + encodeURIComponent(existing.id), { method: 'DELETE' });
                        wasDeduped = true;
                    }
                }
            }
        } catch (_) {}

        const body = {
            name: asset.name || '未命名素材',
            type: mime,
            content: content,
            desc: `${safeName}.${fileExt}`,
            source: sourceId,
            tags: JSON.stringify({ category: category, fileName: `${safeName}.${fileExt}` }),
        };
        const resp = await fetchWithCsrf('/api/asset-library', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || '同步失败');
        }
        return { ok: true, deduped: wasDeduped, nearLimit: false };
    } catch (e) {
        console.warn('同步素材到素材库失败：', e);
        return { ok: false, deduped: false, nearLimit: false };
    }
}

// 添加项目素材（支持 URL / 文本 / 本地文件）
async function addProjectAsset() {
    const projectId = document.getElementById('assets-project-id').value;
    const assetName = document.getElementById('asset-name').value.trim();
    const assetType = document.getElementById('asset-type').value;
    const assetContent = document.getElementById('asset-url').value.trim();
    const assetFileInput = document.getElementById('asset-file');
    const selectedFile = assetFileInput && assetFileInput.files ? assetFileInput.files[0] : null;

    if (!assetName) {
        await showTechPrompt({
            title: '输入有误',
            message: '素材名称不能为空！',
            confirmText: '知道了',
        });
        return;
    }
    if (!assetContent && !selectedFile) {
        await showTechPrompt({
            title: '输入有误',
            message: '请填写素材URL/内容，或选择一个本地文件！',
            confirmText: '知道了',
        });
        return;
    }

    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // 初始化assets数组（如果不存在）
    if (!project.assets) {
        project.assets = [];
    }

    let finalContent = assetContent;
    if (selectedFile) {
        try {
            finalContent = await optimizeFileForStorage(selectedFile);
        } catch (e) {
            console.error('读取本地文件失败:', e);
            await showTechPrompt({
                title: '读取失败',
                message: '读取本地文件失败，或文件过大（非图片建议小于1MB）。请压缩后重试。',
                confirmText: '知道了',
            });
            return;
        }
    }

    // 添加新素材（本地文件会以 dataURL 存储，便于预览）
    const newAsset = {
        id: Date.now().toString(),
        name: assetName,
        type: assetType,
        content: finalContent,
        createTime: new Date().toISOString(),
    };

    project.assets.push(newAsset);
    const syncResult = await syncProjectAssetToLibrary(project, newAsset);

    saveProjectsToStorage();
    openAssetsModal(projectId);

    // 重置表单
    document.getElementById('asset-name').value = '';
    document.getElementById('asset-url').value = '';
    if (assetFileInput) {
        assetFileInput.value = '';
    }
    const assetFileName = document.getElementById('asset-file-name');
    if (assetFileName) {
        assetFileName.textContent = '未选择本地文件';
    }

    let tip = '素材添加成功！';
    if (syncResult && syncResult.ok) {
        tip += syncResult.deduped ? '\n素材库中已有同源素材，已更新并置顶。' : '\n已同步到素材库。';
        if (syncResult.nearLimit) {
            tip += '\n提示：本地存储空间接近上限，建议及时清理不需要的素材。';
        }
    } else {
        tip += '\n但同步到素材库失败，请稍后重试。';
    }

    const goToLibrary = await showTechPrompt({
        title: '素材同步完成',
        message: tip + '\n\n是否前往素材库查看？',
        confirmText: '前往素材库',
        cancelText: '留在当前页',
        showCancel: true,
    });
    if (goToLibrary) {
        window.location.href = '../asset-library/asset-library.html';
    }
}

// 绑定素材操作事件
function bindAssetEvents() {
    // 删除素材
    document.querySelectorAll('.delete-asset').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.closest('.delete-asset').dataset.index);
            const projectId = e.target.closest('.delete-asset').dataset.projectId;

            const ok = await showTechPrompt({
                title: '删除素材',
                message: '确定删除此素材？',
                confirmText: '删除',
                cancelText: '取消',
                showCancel: true,
            });
            if (!ok) return;

            const project = projects.find((p) => p.id === projectId);
            if (project && project.assets && project.assets[index]) {
                project.assets.splice(index, 1);
                saveProjectsToStorage();
                openAssetsModal(projectId);
            }
        });
    });
}

// 重置表单
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

// 辅助函数：格式化日期
function formatDate(isoString) {
    if (PMSharedLib.formatDate) return PMSharedLib.formatDate(isoString);
    return isoString || '-';
}

// 辅助函数：项目类型名称映射
function getProjectTypeName(type) {
    if (PMSharedLib.getProjectTypeName) return PMSharedLib.getProjectTypeName(type);
    return type || '未分类';
}

// 辅助函数：素材类型名称映射
function getAssetTypeName(type) {
    if (PMSharedLib.getAssetTypeName) return PMSharedLib.getAssetTypeName(type);
    return type || '未分类';
}

async function initModule() {
    await loadProjects();
    renderProjectList();
    bindEventListeners();
}

// 提供给dashboard调用的接口
window.initModule = initModule;
// ── Project Templates ──
(function () {
    "use strict";

    const PROJECT_TEMPLATES = {
        rpg: {
            name: "RPG 游戏",
            desc: "角色扮演游戏模板",
            type: "game",
            assets: ["角色", "地图", "UI", "道具"]
        },
        platformer: {
            name: "平台跳跃",
            desc: "2D 平台跳跃游戏模板",
            type: "game",
            assets: ["角色", "背景", "平台", "道具"]
        },
        puzzle: {
            name: "消除游戏",
            desc: "三消/益智游戏模板",
            type: "game",
            assets: ["宝石", "特效", "UI", "背景"]
        },
        "ui-kit": {
            name: "UI 套件",
            desc: "通用游戏 UI 组件集",
            type: "ui",
            assets: ["按钮", "血条", "弹窗", "图标"]
        }
    };

    const selectedTemplate = "blank";

    function initTemplateCards() {
        const cards = document.querySelectorAll("#templateCards .template-card");
        cards.forEach(function (card) {
            card.addEventListener("click", function () {
                cards.forEach(function (c) {
                    c.style.background = "rgba(255,255,255,0.03)";
                    c.style.borderColor = "rgba(255,255,255,0.08)";
                });
                card.style.background = "rgba(0,240,255,0.08)";
                card.style.borderColor = "rgba(0,240,255,0.35)";
                selectedTemplate = card.dataset.tpl;
                applyTemplate(selectedTemplate);
            });
            card.addEventListener("mouseenter", function () {
                if (card.dataset.tpl !== selectedTemplate) {
                    card.style.background = "rgba(255,255,255,0.06)";
                    card.style.borderColor = "rgba(255,255,255,0.15)";
                }
            });
            card.addEventListener("mouseleave", function () {
                if (card.dataset.tpl !== selectedTemplate) {
                    card.style.background = "rgba(255,255,255,0.03)";
                    card.style.borderColor = "rgba(255,255,255,0.08)";
                }
            });
        });
    }

    function applyTemplate(tplKey) {
        const tpl = PROJECT_TEMPLATES[tplKey];
        if (!tpl) return;
        const nameInput = document.getElementById("project-name");
        const descInput = document.getElementById("project-desc");
        const typeInput = document.getElementById("project-type");
        if (nameInput && !nameInput.value.trim()) {
            nameInput.value = tpl.name;
        }
        if (descInput && !descInput.value.trim()) {
            descInput.value = tpl.desc;
        }
        if (typeInput) {
            typeInput.value = tpl.type;
            typeInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function getSelectedTemplate() {
        return selectedTemplate;
    }

    function getTemplateData(tplKey) {
        return PROJECT_TEMPLATES[tplKey] || null;
    }

    // Inject into init flow
    const origInit = window.init;
    if (typeof origInit === "function") {
        window.init = async function () {
            await origInit();
            initTemplateCards();
        };
    } else {
        document.addEventListener("DOMContentLoaded", initTemplateCards);
    }

    // Expose for createProject
    window._pmTemplates = {
        getSelected: getSelectedTemplate,
        getData: getTemplateData,
        TEMPLATES: PROJECT_TEMPLATES
    };

    // Override createProject to handle templates
    const origCreateProject = window.createProject;
    if (typeof origCreateProject === "function") {
        window.createProject = async function () {
            const tplKey = getSelectedTemplate();
            const tpl = getTemplateData(tplKey);

            // Call original create
            await origCreateProject();

            // If template selected and project was created, add placeholder categories
            if (tpl && tpl.assets && tpl.assets.length > 0) {
                const projectsRaw = localStorage.getItem(pmStorageKey("gameui-projects"));
                if (projectsRaw) {
                    try {
                        const projs = JSON.parse(projectsRaw);
                        if (projs.length > 0) {
                            const latest = projs[0];
                            if (!latest.templateApplied) {
                                latest.templateApplied = tplKey;
                                latest.templateAssets = tpl.assets;
                                localStorage.setItem(pmStorageKey("gameui-projects"), JSON.stringify(projs));
                            }
                        }
                    } catch (_) {}
                }
            }

            // Reset template selection
            selectedTemplate = "blank";
            const cards = document.querySelectorAll("#templateCards .template-card");
            cards.forEach(function (c) {
                c.style.background = c.dataset.tpl === "blank" ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.03)";
                c.style.borderColor = c.dataset.tpl === "blank" ? "rgba(0,240,255,0.35)" : "rgba(255,255,255,0.08)";
            });
        };
    }
})();
