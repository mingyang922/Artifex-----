/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * 素材库 - 渲染和 UI
 * 从 asset-library.js 拆分，通过 AssetLibraryRender 暴露
 */
(function () {
    'use strict';

    // ── 依赖注入（由 asset-library.js init 时调用 setDeps 传入） ──
    let assetGrid = null;
    let noAssets = null;
    let modalRoot = null;
    let assets = null;
    let selectedAssets = null;
    let categories = null;
    let filterAssets = null;
    let uiToast = null;
    let uiConfirm = null;
    let fetchWithCsrf = null;
    let saveState = null;
    let dbItemToFrontend = null;
    let initTechSelects = null;

    function setDeps(deps) {
        assetGrid = deps.assetGrid;
        noAssets = deps.noAssets;
        modalRoot = deps.modalRoot;
        assets = deps.assets;
        selectedAssets = deps.selectedAssets;
        categories = deps.categories;
        filterAssets = deps.filterAssets;
        uiToast = deps.uiToast;
        uiConfirm = deps.uiConfirm;
        fetchWithCsrf = deps.fetchWithCsrf;
        saveState = deps.saveState;
        dbItemToFrontend = deps.dbItemToFrontend;
        initTechSelects = deps.initTechSelects;
    }

    function renderAssetsBase() {
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
            renderAssetsBase();
        } catch (_e) {
            console.error('删除素材失败', e);
            uiToast('删除失败：' + (e.message || '请重试'), 'warn');
        }
    }

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
            } catch (_e) {
                console.error('批量删除素材失败', id, e);
            }
        }
        selectedAssets.clear();
        renderAssetsBase();
        updateBatchBar();
        if (deleted > 0) {
            uiToast('已删除 ' + deleted + ' 个素材', 'success');
        }
    }

    // 绑定批量操作按钮
    function bindBatchActions() {
        const btnSelectAll = document.getElementById('btnSelectAll');
        const btnDeselectAll = document.getElementById('btnDeselectAll');
        const btnExportMenu = document.getElementById('btnExportMenu');
        const exportMenu = document.getElementById('exportMenu');
        const btnBatchDelete = document.getElementById('btnBatchDelete');

        if (btnSelectAll) {
            btnSelectAll.addEventListener('click', () => {
                assets.forEach((a) => selectedAssets.add(a.id));
                renderAssetsBase();
                updateBatchBar();
            });
        }
        if (btnDeselectAll) {
            btnDeselectAll.addEventListener('click', () => {
                selectedAssets.clear();
                renderAssetsBase();
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
    }

    // ── 辅助：加载图片 ──
    function loadImageFromDataURL(dataURL) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = dataURL;
        });
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
        } catch (_e) {
            console.error('导出失败:', e);
            uiToast('导出失败: ' + (e.message || '未知错误'), 'warn');
        }
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
            const _w = img.naturalWidth;
            const _h = img.naturalHeight;
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

    // ── 填充分类下拉选项 ──
    function populateCategorySelectors() {
        const categoryFilterEl = document.getElementById('categoryFilter');
        const uploadCategoryEl = document.getElementById('uploadCategory');
        // 筛选器
        categoryFilterEl.innerHTML =
            '<option value="all">全部分类</option>' +
            categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        uploadCategoryEl.innerHTML = categories
            .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
            .join('');
        if (initTechSelects) initTechSelects();
    }

    // ── 基础筛选代理 ──
    function filterAssetsBase() {
        const categoryFilterEl = document.getElementById('categoryFilter');
        const assetSearchEl = document.getElementById('assetSearch');
        const typeFilterEl = document.getElementById('typeFilter');
        const sortOrderEl = document.getElementById('sortOrder');
        // 委托给 AssetLibraryFilter 模块
        if (window.AssetLibraryFilter && typeof window.AssetLibraryFilter.filterAssets === 'function') {
            return window.AssetLibraryFilter.filterAssets(assets, {
                searchEl: assetSearchEl,
                categoryFilterEl: categoryFilterEl,
                typeFilterEl: typeFilterEl,
                sortOrderEl: sortOrderEl,
                tagFilter: null, // tag filter applied in main file override
            });
        }
        // 回退：简单返回所有资产
        return assets;
    }

    // ── 初始化（由 asset-library.js 调用） ──
    function init() {
        bindBatchActions();
    }

    // ── 导出 ──
    window.AssetLibraryRender = {
        setDeps: setDeps,
        init: init,
        renderAssetsBase: renderAssetsBase,
        openPreview: openPreview,
        downloadAsset: downloadAsset,
        deleteAsset: deleteAsset,
        updateBatchBar: updateBatchBar,
        batchDeleteAssets: batchDeleteAssets,
        handleExport: handleExport,
        populateCategorySelectors: populateCategorySelectors,
        filterAssetsBase: filterAssetsBase,
    };
})();
