/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3
 *
 * 活动日志模块（从 user-center-page.js 拆分）
 */
(function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────────────── */

    const _activityLogState = { page: 1, loading: false, hasMore: true };

    /* ── Helpers ───────────────────────────────────────────────────── */

    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diffMs = now - then;
        if (diffMs < 0) return '刚刚';
        const seconds = Math.floor(diffMs / 1000);
        if (seconds < 60) return '刚刚';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}分钟前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小时前`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}天前`;
        const d = new Date(dateStr);
        return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    }

    function getActivityIcon(action) {
        if (!action) return { icon: 'fa-circle', cls: 'auth' };
        if (action.includes('项目')) return { icon: 'fa-folder', cls: 'project' };
        if (action.includes('素材')) return { icon: 'fa-image', cls: 'asset' };
        if (action.includes('AI') || action.includes('生成')) return { icon: 'fa-magic', cls: 'image' };
        if (action.includes('登录') || action.includes('注册') || action.includes('认证')) return { icon: 'fa-user', cls: 'auth' };
        return { icon: 'fa-circle', cls: 'auth' };
    }

    function buildActivityItem(log) {
        const iconInfo = getActivityIcon(log.action);
        let detailHtml = '';
        if (log.details) {
            detailHtml = ` <span class="activity-detail">${escapeHtml(log.details)}</span>`;
        }
        return `
            <div class="activity-item">
                <div class="activity-item-header">
                    <div class="activity-icon activity-icon--${iconInfo.cls}">
                        <i class="fas ${iconInfo.icon}"></i>
                    </div>
                    <span class="activity-action">${escapeHtml(log.action)}${detailHtml}</span>
                    <span class="activity-time">${formatRelativeTime(log.created_at)}</span>
                </div>
            </div>
        `;
    }

    // escapeHtml 由 js/html-utils.js 提供（全局函数）

    /* ── Load Activity Log ─────────────────────────────────────────── */

    async function loadActivityLog(page) {
        if (_activityLogState.loading) return;
        _activityLogState.loading = true;
        const listEl = document.getElementById('activity-log-list');
        const loadMoreWrap = document.getElementById('activity-load-more-wrap');
        if (!listEl) { _activityLogState.loading = false; return; }

        if (page === 1) {
            listEl.innerHTML = '<div class="activity-loading"><i class="fas fa-spinner fa-spin" style="color:#00f0ff;font-size:24px"></i><span style="color:#b0b0c0;margin-left:10px">加载中...</span></div>';
            _activityLogState.hasMore = true;
        }

        try {
            const r = await fetch(`/api/activity-log?page=${page}&limit=20`, { credentials: 'include' });
            if (r.status === 401) { window.location.href = loginHtmlPath(); return; }
            const data = await r.json();
            const logs = data.logs || [];

            if (page === 1) listEl.innerHTML = '';

            if (logs.length === 0 && page === 1) {
                listEl.innerHTML = '<div class="activity-empty"><i class="fas fa-inbox"></i><span>暂无活动记录</span></div>';
                if (loadMoreWrap) loadMoreWrap.style.display = 'none';
                _activityLogState.hasMore = false;
            } else {
                logs.forEach((log) => {
                    listEl.insertAdjacentHTML('beforeend', buildActivityItem(log));
                });
                const totalPages = Math.ceil((data.total || 0) / (data.limit || 20));
                if (page >= totalPages) {
                    _activityLogState.hasMore = false;
                    if (loadMoreWrap) loadMoreWrap.style.display = 'none';
                } else {
                    if (loadMoreWrap) loadMoreWrap.style.display = '';
                }
            }
        } catch (_e) {
            if (page === 1) {
                listEl.innerHTML = '<div class="activity-empty"><i class="fas fa-exclamation-triangle"></i><span>加载失败，请稍后重试</span></div>';
            }
        }

        _activityLogState.loading = false;
    }

    /* ── Init ──────────────────────────────────────────────────────── */

    function initActivityLog() {
        const loadMoreBtn = document.getElementById('activity-load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                _activityLogState.page++;
                loadActivityLog(_activityLogState.page);
            });
        }

        // Hook into tab switching: load data when activity-log tab becomes visible
        const activityTab = document.querySelector('.user-center-tab[data-tab="activity-log"]');
        if (activityTab) {
            activityTab.addEventListener('click', () => {
                if (_activityLogState.page === 1 && !_activityLogState.loading) {
                    loadActivityLog(1);
                }
            });
        }

        // If activity-log tab is already active on load, fetch immediately
        if (activityTab && activityTab.classList.contains('active')) {
            loadActivityLog(1);
        }
    }

    /* ── Export ─────────────────────────────────────────────────────── */

    window.UserCenterActivity = {
        formatRelativeTime,
        getActivityIcon,
        buildActivityItem,
        loadActivityLog,
        initActivityLog,
    };
})();
