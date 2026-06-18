/**
 * Artifex - Image Storage and Persistence Module
 * Extracted from ImageGenerator for modularity
 */
'use strict';
(function () {
    'use strict';

    let _gen = null;

    function init(gen) {
        _gen = gen;
    }

    function getGeneratorUiStateKey() {
        return aiStorageKey('generator_ui_state_v1');
    }

    function pruneGeneratedImages() {
        const before = Array.isArray(_gen.generatedImages) ? _gen.generatedImages.length : 0;
        _gen.generatedImages = (Array.isArray(_gen.generatedImages) ? _gen.generatedImages : []).filter(function (image) {
            return image && image.id && image.name && _gen.isRenderableImageUrl(image.imageUrl);
        });
        if (_gen.generatedImages.length !== before) {
            localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(_gen.generatedImages));
        }
    }

    function persistGeneratorUiState() {
        try {
            const state = {
                imageType: document.getElementById('imageType')?.value || '',
                style: document.getElementById('imageStyle')?.value || '',
                colorScheme: document.getElementById('imageColorScheme')?.value || '',
                imageSize: document.getElementById('imageSize')?.value || '',
                apiProvider: document.getElementById('apiProvider')?.value || '',
                description: document.getElementById('imageDescription')?.value || '',
                imageMode: document.querySelector('input[name="imageMode"]:checked')?.value || 'text2img',
                promptMode: document.querySelector('input[name="promptMode"]:checked')?.value || 'custom',
                wanxModel: document.getElementById('wanxModelSelect')?.value || '',
                qwenModel: document.getElementById('qwenModelSelect')?.value || '',
                strength: document.getElementById('img2imgStrength')?.value || '',
                proPrompt: document.getElementById('proPromptTextarea')?.value || '',
                sketchBase64: _gen.sketchBase64 || '',
                stStrength: document.getElementById('stStrength')?.value || '',
                styleTransferContentBase64: _gen.styleTransferContentBase64 || '',
                styleTransferRefBase64: _gen.styleTransferRefBase64 || '',
                upscaleBase64: _gen.upscaleBase64 || '',
                removeBgBase64: _gen.removeBgBase64 || '',
                upscaleFactor: document.getElementById('upscaleFactor')?.value || '2',
            };
            sessionStorage.setItem(getGeneratorUiStateKey(), JSON.stringify(state));
        } catch (_e) {
            console.warn('保存 AI 生成器状态失败:', _e);
        }
    }

    function restoreGeneratorUiState() {
        let state = null;
        try {
            const raw = sessionStorage.getItem(getGeneratorUiStateKey());
            state = raw ? JSON.parse(raw) : null;
        } catch (_e) {
            state = null;
        }
        if (!state) return;

        const setValue = function (id, value) {
            const el = document.getElementById(id);
            if (el && value !== undefined && value !== null && value !== '') {
                el.value = value;
            }
        };

        setValue('imageType', state.imageType);
        setValue('imageStyle', state.style);
        setValue('imageColorScheme', state.colorScheme);
        setValue('imageSize', state.imageSize);
        setValue('apiProvider', state.apiProvider);
        setValue('imageDescription', state.description);
        setValue('wanxModelSelect', state.wanxModel);
        setValue('qwenModelSelect', state.qwenModel);
        setValue('img2imgStrength', state.strength);
        setValue('proPromptTextarea', state.proPrompt);
        setValue('stStrength', state.stStrength);

        const imageModeEl = document.querySelector('input[name="imageMode"][value="' + CSS.escape(state.imageMode || 'text2img') + '"]');
        if (imageModeEl) imageModeEl.checked = true;
        const promptModeEl = document.querySelector(
            'input[name="promptMode"][value="' + CSS.escape(state.promptMode || 'custom') + '"]'
        );
        if (promptModeEl) promptModeEl.checked = true;
        const apiProviderEl = document.getElementById('apiProvider');
        if (apiProviderEl && state.apiProvider) {
            apiProviderEl.value = state.apiProvider;
            apiProviderEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (promptModeEl) {
            promptModeEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (imageModeEl) {
            imageModeEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const img2imgZone = document.getElementById('img2imgZone');
        if (img2imgZone) {
            img2imgZone.style.display = (state.imageMode || 'text2img') === 'img2img' ? 'block' : 'none';
        }
        const stZone = document.getElementById('styleTransferZone');
        if (stZone) {
            stZone.style.display = (state.imageMode || 'text2img') === 'styleTransfer' ? 'block' : 'none';
        }
        const upZone = document.getElementById('upscaleZone');
        if (upZone) {
            upZone.style.display = (state.imageMode || 'text2img') === 'upscale' ? 'block' : 'none';
        }
        const rbZone = document.getElementById('removeBgZone');
        if (rbZone) {
            rbZone.style.display = (state.imageMode || 'text2img') === 'removeBg' ? 'block' : 'none';
        }
        setValue('upscaleFactor', state.upscaleFactor);

        // 风格迁移图片预览恢复
        if (state.styleTransferContentBase64) {
            _gen.styleTransferContentBase64 = state.styleTransferContentBase64;
            const preview = document.getElementById('stContentPreview');
            if (preview) {
                preview.innerHTML = '';
                const _img = document.createElement('img');
                _img.src = _gen.styleTransferContentBase64;
                _img.alt = '内容图预览';
                preview.appendChild(_img);
            }
        }
        if (state.styleTransferRefBase64) {
            _gen.styleTransferRefBase64 = state.styleTransferRefBase64;
            const preview2 = document.getElementById('stRefPreview');
            if (preview2) {
                preview2.innerHTML = '';
                const _img2 = document.createElement('img');
                _img2.src = _gen.styleTransferRefBase64;
                _img2.alt = '风格参考图预览';
                preview2.appendChild(_img2);
            }
        }
        if (state.upscaleBase64) {
            _gen.upscaleBase64 = state.upscaleBase64;
            const preview3 = document.getElementById('upscalePreview');
            if (preview3) {
                preview3.innerHTML = '';
                const _img3 = document.createElement('img');
                _img3.src = _gen.upscaleBase64;
                _img3.alt = '放大源图预览';
                preview3.appendChild(_img3);
            }
        }
        if (state.removeBgBase64) {
            _gen.removeBgBase64 = state.removeBgBase64;
            const preview4 = document.getElementById('removeBgPreview');
            if (preview4) {
                preview4.innerHTML = '';
                const _img4 = document.createElement('img');
                _img4.src = _gen.removeBgBase64;
                _img4.alt = '背景去除源图预览';
                preview4.appendChild(_img4);
            }
        }

        const qwenModelEl = document.getElementById('qwenModelSelect');
        if (qwenModelEl) {
            const wrapper = qwenModelEl.nextElementSibling;
            if (wrapper && wrapper.classList.contains('tech-select')) {
                wrapper.style.display = (state.promptMode || 'custom') === 'professional' ? '' : 'none';
            }
        }

        const wanxModelEl = document.getElementById('wanxModelSelect');
        if (wanxModelEl) {
            const wrapper2 = wanxModelEl.nextElementSibling;
            if (wrapper2 && wrapper2.classList.contains('tech-select')) {
                wrapper2.style.display = (state.apiProvider || '') === 'alibaba' ? '' : 'none';
            }
        }

        if (state.sketchBase64) {
            _gen.sketchBase64 = state.sketchBase64;
            const preview5 = document.getElementById('sketchPreview');
            if (preview5) {
                preview5.innerHTML = ''; var _img5 = document.createElement('img'); _img5.src = _gen.sketchBase64; _img5.alt = '线稿预览'; preview5.appendChild(_img5);
            }
        }
    }

    function saveImage(image) {
        if (!image || !_gen.isRenderableImageUrl(image.imageUrl)) {
            console.debug('[image-generator] 跳过保存无效图片:', image);
            return false;
        }
        _gen.generatedImages.unshift(image);
        const maxImages = (window.ArtifexConstants && window.ArtifexConstants.GENERATED_IMAGES_MAX) || 15;
        if (_gen.generatedImages.length > maxImages) {
            _gen.generatedImages = _gen.generatedImages.slice(0, maxImages);
        }
        localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(_gen.generatedImages));
        _gen.renderImages();
        return true;
    }

    function deleteImage(imageId) {
        (async function () {
            const ok = await window.TechUI.confirm('确定要删除这张图片吗？', '删除图片', '删除', '取消');
            if (!ok) return;
            _gen.generatedImages = _gen.generatedImages.filter(function (i) { return i.id !== imageId; });
            localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(_gen.generatedImages));
            _gen.renderImages();
        })();
    }

    function getCurrentProjectContext() {
        try {
            const raw = localStorage.getItem(aiStorageKey('currentProjectContext'));
            return raw ? JSON.parse(raw) : null;
        } catch (_e) {
            return null;
        }
    }

    function buildAssetLibraryItemFromImage(image) {
        return {
            id: 'ai_img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: image.name || 'AI图片',
            fileName: (image.name || 'ai-image').replace(/[\\/:*?"<>|]/g, '_') + '.png',
            category: 'AI生成',
            type: 'image/png',
            dataURL: image.imageUrl,
            favorite: false,
            createdAt: Date.now(),
            source: 'ai-generate',
        };
    }

    async function saveToAssetLibrary(imageId) {
        const image = _gen.generatedImages.find(function (i) { return i.id === imageId; });
        if (!image) {
            themedWarn('未找到要保存的图片');
            return;
        }
        try {
            const fileName = (image.name || 'ai-image').replace(/[\\/:*?"<>|]/g, '_') + '.png';
            const body = {
                name: image.name || 'AI图片',
                type: 'image/png',
                content: image.imageUrl || '',
                desc: fileName,
                source: 'ai-generate',
                tags: JSON.stringify({ category: 'AI生成', fileName: fileName }),
            };
            const resp = await fetchWithCsrf('/api/asset-library', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(function () { return {}; });
                throw new Error(err.error || '保存失败');
            }
            themedSuccess('图片已保存到素材库');
        } catch (e) {
            console.error('保存到素材库失败', e);
            // Fallback to localStorage
            try {
                let state = { categories: [], assets: [] };
                const raw = localStorage.getItem(aiStorageKey('assetLibrary_v1'));
                state = raw ? JSON.parse(raw) : state;
                state.categories = Array.isArray(state.categories) ? state.categories : [];
                state.assets = Array.isArray(state.assets) ? state.assets : [];
                if (!state.categories.includes('AI生成')) {
                    state.categories.unshift('AI生成');
                }
                state.assets.unshift(buildAssetLibraryItemFromImage(image));
                localStorage.setItem(aiStorageKey('assetLibrary_v1'), JSON.stringify(state));
                themedSuccess('图片已保存到素材库（本地备份）');
            } catch (_fallbackErr) {
                themedWarn('保存失败：' + (e.message || '请重试'));
            }
        }
    }

    function saveToCurrentProject(imageOrId, options) {
        options = options || {};
        const image = typeof imageOrId === 'string' ? _gen.generatedImages.find(function (i) { return i.id === imageOrId; }) : imageOrId;
        if (!image) {
            themedWarn('未找到要加入项目的图片');
            return;
        }
        const context = getCurrentProjectContext();
        if (!context || !context.id) {
            themedWarn('未检测到当前项目，请从项目详情页进入 AI 生成');
            return;
        }
        let projects = [];
        try {
            projects = JSON.parse(localStorage.getItem(aiStorageKey('gameui-projects'))) || [];
        } catch (_e) {
            projects = [];
        }
        const idx = projects.findIndex(function (p) { return p.id === context.id; });
        if (idx === -1) {
            themedWarn('当前项目不存在，可能已被删除');
            return;
        }
        const project = projects[idx];
        if (!Array.isArray(project.assets)) {
            project.assets = [];
        }
        const assetPayload = {
            id: Date.now().toString(),
            name: image.name || 'AI生成图片',
            type: 'image',
            content: image.imageUrl,
            desc: image.description || 'AI生成图片',
            createTime: new Date().toISOString(),
            isAIGenerated: true,
            sourceAssetId: image.id,
        };
        const existingIndex = project.assets.findIndex(function (asset) { return asset && asset.sourceAssetId === image.id; });
        if (existingIndex >= 0) {
            project.assets[existingIndex] = assetPayload;
        } else {
            project.assets.push(assetPayload);
        }
        project.version = (project.version || 1) + 0.1;
        if (!Array.isArray(project.versionHistory)) {
            project.versionHistory = [];
        }
        project.versionHistory.push({
            time: new Date().toISOString(),
            desc: '从AI生成加入图片素材：' + (image.name || 'AI图片'),
        });
        projects[idx] = project;
        localStorage.setItem(aiStorageKey('gameui-projects'), JSON.stringify(projects));
        if (!options.silent) {
            themedSuccess('图片已加入当前项目');
        }
        return true;
    }

    function autoSaveGeneratedImageToCurrentProject(image) {
        const context = getCurrentProjectContext();
        if (!context || !context.id) return false;
        return saveToCurrentProject(image, { silent: true });
    }

    function writeScopedJson(key, data) {
        try {
            localStorage.setItem(aiStorageKey(key), JSON.stringify(data));
        } catch (_) {}
    }

    // Export to window
    window.ImageStorage = {
        init: init,
        writeScopedJson: writeScopedJson,
        getGeneratorUiStateKey: getGeneratorUiStateKey,
        pruneGeneratedImages: pruneGeneratedImages,
        persistGeneratorUiState: persistGeneratorUiState,
        restoreGeneratorUiState: restoreGeneratorUiState,
        saveImage: saveImage,
        deleteImage: deleteImage,
        getCurrentProjectContext: getCurrentProjectContext,
        buildAssetLibraryItemFromImage: buildAssetLibraryItemFromImage,
        saveToAssetLibrary: saveToAssetLibrary,
        saveToCurrentProject: saveToCurrentProject,
        autoSaveGeneratedImageToCurrentProject: autoSaveGeneratedImageToCurrentProject,
    };
})();
