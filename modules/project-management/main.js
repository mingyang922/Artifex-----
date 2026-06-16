/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
const PMSharedLib = window.PMShared || {};
const PMUI = window.PMUI || {};
const PMTemplates = window.PMTemplates || {};
const pmStorageKey = PMSharedLib.pmStorageKey || function (base) { return base; };

// 全局变量定义
const projects = []; // 项目列表
const projectsCache = null; // 内存缓存

// DOM加载完成后执行初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 初始化函数
async function init() {
    await loadProjects();
    PMUI.renderProjectList();
    PMUI.bindEventListeners();
    PMUI.initModalTechSelects();
    window.refreshPmTechSelects = PMUI.initModalTechSelects;
    setTimeout(PMUI.initModalTechSelects, 0);
    if (PMTemplates.initCards) PMTemplates.initCards();
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
            projects = (data.projects || []).map(function (p) {
                return {
                    id: p.id.toString(),
                    name: p.name,
                    desc: p.description,
                    type: p.type,
                    createTime: p.created_at,
                    version: p.version,
                    versionHistory: (p.versionHistory || []).map(function (v) {
                        return { time: v.created_at, desc: v.description };
                    }),
                    assets: (p.assets || []).map(function (a) {
                        return {
                            id: a.id.toString(),
                            name: a.name,
                            type: a.type,
                            content: a.content,
                        };
                    }),
                };
            });
            projectsCache = projects;
            syncProjectsToLocalStorage();
        }
    } catch (error) {
        console.error('加载项目数据失败:', error);
        projects = [];
        projectsCache = [];
        PMSharedLib.uiToast('加载项目列表失败，请刷新重试', 'error');
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
            const res = await fetch('/api/projects/' + project.id, {
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
            if (data.ok && data.project) {
                project.version = data.project.version;
                project.versionHistory = (data.project.versionHistory || []).map(function (v) {
                    return { time: v.created_at, desc: v.description };
                });
            }
        }
    } catch (error) {
        console.error('保存项目失败:', error);
        PMSharedLib.uiToast('保存项目失败', 'error');
    }
}

// 同步项目数据到 localStorage（供 Dashboard 等模块读取）
function syncProjectsToLocalStorage() {
    try {
        localStorage.setItem(pmStorageKey('gameui-projects'), JSON.stringify(projects));
    } catch (_e) { /* ignore */ }
}

// 批量保存项目到服务端
const saveProjectsToStorage = debounce(function (versionDesc) {
    projects.forEach(function (p) { saveProjectToServer(p, versionDesc); });
    projectsCache = projects;
}, 300);

// 注意：getCsrfToken 已移至 js/api-utils.js

function showTechPrompt(options) {
    if (PMSharedLib.showTechPrompt) return PMSharedLib.showTechPrompt(options);
    return Promise.resolve(false);
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
    let newProject;
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
            PMSharedLib.uiToast(data.error || '创建失败', 'error');
            return;
        }
        // 转换为前端格式并添加到列表
        newProject = {
            id: data.project.id.toString(),
            name: data.project.name,
            desc: data.project.description,
            type: data.project.type,
            createTime: data.project.created_at,
            version: data.project.version,
            versionHistory: (data.project.versionHistory || []).map(function (v) {
                return { time: v.created_at, desc: v.description };
            }),
            assets: [],
        };
        projects.unshift(newProject);
        projectsCache = projects;
    } catch (error) {
        console.error('创建项目失败:', error);
        PMSharedLib.uiToast('创建项目失败', 'error');
        return;
    }

    // Handle template selection
    if (PMTemplates.getSelected) {
        const tplKey = PMTemplates.getSelected();
        const tpl = PMTemplates.getData(tplKey);
        if (tpl && tpl.assets && tpl.assets.length > 0) {
            try {
                const projectsRaw = localStorage.getItem(pmStorageKey('gameui-projects'));
                if (projectsRaw) {
                    const projs = JSON.parse(projectsRaw);
                    if (projs.length > 0) {
                        const latest = projs[0];
                        if (!latest.templateApplied) {
                            latest.templateApplied = tplKey;
                            latest.templateAssets = tpl.assets;
                            localStorage.setItem(pmStorageKey('gameui-projects'), JSON.stringify(projs));
                        }
                    }
                }
            } catch (_) {}
        }
        PMTemplates.resetSelection();
    }

    PMUI.renderProjectList();
    PMUI.resetForm('create');
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
        try {
            localStorage.setItem(pmStorageKey('gameui-projects'), JSON.stringify(projects));
            projectsCache = projects;
        } catch (e) {
            console.error('同步保存项目数据失败:', e);
        }
        const aiPagePath = getAIGeneratePath();
        window.location.href = aiPagePath + '?projectId=' + encodeURIComponent(newProject.id);
        return;
    }

    saveProjectsToStorage();
    syncProjectsToLocalStorage();
    PMSharedLib.uiToast('项目创建成功！', 'success');
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

    const projectIndex = projects.findIndex(function (p) { return p.id === projectId; });
    if (projectIndex === -1) return;

    projects[projectIndex].name = nameInput.value.trim();
    projects[projectIndex].desc = descInput.value.trim();
    projects[projectIndex].type = typeInput.value;

    saveProjectsToStorage('项目信息更新');
    syncProjectsToLocalStorage();
    PMUI.renderProjectList();
    document.getElementById('edit-project-modal').classList.add('hidden');
    PMSharedLib.uiToast('项目更新成功！', 'success');
}

// 删除项目
async function deleteProject(projectId) {
    try {
        const csrfToken = await getCsrfToken();
        const res = await fetch('/api/projects/' + projectId, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-XSRF-Token': csrfToken },
        });
        if (!res.ok) {
            throw new Error('删除项目失败');
        }
        projects = projects.filter(function (p) { return p.id !== projectId; });
        projectsCache = projects;
        syncProjectsToLocalStorage();
        PMUI.renderProjectList();
    } catch (error) {
        console.error('删除项目失败:', error);
        PMSharedLib.uiToast('删除项目失败，请重试', 'error');
    }
}

// ── File handling utilities ──

function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function (e) { resolve(e.target && e.target.result ? e.target.result : ''); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function compressImageFile(file, options) {
    options = options || {};
    const maxWidth = options.maxWidth || 1600;
    const maxHeight = options.maxHeight || 1600;
    const targetMaxLength = options.targetMaxLength || 700000;
    const minQuality = options.minQuality || 0.45;

    const originalDataUrl = await readFileAsDataURL(file);
    const img = new Image();
    await new Promise(function (resolve, reject) {
        img.onload = resolve;
        img.onerror = reject;
        img.src = originalDataUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const quality = 0.85;
    const result = canvas.toDataURL('image/jpeg', quality);
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

// ── Asset library sync ──

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

async function syncProjectAssetToLibrary(project, asset) {
    try {
        const category = getLibraryCategoryByAssetType(asset.type);
        const content = asset.content || '';
        const mime = 'image/png';
        if (typeof content === 'string' && content.startsWith('data:')) {
            const m = content.match(/^data:([^;]+);/);
            if (m && m[1]) mime = m[1];
        }
        const fileExt = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'png');
        const safeName = (asset.name || 'asset').replace(/[\\/:*?"<>|]/g, '_');
        const sourceId = 'project_' + project.id + '_' + asset.id;

        // Check for existing asset with same source to deduplicate
        const wasDeduped = false;
        try {
            const listResp = await fetch('/api/asset-library', { credentials: 'include' });
            if (listResp.ok) {
                const listData = await listResp.json();
                if (listData.ok && Array.isArray(listData.items)) {
                    const existing = listData.items.find(function (item) { return item.source === sourceId; });
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
            desc: safeName + '.' + fileExt,
            source: sourceId,
            tags: JSON.stringify({ category: category, fileName: safeName + '.' + fileExt }),
        };
        const resp = await fetchWithCsrf('/api/asset-library', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(function () { return {}; });
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

    const project = projects.find(function (p) { return p.id === projectId; });
    if (!project) return;

    if (!project.assets) {
        project.assets = [];
    }

    const finalContent = assetContent;
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
    PMUI.openAssetsModal(projectId);

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

    const tip = '素材添加成功！';
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
    PMUI.renderProjectList();
    PMUI.bindEventListeners();
}

// 提供给dashboard调用的接口
window.initModule = initModule;
