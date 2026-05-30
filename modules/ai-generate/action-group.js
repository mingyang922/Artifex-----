/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
'use strict';
window.lastThreeViewImageUrl = null;
window.lastThreeViewFrontDataUrl = null;
window.lastActionSketchDataUrl = null;
window.lastThreeViewParams = null;

/**
 * 从三视图中裁剪正面视角（左侧 1/3）并返回 data URL。
 * 三视图一般按 正面 | 侧面 | 背面 排列，取最左段即可。
 */
function cropFrontViewFromThreeView(imgUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const cols = img.width > img.height * 2 ? 3 : 2;
            const cropW = Math.floor(img.width / cols);
            const cropH = img.height;
            const canvas = document.createElement('canvas');
            canvas.width = cropW;
            canvas.height = cropH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, cropW, cropH, 0, 0, cropW, cropH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('裁剪正面视角失败：图片加载出错'));
        img.src = imgUrl;
    });
}
window.actionInputMode = null;

const ACTION_THREE_VIEW_PRESETS = {
    turnaround_pixel:
        'character turnaround reference sheet, three full body views in one image arranged left to right: front view, side view, back view, pixel art, chibi, game sprite, consistent costume and accessories, white background',
    turnaround_game:
        'character turnaround, three views front side back, full body, same outfit and proportions, game art reference sheet, white background, clean shading',
    turnaround_minimal: 'three views turnaround, front side back, full body, neutral pose, white background',
    custom: '',
};

const ACTION_MOTION_STYLE = {
    pixel_chibi: 'pixel art, 2d game sprite, chibi, full body, solo, white background',
    pixel_hd: 'pixel art, 2d game character sprite, full body, white background',
    flat_game: 'flat color, 2d game illustration, full body, white background',
    none: '',
};

function setActionInputMode(mode) {
    if (!mode || (mode !== 'types' && mode !== 'prompt')) return;
    if (window.actionInputMode && window.actionInputMode !== mode) return;
    window.actionInputMode = mode;
    const promptEl = document.getElementById('actionCharacterPrompt');
    const checkboxes = Array.from(document.querySelectorAll('input[name="actionType"]'));
    if (mode === 'prompt') {
        checkboxes.forEach((cb) => {
            cb.disabled = true;
        });
        if (promptEl) promptEl.readOnly = false;
    } else {
        checkboxes.forEach((cb) => {
            cb.disabled = false;
        });
        if (promptEl) promptEl.readOnly = true;
    }
}

function clearActionInputMode() {
    window.actionInputMode = null;
    const promptEl = document.getElementById('actionCharacterPrompt');
    const checkboxes = Array.from(document.querySelectorAll('input[name="actionType"]'));
    checkboxes.forEach((cb) => {
        cb.disabled = false;
    });
    if (promptEl) promptEl.readOnly = false;
}

function parsePromptActions(text) {
    const t = String(text || '');
    const map = [
        { key: 'idle', regex: /(待机|站立|idle)/i },
        { key: 'run', regex: /(跑|奔跑|冲刺|run)/i },
        { key: 'jump', regex: /(跳|跃起|腾空|jump)/i },
        { key: 'attack', regex: /(攻击|挥剑|出拳|斩击|attack)/i },
    ];
    const out = map.filter((x) => x.regex.test(t)).map((x) => x.key);
    return out.length ? out : ['idle'];
}

(function setupActionSketchAndThreeView() {
    const sketchInput = document.getElementById('actionSketchInput');
    const sketchWrap = document.getElementById('actionSketchPreviewWrap');
    const sketchImg = document.getElementById('actionSketchPreview');
    const promptEl = document.getElementById('actionCharacterPrompt');
    const actionTypeBoxes = Array.from(document.querySelectorAll('input[name="actionType"]'));
    const actionSketchStateKey = 'artifex-action-sketch-data-url';

    const setActionSketchDataUrl = (dataUrl) => {
        if (!dataUrl || typeof dataUrl !== 'string') return;
        window.lastActionSketchDataUrl = dataUrl;
        if (sketchImg) sketchImg.src = dataUrl;
        if (sketchWrap) sketchWrap.style.display = 'block';
        try {
            sessionStorage.setItem(actionSketchStateKey, dataUrl);
        } catch (_) {}
    };

    const handleActionSketchPaste = (event) => {
        const items =
            event && event.clipboardData && event.clipboardData.items ? Array.from(event.clipboardData.items) : [];
        const imageItem = items.find((item) => item.kind === 'file' && item.type && item.type.startsWith('image/'));
        if (!imageItem) return false;
        const active = document.activeElement;
        const isTypingTarget =
            active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (isTypingTarget && active && active.id !== 'actionSketchInput') return false;
        const file = imageItem.getAsFile && imageItem.getAsFile();
        if (!file) return false;
        const reader = new FileReader();
        reader.onload = () => {
            setActionSketchDataUrl(reader.result);
            if (sketchInput) sketchInput.value = '';
            themedSuccess('已从剪贴板粘贴角色草图');
        };
        reader.readAsDataURL(file);
        event.preventDefault();
        return true;
    };

    try {
        const restored = sessionStorage.getItem(actionSketchStateKey);
        if (restored && typeof restored === 'string' && restored.startsWith('data:')) {
            setActionSketchDataUrl(restored);
        }
    } catch (_) {}

    if (promptEl) {
        promptEl.addEventListener('input', function () {
            if ((this.value || '').trim()) {
                setActionInputMode('prompt');
            } else if (window.actionInputMode === 'prompt') {
                clearActionInputMode();
            }
        });
    }
    actionTypeBoxes.forEach((cb) => {
        cb.addEventListener('change', function () {
            const hasChecked = actionTypeBoxes.some((x) => x.checked);
            if (hasChecked) {
                setActionInputMode('types');
            } else if (window.actionInputMode === 'types') {
                clearActionInputMode();
            }
        });
    });
    if (sketchInput) {
        sketchInput.addEventListener('change', function () {
            const f = this.files && this.files[0];
            if (!f) {
                if (sketchWrap) sketchWrap.style.display = 'none';
                window.lastActionSketchDataUrl = null;
                try {
                    sessionStorage.removeItem(actionSketchStateKey);
                } catch (_) {}
                return;
            }
            const reader = new FileReader();
            reader.onload = function (ev) {
                setActionSketchDataUrl(ev.target.result);
            };
            reader.readAsDataURL(f);
        });
    }

    document.addEventListener('paste', handleActionSketchPaste);

    document.getElementById('actionThreeViewBtn')?.addEventListener('click', async function () {
        if (!window.lastActionSketchDataUrl) {
            themedWarn('请先上传草图 / 线稿图片。');
            return;
        }
        const presetKey = document.getElementById('actionThreeViewPreset').value;
        const extra = (document.getElementById('actionThreeViewExtraPrompt').value || '').trim();
        const suffix = ACTION_THREE_VIEW_PRESETS[presetKey] || '';
        let fullPrompt = [suffix, extra].filter(Boolean).join(' ');
        fullPrompt = appendStyleRefToPrompt(fullPrompt);
        if (!fullPrompt) {
            themedWarn('请至少填写「三视图附加提示词」或选择非 custom 的三视图预设。');
            return;
        }
        const size = document.getElementById('actionThreeViewSize').value;
        const strength = Number(document.getElementById('actionThreeViewStrength').value) || 0.55;
        const prog = document.getElementById('actionThreeViewProgress');
        const progText = document.getElementById('actionThreeViewProgressText');
        const resWrap = document.getElementById('actionThreeViewResultWrap');
        const resBox = document.getElementById('actionThreeViewResult');
        prog.style.display = 'block';
        resWrap.style.display = 'none';
        this.disabled = true;
        progText.textContent = '正在调用 Seedream 生成三视图…';
        try {
            const res = await fetch(API_BASE + '/api/image-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    mode: 'img2img',
                    provider: 'jimeng',
                    prompt: fullPrompt,
                    image: window.lastActionSketchDataUrl,
                    strength: Math.min(0.9, Math.max(0.2, strength)),
                    size: size,
                    jimeng: {
                        response_format: 'url',
                        require_exact_size: true,
                        extra_body: {
                            reference_mode: 'three_view',
                            output_layout: 'front_side_back',
                        },
                    },
                }),
            });
            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                themedError('三视图接口返回非 JSON：' + text.slice(0, 200));
                return;
            }
            if (!res.ok) {
                showApiError(data, res.status, '三视图生成');
                return;
            }
            const imageUrl = data.image_url;
            if (!imageUrl) {
                themedError('未收到图片，请检查 Seedream 接口返回。');
                return;
            }
            window.lastThreeViewImageUrl = imageUrl;
            window.lastThreeViewParams = { presetKey, size, strength, extra };
            resBox.innerHTML =
                '<img src="' +
                getProxyImageUrl(imageUrl) +
                '" alt="三视图" style="max-width:100%;max-height:360px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);">';
            resWrap.style.display = 'block';
            try {
                window.lastThreeViewFrontDataUrl = await cropFrontViewFromThreeView(getProxyImageUrl(imageUrl));
            } catch (cropErr) {
                console.warn('裁剪正面视角失败，动作帧将使用完整三视图:', cropErr);
                window.lastThreeViewFrontDataUrl = null;
            }
        } catch (e) {
            themedError('三视图生成失败：' + (e.message || e));
        } finally {
            prog.style.display = 'none';
            this.disabled = false;
        }
    });
})();

document.getElementById('actionGroupGenerateBtn')?.addEventListener('click', async function () {
    const promptEl = document.getElementById('actionCharacterPrompt');
    const framesPer = parseInt(document.getElementById('actionFramesPer').value, 10);
    const provider = 'jimeng';
    const size = document.getElementById('actionSize').value;
    const characterPrompt = (promptEl.value || '').trim();
    if (!window.lastThreeViewImageUrl) {
        themedWarn('请先生成三视图。动作组必须完全参考上列三视图后才能批量生成。');
        return;
    }
    const motionKey = document.getElementById('actionMotionPreset').value;
    const motionSuffix = ACTION_MOTION_STYLE[motionKey] || '';
    const actions = [];
    document.querySelectorAll('input[name="actionType"]:checked').forEach((cb) => actions.push(cb.value));

    const hasPrompt = !!characterPrompt;
    const hasTypes = actions.length > 0;
    if (hasPrompt && hasTypes) {
        themedWarn('动作控制冲突：你同时设置了「人物动作详细提示词」和「动作类型多选」。请只保留一个。');
        return;
    }
    if (!hasPrompt && !hasTypes) {
        themedWarn('请二选一：填写「人物动作详细提示词」，或选择至少一种「动作类型」。');
        return;
    }
    const actionNames = { idle: '待机', run: '跑', jump: '跳', attack: '攻击' };
    const resolvedActions = hasPrompt ? parsePromptActions(characterPrompt) : actions;
    const actionPromptPrefix = hasPrompt ? characterPrompt : '';
    const frames = [];
    for (const action of resolvedActions) {
        for (let f = 0; f < framesPer; f++) {
            const actionDesc = hasPrompt ? '按动作提示词执行' : `${actionNames[action]}动作`;
            const promptHead = [actionPromptPrefix, motionSuffix].filter(Boolean).join('，');
            let p = promptHead
                ? `${promptHead}。角色${actionDesc}，第${f + 1}帧，共${framesPer}帧。`
                : `角色${actionDesc}，第${f + 1}帧，共${framesPer}帧。`;
            p +=
                ' 必须100%参考已生成三视图的角色设定，保持脸型、发型、服装配色、道具、体型比例一致。' +
                ' 每帧只画一个角色、一个视角，禁止多人、多视角拼图、正背面组合，纯色简洁背景。';
            p = appendStyleRefToPrompt(p);
            frames.push({ action, frameIndex: f, prompt: p });
        }
    }
    const progressEl = document.getElementById('actionGroupProgress');
    const progressText = document.getElementById('actionGroupProgressText');
    const resultEl = document.getElementById('actionGroupResult');
    const previewEl = document.getElementById('actionGroupPreview');
    progressEl.style.display = 'block';
    resultEl.style.display = 'none';
    this.disabled = true;
    const endpoint = API_BASE + '/api/image-proxy';
    const results = [];
    const failMessages = [];
    for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        progressText.textContent = `正在生成 ${i + 1}/${frames.length} …`;
        try {
            const payload = { prompt: f.prompt, size, provider, num_images: 1 };
            const hasThreeViewRef = !!window.lastThreeViewImageUrl;
            const frontRef = window.lastThreeViewFrontDataUrl || window.lastThreeViewImageUrl;
            if (hasThreeViewRef) {
                payload.mode = 'img2img';
                payload.image = frontRef;
                payload.strength = Math.min(
                    0.75,
                    Math.max(0.25, Number(window.lastThreeViewParams && window.lastThreeViewParams.strength) || 0.45)
                );
            }
            payload.jimeng = {
                response_format: 'url',
                sequential_image_generation: 'disabled',
                require_exact_size: true,
                extra_body: {
                    frame_meta: {
                        action: f.action,
                        frameIndex: f.frameIndex,
                        framesPer,
                    },
                    consistency: hasThreeViewRef
                        ? {
                              three_view_reference: frontRef,
                              three_view_params: window.lastThreeViewParams || null,
                          }
                        : undefined,
                    reference_mode: hasThreeViewRef ? 'character_consistency' : undefined,
                    reference_image: hasThreeViewRef ? frontRef : undefined,
                    reference_image_url: hasThreeViewRef ? frontRef : undefined,
                },
            };
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (parseErr) {
                failMessages.push(`第 ${i + 1} 帧: 响应不是 JSON (${res.status}) ${text.slice(0, 120)}`);
                console.error('action group frame parse error', res.status, text);
                continue;
            }
            if (!res.ok) {
                const msg = data.message || data.error || data.details || JSON.stringify(data);
                const tag = res.status === 400 ? '参数' : res.status === 401 ? '鉴权' : res.status >= 500 ? 'API' : '';
                failMessages.push(`第 ${i + 1} 帧 [${tag || 'HTTP'}${res.status}]: ${msg}`);
                console.error('action group API error', res.status, data);
                continue;
            }
            const imageUrl = data.image_url || (data.images && data.images[0] && data.images[0].url);
            if (imageUrl) {
                results.push({ action: f.action, frameIndex: f.frameIndex, imageUrl, prompt: f.prompt });
            } else {
                failMessages.push(`第 ${i + 1} 帧: 成功响应但无 image_url`);
                console.warn('action group no image_url', data);
            }
        } catch (e) {
            failMessages.push(`第 ${i + 1} 帧: ${e.message || e}`);
            console.warn('frame failed', f, e);
        }
    }
    progressEl.style.display = 'none';
    this.disabled = false;
    const [w, h] = size.split('x').map(Number);
    window.lastActionGroupResult = {
        frames: results,
        characterPrompt,
        size,
        frameWidth: w,
        frameHeight: h,
        framesPer,
        actions: resolvedActions,
        threeViewUrl: window.lastThreeViewImageUrl || null,
        threeViewParams: window.lastThreeViewParams || null,
    };
    const tailHintJimeng =
        '</p><p style="color:#888;font-size:12px;margin-top:6px;">即梦 / 方舟：1) 打开 <code>' +
        API_BASE +
        '/api/jimeng/status</code>，确认 <code>ok</code> 为 true；2) <code>config/.env</code> 的 <code>JIMENG_API_KEY</code> 须为火山方舟「API Key 管理」里<strong>创建时一次性完整复制</strong>的 <code>sk-</code> 密钥（勿用 IAM 的 AKLT）；3) 若错误含 <code>401</code> 或 <code>API key format is incorrect</code>，请在控制台<strong>新建</strong> API Key，替换后重启 <code>node backend/proxy.js</code>；4) 可在 <code>config/.env</code> 临时设 <code>JIMENG_LIVE_TEST=1</code>，访问 <code>' +
        API_BASE +
        '/api/jimeng/live-test</code> 查看方舟返回（用完改回 0）。</p>';
    const tailHintGeneric =
        '</p><p style="color:#888;font-size:12px;margin-top:6px;">请用 <code>http://127.0.0.1:3000</code> 访问（勿 file://），并检查对应服务商密钥与网络。</p>';
    let tailHint = provider === 'jimeng' ? tailHintJimeng : tailHintGeneric;
    const errHint = failMessages.length
        ? '<p style="color:#f0a0a0;font-size:13px;margin-top:10px;white-space:pre-wrap;word-break:break-word;">' +
          failMessages.slice(0, 5).join('\n') +
          (failMessages.length > 5 ? '\n… 其余省略，请打开开发者工具 Console 查看' : '') +
          tailHint
        : '';
    previewEl.innerHTML = results.length
        ? results.reduce((acc, r) => {
              const key = r.action + '_' + r.frameIndex;
              return (
                  acc +
                  '<img src="' +
                  getProxyImageUrl(r.imageUrl) +
                  '" alt="' +
                  key +
                  '" style="width:80px;height:80px;object-fit:contain;border:1px solid rgba(255,255,255,0.2);border-radius:4px;margin:2px;" title="' +
                  r.action +
                  ' ' +
                  r.frameIndex +
                  '">'
              );
          }, '')
        : '<p style="color:#b0b0c0;">未生成到任何帧，请检查 API 或重试。</p>' + errHint;
    resultEl.style.display = 'block';
});

async function exportSpritesheetPng() {
    const r = window.lastActionGroupResult;
    if (!r || !r.frames.length) {
        themedWarn('请先完成一次「批量生成动作组」');
        return;
    }
    const cols = r.framesPer;
    const rows = r.actions.length;
    const c = document.createElement('canvas');
    c.width = cols * r.frameWidth;
    c.height = rows * r.frameHeight;
    const ctx = c.getContext('2d');
    for (let row = 0; row < r.actions.length; row++) {
        for (let col = 0; col < cols; col++) {
            const frame = r.frames.find((f) => f.action === r.actions[row] && f.frameIndex === col);
            if (!frame) continue;
            try {
                const img = await loadImage(getProxyImageUrl(frame.imageUrl));
                ctx.drawImage(img, col * r.frameWidth, row * r.frameHeight, r.frameWidth, r.frameHeight);
            } catch (e) {
                console.warn(e);
            }
        }
    }
    c.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'spritesheet_' + Date.now() + '.png';
        a.click();
        URL.revokeObjectURL(a.href);
    }, 'image/png');
}

function exportCreditsJson() {
    const r = window.lastActionGroupResult;
    if (!r || !r.frames.length) {
        themedWarn('请先完成一次「批量生成动作组」');
        return;
    }
    const obj = {
        generatedAt: new Date().toISOString(),
        characterPrompt: r.characterPrompt,
        size: r.size,
        actions: r.actions,
        threeViewUrl: r.threeViewUrl || null,
        frames: r.frames.map((f) => ({ action: f.action, frameIndex: f.frameIndex })),
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'credits.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

async function exportZipByAnimation() {
    const r = window.lastActionGroupResult;
    if (!r || !r.frames.length) {
        themedWarn('请先完成一次「批量生成动作组」');
        return;
    }
    if (typeof JSZip === 'undefined') {
        themedWarn('请等待 JSZip 加载完成');
        return;
    }
    const zip = new JSZip();
    const actionOrder = [...new Set(r.frames.map((f) => f.action))];
    for (const action of actionOrder) {
        const folder = zip.folder(action);
        const list = r.frames.filter((f) => f.action === action).sort((a, b) => a.frameIndex - b.frameIndex);
        for (const frame of list) {
            const blob = await fetchImageAsBlob(frame.imageUrl);
            folder.file(frame.frameIndex + '.png', blob, { binary: true });
        }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'sprites_by_animation_' + Date.now() + '.zip';
    a.click();
    URL.revokeObjectURL(a.href);
}

async function exportZipByFrame() {
    const r = window.lastActionGroupResult;
    if (!r || !r.frames.length) {
        themedWarn('请先完成一次「批量生成动作组」');
        return;
    }
    if (typeof JSZip === 'undefined') {
        themedWarn('请等待 JSZip 加载完成');
        return;
    }
    const zip = new JSZip();
    for (let i = 0; i < r.frames.length; i++) {
        const frame = r.frames[i];
        const blob = await fetchImageAsBlob(frame.imageUrl);
        zip.file(frame.action + '_' + frame.frameIndex + '.png', blob, { binary: true });
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'sprites_by_frame_' + Date.now() + '.zip';
    a.click();
    URL.revokeObjectURL(a.href);
}

async function downloadThreeViewPng() {
    if (!window.lastThreeViewImageUrl) {
        themedWarn('请先生成三视图');
        return;
    }
    const blob = await fetchImageAsBlob(window.lastThreeViewImageUrl);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'three_view_' + Date.now() + '.png';
    a.click();
    URL.revokeObjectURL(a.href);
}

async function downloadThreeViewZip() {
    if (!window.lastThreeViewImageUrl) {
        themedWarn('请先生成三视图');
        return;
    }
    if (typeof JSZip === 'undefined') {
        themedWarn('请等待 JSZip 加载完成');
        return;
    }
    const blob = await fetchImageAsBlob(window.lastThreeViewImageUrl);
    const zip = new JSZip();
    zip.file('three_view.png', blob, { binary: true });
    const meta = {
        exportedAt: new Date().toISOString(),
        threeViewUrl: window.lastThreeViewImageUrl,
        threeViewParams: window.lastThreeViewParams || null,
    };
    zip.file('three_view_meta.json', JSON.stringify(meta, null, 2));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'three_view_' + Date.now() + '.zip';
    a.click();
    URL.revokeObjectURL(a.href);
}

document.getElementById('exportSpritesheetPng')?.addEventListener('click', exportSpritesheetPng);
document.getElementById('exportCreditsJson')?.addEventListener('click', exportCreditsJson);
document.getElementById('exportZipByAnimation')?.addEventListener('click', exportZipByAnimation);
document.getElementById('exportZipByFrame')?.addEventListener('click', exportZipByFrame);
document.getElementById('downloadThreeViewPng')?.addEventListener('click', downloadThreeViewPng);
document.getElementById('downloadThreeViewZip')?.addEventListener('click', downloadThreeViewZip);

