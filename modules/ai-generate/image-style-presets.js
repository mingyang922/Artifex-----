/**
 * Artifex - Style Preset Management Module
 * Extracted from ImageGenerator for modularity
 */
'use strict';
(function () {
    'use strict';

    var _gen = null;

    function init(gen) {
        _gen = gen;
    }

    function getStylePresetsList() {
        return readScopedJson(STYLE_PRESETS_KEY, []);
    }

    function saveStylePresetsList(list) {
        writeScopedJson(STYLE_PRESETS_KEY, list);
        try {
            window.dispatchEvent(new CustomEvent('stylePresetsChanged', { bubbles: true }));
        } catch (_) {}
    }

    function refreshStylePresetSelect(keepSelectedId) {
        var sel = document.getElementById('stylePresetSelect');
        if (!sel) return;
        var cur = keepSelectedId !== null ? String(keepSelectedId) : String(sel.value || '');
        var list = getStylePresetsList();
        teardownTechSelectForSelect(sel);
        teardownTechSelectForSelect(document.getElementById('styleVlModelSelect'));
        sel.innerHTML = '<option value="">— 不使用预设 —</option>';
        list.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = String(p.id);
            var refMark = p.referenceThumb ? ' · 含参考图' : '';
            opt.textContent = (p.name || '未命名') + refMark;
            sel.appendChild(opt);
        });
        if (cur && list.some(function (x) { return String(x.id) === cur; })) {
            sel.value = cur;
        } else {
            sel.value = '';
        }
        if (typeof initTechSelects === 'function') {
            initTechSelects();
        }
        updateStylePresetStripStatus();
    }

    function updateStylePresetStripStatus() {
        var statusEl = document.getElementById('stylePresetStripStatus');
        if (!statusEl) return;
        var sel = document.getElementById('stylePresetSelect');
        var ta = document.getElementById('styleExtractTextarea');
        var id = sel && sel.value ? String(sel.value) : '';
        var sn = (ta && ta.value.trim()) || '';
        if (id) {
            var pr = getStylePresetsList().find(function (x) { return String(x.id) === id; });
            var name = (pr && pr.name) || '未命名';
            statusEl.textContent = sn ? '使用预设：' + name + '（片段可编辑）' : '使用预设：' + name;
            return;
        }
        if (sn) {
            statusEl.textContent = '已填写风格片段（未绑定预设）';
            return;
        }
        statusEl.textContent = '未使用风格预设';
    }

    function bindStylePresetEvents() {
        var fileInp = document.getElementById('styleRefFileInput');
        var pickBtn = document.getElementById('styleRefPickBtn');
        var extractBtn = document.getElementById('styleExtractBtn');
        var saveBtn = document.getElementById('stylePresetSaveBtn');
        var delBtn = document.getElementById('stylePresetDeleteBtn');
        var sel = document.getElementById('stylePresetSelect');
        var ta = document.getElementById('styleExtractTextarea');
        var thumbWrap = document.getElementById('styleRefThumbWrap');
        var thumbImg = document.getElementById('styleRefThumbImg');

        refreshStylePresetSelect();

        if (pickBtn && fileInp) {
            pickBtn.addEventListener('click', function () { fileInp.click(); });
        }
        if (fileInp) {
            fileInp.addEventListener('change', function (e) {
                var file = e.target.files && e.target.files[0];
                _gen._styleRefRawDataUrl = null;
                if (thumbWrap) thumbWrap.classList.remove('is-visible');
                if (!file || !file.type.startsWith('image/')) return;
                var reader = new FileReader();
                reader.onload = function () {
                    _gen._styleRefRawDataUrl = reader.result;
                    if (thumbImg) thumbImg.src = _gen._styleRefRawDataUrl;
                    if (thumbWrap) thumbWrap.classList.add('is-visible');
                };
                reader.readAsDataURL(file);
                fileInp.value = '';
            });
        }

        if (extractBtn) {
            extractBtn.addEventListener('click', function () { extractStyleFromReference(); });
        }

        if (sel && ta) {
            sel.addEventListener('change', function () {
                var id = sel.value;
                if (!id) {
                    updateStylePresetStripStatus();
                    return;
                }
                var p = getStylePresetsList().find(function (x) { return String(x.id) === String(id); });
                if (p && p.styleText) ta.value = p.styleText;
                updateStylePresetStripStatus();
            });
            ta.addEventListener('input', function () { updateStylePresetStripStatus(); });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async function () {
                var nameInp = document.getElementById('stylePresetNameInput');
                var saveRef = document.getElementById('stylePresetSaveRefCheck');
                var styleText = (ta && ta.value.trim()) || '';
                if (!styleText) {
                    themedWarn('请先填写或提取「当前风格片段」');
                    return;
                }
                var referenceThumb = null;
                if (saveRef && saveRef.checked && _gen._styleRefRawDataUrl) {
                    try {
                        referenceThumb = await compressDataUrlImage(_gen._styleRefRawDataUrl, 512, 'image/webp', 0.72);
                    } catch (err) {
                        console.debug('[image-generator] 参考图压缩失败', err);
                        themedWarn('参考图压缩失败，将使用原图');
                    }
                }
                var name = (nameInp && nameInp.value.trim()) || '我的风格 ' + new Date().toLocaleString('zh-CN');
                var list = getStylePresetsList();
                list.push({
                    id: Date.now().toString(),
                    name: name,
                    styleText: styleText,
                    referenceThumb: referenceThumb,
                    createdAt: new Date().toISOString(),
                });
                saveStylePresetsList(list);
                refreshStylePresetSelect(list[list.length - 1].id);
                if (nameInp) nameInp.value = '';
                themedSuccess('预设已保存');
            });
        }

        if (delBtn && sel) {
            delBtn.addEventListener('click', async function () {
                var id = sel.value;
                if (!id) {
                    themedWarn('请先在列表中选择要删除的预设');
                    return;
                }
                var ok = await window.TechUI.confirm('确定删除该风格预设？', '删除预设', '删除', '取消');
                if (!ok) return;
                var next = getStylePresetsList().filter(function (x) { return String(x.id) !== String(id); });
                saveStylePresetsList(next);
                refreshStylePresetSelect('');
                if (ta) ta.value = '';
            });
        }
    }

    async function extractStyleFromReference() {
        var ta = document.getElementById('styleExtractTextarea');
        var extractBtn = document.getElementById('styleExtractBtn');
        if (extractBtn && extractBtn.disabled) {
            return;
        }
        var styleVlModelSelect = document.getElementById('styleVlModelSelect');
        var vlModel =
            (styleVlModelSelect && styleVlModelSelect.value) ||
            'qwen-vl-plus';
        if (!_gen._styleRefRawDataUrl) {
            themedWarn('请先选择参考图');
            return;
        }
        var payloadImage = _gen._styleRefRawDataUrl;
        try {
            payloadImage = await compressDataUrlImage(_gen._styleRefRawDataUrl, 1280, 'image/webp', 0.82);
        } catch (_e) {
            console.debug('[image-generator] 压缩参考图失败，使用原图', _e);
        }
        try {
            if (extractBtn) {
                extractBtn.disabled = true;
                extractBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提取中…';
            }
            var response = await fetch(API_BASE + '/api/alibaba-vision-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': await getCsrfToken() },
                credentials: 'include',
                body: JSON.stringify({
                    image_base64: payloadImage,
                    model: vlModel,
                    max_tokens: 512,
                }),
            });
            var errText = await response.text();
            var data;
            try {
                data = JSON.parse(errText);
            } catch (_) {
                data = null;
            }
            if (!response.ok) {
                throw new Error((data && (data.message || data.error)) || errText || 'HTTP ' + response.status);
            }
            var text = (data && data.output && data.output.text && String(data.output.text).trim()) || '';
            if (!text) throw new Error('返回为空');
            if (ta) ta.value = text;
            updateStylePresetStripStatus();
            themedSuccess('画风提取完成，可编辑后保存为预设');
        } catch (err) {
            console.error(err);
            themedError('提取失败：' + (err && err.message ? err.message : err));
        } finally {
            if (extractBtn) {
                extractBtn.innerHTML = '<i class="fas fa-magic"></i> 提取画风';
                _gen.checkVisionExtractButton().catch(function () {});
            }
        }
    }

    // Export to window
    window.ImageStylePresets = {
        init: init,
        getStylePresetsList: getStylePresetsList,
        saveStylePresetsList: saveStylePresetsList,
        refreshStylePresetSelect: refreshStylePresetSelect,
        updateStylePresetStripStatus: updateStylePresetStripStatus,
        bindStylePresetEvents: bindStylePresetEvents,
        extractStyleFromReference: extractStyleFromReference,
    };
})();
