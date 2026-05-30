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
                if (window.TechUI && typeof window.TechUI.confirm === 'function') {
                    return window.TechUI.confirm(message, title || '请确认', '确定', '取消');
                }
                return Promise.resolve(confirm(message));
            }

            function uiPrompt(title, label, value) {
                if (window.TechUI && typeof window.TechUI.prompt === 'function') {
                    return window.TechUI.prompt(title, label, value || '', '确定', '取消');
                }
                return Promise.resolve(prompt(label, value || ''));
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
            // 导航元素引用已移除，因为现在使用与dashboard.html一致的导航结构

            // 运行初始化
            let categories = [];
            let assets = [];

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
                    console.warn('保存分类失败', e);
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

            function renderAssets() {
                const q = (searchEl.value || '').trim().toLowerCase();
                const cat = categoryFilterEl.value;
                const filtered = assets.filter((a) => {
                    if (cat !== 'all' && a.category !== cat) return false;
                    if (!q) return true;
                    return (a.name || '').toLowerCase().includes(q) || (a.fileName || '').toLowerCase().includes(q);
                });
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
                        const newWindow = window.open();
                        newWindow.document.write(`
            <html>
              <head><title>${fileName}</title></head>
              <body style="margin:0; padding:20px; text-align:center; background:#1a1a2e; color:#e0e0e0;">
                <img src="${a.dataURL}" style="max-width:100%; max-height:80vh; border-radius:8px;" alt="${fileName}">
                <p style="margin-top:20px;">右键点击图片选择"另存为"来保存文件</p>
                <button onclick="window.close()" style="padding:10px 20px; background:#00f0ff; color:#1a1a2e; border:none; border-radius:5px; cursor:pointer;">关闭</button>
              </body>
            </html>
          `);
                        return;
                    }

                    // 方法2：使用fetch + blob下载（适用于所有文件类型）
                    fetch(a.dataURL)
                        .then((response) => response.blob())
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
                        tags: JSON.stringify({ category: item.category || '其他', fileName: item.fileName || '' }),
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
                const MAX_NON_IMAGE_FILE_SIZE = 2.5 * 1024 * 1024;
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
                    console.warn('上传失败详情:\n' + failMessages.join('\n'));
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

            btnChoose.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

            // 搜索与筛选
            searchEl.addEventListener('input', () => renderAssets());
            categoryFilterEl.addEventListener('change', () => renderAssets());

            btnAddCategory.addEventListener('click', async () => {
                const v = await uiPrompt('新增分类', '输入新分类名称：', '');
                if (v && v.trim()) {
                    categories.unshift(v.trim());
                    populateCategorySelectors();
                    saveState();
                }
            });

            btnClearAll.addEventListener('click', async () => {
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

            // 工具：转义 HTML
            function escapeHtml(s) {
                return (s + '').replace(/[&<>"']/g, function (m) {
                    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
                });
            }

            // Convert database item to frontend format
            function dbItemToFrontend(item) {
                let category = '其他';
                let fileName = item.desc || '';
                try {
                    const tagsObj = JSON.parse(item.tags || '{}');
                    if (tagsObj.category) category = tagsObj.category;
                    if (tagsObj.fileName) fileName = tagsObj.fileName;
                } catch (_) {}
                return {
                    id: item.id,
                    name: item.name || '',
                    fileName: fileName,
                    category: category,
                    type: item.type || 'image',
                    dataURL: item.content || '',
                    source: item.source || '',
                    createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
                };
            }

            // Load assets from server API
            async function loadAssetsFromServer() {
                try {
                    const resp = await fetch('/api/asset-library', { credentials: 'include' });
                    if (resp.status === 401) {
                        window.location.href = '../../login.html';
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
                // 兼容历史未分用户键：首次进入分用户键时自动合并一次，避免“显示成功但看不到”
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
            searchEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    renderAssets();
                }
            });
