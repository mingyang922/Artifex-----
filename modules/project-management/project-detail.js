/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
'use strict';
const PMSharedLib = window.PMShared || {};
const pmStorageKey = PMSharedLib.pmStorageKey || ((base) => base);

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let currentProject = null;
let projects = [];
let projectsCache = null;

// DOM 加载后先尝试校验登录，再执行页面初始化。
// 说明：本地联调或 /api/me 不可用时，userId 可能为空，若直接 return 会导致整页"按钮无响应"。
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await GameUiUserScope.ensure();
    } catch (e) {
        console.warn('用户态校验失败，继续执行本地初始化：', e);
    }
    await init();
});

async function init() {
    await loadProjects();

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        await showTechPrompt({
            title: '提示',
            message: '项目ID不存在',
            confirmText: '返回',
        });
        navigateBack();
        return;
    }

    currentProject = projects.find((project) => project.id === projectId);

    if (!currentProject) {
        await showTechPrompt({
            title: '提示',
            message: '找不到该项目',
            confirmText: '返回',
        });
        navigateBack();
        return;
    }

    // 将当前项目上下文写入 localStorage，供 AI 生成 / 素材库 等模块联动使用
    try {
        localStorage.setItem(
            pmStorageKey('currentProjectContext'),
            JSON.stringify({
                id: currentProject.id,
                name: currentProject.name,
                type: currentProject.type,
                createTime: currentProject.createTime,
            })
        );
    } catch (e) {
        console.warn('写入 currentProjectContext 失败：', e);
    }

    renderProjectInfo();
    renderAssetList();
    bindEventListeners();

    // 兜底：确保详情页所有下拉都替换为主题自定义样式
    if (typeof window.refreshTechSelects === 'function') {
        window.refreshTechSelects();
    }

    // 统一流光跟随：详情区和素材卡片都使用鼠标高光坐标
    bindCardGlowEffects();
}

function bindCardGlowEffects() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const selector = '.project-header, .asset-upload-section, .asset-card, .asset-library-item';
    const bind = (el) => {
        if (!el || el.dataset.cardGlowBound === '1') return;
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

    document.querySelectorAll(selector).forEach(bind);
    const observer = new MutationObserver(() => {
        document.querySelectorAll(selector).forEach(bind);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

async function loadProjects() {
    if (projectsCache) {
        projects = projectsCache;
        return;
    }

    try {
        const res = await fetch('/api/projects', { credentials: 'include' });
        if (res.status === 401) {
            window.location.href = '../../login.html';
            return;
        }
        const data = await res.json();
        if (data.ok) {
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
                    desc: a.desc,
                    createTime: a.createTime,
                })),
            }));
            projectsCache = projects;
        }
    } catch (error) {
        console.error('加载项目数据失败:', error);
        projects = [];
        projectsCache = [];
    }
}

function debounce(func, wait) {
    return PMSharedLib.debounce ? PMSharedLib.debounce(func, wait) : func;
}

async function saveProjectToServer(project) {
    try {
        const csrfToken = await getCsrfToken();
        if (project.id && !project.id.startsWith('new_')) {
            await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                body: JSON.stringify({
                    name: project.name,
                    description: project.desc,
                    type: project.type,
                }),
            });
        }
    } catch (error) {
        console.error('保存项目失败:', error);
    }
}

let saveProjectsToStorage = debounce(function () {
    projects.forEach(p => saveProjectToServer(p));
    projectsCache = projects;
}, 300);

function showTechPrompt(options) {
    if (PMSharedLib.showTechPrompt) return PMSharedLib.showTechPrompt(options);
    return Promise.resolve(false);
}

function uiToast(message, type = 'success') {
    if (PMSharedLib.uiToast) PMSharedLib.uiToast(message, type);
}

function showTechAssetEditorDialog(asset) {
    const safeAsset = asset || {};
    const validTypes = ['image', 'icon', 'button', 'component', 'character', 'environment', 'prop'];

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;background:rgba(2,8,20,0.72);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';

        const box = document.createElement('div');
        box.style.cssText =
            'width:min(640px,94vw);background:linear-gradient(165deg,#121a2e 0%,#0c1220 100%);border:1px solid rgba(0,240,255,0.26);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.55),0 0 36px rgba(0,240,255,0.12);color:#e8ecf4;font-family:"Rajdhani","Segoe UI",sans-serif;';

        const header = document.createElement('div');
        header.style.cssText =
            'padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08);font-family:"Orbitron","Segoe UI",sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#00f0ff;';
        header.textContent = '编辑素材';

        const body = document.createElement('div');
        body.style.cssText = 'padding:14px 16px;display:grid;gap:12px;';

        const createField = (labelText, control) => {
            const wrap = document.createElement('label');
            wrap.style.cssText = 'display:grid;gap:6px;font-size:13px;color:#9ec7df;';
            const label = document.createElement('span');
            label.textContent = labelText;
            label.style.cssText = 'letter-spacing:0.05em;text-transform:uppercase;font-weight:600;';
            wrap.appendChild(label);
            wrap.appendChild(control);
            return wrap;
        };

        const baseInputStyle =
            'width:100%;max-width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid rgba(0,240,255,0.28);background:rgba(5,8,16,0.7);color:#e8ecf4;font-size:15px;font-family:"Rajdhani","Segoe UI",sans-serif;outline:none;';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = safeAsset.name || '';
        nameInput.style.cssText = baseInputStyle;

        const descInput = document.createElement('textarea');
        descInput.rows = 3;
        descInput.value = safeAsset.desc || '';
        descInput.style.cssText = baseInputStyle + 'resize:vertical;min-height:72px;';

        const typeSelect = document.createElement('select');
        typeSelect.style.cssText = baseInputStyle;
        validTypes.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });
        typeSelect.value = validTypes.includes((safeAsset.type || '').toLowerCase())
            ? safeAsset.type.toLowerCase()
            : 'image';

        body.appendChild(createField('素材名称', nameInput));
        body.appendChild(createField('素材描述', descInput));
        body.appendChild(createField('素材类型', typeSelect));

        const footer = document.createElement('div');
        footer.style.cssText =
            'padding:14px 16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:10px;justify-content:flex-end;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText =
            'display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:6px;border:1px solid rgba(0,240,255,0.2);background:rgba(255,255,255,0.04);color:#e8ecf4;cursor:pointer;font-family:"Rajdhani","Segoe UI",sans-serif;font-size:14px;font-weight:600;';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '保存';
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
            if (e.key === 'Escape') close(null);
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                confirmBtn.click();
            }
        };
        document.addEventListener('keydown', onKeydown);

        cancelBtn.addEventListener('click', () => close(null));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(null);
        });

        confirmBtn.addEventListener('click', async () => {
            const nextName = nameInput.value.trim();
            if (!nextName) {
                await showTechPrompt({
                    title: '输入有误',
                    message: '素材名称不能为空。',
                    confirmText: '知道了',
                });
                nameInput.focus();
                return;
            }

            const nextType = (typeSelect.value || '').trim().toLowerCase();
            if (!validTypes.includes(nextType)) {
                await showTechPrompt({
                    title: '输入有误',
                    message: '素材类型无效，请重新选择。',
                    confirmText: '知道了',
                });
                return;
            }

            close({
                name: nextName,
                desc: descInput.value.trim(),
                type: nextType,
            });
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);
        box.appendChild(header);
        box.appendChild(body);
        box.appendChild(footer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => nameInput.focus(), 0);
    });
}

// 上传等关键写入要求立即落盘，不能走防抖
async function persistProjectsNow() {
    try {
        await saveProjectToServer(currentProject);
        projectsCache = projects;
        return true;
    } catch (error) {
        console.error('立即保存项目数据失败:', error);
        uiToast('素材保存失败，请稍后重试。', 'warn');
        return false;
    }
}

function renderProjectInfo() {
    document.getElementById('project-name').textContent = currentProject.name;
    document.getElementById('project-description').textContent = currentProject.desc || '无描述';
    document.getElementById('project-create-time').textContent = formatDate(currentProject.createTime);
    document.getElementById('project-version').textContent = currentProject.version;
    document.getElementById('project-asset-count').textContent = currentProject.assets
        ? currentProject.assets.length
        : 0;

    const projectTypeBadge = document.getElementById('project-type-badge');
    projectTypeBadge.textContent = getProjectTypeName(currentProject.type);

    document.getElementById('edit-project-id').value = currentProject.id;
    document.getElementById('unify-style-project-id').value = currentProject.id;
}

function renderAssetList() {
    const assetGrid = document.getElementById('asset-grid');
    const emptyAssets = document.getElementById('empty-assets');

    if (!currentProject.assets || currentProject.assets.length === 0) {
        assetGrid.innerHTML = '';
        emptyAssets.classList.remove('hidden');
        return;
    }

    emptyAssets.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    currentProject.assets.forEach((asset, index) => {
        const assetCard = document.createElement('div');
        assetCard.className = 'asset-card';
        assetCard.dataset.index = index;

        const safeContent = escapeHtml(asset.content || 'https://via.placeholder.com/280x200?text=No+Preview');
        const safeName = escapeHtml(asset.name || '');
        const safeDesc = escapeHtml(asset.desc || '无描述');
        assetCard.innerHTML = `
            <div class="asset-preview">
                <img src="${safeContent}" alt="${safeName}">
            </div>
            <div class="asset-info">
                <h4>${safeName}</h4>
                <p>${safeDesc}</p>
                <div class="asset-meta">
                    <span>${getAssetTypeName(asset.type)}</span>
                    <span>${formatDate(asset.createTime)}</span>
                    ${asset.isAIGenerated ? '<span class="ai-generated">AI生成</span>' : ''}
                </div>
                <div class="asset-actions">
                    <button class="edit-asset icon-btn" title="编辑素材">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-asset icon-btn" title="删除素材">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        fragment.appendChild(assetCard);
    });

    assetGrid.innerHTML = '';
    assetGrid.appendChild(fragment);

    bindAssetEvents();
}

function bindAssetEvents() {
    document.querySelectorAll('.edit-asset').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.asset-card');
            if (!card) return;
            const index = parseInt(card.dataset.index, 10);
            if (Number.isNaN(index) || !currentProject.assets || !currentProject.assets[index]) return;

            await editAssetAtIndex(index);
        });
    });

    document.querySelectorAll('.delete-asset').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.closest('.asset-card').dataset.index);
            if (Number.isNaN(index) || !currentProject.assets || !currentProject.assets[index]) return;

            const confirmed = await showTechPrompt({
                title: '删除素材',
                message: '确定删除此素材？该操作不可撤销。',
                confirmText: '删除',
                cancelText: '取消',
                showCancel: true,
            });
            if (!confirmed) return;

            const deletedAssetName = currentProject.assets[index].name;
            currentProject.assets.splice(index, 1);
            currentProject.version += 0.1;
            currentProject.versionHistory.push({
                time: new Date().toISOString(),
                desc: '删除素材：' + deletedAssetName,
            });
            saveProjectsToStorage();
            renderAssetList();
            renderProjectInfo();
        });
    });
}

async function editAssetAtIndex(index) {
    const asset = currentProject.assets[index];
    if (!asset) return;

    const edited = await showTechAssetEditorDialog(asset);
    if (!edited) return;

    const nextName = edited.name;
    const nextDesc = edited.desc;
    const nextType = edited.type;

    const beforeName = asset.name || '未命名素材';
    asset.name = nextName;
    asset.desc = nextDesc;
    asset.type = nextType;
    asset.updateTime = new Date().toISOString();

    currentProject.version += 0.1;
    currentProject.versionHistory.push({
        time: new Date().toISOString(),
        desc: `编辑素材：${beforeName} -> ${nextName}`,
    });

    const saved = await persistProjectsNow();
    if (!saved) return;

    renderAssetList();
    renderProjectInfo();
    await showTechPrompt({
        title: '保存成功',
        message: '素材编辑成功！',
        confirmText: '完成',
    });
}

function bindEventListeners() {
    document.getElementById('back-to-projects').addEventListener('click', navigateBack);

    document.querySelectorAll('.upload-tab').forEach((tab) => {
        tab.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;

            document.querySelectorAll('.upload-tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.upload-content').forEach((c) => c.classList.remove('active'));

            e.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // 标签切换后重新同步一次，防止出现原生 select 回退
            if (typeof window.refreshTechSelects === 'function') {
                window.refreshTechSelects();
            }
        });
    });

    document.querySelectorAll('input[name="ai-method"]').forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const method = e.target.value;

            document.getElementById('sketch-generate').classList.toggle('hidden', method !== 'sketch');
            document.getElementById('description-generate').classList.toggle('hidden', method !== 'description');
        });
    });

    document.getElementById('local-file-input').addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || '未选择文件';
        document.getElementById('selected-file-name').textContent = fileName;
    });

    document.getElementById('upload-asset-btn').addEventListener('click', uploadLocalAsset);

    document.getElementById('generate-asset-btn').addEventListener('click', generateAsset);

    document.querySelectorAll('.add-from-library-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const libId = e.target.dataset.id;
            addFromLibrary(libId);
        });
    });

    document.getElementById('edit-project-btn').addEventListener('click', () => {
        document.getElementById('edit-project-name').value = currentProject.name;
        document.getElementById('edit-project-desc').value = currentProject.desc || '';
        document.getElementById('edit-project-type').value = currentProject.type;
        if (typeof window.refreshTechSelects === 'function') {
            window.refreshTechSelects();
        }
        document.getElementById('edit-project-modal').classList.remove('hidden');
    });

    document.getElementById('save-edit-btn').addEventListener('click', saveProjectEdit);

    document.getElementById('version-history-btn').addEventListener('click', openVersionHistory);

    document.getElementById('share-project-btn').addEventListener('click', openShareModal);

    document.getElementById('unify-style-btn').addEventListener('click', () => {
        document.getElementById('unify-style-modal').classList.remove('hidden');
    });

    document.getElementById('confirm-unify-btn').addEventListener('click', unifyProjectStyle);

    document.querySelectorAll('.close-modal').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach((modal) => modal.classList.add('hidden'));
        });
    });

    document.getElementById('copy-link-btn').addEventListener('click', copyShareLink);
}

function navigateBack() {
    const isInDashboard = window.location.pathname.includes('dashboard.html');
    const backPath = isInDashboard ? '../dashboard.html' : 'index.html';
    window.location.href = backPath;
}

async function uploadLocalAsset() {
    const assetName = document.getElementById('local-asset-name').value.trim() || '未命名素材';
    const assetType = document.getElementById('local-asset-type').value;
    const fileInput = document.getElementById('local-file-input');
    const assetDesc = document.getElementById('local-asset-desc').value.trim();

    if (!fileInput.files.length) {
        await showTechPrompt({
            title: '输入有误',
            message: '请选择要上传的文件！',
            confirmText: '知道了',
        });
        return;
    }

    // 文件上传处理
    const file = fileInput.files[0];

    let finalDataUrl = '';
    try {
        finalDataUrl = await optimizeFileForStorage(file);
    } catch (e) {
        console.error('读取文件失败:', e);
        await showTechPrompt({
            title: '读取失败',
            message: '读取文件失败，请重试。',
            confirmText: '知道了',
        });
        return;
    }

    if (!currentProject.assets) {
        currentProject.assets = [];
    }

    const newAsset = {
        id: Date.now().toString(),
        name: assetName,
        type: assetType,
        content: finalDataUrl,
        desc: assetDesc,
        createTime: new Date().toISOString(),
        isAIGenerated: false,
    };

    currentProject.assets.push(newAsset);
    currentProject.version += 0.1;
    currentProject.versionHistory.push({
        time: new Date().toISOString(),
        desc: `添加素材：${assetName}`,
    });

    // 上传场景要求可立即落盘，避免用户刷新后素材丢失
    const saved = await persistProjectsNow();
    if (!saved) {
        // 回滚，避免页面显示成功但实际未保存
        currentProject.assets.pop();
        return;
    }
    const syncResult = await syncProjectAssetToLibrary(currentProject, newAsset);
    renderAssetList();
    renderProjectInfo();

    document.getElementById('local-asset-name').value = '';
    document.getElementById('local-file-input').value = '';
    document.getElementById('local-asset-desc').value = '';
    document.getElementById('selected-file-name').textContent = '未选择文件';

    let tip = '素材上传成功！';
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

function fileToDataURL(file) {
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

    const originalDataUrl = await fileToDataURL(file);
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
    // 非图片文件给出保护阈值，避免极大 dataURL 直接撑爆 localStorage
    if (!file.type || !file.type.startsWith('image/')) {
        if (file.size > 1024 * 1024) {
            throw new Error('非图片文件过大，超过1MB');
        }
        return fileToDataURL(file);
    }

    // 小图直接保存，避免不必要损失
    if (file.size <= 350 * 1024) {
        return fileToDataURL(file);
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
                        // Delete existing before re-adding
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

function generateAsset() {
    const method = document.querySelector('input[name="ai-method"]:checked').value;

    if (method === 'sketch') {
        generateFromSketch();
    } else {
        generateFromDescription();
    }
}

function generateFromSketch() {
    const sketchUrl = document.getElementById('sketch-url').value.trim();
    if (!sketchUrl) {
        uiToast('请输入线稿图片URL！', 'warn');
        return;
    }
    const aiPagePath = '../ai-generate/ai-generator-new.html';
    window.location.href = `${aiPagePath}?mode=img2img&projectId=${encodeURIComponent(currentProject.id)}`;
}

function generateFromDescription() {
    const description = document.getElementById('asset-description').value.trim();
    if (!description) {
        uiToast('请输入素材描述！', 'warn');
        return;
    }
    const aiPagePath = '../ai-generate/ai-generator-new.html';
    window.location.href = `${aiPagePath}?prompt=${encodeURIComponent(description)}&projectId=${encodeURIComponent(currentProject.id)}`;
}

function addFromLibrary() {
    const assetLibPath = '../asset-library/asset-library.html';
    window.location.href = `${assetLibPath}?projectId=${encodeURIComponent(currentProject.id)}`;
}

function unifyProjectStyle() {
    uiToast('请在 AI 生成页中使用风格预设功能', 'info');
    const aiPagePath = '../ai-generate/ai-generator-new.html';
    window.location.href = `${aiPagePath}?projectId=${encodeURIComponent(currentProject.id)}`;
}

async function saveProjectEdit() {
    const projectName = document.getElementById('edit-project-name').value.trim();

    if (!projectName) {
        await showTechPrompt({
            title: '输入有误',
            message: '项目名称不能为空！',
            confirmText: '知道了',
        });
        return;
    }

    currentProject.name = projectName;
    currentProject.desc = document.getElementById('edit-project-desc').value.trim();
    currentProject.type = document.getElementById('edit-project-type').value;
    currentProject.version += 0.1;
    currentProject.versionHistory.push({
        time: new Date().toISOString(),
        desc: '编辑项目信息',
    });

    saveProjectsToStorage();
    renderProjectInfo();

    document.getElementById('edit-project-modal').classList.add('hidden');

    uiToast('项目信息已更新！', 'success');
}

function openVersionHistory() {
    const versionList = document.getElementById('version-list');

    if (!currentProject.versionHistory || currentProject.versionHistory.length === 0) {
        versionList.innerHTML = '<p class="no-versions">暂无版本历史记录</p>';
    } else {
        const fragment = document.createDocumentFragment();

        const sortedHistory = [...currentProject.versionHistory].sort((a, b) => new Date(b.time) - new Date(a.time));

        sortedHistory.forEach((version, index) => {
            const versionItem = document.createElement('div');
            versionItem.className = 'version-item';
            versionItem.innerHTML = `
                <div class="version-header">
                    <span class="version-index">${index + 1}</span>
                    <span class="version-time">${formatDate(version.time)}</span>
                </div>
                <div class="version-desc">${escapeHtml(version.desc || '')}</div>
            `;
            fragment.appendChild(versionItem);
        });

        versionList.innerHTML = '';
        versionList.appendChild(fragment);
    }

    document.getElementById('version-history-modal').classList.remove('hidden');
}

function openShareModal() {
    const shareLink = `${window.location.origin}${window.location.pathname}?id=${currentProject.id}`;
    document.getElementById('share-link').value = shareLink;

    document.getElementById('share-modal').classList.remove('hidden');
}

function copyShareLink() {
    const shareLinkInput = document.getElementById('share-link');
    shareLinkInput.select();
    document.execCommand('copy');

    uiToast('链接已复制到剪贴板！', 'success');
}

function getAssetTypeName(type) {
    if (PMSharedLib.getAssetTypeName) return PMSharedLib.getAssetTypeName(type);
    return type || '未分类';
}

function getProjectTypeName(type) {
    if (PMSharedLib.getProjectTypeName) return PMSharedLib.getProjectTypeName(type);
    return type || '未分类';
}

function formatDate(isoString) {
    if (PMSharedLib.formatDate) return PMSharedLib.formatDate(isoString);
    return isoString || '-';
}
