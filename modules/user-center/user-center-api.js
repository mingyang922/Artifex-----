/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * API 设置管理模块（从 user-center-page.js 拆分）
 */
(function () {
    'use strict';

    /* ── API Provider Form Schema ──────────────────────────────────── */

    function getApiFormSchema(provider) {
        if (provider === 'tencent') {
            return {
                field1: { key: 'secretId', label: 'SecretId', placeholder: 'AKID...' },
                field2: { key: 'secretKey', label: 'SecretKey', placeholder: '请输入 SecretKey' },
                field3: null,
            };
        }
        if (provider === 'sdwebui') {
            return {
                field1: { key: 'baseUrl', label: 'WebUI 地址', placeholder: 'http://127.0.0.1:7860' },
                field2: { key: 'apiKey', label: 'API Key（可选）', placeholder: '未设置可留空' },
                field3: null,
            };
        }
        if (provider === 'alibaba') {
            return {
                field1: { key: 'apiKey', label: 'API Key', placeholder: 'sk-...' },
                field2: { key: 'model', label: '文生图模型（可选）', placeholder: 'wanx-v1 / wanx2.1-t2i-turbo' },
                field3: { key: 'visionModel', label: '多模态模型（可选）', placeholder: 'qwen-vl-plus' },
            };
        }
        return {
            field1: { key: 'apiKey', label: 'API Key', placeholder: 'sk-...' },
            field2: { key: 'model', label: '模型（可选）', placeholder: 'doubao-seedream-4.0-250828' },
            field3: {
                key: 'endpoint',
                label: '接口地址（可选）',
                placeholder: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
            },
        };
    }

    /* ── Update Form Fields ────────────────────────────────────────── */

    function updateApiSettingsFields(provider) {
        const schema = getApiFormSchema(provider);
        const f1 = document.getElementById('api-field-1');
        const f1Label = document.getElementById('api-field-1-label');
        const f2Wrap = document.getElementById('api-field-2-wrap');
        const f2 = document.getElementById('api-field-2');
        const f2Label = document.getElementById('api-field-2-label');
        const f3Wrap = document.getElementById('api-field-3-wrap');
        const f3 = document.getElementById('api-field-3');
        const f3Label = document.getElementById('api-field-3-label');
        if (!f1 || !f1Label || !f2Wrap || !f2 || !f2Label || !f3Wrap || !f3 || !f3Label) return;
        f1Label.textContent = schema.field1.label;
        f1.placeholder = schema.field1.placeholder;
        f2.value = '';
        f3.value = '';
        if (schema.field2) {
            f2Wrap.style.display = '';
            f2Label.textContent = schema.field2.label;
            f2.placeholder = schema.field2.placeholder;
        } else {
            f2Wrap.style.display = 'none';
        }
        if (schema.field3) {
            f3Wrap.style.display = '';
            f3Label.textContent = schema.field3.label;
            f3.placeholder = schema.field3.placeholder;
        } else {
            f3Wrap.style.display = 'none';
        }
    }

    /* ── Build Credential Payload ──────────────────────────────────── */

    function buildApiCredentialPayload(provider) {
        const schema = getApiFormSchema(provider);
        const f1 = document.getElementById('api-field-1');
        const f2 = document.getElementById('api-field-2');
        const f3 = document.getElementById('api-field-3');
        if (!f1 || !f2 || !f3) return null;
        const payload = {};
        if (schema.field1 && String(f1.value || '').trim()) payload[schema.field1.key] = String(f1.value || '').trim();
        if (schema.field2 && String(f2.value || '').trim()) payload[schema.field2.key] = String(f2.value || '').trim();
        if (schema.field3 && String(f3.value || '').trim()) payload[schema.field3.key] = String(f3.value || '').trim();
        return payload;
    }

    /* ── Refresh Status ────────────────────────────────────────────── */

    async function refreshApiSettingsStatus() {
        const statusEl = document.getElementById('api-settings-status');
        if (!statusEl) return null;
        try {
            const r = await fetch('/api/me/api-settings/status', { credentials: 'include' });
            if (r.status === 401) {
                window.location.href = loginHtmlPath();
                return null;
            }
            const data = await r.json();
            const status = data.status || {};
            const parts = ['jimeng', 'alibaba', 'tencent', 'sdwebui'].map(
                (k) => `${k}:${status[k] ? '已配置' : '未配置'}`
            );
            statusEl.textContent = `配置状态：${parts.join(' | ')}${data.isAdmin ? ' | 角色:管理员' : ' | 角色:普通用户'}`;
            return data;
        } catch (_e) {
            statusEl.textContent = '配置状态读取失败，请稍后重试';
            return null;
        }
    }

    /* ── Init API Settings Center ──────────────────────────────────── */

    function initApiSettingsCenter() {
        const providerSelect = document.getElementById('api-provider-select');
        const saveBtn = document.getElementById('save-api-settings-btn');
        const clearBtn = document.getElementById('clear-api-settings-btn');
        const refreshBtn = document.getElementById('refresh-api-settings-btn');
        const field1 = document.getElementById('api-field-1');
        if (!providerSelect || !saveBtn || !clearBtn || !refreshBtn || !field1) return;

        const syncSchema = () => {
            updateApiSettingsFields(providerSelect.value);
            field1.value = '';
        };
        providerSelect.addEventListener('change', syncSchema);
        syncSchema();

        saveBtn.addEventListener('click', async () => {
            try {
                const provider = providerSelect.value;
                const credentials = buildApiCredentialPayload(provider);
                if (!credentials || Object.keys(credentials).length === 0) {
                    window.TechUI.toast('请至少填写一个有效字段', 'error');
                    return;
                }
                const csrfToken = await getCsrfToken();
                const r = await fetch('/api/me/api-settings', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                    body: JSON.stringify({ provider, credentials }),
                });
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    window.TechUI.toast((err && err.message) || '保存失败', 'error');
                    return;
                }
                window.TechUI.toast('API 配置已保存', 'success');
                refreshApiSettingsStatus();
            } catch (error) {
                console.error('保存 API 配置失败:', error);
                window.TechUI.toast('保存失败，请重试', 'error');
            }
        });

        clearBtn.addEventListener('click', async () => {
            try {
                const provider = providerSelect.value;
                const csrfToken = await getCsrfToken();
                const r = await fetch(`/api/me/api-settings/${encodeURIComponent(provider)}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: { 'X-XSRF-Token': csrfToken },
                });
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    window.TechUI.toast((err && err.message) || '清空失败', 'error');
                    return;
                }
                window.TechUI.toast('当前服务商配置已清空', 'success');
                refreshApiSettingsStatus();
            } catch (error) {
                console.error('清空 API 配置失败:', error);
                window.TechUI.toast('清空失败，请重试', 'error');
            }
        });

        refreshBtn.addEventListener('click', () => {
            refreshApiSettingsStatus();
        });

        refreshApiSettingsStatus();
    }

    /* ── Export ─────────────────────────────────────────────────────── */

    window.UserCenterApi = {
        getApiFormSchema,
        updateApiSettingsFields,
        buildApiCredentialPayload,
        refreshApiSettingsStatus,
        initApiSettingsCenter,
    };
})();
