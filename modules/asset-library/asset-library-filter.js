/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * 素材库 - 筛选与排序（纯逻辑，无 DOM 操作）
 * 标签系统、上下文菜单、项目选择器等 UI 逻辑保留在 asset-library.js
 */
(function () {
    'use strict';

    /**
     * 筛选 + 排序素材列表
     * @param {Array} assets - 素材数组
     * @param {Object} opts - 筛选选项
     * @param {HTMLInputElement}  [opts.assetSearchEl]     - 搜索框
     * @param {HTMLSelectElement} [opts.categoryFilterEl]  - 分类下拉
     * @param {HTMLSelectElement} [opts.typeFilterEl]      - 类型下拉
     * @param {HTMLSelectElement} [opts.sortOrderEl]       - 排序下拉
     * @param {string|null}       [opts.tagFilter]         - 标签筛选值
     * @returns {Array} 筛选后的素材
     */
    function filterAssets(assets, opts) {
        const e = opts || {};
        const q = (e.assetSearchEl ? e.assetSearchEl.value : '').trim().toLowerCase();
        const cat = e.categoryFilterEl ? e.categoryFilterEl.value : 'all';
        const type = e.typeFilterEl ? e.typeFilterEl.value : 'all';
        const sort = e.sortOrderEl ? e.sortOrderEl.value : 'newest';
        const tag = e.tagFilter || null;

        let filtered = (assets || []).filter(function (a) {
            if (cat !== 'all' && a.category !== cat) return false;
            if (type !== 'all') {
                const at = (a.type || '').toLowerCase();
                if (at !== type && !at.startsWith(type + '/')) return false;
            }
            if (q) {
                const nameMatch = (a.name || '').toLowerCase().indexOf(q) !== -1;
                const descMatch = (a.fileName || '').toLowerCase().indexOf(q) !== -1;
                if (!nameMatch && !descMatch) return false;
            }
            return true;
        });

        // 按标签筛选
        if (tag) {
            filtered = filtered.filter(function (a) {
                return Array.isArray(a.tags) && a.tags.indexOf(tag) !== -1;
            });
        }

        // 排序
        if (sort === 'newest') {
            filtered.sort(function (a, b) {
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
        } else if (sort === 'oldest') {
            filtered.sort(function (a, b) {
                return (a.createdAt || 0) - (b.createdAt || 0);
            });
        } else if (sort === 'name') {
            filtered.sort(function (a, b) {
                return (a.name || '').localeCompare(b.name || '');
            });
        }

        return filtered;
    }

    // ── 导出 ──
    window.AssetLibraryFilter = {
        filterAssets: filterAssets,
    };
})();
