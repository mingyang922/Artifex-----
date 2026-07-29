/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
/**
 * Artifex：浏览器端项目 / 素材 / 风格预设等 localStorage 导出、导入与用量提示。
 * 依赖 GameUiUserScope（与 user-storage-scope.js 一致键名规则）。
 */
'use strict';
var _root = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this;

const EXPORT_VERSION = 1;
const BASE_KEYS = ['gameui-projects', 'assetLibrary_v1', 'style_presets_v1', 'generatedImages'];

function scopedKey(base) {
    try {
        if (_root.GameUiUserScope && typeof _root.GameUiUserScope.key === 'function') {
            return _root.GameUiUserScope.key(base);
        }
    } catch (_e) {
        /* ignore */
    }
    try {
        const id = _root.localStorage.getItem('gameui-session-user-id');
        return id ? base + ':u' + id : base;
    } catch (_e2) {
        return base;
    }
}

function collectPayload() {
    const out = { version: EXPORT_VERSION, exportedAt: new Date().toISOString(), keys: {}, meta: {} };
    BASE_KEYS.forEach(function (base) {
        const k = scopedKey(base);
        try {
            const v = _root.localStorage.getItem(k);
            if (v !== null && v !== '') {
                out.keys[k] = v;
                out.meta[k] = { bytes: v.length };
            }
        } catch (e) {
            out.meta[k] = { error: String(e && e.message) };
        }
    });
    return out;
}

/** 估算当前 origin 下 localStorage 已用字节（近似） */
function estimateUsedBytes() {
    let total = 0;
    try {
        for (let i = 0; i < _root.localStorage.length; i++) {
            const key = _root.localStorage.key(i);
            if (!key) continue;
            const val = _root.localStorage.getItem(key) || '';
            total += key.length + val.length;
        }
    } catch (_e) {
        return null;
    }
    return total;
}

function formatBytes(n) {
    if (n === null || isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
}

function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 0);
}

function exportAll() {
    const payload = collectPayload();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadJson('artifex-local-backup-' + stamp + '.json', payload);
    return payload;
}

function applyImport(payload, mode) {
    if (!payload || typeof payload.keys !== 'object') throw new Error('无效的备份文件');
    const keys = payload.keys;
    const MAX_BACKUP_SIZE = 10 * 1024 * 1024; // 10MB 上限
    let totalSize = 0;
    Object.keys(keys).forEach(function (k) {
        const val = keys[k];
        if (typeof val !== 'string') return; // 跳过非字符串值
        totalSize += k.length + val.length;
        if (totalSize > MAX_BACKUP_SIZE) {
            throw new Error('备份文件过大（超过 10MB 限制）');
        }
        // 键名安全检查：只允许字母、数字、连字符、下划线、点号
        if (!/^[\w.-]+$/.test(k)) {
            console.warn('[data-portability] 跳过不安全的键名:', k);
            return;
        }
        if (mode === 'replace' || mode === 'merge') {
            try {
                _root.localStorage.setItem(k, val);
            } catch (e) {
                throw new Error('写入失败: ' + k + ' — ' + (e && e.message));
            }
        }
    });
}

function bindDashboardUi() {
    const usageEl = document.getElementById('artifex-storage-usage');
    const btnExport = document.getElementById('artifex-export-local-btn');
    const btnImport = document.getElementById('artifex-import-local-btn');
    const fileInput = document.getElementById('artifex-import-local-file');
    if (!usageEl && !btnExport) return;

    function refreshUsage() {
        if (!usageEl) return;
        const b = estimateUsedBytes();
        const approxQuota = 5 * 1024 * 1024;
        const pct = b !== null ? Math.min(100, Math.round((b / approxQuota) * 100)) : null;
        usageEl.textContent =
            b !== null
                ? '本地数据约 ' + formatBytes(b) + '（按 ~5MB 浏览器上限粗算约 ' + pct + '%，实际因浏览器而异）'
                : '无法估算本地存储用量';
    }
    refreshUsage();

    if (btnExport) {
        btnExport.addEventListener('click', function () {
            try {
                exportAll();
                if (_root.TechUI && typeof _root.TechUI.toast === 'function') {
                    _root.TechUI.toast('已导出 JSON 备份文件', 'success', 2600);
                }
            } catch (e) {
                if (_root.TechUI && typeof _root.TechUI.toast === 'function') {
                    _root.TechUI.toast('导出失败：' + (e && e.message), 'error', 4000);
                }
            }
        });
    }

    if (btnImport && fileInput) {
        btnImport.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function () {
            const f = fileInput.files && fileInput.files[0];
            fileInput.value = '';
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    const payload = JSON.parse(reader.result);
                    const run = function (mode) {
                        applyImport(payload, mode);
                        refreshUsage();
                        if (_root.TechUI && typeof _root.TechUI.toast === 'function') {
                            _root.TechUI.toast('导入完成，建议刷新页面以加载新数据', 'success', 3200);
                        }
                    };
                    if (_root.TechUI && typeof _root.TechUI.confirm === 'function') {
                        _root.TechUI.confirm(
                            '导入将覆盖当前账号下同名 localStorage 键中的项目 / 素材库 / 风格预设等数据。是否继续？',
                            '导入本地备份',
                            '覆盖并导入',
                            '取消'
                        ).then(function (ok) {
                            if (ok) run('replace');
                        });
                    } else if (_root.confirm('确定导入？将覆盖本地同名键数据')) {
                        run('replace');
                    }
                } catch (e) {
                    if (_root.TechUI && typeof _root.TechUI.toast === 'function') {
                        _root.TechUI.toast('导入失败：' + (e && e.message), 'error', 4000);
                    }
                }
            };
            reader.readAsText(f, 'utf-8');
        });
    }
}

_root.ArtifexDataPortability = {
    collectPayload: collectPayload,
    exportAll: exportAll,
    estimateUsedBytes: estimateUsedBytes,
    formatBytes: formatBytes,
    bindDashboardUi: bindDashboardUi,
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDashboardUi);
} else {
    bindDashboardUi();
}
