/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
/**
 * Artifex：浏览器端项目 / 素材 / 风格预设等 localStorage 导出、导入与用量提示。
 * 依赖 GameUiUserScope（与 user-storage-scope.js 一致键名规则）。
 */
(function (global) {
    'use strict';

    var EXPORT_VERSION = 1;
    var BASE_KEYS = ['gameui-projects', 'assetLibrary_v1', 'style_presets_v1', 'generatedImages'];

    function scopedKey(base) {
        try {
            if (global.GameUiUserScope && typeof global.GameUiUserScope.key === 'function') {
                return global.GameUiUserScope.key(base);
            }
        } catch (e) {
            /* ignore */
        }
        try {
            var id = global.localStorage.getItem('gameui-session-user-id');
            return id ? base + ':u' + id : base;
        } catch (e2) {
            return base;
        }
    }

    function collectPayload() {
        var out = { version: EXPORT_VERSION, exportedAt: new Date().toISOString(), keys: {}, meta: {} };
        BASE_KEYS.forEach(function (base) {
            var k = scopedKey(base);
            try {
                var v = global.localStorage.getItem(k);
                if (v != null && v !== '') {
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
        var total = 0;
        try {
            for (var i = 0; i < global.localStorage.length; i++) {
                var key = global.localStorage.key(i);
                if (!key) continue;
                var val = global.localStorage.getItem(key) || '';
                total += key.length + val.length;
            }
        } catch (e) {
            return null;
        }
        return total;
    }

    function formatBytes(n) {
        if (n == null || isNaN(n)) return '—';
        if (n < 1024) return n + ' B';
        if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1048576).toFixed(2) + ' MB';
    }

    function downloadJson(filename, obj) {
        var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
        var a = document.createElement('a');
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
        var payload = collectPayload();
        var stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        downloadJson('artifex-local-backup-' + stamp + '.json', payload);
        return payload;
    }

    function applyImport(payload, mode) {
        if (!payload || typeof payload.keys !== 'object') throw new Error('无效的备份文件');
        var keys = payload.keys;
        Object.keys(keys).forEach(function (k) {
            if (mode === 'replace' || mode === 'merge') {
                try {
                    if (mode === 'merge') {
                        var cur = global.localStorage.getItem(k);
                        if (cur && (k.indexOf('gameui-projects') !== -1 || k.indexOf('assetLibrary') !== -1)) {
                            /* 合并：仅对 JSON 数组类简单合并较危险，此处 merge 与 replace 相同写入备份值 */
                        }
                    }
                    global.localStorage.setItem(k, keys[k]);
                } catch (e) {
                    throw new Error('写入失败: ' + k + ' — ' + (e && e.message));
                }
            }
        });
    }

    function bindDashboardUi() {
        var usageEl = document.getElementById('artifex-storage-usage');
        var btnExport = document.getElementById('artifex-export-local-btn');
        var btnImport = document.getElementById('artifex-import-local-btn');
        var fileInput = document.getElementById('artifex-import-local-file');
        if (!usageEl && !btnExport) return;

        function refreshUsage() {
            if (!usageEl) return;
            var b = estimateUsedBytes();
            var approxQuota = 5 * 1024 * 1024;
            var pct = b != null ? Math.min(100, Math.round((b / approxQuota) * 100)) : null;
            usageEl.textContent =
                b != null
                    ? '本地数据约 ' + formatBytes(b) + '（按 ~5MB 浏览器上限粗算约 ' + pct + '%，实际因浏览器而异）'
                    : '无法估算本地存储用量';
        }
        refreshUsage();

        if (btnExport) {
            btnExport.addEventListener('click', function () {
                try {
                    exportAll();
                    if (global.TechUI && typeof global.TechUI.toast === 'function') {
                        global.TechUI.toast('已导出 JSON 备份文件', 'success', 2600);
                    }
                } catch (e) {
                    if (global.TechUI && typeof global.TechUI.toast === 'function') {
                        global.TechUI.toast('导出失败：' + (e && e.message), 'error', 4000);
                    }
                }
            });
        }

        if (btnImport && fileInput) {
            btnImport.addEventListener('click', function () {
                fileInput.click();
            });
            fileInput.addEventListener('change', function () {
                var f = fileInput.files && fileInput.files[0];
                fileInput.value = '';
                if (!f) return;
                var reader = new FileReader();
                reader.onload = function () {
                    try {
                        var payload = JSON.parse(reader.result);
                        var run = function (mode) {
                            applyImport(payload, mode);
                            refreshUsage();
                            if (global.TechUI && typeof global.TechUI.toast === 'function') {
                                global.TechUI.toast('导入完成，建议刷新页面以加载新数据', 'success', 3200);
                            }
                        };
                        if (global.TechUI && typeof global.TechUI.confirm === 'function') {
                            global.TechUI.confirm(
                                '导入将覆盖当前账号下同名 localStorage 键中的项目 / 素材库 / 风格预设等数据。是否继续？',
                                '导入本地备份',
                                '覆盖并导入',
                                '取消'
                            ).then(function (ok) {
                                if (ok) run('replace');
                            });
                        } else if (global.confirm('确定导入？将覆盖本地同名键数据')) {
                            run('replace');
                        }
                    } catch (e) {
                        if (global.TechUI && typeof global.TechUI.toast === 'function') {
                            global.TechUI.toast('导入失败：' + (e && e.message), 'error', 4000);
                        }
                    }
                };
                reader.readAsText(f, 'utf-8');
            });
        }
    }

    global.ArtifexDataPortability = {
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
})(typeof window !== 'undefined' ? window : this);
