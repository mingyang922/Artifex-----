/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
// ImageGenerator类 - 负责AI图片生成功能
class ImageGenerator {
    // 转义 HTML 特殊字符，防止 XSS
    static escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // 转义 JS 字符串中的特殊字符（用于 onclick 等内联事件处理器）
    static escapeJsStr(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/</g, '\\x3c').replace(/>/g, '\\x3e');
    }

    constructor() {
        this.apiConfig = {
            endpoint: API_BASE + '/api/image-proxy',
        };
        try {
            this.generatedImages = JSON.parse(localStorage.getItem(aiStorageKey('generatedImages')) || '[]');
        } catch (_) {
            this.generatedImages = [];
        }
        this.sketchBase64 = null; // 线稿图 base64（图生图模式用）
        this._styleRefRawDataUrl = null; // 风格提取用参考图 data URL
        this.styleTransferContentBase64 = null; // 风格迁移：内容图 base64
        this.styleTransferRefBase64 = null; // 风格迁移：风格参考图 base64
        this.upscaleBase64 = null; // 图片放大：源图 base64
        this.removeBgBase64 = null; // 背景去除：源图 base64
        this.init();
    }

    init() {
        this.pruneGeneratedImages();
        this.bindEvents();
        this.restoreGeneratorUiState();
        this.renderImages();
        this.updateStylePresetStripStatus();
        this.checkVisionExtractButton().catch(() => {});
    }

    isRenderableImageUrl(url) {
        return typeof url === 'string' && /^(data:|blob:|https?:\/\/)/i.test(url.trim());
    }

    pruneGeneratedImages() {
        const before = Array.isArray(this.generatedImages) ? this.generatedImages.length : 0;
        this.generatedImages = (Array.isArray(this.generatedImages) ? this.generatedImages : []).filter((image) => {
            return image && image.id && image.name && this.isRenderableImageUrl(image.imageUrl);
        });
        if (this.generatedImages.length !== before) {
            localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(this.generatedImages));
        }
    }

    bindEvents() {
        const form = document.getElementById('imageGeneratorForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        // 生成模式切换：显示/隐藏线稿上传区 / 风格迁移区
        document.querySelectorAll('input[name="imageMode"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                const mode = document.querySelector('input[name="imageMode"]:checked').value;
                const zone = document.getElementById('img2imgZone');
                if (zone) zone.style.display = mode === 'img2img' ? 'block' : 'none';
                const stZone = document.getElementById('styleTransferZone');
                if (stZone) stZone.style.display = mode === 'styleTransfer' ? 'block' : 'none';
                const upZone = document.getElementById('upscaleZone');
                if (upZone) upZone.style.display = mode === 'upscale' ? 'block' : 'none';
                const rbZone = document.getElementById('removeBgZone');
                if (rbZone) rbZone.style.display = mode === 'removeBg' ? 'block' : 'none';
                this.persistGeneratorUiState();
            });
        });
        // 线稿文件选择：预览 + 读取 Base64
        const sketchFile = document.getElementById('sketchFile');
        if (sketchFile) {
            sketchFile.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                const preview = document.getElementById('sketchPreview');
                this.sketchBase64 = null;
                if (preview) preview.innerHTML = '';
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.sketchBase64 = reader.result; // data:image/png;base64,xxx
                    if (preview) {
                        preview.innerHTML = ''; const _img = document.createElement('img'); _img.src = this.sketchBase64; _img.alt = '线稿预览'; preview.appendChild(_img);
                    }
                    this.persistGeneratorUiState();
                };
                reader.readAsDataURL(file);
                this.persistGeneratorUiState();
            });
        }
        const handleClipboardPaste = (event) => {
            const items =
                event && event.clipboardData && event.clipboardData.items ? Array.from(event.clipboardData.items) : [];
            const imageItem = items.find((item) => item.kind === 'file' && item.type && item.type.startsWith('image/'));
            if (!imageItem) return false;
            const active = document.activeElement;
            const isTypingTarget =
                active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isTypingTarget && active && active.id !== 'sketchFile') return false;
            const file = imageItem.getAsFile && imageItem.getAsFile();
            if (!file) return false;
            const reader = new FileReader();
            reader.onload = () => {
                this.sketchBase64 = reader.result;
                const preview = document.getElementById('sketchPreview');
                if (preview) {
                    preview.innerHTML = ''; const _img = document.createElement('img'); _img.src = this.sketchBase64; _img.alt = '线稿预览'; preview.appendChild(_img);
                }
                const img2imgRadio = document.querySelector('input[name="imageMode"][value="img2img"]');
                if (img2imgRadio && !img2imgRadio.checked) {
                    img2imgRadio.checked = true;
                    img2imgRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
                this.persistGeneratorUiState();
                themedSuccess('已从剪贴板粘贴线稿图片');
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return true;
        };
        document.addEventListener('paste', (event) => {
            handleClipboardPaste(event);
        });
        // 生成自由度滑块数值显示
        const strengthSlider = document.getElementById('img2imgStrength');
        const strengthValue = document.getElementById('strengthValue');
        if (strengthSlider && strengthValue) {
            strengthSlider.addEventListener('input', () => {
                strengthValue.textContent = strengthSlider.value;
                this.persistGeneratorUiState();
            });
        }

        // 风格迁移：强度滑块数值显示
        const stStrengthSlider = document.getElementById('stStrength');
        const stStrengthValue = document.getElementById('stStrengthValue');
        if (stStrengthSlider && stStrengthValue) {
            stStrengthSlider.addEventListener('input', () => {
                stStrengthValue.textContent = stStrengthSlider.value;
                this.persistGeneratorUiState();
            });
        }

        // 风格迁移：内容图上传
        const stContentFile = document.getElementById('stContentFile');
        if (stContentFile) {
            stContentFile.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                const preview = document.getElementById('stContentPreview');
                this.styleTransferContentBase64 = null;
                if (preview) preview.innerHTML = '';
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.styleTransferContentBase64 = reader.result;
                    if (preview) {
                        preview.innerHTML = '';
                        const _img = document.createElement('img');
                        _img.src = this.styleTransferContentBase64;
                        _img.alt = '内容图预览';
                        preview.appendChild(_img);
                    }
                    this.persistGeneratorUiState();
                };
                reader.readAsDataURL(file);
            });
        }

        // 风格迁移：风格参考图上传
        const stRefFile = document.getElementById('stRefFile');
        if (stRefFile) {
            stRefFile.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                const preview = document.getElementById('stRefPreview');
                this.styleTransferRefBase64 = null;
                if (preview) preview.innerHTML = '';
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.styleTransferRefBase64 = reader.result;
                    if (preview) {
                        preview.innerHTML = '';
                        const _img = document.createElement('img');
                        _img.src = this.styleTransferRefBase64;
                        _img.alt = '风格参考图预览';
                        preview.appendChild(_img);
                    }
                    this.persistGeneratorUiState();
                };
                reader.readAsDataURL(file);
            });
        }

        // 图片放大：源图上传
        const upscaleFile = document.getElementById('upscaleFile');
        if (upscaleFile) {
            upscaleFile.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                const preview = document.getElementById('upscalePreview');
                this.upscaleBase64 = null;
                if (preview) preview.innerHTML = '';
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.upscaleBase64 = reader.result;
                    if (preview) {
                        preview.innerHTML = '';
                        const _img = document.createElement('img');
                        _img.src = this.upscaleBase64;
                        _img.alt = '放大源图预览';
                        preview.appendChild(_img);
                    }
                    this.persistGeneratorUiState();
                };
                reader.readAsDataURL(file);
            });
        }

        // 背景去除：源图上传
        const removeBgFile = document.getElementById('removeBgFile');
        if (removeBgFile) {
            removeBgFile.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                const preview = document.getElementById('removeBgPreview');
                this.removeBgBase64 = null;
                if (preview) preview.innerHTML = '';
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.removeBgBase64 = reader.result;
                    if (preview) {
                        preview.innerHTML = '';
                        const _img = document.createElement('img');
                        _img.src = this.removeBgBase64;
                        _img.alt = '背景去除源图预览';
                        preview.appendChild(_img);
                    }
                    this.persistGeneratorUiState();
                };
                reader.readAsDataURL(file);
            });
        }

        // 工具：同时隐藏/显示原生 select 和自定义 tech-select wrapper
        const toggleSelectVisible = (selectEl, visible) => {
            if (!selectEl) return;
            selectEl.style.display = visible ? '' : 'none';
            const wrapper = selectEl.nextElementSibling;
            if (wrapper && wrapper.classList.contains('tech-select')) {
                wrapper.style.display = visible ? '' : 'none';
            }
        };

        // API 服务商切换 → 联动万相模型选择框 + 即梦尺寸过滤
        const apiProviderEl = document.getElementById('apiProvider');
        const wanxModelEl = document.getElementById('wanxModelSelect');
        const imageSizeEl = document.getElementById('imageSize');
        const jimengMinPixels = (window.ArtifexConstants && window.ArtifexConstants.JIMENG_MIN_PIXELS) || 921600;
        const updateImageSizeForProvider = () => {
            if (!imageSizeEl) return;
            const isJimeng = apiProviderEl && apiProviderEl.value === 'jimeng';
            Array.from(imageSizeEl.options).forEach((opt) => {
                if (!opt.value) return;
                const parts = opt.value.split('x');
                const px = parseInt(parts[0]) * parseInt(parts[1]);
                opt.disabled = isJimeng && px < jimengMinPixels;
                if (opt.disabled && opt.selected) {
                    const first = Array.from(imageSizeEl.options).find((o) => o.value && !o.disabled);
                    if (first) first.selected = true;
                }
            });
        };
        if (apiProviderEl) {
            apiProviderEl.addEventListener('change', () => {
                toggleSelectVisible(wanxModelEl, apiProviderEl.value === 'alibaba');
                updateImageSizeForProvider();
                this.persistGeneratorUiState();
            });
            updateImageSizeForProvider();
        }

        // Prompt 模式切换 → 联动千问模型选择框 + 按钮文字 + 预览区
        const qwenModelEl = document.getElementById('qwenModelSelect');
        const btnText = document.getElementById('imageGenBtnText');
        const proPromptZone = document.getElementById('proPromptPreviewZone');
        document.querySelectorAll('input[name="promptMode"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                const isPro = document.querySelector('input[name="promptMode"]:checked').value === 'professional';
                toggleSelectVisible(qwenModelEl, isPro);
                if (btnText) btnText.textContent = isPro ? '生成专业 Prompt' : '开始生成图片';
                if (proPromptZone) {
                    proPromptZone.style.display = isPro ? 'block' : 'none';
                    if (!isPro) document.getElementById('proPromptTextarea').value = '';
                }
                this.persistGeneratorUiState();
            });
        });

        // 重新生成 Prompt 按钮
        const regenBtn = document.getElementById('regenPromptBtn');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => this.handleGeneratePrompt());
        }

        // 确认并生成图片按钮
        const confirmBtn = document.getElementById('confirmGenImageBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.handleConfirmGenImage());
        }

        // 表单状态持久化（加 300ms 防抖，避免输入/滑块拖动时高频写入 sessionStorage）
        let _persistTimer = null;
        const debouncedPersist = () => { clearTimeout(_persistTimer); _persistTimer = setTimeout(() => this.persistGeneratorUiState(), 300); };
        document
            .querySelectorAll('#imageGeneratorForm input, #imageGeneratorForm textarea, #imageGeneratorForm select')
                .forEach((el) => {
                    el.addEventListener('change', () => this.persistGeneratorUiState());
                    el.addEventListener('input', debouncedPersist);
                });

        this.bindStylePresetEvents();
    }

    getStylePresetsList() {
        return readScopedJson(STYLE_PRESETS_KEY, []);
    }

    saveStylePresetsList(list) {
        writeScopedJson(STYLE_PRESETS_KEY, list);
        try {
            window.dispatchEvent(new CustomEvent('stylePresetsChanged', { bubbles: true }));
        } catch (_) {}
    }

    refreshStylePresetSelect(keepSelectedId) {
        const sel = document.getElementById('stylePresetSelect');
        if (!sel) return;
        const cur = keepSelectedId !== null ? String(keepSelectedId) : String(sel.value || '');
        const list = this.getStylePresetsList();
        teardownTechSelectForSelect(sel);
        teardownTechSelectForSelect(document.getElementById('styleVlModelSelect'));
        sel.innerHTML = '<option value="">— 不使用预设 —</option>';
        list.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = String(p.id);
            const refMark = p.referenceThumb ? ' · 含参考图' : '';
            opt.textContent = (p.name || '未命名') + refMark;
            sel.appendChild(opt);
        });
        if (cur && list.some((x) => String(x.id) === cur)) {
            sel.value = cur;
        } else {
            sel.value = '';
        }
        if (typeof initTechSelects === 'function') {
            initTechSelects();
        }
        this.updateStylePresetStripStatus();
    }

    updateStylePresetStripStatus() {
        const statusEl = document.getElementById('stylePresetStripStatus');
        if (!statusEl) return;
        const sel = document.getElementById('stylePresetSelect');
        const ta = document.getElementById('styleExtractTextarea');
        const id = sel && sel.value ? String(sel.value) : '';
        const sn = (ta && ta.value.trim()) || '';
        if (id) {
            const pr = this.getStylePresetsList().find((x) => String(x.id) === id);
            const name = (pr && pr.name) || '未命名';
            statusEl.textContent = sn ? `使用预设：${name}（片段可编辑）` : `使用预设：${name}`;
            return;
        }
        if (sn) {
            statusEl.textContent = '已填写风格片段（未绑定预设）';
            return;
        }
        statusEl.textContent = '未使用风格预设';
    }

    async checkVisionExtractButton() {
        const extractBtn = document.getElementById('styleExtractBtn');
        const hint = document.getElementById('styleExtractDisabledHint');
        if (!extractBtn) return;
        let ok = false;
        try {
            const res = await fetch(API_BASE + '/api/me/api-settings/status', {
                method: 'GET',
                credentials: 'include',
            });
            const data = await res.json();
            ok = !!(data && data.status && data.status.alibaba);
        } catch (_) {
            ok = false;
        }
        extractBtn.disabled = !ok;
        if (hint) {
            hint.style.display = ok ? 'none' : 'inline';
            hint.textContent = ok ? '' : '你尚未配置阿里云 API Key，「提取画风」不可用。';
        }
    }

    async syncProviderAccessControl() {
        const select = document.getElementById('apiProvider');
        if (!select) return;
        let payload = null;
        try {
            const res = await fetch(API_BASE + '/api/me/api-settings/status', {
                method: 'GET',
                credentials: 'include',
            });
            if (res.status === 401) {
                window.location.href = loginHtmlPath();
                return;
            }
            payload = await res.json();
        } catch (_) {
            return;
        }
        const status = (payload && payload.status) || {};
        const isAdmin = !!(payload && payload.isAdmin);
        const optionMap = new Map(Array.from(select.options).map((opt) => [opt.value, opt]));
        // free/mock 对所有用户可用
        // jimeng/alibaba/tencent/sdwebui：管理员可直接用项目密钥，普通用户需自行配置
        ['jimeng', 'alibaba', 'tencent', 'sdwebui'].forEach((value) => {
            const opt = optionMap.get(value);
            if (!opt) return;
            const configured = !!status[value];
            opt.disabled = !configured && !isAdmin;
            if (!configured && !isAdmin) {
                opt.textContent = opt.textContent.replace('（未配置）', '') + '（未配置）';
            } else {
                opt.textContent = opt.textContent.replace('（未配置）', '');
            }
        });
        if (select.options[select.selectedIndex] && select.options[select.selectedIndex].disabled) {
            const firstEnabled = Array.from(select.options).find((opt) => !opt.disabled && !opt.hidden);
            if (firstEnabled) {
                select.value = firstEnabled.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    bindStylePresetEvents() {
        const fileInp = document.getElementById('styleRefFileInput');
        const pickBtn = document.getElementById('styleRefPickBtn');
        const extractBtn = document.getElementById('styleExtractBtn');
        const saveBtn = document.getElementById('stylePresetSaveBtn');
        const delBtn = document.getElementById('stylePresetDeleteBtn');
        const sel = document.getElementById('stylePresetSelect');
        const ta = document.getElementById('styleExtractTextarea');
        const thumbWrap = document.getElementById('styleRefThumbWrap');
        const thumbImg = document.getElementById('styleRefThumbImg');

        this.refreshStylePresetSelect();

        if (pickBtn && fileInp) {
            pickBtn.addEventListener('click', () => fileInp.click());
        }
        if (fileInp) {
            fileInp.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                this._styleRefRawDataUrl = null;
                if (thumbWrap) thumbWrap.classList.remove('is-visible');
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this._styleRefRawDataUrl = reader.result;
                    if (thumbImg) thumbImg.src = this._styleRefRawDataUrl;
                    if (thumbWrap) thumbWrap.classList.add('is-visible');
                };
                reader.readAsDataURL(file);
                fileInp.value = '';
            });
        }

        if (extractBtn) {
            extractBtn.addEventListener('click', () => this.extractStyleFromReference());
        }

        if (sel && ta) {
            sel.addEventListener('change', () => {
                const id = sel.value;
                if (!id) {
                    this.updateStylePresetStripStatus();
                    return;
                }
                const p = this.getStylePresetsList().find((x) => String(x.id) === String(id));
                if (p && p.styleText) ta.value = p.styleText;
                this.updateStylePresetStripStatus();
            });
            ta.addEventListener('input', () => this.updateStylePresetStripStatus());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const nameInp = document.getElementById('stylePresetNameInput');
                const saveRef = document.getElementById('stylePresetSaveRefCheck');
                const styleText = (ta && ta.value.trim()) || '';
                if (!styleText) {
                    themedWarn('请先填写或提取「当前风格片段」');
                    return;
                }
                let referenceThumb = null;
                if (saveRef && saveRef.checked && this._styleRefRawDataUrl) {
                    try {
                        referenceThumb = await compressDataUrlImage(this._styleRefRawDataUrl, 512, 'image/webp', 0.72);
                    } catch (err) {
                        console.debug('[image-generator] 参考图压缩失败', err);
                        themedWarn('参考图压缩失败，将使用原图');
                    }
                }
                const name = (nameInp && nameInp.value.trim()) || '我的风格 ' + new Date().toLocaleString('zh-CN');
                const list = this.getStylePresetsList();
                list.push({
                    id: Date.now().toString(),
                    name,
                    styleText,
                    referenceThumb,
                    createdAt: new Date().toISOString(),
                });
                this.saveStylePresetsList(list);
                this.refreshStylePresetSelect(list[list.length - 1].id);
                if (nameInp) nameInp.value = '';
                themedSuccess('预设已保存');
            });
        }

        if (delBtn && sel) {
            delBtn.addEventListener('click', async () => {
                const id = sel.value;
                if (!id) {
                    themedWarn('请先在列表中选择要删除的预设');
                    return;
                }
                const ok = await window.TechUI.confirm('确定删除该风格预设？', '删除预设', '删除', '取消');
                if (!ok) return;
                const next = this.getStylePresetsList().filter((x) => String(x.id) !== String(id));
                this.saveStylePresetsList(next);
                this.refreshStylePresetSelect('');
                if (ta) ta.value = '';
            });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const formData = this.getFormData();
        if (!this.validateForm(formData)) {
            return;
        }

        if (formData.promptMode === 'professional') {
            await this.handleGeneratePrompt();
        } else {
            await this.doGenerateImage(formData);
        }
    }

    async extractStyleFromReference() {
        const ta = document.getElementById('styleExtractTextarea');
        const extractBtn = document.getElementById('styleExtractBtn');
        if (extractBtn && extractBtn.disabled) {
            return;
        }
        const styleVlModelSelect = document.getElementById('styleVlModelSelect');
        const vlModel =
            (styleVlModelSelect && styleVlModelSelect.value) ||
            'qwen-vl-plus';
        if (!this._styleRefRawDataUrl) {
            themedWarn('请先选择参考图');
            return;
        }
        let payloadImage = this._styleRefRawDataUrl;
        try {
            payloadImage = await compressDataUrlImage(this._styleRefRawDataUrl, 1280, 'image/webp', 0.82);
        } catch (e) {
            console.debug('[image-generator] 压缩参考图失败，使用原图', e);
        }
        try {
            if (extractBtn) {
                extractBtn.disabled = true;
                extractBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提取中…';
            }
            const response = await fetch(API_BASE + '/api/alibaba-vision-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': await getCsrfToken() },
                credentials: 'include',
                body: JSON.stringify({
                    image_base64: payloadImage,
                    model: vlModel,
                    max_tokens: 512,
                }),
            });
            const errText = await response.text();
            let data;
            try {
                data = JSON.parse(errText);
            } catch (_) {
                data = null;
            }
            if (!response.ok) {
                throw new Error((data && (data.message || data.error)) || errText || `HTTP ${response.status}`);
            }
            const text = (data && data.output && data.output.text && String(data.output.text).trim()) || '';
            if (!text) throw new Error('返回为空');
            if (ta) ta.value = text;
            this.updateStylePresetStripStatus();
            themedSuccess('画风提取完成，可编辑后保存为预设');
        } catch (err) {
            console.error(err);
            themedError('提取失败：' + (err && err.message ? err.message : err));
        } finally {
            if (extractBtn) {
                extractBtn.innerHTML = '<i class="fas fa-magic"></i> 提取画风';
                this.checkVisionExtractButton().catch(() => {});
            }
        }
    }

    async handleGeneratePrompt() {
        const formData = this.getFormData();
        if (!formData.description) {
            themedWarn('请先填写详细描述');
            return;
        }
        const rawDesc = this.buildImagePrompt(formData);
        const textarea = document.getElementById('proPromptTextarea');
        const regenBtn = document.getElementById('regenPromptBtn');
        try {
            if (regenBtn) {
                regenBtn.disabled = true;
                regenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
            }
            const proPrompt = await this.enhancePromptWithQwen(rawDesc, formData.qwenModel);
            if (textarea) textarea.value = proPrompt;
        } catch (error) {
            console.error('Prompt 生成失败:', error);
            if (textarea) textarea.value = '生成失败: ' + error.message;
        } finally {
            if (regenBtn) {
                regenBtn.disabled = false;
                regenBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 重新生成 Prompt';
            }
        }
    }

    async handleConfirmGenImage() {
        const formData = this.getFormData();
        const proPrompt = document.getElementById('proPromptTextarea').value.trim();
        if (!proPrompt) {
            themedWarn('请先生成或填写专业 Prompt');
            return;
        }
        formData._finalPrompt = proPrompt;
        await this.doGenerateImage(formData);
    }

    async doGenerateImage(formData) {
        this.showLoading();
        try {
            const result = await this.generateImage(formData);
            this.displayResult(result);
            this.saveImage(result);
            this.autoSaveGeneratedImageToCurrentProject(result);
        } catch (error) {
            console.error('图片生成失败:', error);
            this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    getFormData() {
        const imageModeEl = document.querySelector('input[name="imageMode"]:checked');
        const imageMode = imageModeEl ? imageModeEl.value : 'text2img';
        const strengthEl = document.getElementById('img2imgStrength');
        const strength = strengthEl ? parseFloat(strengthEl.value) : 0.7;
        const promptModeEl = document.querySelector('input[name="promptMode"]:checked');
        const promptMode = promptModeEl ? promptModeEl.value : 'custom';
        const styleTa = document.getElementById('styleExtractTextarea');
        const stylePresetSnippet = (styleTa && styleTa.value.trim()) || '';
        const presetSel = document.getElementById('stylePresetSelect');
        const presetId = presetSel && presetSel.value ? String(presetSel.value) : '';
        let presetReferenceThumb = null;
        if (presetId) {
            const pr = this.getStylePresetsList().find((x) => String(x.id) === presetId);
            if (pr && pr.referenceThumb) presetReferenceThumb = pr.referenceThumb;
        }
        let sketchImageBase64 = this.sketchBase64 || null;
        if (imageMode === 'img2img' && !sketchImageBase64 && presetReferenceThumb) {
            sketchImageBase64 = presetReferenceThumb;
        }

        const stStrengthEl = document.getElementById('stStrength');
        const stStrength = stStrengthEl ? parseFloat(stStrengthEl.value) : 0.6;
        const apiProvider = document.getElementById('apiProvider').value;
        const styleReferenceImageForApi =
            imageMode === 'text2img' && apiProvider === 'jimeng' && presetReferenceThumb
                ? presetReferenceThumb
                : undefined;
        return {
            imageType: document.getElementById('imageType').value,
            style: document.getElementById('imageStyle').value,
            colorScheme: document.getElementById('imageColorScheme').value,
            imageSize: document.getElementById('imageSize').value,
            apiProvider: apiProvider,
            description: document.getElementById('imageDescription').value,
            imageMode: imageMode,
            sketchImageBase64: sketchImageBase64,
            strength: strength,
            promptMode: promptMode,
            wanxModel: apiProvider === 'alibaba' ? document.getElementById('wanxModelSelect').value : undefined,
            qwenModel: promptMode === 'professional' ? document.getElementById('qwenModelSelect').value : undefined,
            stylePresetSnippet: stylePresetSnippet,
            presetId: presetId,
            styleReferenceImageForApi: styleReferenceImageForApi,
            // 风格迁移专用字段
            styleTransferContentBase64: this.styleTransferContentBase64,
            styleTransferRefBase64: this.styleTransferRefBase64,
            stStrength: stStrength,
            // 图片放大 / 背景去除
            upscaleBase64: this.upscaleBase64,
            removeBgBase64: this.removeBgBase64,
            upscaleFactor: document.getElementById('upscaleFactor')?.value || '2',
        };
    }

    validateForm(data) {
        const labels = {
            imageType: '图片类型',
            style: '设计风格',
            colorScheme: '配色方案',
            imageSize: '图片尺寸',
            apiProvider: 'API服务商',
            description: '详细描述',
        };
        if (data.imageMode === 'img2img') {
            if (!data.sketchImageBase64) {
                themedWarn('线稿转成品图模式下请先上传线稿或草图');
                return false;
            }
        }
        if (data.imageMode === 'styleTransfer') {
            if (!data.styleTransferContentBase64) {
                themedWarn('风格迁移模式下请先上传内容图');
                return false;
            }
            if (!data.styleTransferRefBase64) {
                themedWarn('风格迁移模式下请先上传风格参考图');
                return false;
            }
            return true;
        }
        if (data.imageMode === 'upscale') {
            if (!data.upscaleBase64) {
                themedWarn('图片放大模式下请先上传源图片');
                return false;
            }
            return true;
        }
        if (data.imageMode === 'removeBg') {
            if (!data.removeBgBase64) {
                themedWarn('背景去除模式下请先上传源图片');
                return false;
            }
            return true;
        }
        for (const key of ['imageType', 'style', 'colorScheme', 'imageSize', 'apiProvider', 'description']) {
            if (!data[key]) {
                themedWarn(`请填写${labels[key] || key}`);
                return false;
            }
        }
        return true;
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (loading) loading.style.display = 'block';
        // 使用不确定进度条动画（CSS 动画），不显示假百分比
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.animation = 'progress-indeterminate 1.5s ease-in-out infinite';
        }
        if (progressText) progressText.textContent = '正在生成图片，请稍候...';

        this._loadingInterval = null; // 不再使用假进度
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const progressBar = document.getElementById('progressBar');
        if (loading) loading.style.display = 'none';
        if (progressBar) progressBar.style.animation = '';
        if (this._loadingInterval) {
            clearInterval(this._loadingInterval);
            this._loadingInterval = null;
        }
    }

    async generateImage(formData) {
        let prompt;
        if (formData.imageMode === 'styleTransfer') {
            prompt = '将此图片转换为参考图的艺术风格，保留原始内容和构图，应用参考图的色彩、笔触和纹理特征';
            const sn = (formData.stylePresetSnippet && String(formData.stylePresetSnippet).trim()) || '';
            if (sn) prompt += `。画风参考：${sn}`;
        } else if (formData.imageMode === 'upscale') {
            prompt = '高清放大，保持原始风格和细节，提升分辨率';
            if (formData.upscaleFactor === '4') prompt += '，4倍超分辨率放大';
        } else if (formData.imageMode === 'removeBg') {
            prompt = '去除背景，保留主体，透明背景，干净抠图';
        } else if (formData._finalPrompt) {
            prompt = formData._finalPrompt;
            const sn = (formData.stylePresetSnippet && String(formData.stylePresetSnippet).trim()) || '';
            if (sn && !prompt.includes(sn)) {
                prompt = `${prompt}。画风参考：${sn}`;
            }
        } else {
            prompt = this.buildImagePrompt(formData);
        }

        try {
            const imageUrl = await this.callImageAPI(prompt, formData);
            const mode = formData.imageMode;
            const modeNames = { styleTransfer: '风格迁移', upscale: '图片放大', removeBg: '背景去除' };
            const modeName = modeNames[mode];
            return {
                id: Date.now().toString(),
                name: modeName
                    ? `${modeName}_${Date.now()}`
                    : `${formData.imageType}_${formData.style}_${Date.now()}`,
                type: modeName || formData.imageType,
                style: modeName || formData.style,
                colorScheme: modeName ? '—' : formData.colorScheme,
                imageSize: formData.imageSize,
                description: modeName
                    ? `${modeName}模式`
                    : formData.description,
                imageUrl: imageUrl,
                prompt: prompt,
                promptMode: formData.promptMode,
                timestamp: new Date().toLocaleString('zh-CN'),
                presetId: formData.presetId || '',
                stylePresetSnippet: (formData.stylePresetSnippet && String(formData.stylePresetSnippet).trim()) || '',
            };
        } catch (error) {
            console.error('图片API调用失败:', error);
            throw new Error(`图片生成失败: ${error.message}`);
        }
    }

    buildImagePrompt(formData) {
        const base = `${formData.description}，${formData.style}风格，${formData.colorScheme}配色`;
        const sn = (formData.stylePresetSnippet && String(formData.stylePresetSnippet).trim()) || '';
        if (sn) return `${base}。画风参考：${sn}`;
        return base;
    }

    async enhancePromptWithQwen(description, qwenModel) {
        const systemPrompt = `你是一个专业的 AI 绘画 Prompt 工程师。请将以下用户描述转化为适合文生图模型的专业中文 Prompt，要求：
1. 包含主体描述、艺术风格、光影效果、构图方式、画面细节
2. 使用文生图模型常见的专业描述词
3. 不超过 200 字
4. 只输出优化后的中文 Prompt 本身，不要任何解释和前缀

用户描述：${description}`;

        try {
            const response = await fetch(API_BASE + '/api/alibaba-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': await getCsrfToken() },
                credentials: 'include',
                body: JSON.stringify({
                    prompt: systemPrompt,
                    model: qwenModel || 'qwen-turbo',
                    max_tokens: 500,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`千问 Prompt 优化失败 (${response.status}): ${errText}`);
            }

            const data = await response.json();
            if (data.output && data.output.text) {
                return data.output.text.trim();
            }
            throw new Error('千问返回格式异常，未找到 output.text');
        } catch (error) {
            console.warn('千问优化不可用，回退为原始提示词:', error);
            return String(description || '').trim();
        }
    }

    async callImageAPI(prompt, formData) {
        const provider = formData.apiProvider;
        const rawSize = formData.imageSize;
        // 尺寸格式按服务商适配：
        // - tencent: 1024:1024
        // - 其余（jimeng/alibaba/free/mock/sdwebui）: 1024x1024
        const size = provider === 'tencent' ? rawSize.replace('x', ':') : rawSize;
        const mode = formData.imageMode || 'text2img';

        const requestData = {
            prompt: prompt,
            size: size,
            style: formData.style,
            provider: provider,
            num_images: 1,
            mode: mode,
            imageModel: formData.wanxModel || undefined,
        };
        if (mode === 'img2img') {
            requestData.image = formData.sketchImageBase64;
            requestData.strength = formData.strength !== null ? formData.strength : 0.7;
        }
        if (formData.imageMode === 'styleTransfer') {
            requestData.mode = 'img2img';
            requestData.image = formData.styleTransferContentBase64;
            requestData.strength = formData.stStrength || 0.6;
            if (formData.styleTransferRefBase64) {
                requestData.styleReferenceImage = formData.styleTransferRefBase64;
            }
        }
        if (formData.imageMode === 'upscale') {
            requestData.mode = 'img2img';
            requestData.image = formData.upscaleBase64;
            requestData.strength = 0.3;
        }
        if (formData.imageMode === 'removeBg') {
            requestData.mode = 'img2img';
            requestData.image = formData.removeBgBase64;
            requestData.strength = 0.4;
        }
        if (provider === 'jimeng') {
            requestData.jimeng = {
                response_format: 'url',
                require_exact_size: true,
            };
        }
        if (formData.styleReferenceImageForApi) {
            requestData.styleReferenceImage = formData.styleReferenceImageForApi;
        }

        try {
            const csrfToken = await getCsrfToken();
            const response = await fetch(this.apiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errObj;
                try {
                    errObj = JSON.parse(errorText);
                } catch (_) {
                    errObj = { message: errorText };
                }
                showApiError(errObj, response.status, '图片生成');
                throw new Error(errObj.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.image_url) {
                return data.image_url;
            } else if (data.images && data.images.length > 0) {
                return data.images[0].url;
            } else {
                console.error('API返回格式错误:', data);
                throw new Error('API返回格式错误，未找到图片URL');
            }
        } catch (error) {
            if (error.message && !error.message.startsWith('HTTP ')) {
                console.error('图片API调用失败:', error);
            }
            throw error;
        }
    }

    generateMockImage(formData) {
        const colors = ['667eea', '764ba2', 'f093fb', 'f5576c', '4facfe', '00f2fe'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = formData.imageSize.replace('x', 'x');
        const imageUrl = `https://picsum.photos/seed/${Date.now()}/${size.split('x')[0]}/${size.split('x')[1]}`;

        return {
            id: Date.now().toString(),
            name: `Mock_${formData.imageType}_${Date.now()}`,
            type: formData.imageType,
            style: formData.style,
            colorScheme: formData.colorScheme,
            imageSize: formData.imageSize,
            description: formData.description,
            imageUrl: imageUrl,
            prompt: `模拟图片 - ${formData.imageType}`,
            timestamp: new Date().toLocaleString('zh-CN'),
        };
    }

    displayResult(result) {
        const container = document.getElementById('result-body');
        if (!container) return;

        const esc = ImageGenerator.escapeHtml;
        const escJs = ImageGenerator.escapeJsStr;
        const safeUrl = esc(result.imageUrl || '');
        const safeUrlJs = escJs(result.imageUrl || '');
        const safeId = escJs(result.id || '');
        const safeType = esc(result.type || '');
        const safeStyle = esc(result.style || '');
        const safeColor = esc(result.colorScheme || '');
        const safeSize = esc(result.imageSize || '');
        const safeTime = esc(result.timestamp || '');
        const safePresetId = esc(result.presetId || '');
        const snippet = (result.stylePresetSnippet || '').slice(0, 200);
        const safeSnippet = esc(snippet);
        const snippetSuffix = (result.stylePresetSnippet || '').length > 200 ? '…' : '';

        container.innerHTML = `
                        <div style="text-align: center; padding: 20px;">
                            <h3 style="color: #00f0ff; margin-bottom: 20px;">🎉 图片生成成功！</h3>

                            <div style="margin: 20px 0;">
                                <img src="${safeUrl}"
                                     alt="生成的图片"
                                     style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 2px solid #00f0ff;"
                                     onerror="this.style.display='none'; document.getElementById('error-msg').style.display='block';">

                                <div id="error-msg" style="display: none; color: #ff6b6b; padding: 20px;">
                                    <p>❌ 图片无法显示</p>
                                    <p>请点击下方按钮在新窗口打开</p>
                                </div>
                            </div>

                            <div style="background: rgba(0,240,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                                <p><strong>📋 图片信息：</strong></p>
                                <p>类型：${safeType}</p>
                                <p>风格：${safeStyle}</p>
                                <p>配色：${safeColor}</p>
                                <p>尺寸：${safeSize}</p>
                                <p>时间：${safeTime}</p>
                                ${result.presetId ? `<p>风格预设 ID：${safePresetId}</p>` : ''}
                                ${result.stylePresetSnippet ? `<p style="word-break:break-all;">风格片段快照：${safeSnippet}${snippetSuffix}</p>` : ''}
                            </div>

                            <div style="margin-top: 20px;">
                                <button onclick="window.open('${safeUrlJs}', '_blank')"
                                        style="background: #00f0ff; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">
                                    🔗 在新窗口打开
                                </button>
                                <button onclick="imageGenerator.downloadImage('${safeId}')"
                                        style="background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">
                                    💾 下载图片
                                </button>
                                <button onclick="imageGenerator.copyPrompt('${safeId}')"
                                        style="background: #4ade80; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">
                                    📋 复制提示词
                                </button>
                                <button onclick="imageGenerator.saveToAssetLibrary('${safeId}')"
                                        style="background: #f59e0b; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">
                                    🗂️ 存到素材库
                                </button>
                                <button onclick="imageGenerator.saveToCurrentProject('${safeId}')"
                                        style="background: #a78bfa; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">
                                    📌 加入当前项目
                                </button>
                            </div>

                            <details style="margin-top: 20px; text-align: left;">
                                <summary style="cursor: pointer; color: #888;" aria-label="展开或收起本条生成结果的调试信息">🔍 调试信息</summary>
                                <div style="background: #2d2d4d; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 12px; word-break: break-all;">
                                    <p><strong>图片URL:</strong></p>
                                    <p>${safeUrl}</p>
                                </div>
                            </details>
                        </div>
                    `;
    }

    saveImage(image) {
        if (!image || !this.isRenderableImageUrl(image.imageUrl)) {
            console.debug('[image-generator] 跳过保存无效图片:', image);
            return false;
        }
        this.generatedImages.unshift(image);
        const maxImages = (window.ArtifexConstants && window.ArtifexConstants.GENERATED_IMAGES_MAX) || 15;
        if (this.generatedImages.length > maxImages) {
            this.generatedImages = this.generatedImages.slice(0, maxImages);
        }
        localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(this.generatedImages));
        this.renderImages();
        return true;
    }

    renderImages() {
        const container = document.getElementById('generatedAssets');
        if (!container) return;

        this.pruneGeneratedImages();

        if (this.generatedImages.length === 0) {
            container.innerHTML =
                '<div class="empty-state-panel">暂无已生成图片。填写参数后点击生成，即可在这里管理图片。</div>';
            return;
        }

        container.innerHTML = this.generatedImages
            .map(
                (image) => `
                    <div class="asset-card">
                        <div class="asset-preview">
                            <img src="${ImageGenerator.escapeHtml(image.imageUrl)}" alt="${ImageGenerator.escapeHtml(image.name)}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;" onerror="imageGenerator.handleBrokenGeneratedImage('${ImageGenerator.escapeJsStr(image.id)}')">
                        </div>
                        <div class="asset-info">
                            <div class="asset-name">${ImageGenerator.escapeHtml(image.name)}</div>
                            <div style="font-size: 12px; color: #888;">${ImageGenerator.escapeHtml(image.timestamp)}</div>
                            <div style="margin-top: 10px;">
                                <button class="asset-action" onclick="imageGenerator.downloadImage('${ImageGenerator.escapeJsStr(image.id)}')" style="font-size: 12px; padding: 4px 8px;">下载</button>
                                <button class="asset-action" onclick="imageGenerator.previewImage('${ImageGenerator.escapeJsStr(image.id)}')" style="font-size: 12px; padding: 4px 8px;">预览</button>
                                <button class="asset-action" onclick="imageGenerator.saveToAssetLibrary('${ImageGenerator.escapeJsStr(image.id)}')" style="font-size: 12px; padding: 4px 8px;">存到素材库</button>
                                <button class="asset-action" onclick="imageGenerator.saveToCurrentProject('${ImageGenerator.escapeJsStr(image.id)}')" style="font-size: 12px; padding: 4px 8px;">加入项目</button>
                                <button class="asset-action" onclick="imageGenerator.deleteImage('${ImageGenerator.escapeJsStr(image.id)}')" style="font-size: 12px; padding: 4px 8px;">删除</button>
                            </div>
                        </div>
                    </div>
                `
            )
            .join('');
    }

    handleBrokenGeneratedImage(imageId) {
        const before = this.generatedImages.length;
        this.generatedImages = this.generatedImages.filter((image) => image && image.id !== imageId);
        if (this.generatedImages.length !== before) {
            localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(this.generatedImages));
            this.renderImages();
        }
    }

    getCurrentProjectContext() {
        try {
            const raw = localStorage.getItem(aiStorageKey('currentProjectContext'));
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    getGeneratorUiStateKey() {
        return aiStorageKey('generator_ui_state_v1');
    }

    persistGeneratorUiState() {
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
                sketchBase64: this.sketchBase64 || '',
                stStrength: document.getElementById('stStrength')?.value || '',
                styleTransferContentBase64: this.styleTransferContentBase64 || '',
                styleTransferRefBase64: this.styleTransferRefBase64 || '',
                upscaleBase64: this.upscaleBase64 || '',
                removeBgBase64: this.removeBgBase64 || '',
                upscaleFactor: document.getElementById('upscaleFactor')?.value || '2',
            };
            sessionStorage.setItem(this.getGeneratorUiStateKey(), JSON.stringify(state));
        } catch (e) {
            console.warn('保存 AI 生成器状态失败:', e);
        }
    }

    restoreGeneratorUiState() {
        let state = null;
        try {
            const raw = sessionStorage.getItem(this.getGeneratorUiStateKey());
            state = raw ? JSON.parse(raw) : null;
        } catch (e) {
            state = null;
        }
        if (!state) return;

        const setValue = (id, value) => {
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

        const imageModeEl = document.querySelector(`input[name="imageMode"][value="${state.imageMode || 'text2img'}"]`);
        if (imageModeEl) imageModeEl.checked = true;
        const promptModeEl = document.querySelector(
            `input[name="promptMode"][value="${state.promptMode || 'custom'}"]`
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
            this.styleTransferContentBase64 = state.styleTransferContentBase64;
            const preview = document.getElementById('stContentPreview');
            if (preview) {
                preview.innerHTML = '';
                const _img = document.createElement('img');
                _img.src = this.styleTransferContentBase64;
                _img.alt = '内容图预览';
                preview.appendChild(_img);
            }
        }
        if (state.styleTransferRefBase64) {
            this.styleTransferRefBase64 = state.styleTransferRefBase64;
            const preview = document.getElementById('stRefPreview');
            if (preview) {
                preview.innerHTML = '';
                const _img = document.createElement('img');
                _img.src = this.styleTransferRefBase64;
                _img.alt = '风格参考图预览';
                preview.appendChild(_img);
            }
        }
        if (state.upscaleBase64) {
            this.upscaleBase64 = state.upscaleBase64;
            const preview = document.getElementById('upscalePreview');
            if (preview) {
                preview.innerHTML = '';
                const _img = document.createElement('img');
                _img.src = this.upscaleBase64;
                _img.alt = '放大源图预览';
                preview.appendChild(_img);
            }
        }
        if (state.removeBgBase64) {
            this.removeBgBase64 = state.removeBgBase64;
            const preview = document.getElementById('removeBgPreview');
            if (preview) {
                preview.innerHTML = '';
                const _img = document.createElement('img');
                _img.src = this.removeBgBase64;
                _img.alt = '背景去除源图预览';
                preview.appendChild(_img);
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
            const wrapper = wanxModelEl.nextElementSibling;
            if (wrapper && wrapper.classList.contains('tech-select')) {
                wrapper.style.display = (state.apiProvider || '') === 'alibaba' ? '' : 'none';
            }
        }

        if (state.sketchBase64) {
            this.sketchBase64 = state.sketchBase64;
            const preview = document.getElementById('sketchPreview');
            if (preview) {
                preview.innerHTML = ''; const _img = document.createElement('img'); _img.src = this.sketchBase64; _img.alt = '线稿预览'; preview.appendChild(_img);
            }
        }
    }

    buildAssetLibraryItemFromImage(image) {
        return {
            id: 'ai_img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: image.name || 'AI图片',
            fileName: `${(image.name || 'ai-image').replace(/[\\/:*?"<>|]/g, '_')}.png`,
            category: 'AI生成',
            type: 'image/png',
            dataURL: image.imageUrl,
            favorite: false,
            createdAt: Date.now(),
            source: 'ai-generate',
        };
    }

    async saveToAssetLibrary(imageId) {
        const image = this.generatedImages.find((i) => i.id === imageId);
        if (!image) {
            themedWarn('未找到要保存的图片');
            return;
        }
        try {
            const fileName = `${(image.name || 'ai-image').replace(/[\\/:*?"<>|]/g, '_')}.png`;
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
                const err = await resp.json().catch(() => ({}));
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
                state.assets.unshift(this.buildAssetLibraryItemFromImage(image));
                localStorage.setItem(aiStorageKey('assetLibrary_v1'), JSON.stringify(state));
                themedSuccess('图片已保存到素材库（本地备份）');
            } catch (fallbackErr) {
                themedWarn('保存失败：' + (e.message || '请重试'));
            }
        }
    }

    saveToCurrentProject(imageOrId, options = {}) {
        const image = typeof imageOrId === 'string' ? this.generatedImages.find((i) => i.id === imageOrId) : imageOrId;
        if (!image) {
            themedWarn('未找到要加入项目的图片');
            return;
        }
        const context = this.getCurrentProjectContext();
        if (!context || !context.id) {
            themedWarn('未检测到当前项目，请从项目详情页进入 AI 生成');
            return;
        }
        let projects = [];
        try {
            projects = JSON.parse(localStorage.getItem(aiStorageKey('gameui-projects'))) || [];
        } catch (e) {
            projects = [];
        }
        const idx = projects.findIndex((p) => p.id === context.id);
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
        const existingIndex = project.assets.findIndex((asset) => asset && asset.sourceAssetId === image.id);
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
            desc: `从AI生成加入图片素材：${image.name || 'AI图片'}`,
        });
        projects[idx] = project;
        localStorage.setItem(aiStorageKey('gameui-projects'), JSON.stringify(projects));
        if (!options.silent) {
            themedSuccess('图片已加入当前项目');
        }
        return true;
    }

    autoSaveGeneratedImageToCurrentProject(image) {
        const context = this.getCurrentProjectContext();
        if (!context || !context.id) return false;
        return this.saveToCurrentProject(image, { silent: true });
    }

    downloadImage(imageId) {
        const image = this.generatedImages.find((i) => i.id === imageId);
        if (image) {
            const a = document.createElement('a');
            a.href = image.imageUrl;
            a.download = `${image.name}.png`;
            a.click();
        }
    }

    previewImage(imageId) {
        const image = this.generatedImages.find((i) => i.id === imageId);
        if (image) {
            const newWindow = window.open('', '_blank');
            if (!newWindow) { themedWarn('弹窗被浏览器阻止，请允许弹窗后重试'); return; }
            const doc = newWindow.document;
            doc.open();
            doc.write('<!DOCTYPE html><html><head><title></title></head><body></body></html>');
            doc.close();
            doc.title = image.name || '图片预览';
            const body = doc.body;
            body.style.cssText = 'margin:0; padding:20px; background:#1a1a2e; color:white; text-align:center;';
            const h2 = doc.createElement('h2');
            h2.textContent = image.name || '';
            body.appendChild(h2);
            const img = doc.createElement('img');
            img.src = image.imageUrl || '';
            img.alt = image.name || '';
            img.style.cssText = 'max-width:90%; max-height:80vh; border-radius:8px;';
            body.appendChild(img);
            const div = doc.createElement('div');
            div.style.marginTop = '20px';
            const btn = doc.createElement('button');
            btn.textContent = '关闭';
            btn.style.cssText = 'padding:10px 20px; background:#00f0ff; color:#1a1a2e; border:none; border-radius:4px; cursor:pointer;';
            btn.addEventListener('click', function() { newWindow.close(); });
            div.appendChild(btn);
            body.appendChild(div);
        }
    }

    copyPrompt(imageId) {
        const image = this.generatedImages.find((i) => i.id === imageId);
        if (image) {
            navigator.clipboard
                .writeText(image.prompt)
                .then(() => {
                    themedSuccess('提示词已复制到剪贴板');
                })
                .catch((err) => {
                    console.error('复制失败:', err);
                    themedWarn('复制失败，请手动复制提示词');
                });
        }
    }

    deleteImage(imageId) {
        (async () => {
            const ok = await window.TechUI.confirm('确定要删除这张图片吗？', '删除图片', '删除', '取消');
            if (!ok) return;
            this.generatedImages = this.generatedImages.filter((i) => i.id !== imageId);
            localStorage.setItem(aiStorageKey('generatedImages'), JSON.stringify(this.generatedImages));
            this.renderImages();
        })();
    }

    handleError(error) {
        console.error('图片生成失败:', error);
        const container = document.getElementById('result-body');
        if (container) {
            container.innerHTML = `
                        <div style="text-align: center; color: #ff4d4f; padding: 40px;">
                            <h3>❌ 图片生成失败</h3>
                            <p><strong>错误信息:</strong> ${ImageGenerator.escapeHtml(error.message || '未知错误')}</p>
                            <div style="background: rgba(255,77,79,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p><strong>可能的解决方案:</strong></p>
                                <ul style="text-align: left; display: inline-block;">
                                    <li>检查网络连接</li>
                                    <li>尝试使用"免费图片"选项</li>
                                    <li>检查API服务商配置</li>
                                    <li>刷新页面重试</li>
                                </ul>
                            </div>
                            <div style="margin-top: 20px;">
                                <button class="image-action" onclick="imageGenerator.retry()" style="background: #00f0ff; color: #1a1a2e; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">🔄 重试</button>
                            </div>
                        </div>
                    `;
        }
    }

    retry() {
        const form = document.getElementById('imageGeneratorForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
}

// 页面加载完成后初始化
let aiGenerator;
let imageGenerator;
// ── Batch generation extension ──
(function () {
    "use strict";

    const origBind = ImageGenerator.prototype.bindEvents;
    ImageGenerator.prototype.bindEvents = function () {
        origBind.call(this);
        this.initBatchCountButtons();
    };

    ImageGenerator.prototype.initBatchCountButtons = function () {
        const btns = document.querySelectorAll(".batch-count-btn");
        const hiddenInput = document.getElementById("batchCount");
        if (!btns.length || !hiddenInput) return;
        btns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                btns.forEach(function (b) {
                    b.style.background = "rgba(255,255,255,0.04)";
                    b.style.borderColor = "rgba(255,255,255,0.1)";
                    b.style.color = "#b0b0c0";
                });
                btn.style.background = "rgba(0,240,255,0.18)";
                btn.style.borderColor = "rgba(0,240,255,0.35)";
                btn.style.color = "#00f0ff";
                hiddenInput.value = btn.dataset.count;
            });
        });
    };

    ImageGenerator.prototype.getBatchCount = function () {
        const el = document.getElementById("batchCount");
        return el ? Math.max(1, Math.min(8, parseInt(el.value, 10) || 1)) : 1;
    };

    const origDoGenerate = ImageGenerator.prototype.doGenerateImage;
    ImageGenerator.prototype.doGenerateImage = async function (formData) {
        const count = this.getBatchCount();
        if (count <= 1) {
            return origDoGenerate.call(this, formData);
        }
        await this.doBatchGenerate(formData, count);
    };

    ImageGenerator.prototype.doBatchGenerate = async function (formData, count) {
        const self = this;
        self.showLoading();
        const progressText = document.getElementById("progressText");
        if (progressText) progressText.textContent = "正在批量生成 " + count + " 张图片...";

        const results = [];
        const errors = [];
        const promises = [];
        for (let i = 0; i < count; i++) {
            (function (idx) {
                promises.push(
                    self.generateImage(formData)
                        .then(function (result) {
                            result._batchIndex = idx;
                            results.push(result);
                            if (progressText) {
                                progressText.textContent = "已完成 " + results.length + "/" + count + " 张...";
                            }
                            return result;
                        })
                        .catch(function (err) {
                            errors.push({ index: idx, error: err });
                        })
                );
            })(i);
        }

        await Promise.all(promises);
        self.hideLoading();

        results.forEach(function (r) {
            self.saveImage(r);
            self.autoSaveGeneratedImageToCurrentProject(r);
        });

        if (results.length > 0) {
            self.displayBatchResults(results);
        }
        if (errors.length > 0) {
            themedWarn(errors.length + "/" + count + " 张生成失败");
        }
    };

    ImageGenerator.prototype.displayBatchResults = function (results) {
        const container = document.getElementById("result-body");
        if (!container) return;
        const esc = ImageGenerator.escapeHtml;
        const escJs = ImageGenerator.escapeJsStr;

        const gridHtml = results.map(function (r) {
            const safeUrl = esc(r.imageUrl || "");
            const safeId = escJs(r.id || "");
            const safeName = esc(r.name || "");
            return "<div style=\"background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;text-align:center;\">" +
                "<img src=\"" + safeUrl + "\" alt=\"" + safeName + "\" " +
                "style=\"width:100%;height:180px;object-fit:cover;border-radius:6px;border:1px solid rgba(0,240,255,0.15);\" " +
                "onerror=\"this.style.display='none';\">" +
                "<div style=\"margin-top:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;\">" +
                "<button onclick=\"imageGenerator.downloadImage('" + safeId + "')\" " +
                "style=\"background:rgba(0,240,255,0.12);color:#00f0ff;border:1px solid rgba(0,240,255,0.3);padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;\">" +
                "<i class=\"fas fa-download\"></i> 下载</button>" +
                "<button onclick=\"imageGenerator.saveToAssetLibrary('" + safeId + "')\" " +
                "style=\"background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;\">" +
                "<i class=\"fas fa-plus\"></i> 存素材库</button>" +
                "<button onclick=\"imageGenerator.saveToCurrentProject('" + safeId + "')\" " +
                "style=\"background:rgba(167,139,250,0.12);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;\">" +
                "<i class=\"fas fa-thumbtack\"></i> 加入项目</button>" +
                "</div></div>";
        }).join("");

        const idsArr = results.map(function (r) { return r.id; });

        container.innerHTML =
            "<div style=\"text-align:center;padding:20px;\">" +
            "<h3 style=\"color:#00f0ff;margin-bottom:16px;\">" +
            "<i class=\"fas fa-images\"></i> 批量生成完成 (" + results.length + " 张)</h3>" +
            "<div style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin:16px 0;\">" +
            gridHtml + "</div>" +
            "<div style=\"margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;\">" +
            "<button id=\"batchSaveAllBtn\" " +
            "style=\"background:linear-gradient(135deg,#00f0ff,#0077ff);color:#050810;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-family:var(--font-tech-display);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;\">" +
            "<i class=\"fas fa-save\"></i> 全部存入素材库</button>" +
            "<button id=\"batchDownloadAllBtn\" " +
            "style=\"background:rgba(255,255,255,0.06);color:#e0e0e0;border:1px solid rgba(0,240,255,0.2);padding:10px 20px;border-radius:6px;cursor:pointer;font-family:var(--font-tech-display);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;\">" +
            "<i class=\"fas fa-download\"></i> 全部下载</button></div></div>";

        const self = this;
        document.getElementById("batchSaveAllBtn").addEventListener("click", function () {
            self.batchSaveAllToLibrary(idsArr);
        });
        document.getElementById("batchDownloadAllBtn").addEventListener("click", function () {
            self.batchDownloadAll(idsArr);
        });
    };

    ImageGenerator.prototype.batchSaveAllToLibrary = async function (ids) {
        const self = this;
        let ok = 0;
        for (let i = 0; i < ids.length; i++) {
            try { await self.saveToAssetLibrary(ids[i]); ok++; } catch (_) {}
        }
        themedSuccess("已将 " + ok + "/" + ids.length + " 张存入素材库");
    };

    ImageGenerator.prototype.batchDownloadAll = function (ids) {
        const self = this;
        ids.forEach(function (id) { self.downloadImage(id); });
        themedSuccess("正在下载 " + ids.length + " 张图片");
    };
})();
