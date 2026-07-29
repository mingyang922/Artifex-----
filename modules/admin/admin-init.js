/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
// escapeHtml 由 js/html-utils.js 提供（全局函数）
// Tab 切换
document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach((c) => (c.style.display = 'none'));
        const tabContent = document.getElementById('tab-' + tab.dataset.tab);
        if (tabContent) tabContent.style.display = 'block';
    });
});

// 加载数据
async function loadData() {
    try {
        // 检查权限
        const meRes = await fetch('/api/me', { credentials: 'include' });
        if (meRes.status === 401) {
            window.location.href = loginHtmlPath();
            return;
        }
        const _me = await meRes.json();

        // 加载用户列表
        const usersRes = await fetch('/api/admin/users', { credentials: 'include' });
        const usersData = await usersRes.json();
        if (usersData.ok) {
            document.getElementById('stat-total-users').textContent = usersData.users.length;
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = usersData.users
                .map(
                    (u) => `
                            <tr>
                                <td>${escapeHtml(u.id)}</td>
                                <td>${escapeHtml(u.username)}</td>
                                <td>${escapeHtml(u.email)}</td>
                                <td><span class="badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}">${escapeHtml(u.role)}</span></td>
                                <td>${escapeHtml(new Date(u.created_at).toLocaleDateString())}</td>
                            </tr>
                        `
                )
                .join('');
        }

        // 加载用量统计
        const usageRes = await fetch('/api/admin/usage', { credentials: 'include' });
        const usageData = await usageRes.json();
        if (usageData.ok) {
            document.getElementById('stat-today-calls').textContent = usageData.summary.today;
            document.getElementById('stat-total-calls').textContent = usageData.summary.total;

            const providerBody = document.getElementById('provider-stats-body');
            providerBody.innerHTML = usageData.summary.byProvider
                .map(
                    (p) => `
                            <tr>
                                <td>${escapeHtml(p.provider)}</td>
                                <td>${escapeHtml(p.count)}</td>
                            </tr>
                        `
                )
                .join('');

            const detailsBody = document.getElementById('usage-details-body');
            detailsBody.innerHTML = usageData.details
                .slice(0, 50)
                .map(
                    (d) => `
                            <tr>
                                <td>${escapeHtml(d.username)}</td>
                                <td>${escapeHtml(d.provider)}</td>
                                <td>${escapeHtml(d.operation)}</td>
                                <td><span class="badge ${d.status === 'success' ? 'badge-success' : 'badge-error'}">${escapeHtml(d.status)}</span></td>
                                <td>${escapeHtml(d.count)}</td>
                            </tr>
                        `
                )
                .join('');
        }
    } catch (err) {
        console.error('加载失败:', err);
    }
}

loadData();
