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
                            const clickedInside =
                                wrap.contains(e.target) || (portalMenu && portalMenu.contains(e.target));
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

                document
                    .querySelectorAll('.asset-wrap select.input-group')
                    .forEach((select) => buildTechSelect(select));
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
            const uploadCategoryEl = document.getElementById('uploadCategory');
            const btnChoose = document.getElementById('btnChoose');
            const fileInput = document.getElementById('fileInput');
            const uploadArea = document.getElementById('uploadArea');
            const assetGrid = document.getElementById('assetGrid');
            const modalRoot = document.getElementById('modalRoot');
            const noAssets = document.getElementById('noAssets');
            const btnAddCategory = document.getElementById('btnAddCategory');
            const btnClearAll = document.getElementById('btnClearAll');
            const defaultName = document.getElementById('defaultName');
            const assetSearchEl = document.getElementById('assetSearch');
            const typeFilterEl = document.getElementById('typeFilter');
            const sortOrderEl = document.getElementById('sortOrder');
            const btnBatchDelete = document.getElementById('btnBatchDelete');
            // 导航元素引用已移除，因为现在使用与dashboard.html一致的导航结构

            // 运行初始化
            let categories = [];
            let assets = [];
            const selectedAssets = new Set();

            function loadState() {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY + '_categories');
                    categories = raw ? JSON.parse(raw) : DEFAULT_CATEGORIES.slice();
                } catch (e) {
                    categories = DEFAULT_CATEGORIES.slice();
                }
                if (!Array.isArray(categories) || categories.length === 0) {
                    categories = DEFAULT_CATEGORIES.slice();
                }
                // assets will be loaded from server via loadAssetsFromServer()
                assets = [];

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
                                window.location.href =
                                    '../project-management/project-detail.html?id=' + encodeURIComponent(ctx.id);
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

            function populateCategorySelectors() {
                // 筛选器
                categoryFilterEl.innerHTML =
                    '<option value="all">全部分类</option>' +
                    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
                uploadCategoryEl.innerHTML = categories
                    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
                    .join('');
                initTechSelects();
            }

            function filterAssets() {
                const q = (assetSearchEl ? assetSearchEl.value : '').trim().toLowerCase();
                const cat = categoryFilterEl ? categoryFilterEl.value : 'all';
                const type = typeFilterEl ? typeFilterEl.value : 'all';
                const sort = sortOrderEl ? sortOrderEl.value : 'newest';

                let filtered = assets.filter((a) => {
                    if (cat !== 'all' && a.category !== cat) return false;
                    if (type !== 'all') {
                        const at = (a.type || '').toLowerCase();
                        if (at !== type && !at.startsWith(type + '/')) return false;
                    }
                    if (q) {
                        const nameMatch = (a.name || '').toLowerCase().includes(q);
                        const descMatch = (a.fileName || '').toLowerCase().includes(q);
                        if (!nameMatch && !descMatch) return false;
                    }
                    return true;
                });

                if (sort === 'newest') {
                    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                } else if (sort === 'oldest') {
                    filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                } else if (sort === 'name') {
                    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                }

                return filtered;
            }

            function renderAssets() {
                const filtered = filterAssets();
                assetGrid.innerHTML = '';
                if (filtered.length === 0) {
                    noAssets.style.display = 'block';
                    noAssets.textContent = '暂无素材。试试上传一些文件。';
                } else {
                    noAssets.style.display = 'none';
                }
                filtered.forEach((a) => {
                    const card = document.createElement('div');
                    card.className = 'asset-card';
                    if (selectedAssets.has(a.id)) card.classList.add('is-selected');

                    // 选择复选框
                    const check = document.createElement('div');
                    check.className = 'select-check' + (selectedAssets.has(a.id) ? ' is-checked' : '');
                    check.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedAssets.has(a.id)) {
                            selectedAssets.delete(a.id);
                            check.classList.remove('is-checked');
                            card.classList.remove('is-selected');
                        } else {
                            selectedAssets.add(a.id);
                            check.classList.add('is-checked');
                            card.classList.add('is-selected');
                        }
                        updateBatchBar();
                    });
                    card.appendChild(check);

                    const thumb = document.createElement('div');
                    thumb.className = 'thumb';
                    if (a.type && a.type.startsWith('image/') && a.dataURL) {
                        const img = document.createElement('img');
                        img.src = a.dataURL;
                        img.alt = a.name || a.fileName;
                        img.className = 'thumb-img';
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                        thumb.appendChild(img);
                    } else {
                        thumb.textContent = a.fileName || a.name || '文件';
                    }

                    const meta = document.createElement('div');
                    meta.className = 'meta';
                    const name = document.createElement('div');
                    name.className = 'name';
                    name.title = a.name || a.fileName;
                    name.textContent = a.name || a.fileName;
                    const cat = document.createElement('div');
                    cat.className = 'cat';
                    cat.textContent = a.category || '未分类';
                    meta.appendChild(name);
                    meta.appendChild(cat);

                    const actions = document.createElement('div');
                    actions.className = 'card-actions';
                    const btnView = document.createElement('button');
                    btnView.className = 'btn btn-small';
                    btnView.textContent = '预览';
                    btnView.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openPreview(a);
                    });
                    const btnDownload = document.createElement('button');
                    btnDownload.className = 'btn btn-small';
                    btnDownload.textContent = '下载';
                    btnDownload.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadAsset(a);
                    });
                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'btn btn-small';
                    btnDelete.textContent = '删除';
                    btnDelete.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const ok = await uiConfirm('确定删除此素材？', '删除素材');
                        if (ok) {
                            deleteAsset(a.id);
                        }
                    });

                    // 收藏功能已移除
                    actions.appendChild(btnView);
                    actions.appendChild(btnDownload);
                    actions.appendChild(btnDelete);

                    card.appendChild(thumb);
                    card.appendChild(meta);
                    card.appendChild(actions);

                    assetGrid.appendChild(card);
                });
            }

            function openPreview(a) {
                modalRoot.innerHTML = '';
                const modal = document.createElement('div');
                modal.className = 'modal';
                const box = document.createElement('div');
                box.className = 'box';
                const title = document.createElement('div');
                title.style.marginBottom = '8px';
                title.innerHTML = `<strong>${escapeHtml(a.name || a.fileName)}</strong> <span style="color:#666">（${escapeHtml(a.category || '未分类')}, ${escapeHtml(a.fileName || '')}）</span>`;
                box.appendChild(title);
                if (a.type && a.type.startsWith('image/') && a.dataURL) {
                    const img = document.createElement('img');
                    img.src = a.dataURL;
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    box.appendChild(img);
                } else if (a.type && a.type.startsWith('audio/') && a.dataURL) {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = a.dataURL;
                    box.appendChild(audio);
                } else if (a.dataURL) {
                    const link = document.createElement('a');
                    link.href = a.dataURL;
                    link.textContent = '打开/下载文件';
                    link.target = '_blank';
                    box.appendChild(link);
                } else {
                    box.appendChild(document.createTextNode('此文件没有预览数据。'));
                }
                const close = document.createElement('div');
                close.style.marginTop = '12px';
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.textContent = '关闭';
                btn.addEventListener('click', () => {
                    modalRoot.style.display = 'none';
                    modalRoot.innerHTML = '';
                });
                close.appendChild(btn);
                box.appendChild(close);
                modal.appendChild(box);
                modalRoot.appendChild(modal);
                modalRoot.style.display = 'block';
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modalRoot.style.display = 'none';
                        modalRoot.innerHTML = '';
                    }
                });
            }

            function downloadAsset(a) {
                if (!a.dataURL) {
                    uiToast('无下载数据', 'warn');
                    return;
                }

                try {
                    // 获取文件名
                    const fileName = a.fileName || a.name || 'download';

                    // 方法1：直接使用window.open（适用于图片等）
                    if (a.type && a.type.startsWith('image/')) {
                        // 对于图片，直接在新窗口打开并提示用户右键保存
                        const newWindow = window.open('', '_blank');
                        if (!newWindow) {
                            // 弹窗被阻止，回退到直接下载
                            const link = document.createElement('a');
                            link.href = a.dataURL;
                            link.download = fileName;
                            link.click();
                            return;
                        }
                        const doc = newWindow.document;
                        doc.open();
                        doc.write('<!DOCTYPE html><html><head><title></title></head><body></body></html>');
                        doc.close();
                        doc.title = fileName;
                        const body = doc.body;
                        body.style.cssText = 'margin:0; padding:20px; text-align:center; background:#1a1a2e; color:#e0e0e0;';
                        const img = doc.createElement('img');
                        img.src = a.dataURL;
                        img.alt = fileName;
                        img.style.cssText = 'max-width:100%; max-height:80vh; border-radius:8px;';
                        body.appendChild(img);
                        const p = doc.createElement('p');
                        p.style.marginTop = '20px';
                        p.textContent = '右键点击图片选择"另存为"来保存文件';
                        body.appendChild(p);
                        const btn = doc.createElement('button');
                        btn.textContent = '关闭';
                        btn.style.cssText = 'padding:10px 20px; background:#00f0ff; color:#1a1a2e; border:none; border-radius:5px; cursor:pointer;';
                        btn.addEventListener('click', function() { newWindow.close(); });
                        body.appendChild(btn);
                        return;
                    }

                    // 方法2：使用fetch + blob下载（适用于所有文件类型）
                    fetch(a.dataURL)
                        .then((response) => {
                            if (!response.ok) throw new Error('HTTP ' + response.status);
                            return response.blob();
                        })
                        .then((blob) => {
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = fileName;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                        })
                        .catch((error) => {
                            console.error('下载失败:', error);
                            uiToast('下载失败，请重试', 'warn');
                        });
                } catch (error) {
                    console.error('下载失败:', error);
                    uiToast('下载失败，请重试', 'warn');
                }
            }

            async function deleteAsset(id) {
                try {
                    const resp = await fetchWithCsrf('/api/asset-library/' + encodeURIComponent(id), { method: 'DELETE' });
                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        throw new Error(err.error || '删除失败');
                    }
                    assets = assets.filter((x) => x.id !== id);
                    renderAssets();
                } catch (e) {
                    console.error('删除素材失败', e);
                    uiToast('删除失败：' + (e.message || '请重试'), 'warn');
                }
            }

            // 收藏功能已移除，因为导航结构与dashboard.html一致

            function readFileAsDataURL(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(file);
                });
            }

            function dataUrlToImage(dataURL) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('图片读取失败'));
                    img.src = dataURL;
                });
            }

            async function compressImageDataUrl(dataURL, options = {}) {
                const opt = {
                    maxWidth: options.maxWidth || 1600,
                    maxHeight: options.maxHeight || 1600,
                    mimeType: options.mimeType || 'image/webp',
                    quality: options.quality == null ? 0.82 : options.quality,
                };
                const img = await dataUrlToImage(dataURL);
                const ratio = Math.min(opt.maxWidth / img.naturalWidth, opt.maxHeight / img.naturalHeight, 1);
                const w = Math.max(1, Math.round(img.naturalWidth * ratio));
                const h = Math.max(1, Math.round(img.naturalHeight * ratio));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                return canvas.toDataURL(opt.mimeType, opt.quality);
            }

            function createAssetItem(file, defaultNameVal, categoryVal, dataURL, typeOverride) {
                return {
                    id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    name: defaultNameVal || file.name,
                    fileName: file.name,
                    category: categoryVal || '其他',
                    type: typeOverride || file.type || 'application/octet-stream',
                    dataURL: dataURL,
                    favorite: false,
                    createdAt: Date.now(),
                };
            }

            async function persistAssetItem(item) {
                try {
                    const body = {
                        name: item.name || '',
                        type: item.type || 'image',
                        content: item.dataURL || '',
                        desc: item.fileName || '',
                        source: item.source || '',
                        tags: JSON.stringify({ category: item.category || '其他', fileName: item.fileName || '', customTags: item.tags || [] }),
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

            async function addAssetFromFile(file, defaultNameVal, categoryVal) {
                const MAX_NON_IMAGE_FILE_SIZE = (window.ArtifexConstants && window.ArtifexConstants.MAX_NON_IMAGE_FILE_SIZE) || 2.5 * 1024 * 1024;
                const isImage = !!(file.type && file.type.startsWith('image/'));
                if (!isImage && file.size > MAX_NON_IMAGE_FILE_SIZE) {
                    throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），非图片建议不超过 2.5MB`);
                }

                let dataURL = await readFileAsDataURL(file);
                let outType = file.type;

                // 大图先压缩一次，减少 localStorage 超限概率
                if (isImage && file.size > 1.5 * 1024 * 1024) {
                    try {
                        dataURL = await compressImageDataUrl(dataURL, {
                            maxWidth: 1600,
                            maxHeight: 1600,
                            mimeType: 'image/webp',
                            quality: 0.82,
                        });
                        outType = 'image/webp';
                    } catch (e) {
                        console.warn('预压缩失败，回退原图：', e);
                    }
                }

                let item = createAssetItem(file, defaultNameVal, categoryVal, dataURL, outType);
                if (await persistAssetItem(item)) {
                    return item;
                }

                // 保存失败时再激进压缩重试（图片专用）
                if (isImage) {
                    const aggressive = await compressImageDataUrl(dataURL, {
                        maxWidth: 1280,
                        maxHeight: 1280,
                        mimeType: 'image/webp',
                        quality: 0.7,
                    });
                    item = createAssetItem(file, defaultNameVal, categoryVal, aggressive, 'image/webp');
                    if (await persistAssetItem(item)) {
                        uiToast('图片已自动压缩后保存', 'warn');
                        return item;
                    }
                }

                throw new Error('保存失败，素材未保存（服务器存储可能已满）');
            }

            // 处理上传
            async function handleFiles(files) {
                if (!files || files.length === 0) return;
                const cat = uploadCategoryEl.value || categories[0] || '其他';
                const defaultNameVal = defaultName.value && defaultName.value.trim();
                let success = 0;
                let failed = 0;
                const failMessages = [];
                for (const f of Array.from(files)) {
                    try {
                        await addAssetFromFile(f, defaultNameVal || f.name, cat);
                        success++;
                    } catch (e) {
                        failed++;
                        const msg = e && e.message ? e.message : '读取文件失败';
                        failMessages.push(`${f.name}: ${msg}`);
                        console.error('读取文件失败', f.name, e);
                    }
                }
                defaultName.value = '';
                if (fileInput) fileInput.value = '';
                if (success > 0 && failed === 0) {
                    uiToast(`上传成功：${success} 个素材`, 'success');
                } else if (success > 0 && failed > 0) {
                    uiToast(`部分成功：${success} 成功，${failed} 失败`, 'warn');
                } else if (failed > 0) {
                    uiToast(`上传失败：${failed} 个文件未保存`, 'warn');
                }
                if (failMessages.length) {
                    console.debug('[asset-library] 上传失败详情:\n' + failMessages.join('\n'));
                }
            }

            // 拖放上传
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', (e) => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                handleFiles(e.dataTransfer.files);
            });

            if (btnChoose && fileInput) {
                btnChoose.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
            }

            // 搜索与筛选（搜索框加 300ms 防抖，避免大量素材时输入卡顿）
            let _searchTimer = null;
            const debouncedRender = () => { clearTimeout(_searchTimer); _searchTimer = setTimeout(renderAssets, 300); };
            if (searchEl) searchEl.addEventListener('input', debouncedRender);
            if (categoryFilterEl) categoryFilterEl.addEventListener('change', () => renderAssets());
            if (assetSearchEl) assetSearchEl.addEventListener('input', debouncedRender);
            if (typeFilterEl) typeFilterEl.addEventListener('change', () => renderAssets());
            if (sortOrderEl) sortOrderEl.addEventListener('change', () => renderAssets());

            if (btnAddCategory) btnAddCategory.addEventListener('click', async () => {
                const v = await uiPrompt('新增分类', '输入新分类名称：', '');
                if (v && v.trim()) {
                    categories.unshift(v.trim());
                    populateCategorySelectors();
                    saveState();
                }
            });

            if (btnClearAll) btnClearAll.addEventListener('click', async () => {
                const ok = await uiConfirm(
                    '确定要删除所有素材并清空吗？此操作不可撤销',
                    '清空素材库'
                );
                if (ok) {
                    // Delete all assets from server
                    const deletePromises = assets.map((a) =>
                        fetchWithCsrf('/api/asset-library/' + encodeURIComponent(a.id), { method: 'DELETE' }).catch(() => {})
                    );
                    await Promise.all(deletePromises);
                    assets = [];
                    saveState();
                    renderAssets();
                }
            });

            // escapeHtml 由 js/html-utils.js 提供（全局函数）

            // ── 批量选择栏 ──
            function updateBatchBar() {
                const bar = document.getElementById('batchBar');
                const count = document.getElementById('batchCount');
                if (!bar || !count) return;
                if (selectedAssets.size > 0) {
                    bar.style.display = 'flex';
                    count.textContent = '已选 ' + selectedAssets.size + ' 个素材';
                } else {
                    bar.style.display = 'none';
                }
            }

            // 批量删除
            async function batchDeleteAssets() {
                const count = selectedAssets.size;
                if (count === 0) return;
                const ok = await uiConfirm('确定删除选中的 ' + count + ' 个素材？此操作不可撤销。', '批量删除');
                if (!ok) return;
                const ids = Array.from(selectedAssets);
                let deleted = 0;
                for (const id of ids) {
                    try {
                        const resp = await fetchWithCsrf('/api/asset-library/' + encodeURIComponent(id), { method: 'DELETE' });
                        if (resp.ok) {
                            assets = assets.filter((x) => x.id !== id);
                            deleted++;
                        }
                    } catch (e) {
                        console.error('批量删除素材失败', id, e);
                    }
                }
                selectedAssets.clear();
                renderAssets();
                updateBatchBar();
                if (deleted > 0) {
                    uiToast('已删除 ' + deleted + ' 个素材', 'success');
                }
            }

            // 绑定批量操作按钮
            (function bindBatchActions() {
                const btnSelectAll = document.getElementById('btnSelectAll');
                const btnDeselectAll = document.getElementById('btnDeselectAll');
                const btnExportMenu = document.getElementById('btnExportMenu');
                const exportMenu = document.getElementById('exportMenu');

                if (btnSelectAll) {
                    btnSelectAll.addEventListener('click', () => {
                        assets.forEach((a) => selectedAssets.add(a.id));
                        renderAssets();
                        updateBatchBar();
                    });
                }
                if (btnDeselectAll) {
                    btnDeselectAll.addEventListener('click', () => {
                        selectedAssets.clear();
                        renderAssets();
                        updateBatchBar();
                    });
                }
                if (btnBatchDelete) {
                    btnBatchDelete.addEventListener('click', batchDeleteAssets);
                }
                if (btnExportMenu && exportMenu) {
                    btnExportMenu.addEventListener('click', (e) => {
                        e.stopPropagation();
                        exportMenu.classList.toggle('is-open');
                    });
                    document.addEventListener('click', () => {
                        exportMenu.classList.remove('is-open');
                    });
                    exportMenu.querySelectorAll('.export-option').forEach((opt) => {
                        opt.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const format = opt.dataset.format;
                            exportMenu.classList.remove('is-open');
                            handleExport(format);
                        });
                    });
                }
            })();

            // ── 辅助：加载图片 ──
            function loadImageFromDataURL(dataURL) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('图片加载失败'));
                    img.src = dataURL;
                });
            }

            // ── 导出入口 ──
            async function handleExport(format) {
                const selected = assets.filter((a) => selectedAssets.has(a.id));
                const imageAssets = selected.filter((a) => a.type && a.type.startsWith('image/') && a.dataURL);
                if (imageAssets.length === 0) {
                    uiToast('请先选择至少一个图片素材', 'warn');
                    return;
                }
                uiToast('正在打包导出...', 'success');
                try {
                    if (format === 'unity') {
                        await exportUnity(imageAssets);
                    } else if (format === 'godot') {
                        await exportGodot(imageAssets);
                    } else if (format === 'spritesheet') {
                        await exportGenericSpriteSheet(imageAssets);
                    }
                } catch (e) {
                    console.error('导出失败:', e);
                    uiToast('导出失败: ' + (e.message || '未知错误'), 'warn');
                }
            }

            // ── 下载 Blob 为文件 ──
            function downloadBlob(blob, fileName) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            // ── Unity SpriteSheet 导出 ──
            async function exportUnity(imageAssets) {
                if (typeof JSZip === 'undefined') {
                    uiToast('JSZip 未加载，请刷新页面后重试', 'warn');
                    return;
                }
                const zip = new JSZip();
                const frames = {};
                let offsetX = 0;
                let maxH = 0;
                const padding = 2;

                for (const a of imageAssets) {
                    const img = await loadImageFromDataURL(a.dataURL);
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    const safeName = (a.name || a.fileName || 'asset').replace(/[^a-zA-Z0-9_一-鿿]/g, '_');
                    const pngName = safeName + '.png';

                    // 将图片添加到 zip
                    const base64 = a.dataURL.split(',')[1] || '';
                    zip.file('sprites/' + pngName, base64, { base64: true });

                    frames[safeName] = {
                        frame: { x: offsetX, y: 0, w: w, h: h },
                        rotated: false,
                        trimmed: false,
                        spriteSourceSize: { x: 0, y: 0, w: w, h: h },
                        sourceSize: { w: w, h: h },
                    };
                    offsetX += w + padding;
                    maxH = Math.max(maxH, h);
                }

                const meta = {
                    app: 'Artifex',
                    version: '1.0',
                    format: 'RGBA8888',
                    size: { w: offsetX, h: maxH },
                };

                const json = JSON.stringify({ frames: frames, meta: meta }, null, 2);
                zip.file('spritesheet.json', json);
                zip.file('README.txt', 'Artifex Unity SpriteSheet Export\nFormat: JSON Hash\nGenerated: ' + new Date().toISOString());

                const blob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(blob, 'artifex_unity_spritesheet.zip');
                uiToast('Unity SpriteSheet 已导出', 'success');
            }

            // ── Godot Atlas 导出 ──
            async function exportGodot(imageAssets) {
                if (typeof JSZip === 'undefined') {
                    uiToast('JSZip 未加载，请刷新页面后重试', 'warn');
                    return;
                }
                const zip = new JSZip();
                let tresContent = '[gd_resource type="AtlasTexture" load_steps=' + (imageAssets.length + 1) + ' format=3]\n\n';
                let resourceIndex = 1;

                for (const a of imageAssets) {
                    const img = await loadImageFromDataURL(a.dataURL);
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    const safeName = (a.name || a.fileName || 'asset').replace(/[^a-zA-Z0-9_一-鿿]/g, '_');
                    const pngName = safeName + '.png';

                    // 保存图片到 zip
                    const base64 = a.dataURL.split(',')[1] || '';
                    zip.file('textures/' + pngName, base64, { base64: true });

                    // 生成 AtlasTexture 资源
                    tresContent += '[ext_resource type="Texture2D" path="res://textures/' + pngName + '" id="' + resourceIndex + '"]\n';
                    resourceIndex++;
                }

                tresContent += '\n';
                let atlasIndex = 1;
                for (const a of imageAssets) {
                    const img = await loadImageFromDataURL(a.dataURL);
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    tresContent += '[resource]\natlas = ExtResource("' + atlasIndex + '")\nregion = Rect2(0, 0, ' + w + ', ' + h + ')\n\n';
                    atlasIndex++;
                }

                zip.file('atlas.tres', tresContent);
                zip.file('README.txt', 'Artifex Godot Atlas Export\nFormat: Godot .tres AtlasTexture\nGenerated: ' + new Date().toISOString());

                const blob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(blob, 'artifex_godot_atlas.zip');
                uiToast('Godot Atlas 已导出', 'success');
            }

            // ── 通用 SpriteSheet 导出 ──
            async function exportGenericSpriteSheet(imageAssets) {
                const images = [];
                let maxW = 0;
                let maxH = 0;
                for (const a of imageAssets) {
                    const img = await loadImageFromDataURL(a.dataURL);
                    images.push({ img: img, name: a.name || a.fileName || 'asset' });
                    maxW = Math.max(maxW, img.naturalWidth);
                    maxH = Math.max(maxH, img.naturalHeight);
                }

                // 计算网格布局
                const cols = Math.ceil(Math.sqrt(images.length));
                const rows = Math.ceil(images.length / cols);
                const padding = 2;
                const cellW = maxW + padding;
                const cellH = maxH + padding;
                const canvasW = cols * cellW;
                const canvasH = rows * cellH;

                const canvas = document.createElement('canvas');
                canvas.width = canvasW;
                canvas.height = canvasH;
                const ctx = canvas.getContext('2d');

                const frameData = {};
                images.forEach((item, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const x = col * cellW;
                    const y = row * cellH;
                    ctx.drawImage(item.img, x, y);
                    const safeName = item.name.replace(/[^a-zA-Z0-9_一-鿿]/g, '_');
                    frameData[safeName] = {
                        frame: { x: x, y: y, w: item.img.naturalWidth, h: item.img.naturalHeight },
                    };
                });

                const meta = {
                    app: 'Artifex',
                    version: '1.0',
                    format: 'RGBA8888',
                    size: { w: canvasW, h: canvasH },
                    columns: cols,
                    rows: rows,
                };

                const json = JSON.stringify({ frames: frameData, meta: meta }, null, 2);

                // 导出为 zip
                if (typeof JSZip !== 'undefined') {
                    const zip = new JSZip();
                    const pngDataUrl = canvas.toDataURL('image/png');
                    const base64 = pngDataUrl.split(',')[1] || '';
                    zip.file('spritesheet.png', base64, { base64: true });
                    zip.file('spritesheet.json', json);
                    const blob = await zip.generateAsync({ type: 'blob' });
                    downloadBlob(blob, 'artifex_spritesheet.zip');
                } else {
                    // 无 JSZip 时直接下载 png 和 json
                    const a1 = document.createElement('a');
                    a1.href = canvas.toDataURL('image/png');
                    a1.download = 'spritesheet.png';
                    a1.click();
                    const blob = new Blob([json], { type: 'application/json' });
                    downloadBlob(blob, 'spritesheet.json');
                }
                uiToast('通用 SpriteSheet 已导出', 'success');
            }

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
                        assets = data.items.map(dbItemToFrontend);
                    }
                } catch (e) {
                    console.error('从服务器加载素材失败', e);
                    uiToast('加载素材库失败，将使用本地备份', 'warn');
                    // Fallback to localStorage backup
                    try {
                        const raw = localStorage.getItem(STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            assets = parsed.assets || [];
                        }
                    } catch (_) {}
                }
                // Derive categories from loaded assets
                const derivedCats = new Set(categories);
                assets.forEach((a) => {
                    if (a.category && !derivedCats.has(a.category)) derivedCats.add(a.category);
                });
                categories = Array.from(derivedCats);
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
                        favorite: false,
                        createdAt: Date.now() - idx * 1000,
                    };
                });

                return samples;
            }

            // 加载并初始化
            function init() {
                loadState();
                // 如果当前没有素材，则写入示例素材以便用户能快速看到效果
                if (!assets || assets.length === 0) {
                    const samples = sampleAssets();
                    // 将示例素材放在前面
                    assets = samples.concat(assets || []);
                    // 如果 categories 中尚未包含示例的分类，则合并
                    const sampleCats = Array.from(new Set(samples.map((s) => s.category)));
                    sampleCats.forEach((c) => {
                        if (!categories.includes(c)) categories.push(c);
                    });
                    saveState();
                }
                populateCategorySelectors();
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

                    const seen = new Set(
                        scopedAssets.map((a) => (a && (a.id || a.fileName + '|' + a.createdAt)) || '')
                    );
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

                    localStorage.setItem(
                        scopedKey,
                        JSON.stringify({ categories: scopedCategories, assets: scopedAssets })
                    );
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
                populateCategorySelectors();
                renderAssets();
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', bootAssetLibrary);
            } else {
                bootAssetLibrary();
            }

            // 额外：支持按回车上传当前选中文件名（不实际选文件）——保留轻量交互
            // --- tag system ---
            function getAllTags() {
                var tagSet = new Set();
                assets.forEach(function(a) {
                    if (Array.isArray(a.tags)) {
                        a.tags.forEach(function(t) { if (t) tagSet.add(t); });
                    }
                });
                return Array.from(tagSet).sort();
            }
            var activeTagFilter = null;
            function renderTagFilterBar() {
                var bar = document.getElementById('tagFilterBar');
                var chips = document.getElementById('tagFilterChips');
                if (!bar || !chips) return;
                var allTags = getAllTags();
                if (allTags.length === 0) { bar.style.display = 'none'; return; }
                bar.style.display = 'flex'; chips.innerHTML = '';
                allTags.forEach(function(tag) {
                    var chip = document.createElement('span');
                    chip.className = 'tag-filter-chip' + (activeTagFilter === tag ? ' is-active' : '');
                    chip.textContent = tag;
                    chip.addEventListener('click', function() {
                        activeTagFilter = (activeTagFilter === tag) ? null : tag;
                        renderTagFilterBar(); renderAssets();
                    });
                    chips.appendChild(chip);
                });
            }
            var _originalFilterAssets = filterAssets;
            filterAssets = function() {
                var filtered = _originalFilterAssets();
                if (activeTagFilter) {
                    filtered = filtered.filter(function(a) {
                        return Array.isArray(a.tags) && a.tags.indexOf(activeTagFilter) !== -1;
                    });
                }
                return filtered;
            };
            var _originalRenderAssets = renderAssets;
            renderAssets = function() {
                _originalRenderAssets();
                renderTagFilterBar();
                var cards = assetGrid.querySelectorAll('.asset-card');
                var filtered = filterAssets();
                cards.forEach(function(card, idx) {
                    var a = filtered[idx];
                    if (!a) return;
                    if (Array.isArray(a.tags) && a.tags.length > 0) {
                        var tagsDiv = document.createElement('div');
                        tagsDiv.className = 'asset-tags';
                        a.tags.forEach(function(tag) {
                            var chip = document.createElement('span');
                            chip.className = 'tag-chip'; chip.textContent = tag;
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
                        moreBtn.addEventListener('click', function(e) {
                            e.preventDefault(); e.stopPropagation();
                            showCardContextMenu(a, moreBtn);
                        });
                        actions.appendChild(moreBtn);
                    }
                });
            };
            // --- context menu ---
            function showCardContextMenu(asset, anchorEl) {
                document.querySelectorAll('.card-context-menu.is-open').forEach(function(m) { m.remove(); });
                var menu = document.createElement('div');
                menu.className = 'card-context-menu is-open';
                var btnCopy = document.createElement('button');
                btnCopy.innerHTML = '<i class="fas fa-copy"></i> 复制到项目';
                btnCopy.addEventListener('click', function(e) { e.stopPropagation(); menu.remove(); showProjectSelector(asset); });
                var btnTags = document.createElement('button');
                btnTags.innerHTML = '<i class="fas fa-tags"></i> 编辑标签';
                btnTags.addEventListener('click', function(e) { e.stopPropagation(); menu.remove(); showTagEditor(asset); });
                menu.appendChild(btnCopy); menu.appendChild(btnTags);
                document.body.appendChild(menu);
                var rect = anchorEl.getBoundingClientRect();
                menu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
                menu.style.top = (rect.bottom + 4) + 'px';
                setTimeout(function() {
                    document.addEventListener('click', function closeMenu() { menu.remove(); document.removeEventListener('click', closeMenu); });
                }, 10);
            }
            // --- cross-project copy ---
            function showProjectSelector(asset) {
                var dialog = document.createElement('div'); dialog.className = 'project-selector-dialog';
                var box = document.createElement('div'); box.className = 'project-selector-box';
                var title = document.createElement('h3'); title.textContent = '选择目标项目'; box.appendChild(title);
                var listDiv = document.createElement('div'); listDiv.innerHTML = '<div class="project-selector-empty">加载中...</div>'; box.appendChild(listDiv);
                var closeBtn = document.createElement('button'); closeBtn.className = 'project-selector-close'; closeBtn.textContent = '取消';
                closeBtn.addEventListener('click', function() { dialog.remove(); });
                box.appendChild(closeBtn); dialog.appendChild(box);
                dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.remove(); });
                document.body.appendChild(dialog);
                fetch('/api/projects', { credentials: 'include' }).then(function(r) { return r.json(); })
                .then(function(data) {
                    listDiv.innerHTML = '';
                    if (!data.ok || !Array.isArray(data.projects) || data.projects.length === 0) {
                        listDiv.innerHTML = '<div class="project-selector-empty">暂无项目，请先创建项目</div>'; return;
                    }
                    data.projects.forEach(function(proj) {
                        var item = document.createElement('div'); item.className = 'project-list-item';
                        var nameSpan = document.createElement('span'); nameSpan.className = 'project-item-name'; nameSpan.textContent = proj.name;
                        var typeSpan = document.createElement('span'); typeSpan.className = 'project-item-type'; typeSpan.textContent = proj.type || '';
                        item.appendChild(nameSpan); item.appendChild(typeSpan);
                        item.addEventListener('click', function() { copyAssetToProject(asset, proj, dialog); });
                        listDiv.appendChild(item);
                    });
                }).catch(function() { listDiv.innerHTML = '<div class="project-selector-empty">加载失败</div>'; });
            }
            function copyAssetToProject(asset, project, dialog) {
                var assetName = asset.name || asset.fileName || '未命名';
                fetchWithCsrf('/api/projects/' + project.id + '/assets', {
                    method: 'POST', body: JSON.stringify({ name: assetName, type: asset.type || 'image', content: asset.dataURL || '' }),
                }).then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.ok) { uiToast('已复制到项目: ' + project.name, 'success'); if (dialog) dialog.remove(); }
                    else { uiToast('复制失败: ' + (data.error || '未知错误'), 'warn'); }
                }).catch(function(e) { uiToast('复制失败: ' + (e.message || '网络错误'), 'warn'); });
            }
            // --- tag editor ---
            function showTagEditor(asset) {
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
                    tagInputWrap.querySelectorAll('.tag-chip').forEach(function(c) { c.remove(); });
                    currentTags.forEach(function(tag, tidx) {
                        var chip = document.createElement('span'); chip.className = 'tag-chip'; chip.textContent = tag;
                        var removeBtn = document.createElement('span'); removeBtn.className = 'tag-remove'; removeBtn.textContent = '\u00d7';
                        removeBtn.addEventListener('click', function() { currentTags.splice(tidx, 1); renderTagChips(); });
                        chip.appendChild(removeBtn); tagInputWrap.insertBefore(chip, input);
                    });
                }
                function showAutocomplete(query) {
                    var allTags = getAllTags().filter(function(t) { return currentTags.indexOf(t) === -1 && t.toLowerCase().indexOf(query.toLowerCase()) !== -1; });
                    autocomplete.innerHTML = '';
                    if (allTags.length === 0 || !query) { autocomplete.classList.remove('is-open'); return; }
                    allTags.slice(0, 8).forEach(function(tag) {
                        var btn = document.createElement('button'); btn.className = 'tag-autocomplete-item'; btn.textContent = tag;
                        btn.addEventListener('click', function() {
                            if (currentTags.indexOf(tag) === -1) currentTags.push(tag);
                            input.value = ''; autocomplete.classList.remove('is-open'); renderTagChips();
                        });
                        autocomplete.appendChild(btn);
                    });
                    autocomplete.classList.add('is-open'); autocomplete.style.left = '0'; autocomplete.style.bottom = '100%';
                }
                input.addEventListener('input', function() { showAutocomplete(input.value); });
                input.addEventListener('keydown', function(e) {
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
                saveBtn.addEventListener('click', function() { saveAssetTags(asset, currentTags); modalRoot.style.display = 'none'; modalRoot.innerHTML = ''; });
                var cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = '取消';
                cancelBtn.addEventListener('click', function() { modalRoot.style.display = 'none'; modalRoot.innerHTML = ''; });
                actionsDiv.appendChild(cancelBtn); actionsDiv.appendChild(saveBtn); box.appendChild(actionsDiv);
                modal.appendChild(box); modalRoot.appendChild(modal); modalRoot.style.display = 'block';
                modal.addEventListener('click', function(e) { if (e.target === modal) { modalRoot.style.display = 'none'; modalRoot.innerHTML = ''; } });
            }
            function saveAssetTags(asset, newTags) {
                var existingTags = {};
                try { existingTags = JSON.parse(asset._rawTags || '{}'); } catch(_) {}
                existingTags.customTags = newTags;
                fetchWithCsrf('/api/asset-library/' + encodeURIComponent(asset.id), {
                    method: 'PUT', body: JSON.stringify({ tags: JSON.stringify(existingTags) }),
                }).then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.ok) { asset.tags = newTags; renderAssets(); uiToast('标签已保存', 'success'); }
                    else { uiToast('保存失败', 'warn'); }
                }).catch(function() { uiToast('保存失败', 'warn'); });
            }
            // --- URL import ---
            var btnUrlImport = document.getElementById('btnUrlImport');
            if (btnUrlImport) { btnUrlImport.addEventListener('click', function() { showUrlImportDialog(); }); }
            function showUrlImportDialog() {
                var dialog = document.createElement('div'); dialog.className = 'url-import-dialog';
                var box = document.createElement('div'); box.className = 'url-import-box';
                var title = document.createElement('h3'); title.textContent = '从 URL 导入图片'; box.appendChild(title);
                var urlField = document.createElement('input'); urlField.type = 'text'; urlField.className = 'url-field'; urlField.placeholder = '输入图片 URL (http/https)...';
                box.appendChild(urlField);
                var preview = document.createElement('div'); preview.className = 'url-preview-area';
                preview.innerHTML = '<div class="preview-placeholder">输入 URL 后预览图片</div>';
                box.appendChild(preview);
                var loadingDiv = document.createElement('div'); loadingDiv.className = 'url-import-loading'; loadingDiv.style.display = 'none';
                loadingDiv.innerHTML = '<div class="spinner"></div> 加载中...';
                box.appendChild(loadingDiv);
                var actionsDiv = document.createElement('div'); actionsDiv.className = 'url-import-actions';
                var importBtn = document.createElement('button'); importBtn.className = 'btn btn-primary'; importBtn.textContent = '导入'; importBtn.disabled = true; importBtn.style.opacity = '0.5';
                var cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = '取消'; cancelBtn.addEventListener('click', function() { dialog.remove(); });
                actionsDiv.appendChild(cancelBtn); actionsDiv.appendChild(importBtn); box.appendChild(actionsDiv);
                dialog.appendChild(box); dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.remove(); });
                document.body.appendChild(dialog);
                var previewDataUrl = null; var debounceTimer = null;
                urlField.addEventListener('input', function() {
                    clearTimeout(debounceTimer); var url = urlField.value.trim();
                    if (!url) { preview.innerHTML = '<div class="preview-placeholder">输入 URL 后预览图片</div>'; importBtn.disabled = true; importBtn.style.opacity = '0.5'; previewDataUrl = null; return; }
                    try { var parsed = new URL(url); if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') { preview.innerHTML = '<div class="preview-placeholder">仅支持 http/https 协议</div>'; return; } }
                    catch(e) { preview.innerHTML = '<div class="preview-placeholder">无效的 URL</div>'; return; }
                    debounceTimer = setTimeout(function() {
                        loadingDiv.style.display = 'flex'; preview.innerHTML = '';
                        var proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(url);
                        fetch(proxyUrl, { credentials: 'include' })
                        .then(function(r) { if (!r.ok) throw new Error('图片加载失败'); return r.blob(); })
                        .then(function(blob) { return new Promise(function(resolve, reject) { var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(blob); }); })
                        .then(function(dataUrl) {
                            previewDataUrl = dataUrl; preview.innerHTML = '';
                            var img = document.createElement('img'); img.src = dataUrl; preview.appendChild(img);
                            importBtn.disabled = false; importBtn.style.opacity = '1'; loadingDiv.style.display = 'none';
                        })
                        .catch(function(err) {
                            preview.innerHTML = '<div class="preview-placeholder">加载失败: ' + escapeHtml(err.message) + '</div>';
                            loadingDiv.style.display = 'none'; previewDataUrl = null; importBtn.disabled = true; importBtn.style.opacity = '0.5';
                        });
                    }, 500);
                });
                importBtn.addEventListener('click', function() {
                    if (!previewDataUrl) return;
                    importBtn.disabled = true; importBtn.textContent = '导入中...';
                    var cat = (typeof uploadCategoryEl !== 'undefined' && uploadCategoryEl) ? uploadCategoryEl.value : '其他';
                    var fileName = 'url_import_' + Date.now();
                    var item = { id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), name: fileName, fileName: fileName, category: cat, type: 'image', dataURL: previewDataUrl, favorite: false, tags: [], createdAt: Date.now() };
                    persistAssetItem(item).then(function(ok) {
                        if (ok) { uiToast('URL 图片导入成功', 'success'); dialog.remove(); }
                        else { uiToast('导入失败', 'warn'); importBtn.disabled = false; importBtn.textContent = '导入'; }
                    });
                });
            }

            // --- 相似度检测 ---
            var btnFindSimilar = document.getElementById('btnFindSimilar');
            if (btnFindSimilar) {
                btnFindSimilar.addEventListener('click', function() { findSimilarAssets(); });
            }

            function perceptualHash(dataUrl) {
                return new Promise(function(resolve) {
                    var img = new Image();
                    img.onload = function() {
                        var canvas = document.createElement('canvas');
                        canvas.width = 8; canvas.height = 8;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, 8, 8);
                        var data = ctx.getImageData(0, 0, 8, 8).data;
                        var gray = [];
                        for (var i = 0; i < data.length; i += 4) {
                            gray.push(data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                        }
                        var avg = gray.reduce(function(a,b) { return a+b; }, 0) / gray.length;
                        var hash = gray.map(function(g) { return g > avg ? 1 : 0; }).join('');
                        resolve(hash);
                    };
                    img.onerror = function() { resolve(null); };
                    img.src = dataUrl;
                });
            }

            function hammingDistance(h1, h2) {
                if (!h1 || !h2 || h1.length !== h2.length) return 999;
                var dist = 0;
                for (var i = 0; i < h1.length; i++) {
                    if (h1[i] !== h2[i]) dist++;
                }
                return dist;
            }

            async function findSimilarAssets() {
                var imageAssets = assets.filter(function(a) { return a.type && a.type.startsWith('image') && a.dataURL; });
                if (imageAssets.length < 2) { uiToast('至少需要 2 张图片素材才能检测相似度', 'warn'); return; }

                btnFindSimilar.disabled = true;
                btnFindSimilar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';

                var hashes = [];
                for (var i = 0; i < imageAssets.length; i++) {
                    var h = await perceptualHash(imageAssets[i].dataURL);
                    hashes.push({ asset: imageAssets[i], hash: h });
                }

                var groups = [];
                var used = new Set();
                for (var i = 0; i < hashes.length; i++) {
                    if (used.has(i) || !hashes[i].hash) continue;
                    var group = [hashes[i]];
                    used.add(i);
                    for (var j = i + 1; j < hashes.length; j++) {
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

                if (groups.length === 0) { uiToast('未发现相似素材', 'success'); return; }
                showSimilarResults(groups);
            }

            function showSimilarResults(groups) {
                var dialog = document.createElement('div');
                dialog.style.cssText = 'position:fixed;inset:0;background:rgba(2,8,20,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
                var box = document.createElement('div');
                box.style.cssText = 'width:min(900px,95vw);max-height:85vh;overflow:auto;background:linear-gradient(165deg,#121a2e 0%,#0c1220 100%);border:1px solid rgba(0,240,255,0.2);border-radius:16px;padding:24px;color:#e8ecf4;font-family:"Rajdhani","Segoe UI",sans-serif;';
                var totalSimilar = groups.reduce(function(s,g) { return s + g.length; }, 0);
                box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0;font-family:Orbitron,sans-serif;color:#00f0ff;font-size:16px;letter-spacing:1px">发现 ' + groups.length + ' 组相似素材（共 ' + totalSimilar + ' 张）</h3><button class="close-similar" style="background:none;border:none;color:#b0b0c0;font-size:20px;cursor:pointer">×</button></div>';
                var content = document.createElement('div');
                groups.forEach(function(group, gi) {
                    var groupDiv = document.createElement('div');
                    groupDiv.style.cssText = 'margin-bottom:20px;padding:16px;background:rgba(0,240,255,0.03);border:1px solid rgba(0,240,255,0.1);border-radius:12px;';
                    var titleDiv = document.createElement('div');
                    titleDiv.style.cssText = 'font-size:13px;color:#00f0ff;margin-bottom:12px;font-weight:600;';
                    titleDiv.textContent = '第 ' + (gi+1) + ' 组（' + group.length + ' 张相似）';
                    groupDiv.appendChild(titleDiv);
                    var grid = document.createElement('div');
                    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;';
                    group.forEach(function(item) {
                        var card = document.createElement('div');
                        card.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);';
                        var img = document.createElement('img');
                        img.src = item.asset.dataURL || '';
                        img.style.cssText = 'width:100%;height:100px;object-fit:cover;display:block';
                        img.alt = item.asset.name || '';
                        card.appendChild(img);
                        var nameDiv = document.createElement('div');
                        nameDiv.style.cssText = 'padding:6px;font-size:11px;color:#b0b0c0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
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
                box.querySelector('.close-similar').addEventListener('click', function() { dialog.remove(); });
                dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.remove(); });
            }

            searchEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    renderAssets();
                }
            });
