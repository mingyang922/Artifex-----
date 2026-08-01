'use strict';

(async function loadSharedProject() {
    const token = new URLSearchParams(location.search).get('token');
    const errorEl = document.getElementById('shareError');
    if (!token) {
        errorEl.hidden = false;
        errorEl.textContent = '分享链接缺少访问凭证。';
        return;
    }
    try {
        const response = await fetch(`/api/shared-projects/${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.message || '分享链接无效');
        const project = data.project;
        document.title = `${project.name} - Artifex 项目预览`;
        document.getElementById('projectName').textContent = project.name;
        document.getElementById('projectDescription').textContent = project.description || '暂无项目说明';
        document.getElementById('reviewStatus').textContent = project.review_status || 'draft';
        document.getElementById('assetCount').textContent = project.assets.length;
        document.getElementById('projectVersion').textContent = `v${project.version}`;
        document.getElementById('projectType').textContent = project.type || '未分类';
        document.getElementById('updatedAt').textContent = new Date(project.updated_at).toLocaleDateString();
        const list = document.getElementById('assetList');
        list.innerHTML = project.assets.length
            ? project.assets
                  .map(
                      (asset) => `<article class="workflow-card">
                        <span class="status-pill">${escapeHtml(asset.type || 'asset')}</span>
                        <h3>${escapeHtml(asset.name)}</h3>
                        <small>${new Date(asset.created_at).toLocaleString()}</small>
                    </article>`
                  )
                  .join('')
            : '<p class="empty-state">该项目暂时没有可交付资产。</p>';
    } catch (error) {
        errorEl.hidden = false;
        errorEl.textContent = error.message;
        document.getElementById('projectName').textContent = '无法打开项目';
    }
})();
