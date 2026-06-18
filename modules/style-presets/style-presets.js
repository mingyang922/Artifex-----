/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
            'use strict';
            if (window.PageEffects) {
                window.PageEffects.initPointerGlow();
            }

            (function initCardSpotlight() {
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                const selector = '.top-bar, .asset-wrap';
                const bind = (el) => {
                    if (
                        !el ||
                        el.dataset.cardGlowBound === '1' ||
                        !el.style ||
                        typeof el.style.setProperty !== 'function'
                    )
                        return;
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
                const scan = () => document.querySelectorAll(selector).forEach(bind);
                scan();
                let debounceTimer = null;
                const observer = new MutationObserver(() => {
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(scan, 200);
                });
                observer.observe(document.body, { childList: true, subtree: true });
                window.addEventListener('beforeunload', () => observer.disconnect());
            })();

            function uiToast(message, type) {
                if (window.TechUI && typeof window.TechUI.toast === 'function') {
                    window.TechUI.toast(message, type || 'success');
                }
            }
            function uiConfirm(message, title) {
                return window.TechUI.confirm(message, title || '请确认', '确定', '取消');
            }
            function uiPrompt(title, label, value) {
                return window.TechUI.prompt(title, label, value || '', '确定', '取消');
            }

            const STYLE_PRESETS_STORE = 'style_presets_v1';
            function stylePresetsStorageKey() {
                if (typeof GameUiUserScope !== 'undefined' && typeof GameUiUserScope.key === 'function') {
                    return GameUiUserScope.key(STYLE_PRESETS_STORE);
                }
                return STYLE_PRESETS_STORE;
            }
            function readStylePresetsList() {
                try {
                    const raw = localStorage.getItem(stylePresetsStorageKey());
                    const arr = raw ? JSON.parse(raw) : [];
                    return Array.isArray(arr) ? arr : [];
                } catch (_) {
                    return [];
                }
            }
            function writeStylePresetsList(list) {
                try {
                    localStorage.setItem(stylePresetsStorageKey(), JSON.stringify(list));
                } catch (e) {
                    console.error(e);
                    uiToast('风格预设保存失败（存储空间可能不足）', 'warn');
                    return false;
                }
                try {
                    window.dispatchEvent(new CustomEvent('stylePresetsChanged', { bubbles: true }));
                } catch (_) {}
                renderStylePresetLibrary();
                return true;
            }
            function renderStylePresetLibrary() {
                const root = document.getElementById('stylePresetLibraryList');
                if (!root) return;
                const list = readStylePresetsList();
                root.innerHTML = '';
                if (!list.length) {
                    const p = document.createElement('p');
                    p.className = 'style-preset-empty';
                    p.textContent = '暂无风格预设。可在 AI 图片生成或工作台中创建。';
                    root.appendChild(p);
                    return;
                }
                list.forEach((preset) => {
                    const row = document.createElement('div');
                    row.className = 'style-preset-lib-row';
                    const head = document.createElement('div');
                    head.className = 'style-preset-lib-row-header';
                    const title = document.createElement('div');
                    title.className = 'style-preset-lib-name';
                    title.textContent = preset.name || '未命名';
                    const meta = document.createElement('div');
                    meta.className = 'style-preset-lib-meta';
                    meta.textContent = (preset.createdAt || '').slice(0, 10);
                    head.appendChild(title);
                    head.appendChild(meta);
                    if (preset.referenceThumb) {
                        const im = document.createElement('img');
                        im.src = preset.referenceThumb;
                        im.className = 'style-preset-lib-thumb';
                        im.alt = '预设参考图';
                        row.appendChild(im);
                    }
                    const ta = document.createElement('textarea');
                    ta.className = 'style-preset-lib-snippet';
                    ta.value = preset.styleText || '';
                    ta.rows = 3;
                    const actions = document.createElement('div');
                    actions.className = 'style-preset-lib-actions';
                    const btnSave = document.createElement('button');
                    btnSave.className = 'btn btn-small btn-primary';
                    btnSave.type = 'button';
                    btnSave.textContent = '保存片段';
                    btnSave.addEventListener('click', () => {
                        const next = readStylePresetsList().map((x) =>
                            String(x.id) === String(preset.id)
                                ? Object.assign({}, x, { styleText: ta.value.trim() })
                                : x
                        );
                        if (writeStylePresetsList(next)) {
                            uiToast('风格片段已更新', 'success');
                        }
                    });
                    const btnCopy = document.createElement('button');
                    btnCopy.className = 'btn btn-small';
                    btnCopy.type = 'button';
                    btnCopy.textContent = '复制为新预设';
                    btnCopy.addEventListener('click', async () => {
                        const nm = await uiPrompt('复制为预设', '新预设名称：', (preset.name || '预设') + ' 副本');
                        if (!nm || !String(nm).trim()) return;
                        const nu = readStylePresetsList();
                        nu.push({
                            id: Date.now().toString(),
                            name: String(nm).trim(),
                            styleText: ta.value.trim() || preset.styleText || '',
                            referenceThumb: preset.referenceThumb || null,
                            createdAt: new Date().toISOString(),
                        });
                        if (writeStylePresetsList(nu)) {
                            uiToast('已复制为新预设', 'success');
                        }
                    });
                    const btnDel = document.createElement('button');
                    btnDel.className = 'btn btn-small';
                    btnDel.type = 'button';
                    btnDel.textContent = '删除';
                    btnDel.addEventListener('click', async () => {
                        const ok = await uiConfirm('确定删除该风格预设？此操作不可撤销。', '删除风格预设');
                        if (!ok) return;
                        const next = readStylePresetsList().filter((x) => String(x.id) !== String(preset.id));
                        writeStylePresetsList(next);
                        uiToast('已删除', 'success');
                    });
                    actions.appendChild(btnSave);
                    actions.appendChild(btnCopy);
                    actions.appendChild(btnDel);
                    row.appendChild(head);
                    row.appendChild(ta);
                    row.appendChild(actions);
                    root.appendChild(row);
                });
            }

            async function boot() {
                try {
                    await GameUiUserScope.ensure();
                } catch (e) {
                    console.warn('用户态校验失败：', e);
                }
                if (!window.__stylePresetPageListeners) {
                    window.__stylePresetPageListeners = true;
                    window.addEventListener('storage', (e) => {
                        if (e.key === stylePresetsStorageKey()) {
                            renderStylePresetLibrary();
                        }
                    });
                    window.addEventListener('stylePresetsChanged', () => renderStylePresetLibrary());
                }
                renderStylePresetLibrary();
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', boot);
            } else {
                boot();
            }
