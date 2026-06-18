/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * 素材库 - 上传和导入逻辑
 * 从 asset-library.js 拆分，通过 AssetLibraryUpload 暴露
 */
(function () {
    'use strict';

    // ── 依赖注入（由 asset-library.js init 时调用 setDeps 传入） ──
    let assets = null;
    let persistAssetItem = null;
    let uiToast = null;
    let escapeHtml = null;

    function setDeps(deps) {
        assets = deps.assets;
        persistAssetItem = deps.persistAssetItem;
        uiToast = deps.uiToast;
        escapeHtml = deps.escapeHtml;
    }

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
            quality: options.quality === null ? 0.82 : options.quality,
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
        const uploadCategoryEl = document.getElementById('uploadCategory');
        const defaultNameEl = document.getElementById('defaultName');
        const fileInput = document.getElementById('fileInput');
        const cat = uploadCategoryEl ? uploadCategoryEl.value : '其他';
        const defaultNameVal = defaultNameEl && defaultNameEl.value ? defaultNameEl.value.trim() : '';
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
        if (defaultNameEl) defaultNameEl.value = '';
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

    // ── 初始化：绑定拖放和文件选择事件 ──
    function init() {
        const uploadArea = document.getElementById('uploadArea');
        const btnChoose = document.getElementById('btnChoose');
        const fileInput = document.getElementById('fileInput');

        // 拖放上传
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                handleFiles(e.dataTransfer.files);
            });
        }

        if (btnChoose && fileInput) {
            btnChoose.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (_e) => handleFiles(_e.target.files));
        }

        // URL 导入按钮
        const btnUrlImport = document.getElementById('btnUrlImport');
        if (btnUrlImport) {
            btnUrlImport.addEventListener('click', function () { showUrlImportDialog(); });
        }
    }

    // ── URL 导入对话框 ──
    function showUrlImportDialog() {
        const dialog = document.createElement('div'); dialog.className = 'url-import-dialog';
        const box = document.createElement('div'); box.className = 'url-import-box';
        const title = document.createElement('h3'); title.textContent = '从 URL 导入图片'; box.appendChild(title);
        const urlField = document.createElement('input'); urlField.type = 'text'; urlField.className = 'url-field'; urlField.placeholder = '输入图片 URL (http/https)...';
        box.appendChild(urlField);
        const preview = document.createElement('div'); preview.className = 'url-preview-area';
        preview.innerHTML = '<div class="preview-placeholder">输入 URL 后预览图片</div>';
        box.appendChild(preview);
        const loadingDiv = document.createElement('div'); loadingDiv.className = 'url-import-loading'; loadingDiv.style.display = 'none';
        loadingDiv.innerHTML = '<div class="spinner"></div> 加载中...';
        box.appendChild(loadingDiv);
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'url-import-actions';
        const importBtn = document.createElement('button'); importBtn.className = 'btn btn-primary'; importBtn.textContent = '导入'; importBtn.disabled = true; importBtn.style.opacity = '0.5';
        const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = '取消'; cancelBtn.addEventListener('click', function() { dialog.remove(); });
        actionsDiv.appendChild(cancelBtn); actionsDiv.appendChild(importBtn); box.appendChild(actionsDiv);
        dialog.appendChild(box); dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.remove(); });
        document.body.appendChild(dialog);
        let previewDataUrl = null; let debounceTimer = null;
        urlField.addEventListener('input', function() {
            clearTimeout(debounceTimer); const url = urlField.value.trim();
            if (!url) { preview.innerHTML = '<div class="preview-placeholder">输入 URL 后预览图片</div>'; importBtn.disabled = true; importBtn.style.opacity = '0.5'; previewDataUrl = null; return; }
            try { const parsed = new URL(url); if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') { preview.innerHTML = '<div class="preview-placeholder">仅支持 http/https 协议</div>'; return; } }
            catch (_e) { preview.innerHTML = '<div class="preview-placeholder">无效的 URL</div>'; return; }
            debounceTimer = setTimeout(function() {
                loadingDiv.style.display = 'flex'; preview.innerHTML = '';
                const proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(url);
                fetch(proxyUrl, { credentials: 'include' })
                .then(function(r) { if (!r.ok) throw new Error('图片加载失败'); return r.blob(); })
                .then(function(blob) { return new Promise(function(resolve, reject) { const reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(blob); }); })
                .then(function(dataUrl) {
                    previewDataUrl = dataUrl; preview.innerHTML = '';
                    const img = document.createElement('img'); img.src = dataUrl; preview.appendChild(img);
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
            const uploadCategoryEl = document.getElementById('uploadCategory');
            const cat = uploadCategoryEl ? uploadCategoryEl.value : '其他';
            const fileName = 'url_import_' + Date.now();
            const item = { id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), name: fileName, fileName: fileName, category: cat, type: 'image', dataURL: previewDataUrl, favorite: false, tags: [], createdAt: Date.now() };
            persistAssetItem(item).then(function(ok) {
                if (ok) { uiToast('URL 图片导入成功', 'success'); dialog.remove(); }
                else { uiToast('导入失败', 'warn'); importBtn.disabled = false; importBtn.textContent = '导入'; }
            });
        });
    }

    // ── 导出 ──
    window.AssetLibraryUpload = {
        setDeps: setDeps,
        init: init,
        handleFiles: handleFiles,
        addAssetFromFile: addAssetFromFile,
        showUrlImportDialog: showUrlImportDialog,
    };
})();
