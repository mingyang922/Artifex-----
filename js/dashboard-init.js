/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
'use strict';
// escapeHtml 由 js/html-utils.js 提供（全局函数）

function tr(key) {
    return window.i18n?.t ? window.i18n.t(key) : key;
}

function getDashboardLocale() {
    const language = window.i18n?.getLanguage?.() || 'zh';
    return (
        {
            zh: 'zh-CN',
            zht: 'zh-TW',
            en: 'en-US',
            ja: 'ja-JP',
            ko: 'ko-KR',
        }[language] || 'zh-CN'
    );
}

function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(getDashboardLocale(), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

function renderRecentProjects() {
    const grid = document.getElementById('recent-projects-grid');
    if (!grid) return;

    grid.innerHTML = '<p style="color:#666;text-align:center;">' + escapeHtml(tr('dashboard.loading')) + '</p>';

    fetch('/api/projects?page=1&limit=3&summary=1', { credentials: 'include' })
        .then(function (res) {
            if (res.status === 401) {
                window.location.href = loginHtmlPath();
                return null;
            }
            if (!res.ok) throw new Error('API ' + res.status);
            return res.json();
        })
        .then(function (data) {
            if (!data) return;
            let projects = [];
            if (data.ok && data.projects) {
                projects = data.projects.map(function (p) {
                    return {
                        id: String(p.id),
                        name: p.name,
                        desc: p.description,
                        createTime: p.created_at,
                        status: p.status || 'active',
                    };
                });
            }
            if (projects.length > 0) {
                renderProjectCards(grid, projects);
            } else {
                renderFromLocalStorage(grid);
            }
        })
        .catch(function (err) {
            console.warn('[Dashboard] API failed, trying localStorage:', err.message);
            renderFromLocalStorage(grid);
        });
}

function renderFromLocalStorage(grid) {
    let projects = [];
    try {
        if (typeof GameUiUserScope !== 'undefined' && GameUiUserScope.key) {
            const raw = localStorage.getItem(GameUiUserScope.key('gameui-projects'));
            if (raw) projects = JSON.parse(raw) || [];
        } else {
            const raw = localStorage.getItem('gameui-projects');
            if (raw) projects = JSON.parse(raw) || [];
        }
    } catch (_e) {
        /* ignore */
    }
    renderProjectCards(grid, projects);
}

function renderProjectCards(grid, projects) {
    grid.innerHTML = '';

    if (!projects.length) {
        grid.innerHTML = '<p style="color:#666;text-align:center;">' + escapeHtml(tr('dashboard.noProjects')) + '</p>';
        return;
    }

    const recent = projects.slice(0, 3);

    recent.forEach(function (project) {
        let statusText = tr('dashboard.statusActive');
        if (project.status === 'done') statusText = tr('dashboard.statusDone');
        if (project.status === 'paused') statusText = tr('dashboard.statusPaused');

        const card = document.createElement('div');
        card.className = 'project-card';

        card.innerHTML =
            '<div class="project-thumbnail">' +
            '<span class="project-status">' +
            statusText +
            '</span>' +
            '</div>' +
            '<div class="project-info">' +
            '<h3 class="project-title">' +
            (project.name ? escapeHtml(project.name) : escapeHtml(tr('dashboard.untitledProject'))) +
            '</h3>' +
            '<p class="project-desc">' +
            (project.desc ? escapeHtml(project.desc) : escapeHtml(tr('dashboard.noDescription'))) +
            '</p>' +
            '<div class="project-meta">' +
            '<div class="project-date">' +
            '<i class="fas fa-clock"></i>' +
            '<span>' +
            escapeHtml(formatDate(project.createTime)) +
            '</span>' +
            '</div>' +
            '<div class="project-actions">' +
            '<button class="project-action" title="' +
            escapeHtml(tr('dashboard.openProject')) +
            '"><i class="fas fa-arrow-right"></i></button>' +
            '</div>' +
            '</div>' +
            '</div>';

        const openDetail = function () {
            if (!project.id) return;
            window.location.href =
                'modules/project-management/project-detail.html?id=' + encodeURIComponent(project.id);
        };

        card.addEventListener('click', function () {
            openDetail();
        });
        grid.appendChild(card);
    });
}

function readStoredCollection(suffixes) {
    const candidates = [];
    suffixes.forEach(function (suffix) {
        if (typeof GameUiUserScope !== 'undefined' && typeof GameUiUserScope.key === 'function') {
            candidates.push(GameUiUserScope.key(suffix));
        }
        candidates.push(suffix);
    });
    for (const key of [...new Set(candidates)]) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(value)) return value;
            if (Array.isArray(value?.assets)) return value.assets;
        } catch (_error) {
            /* continue with compatibility scan */
        }
    }
    return [];
}

function formatStorage(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
}

function renderRecentGenerations(generations) {
    const container = document.getElementById('recent-generations');
    if (!container) return;
    const recent = generations.slice(0, 4);
    if (!recent.length) {
        container.innerHTML =
            '<div class="workspace-empty"><i class="fas fa-wand-magic-sparkles"></i><br>' +
            escapeHtml(tr('dashboard.emptyGenerations')) +
            '</div>';
        return;
    }
    container.innerHTML = '';
    recent.forEach(function (item) {
        const link = document.createElement('a');
        link.className = 'recent-generation-item';
        link.href = 'modules/ai-generate/ai-generator-new.html';
        const created = item.createdAt || item.timestamp || item.date;
        link.innerHTML =
            '<i class="fas fa-image"></i><span><strong>' +
            escapeHtml(item.name || item.prompt || tr('dashboard.generatedAsset')) +
            '</strong><small>' +
            escapeHtml(item.style || item.provider || tr('dashboard.generationRecord')) +
            '</small></span><span>' +
            escapeHtml(formatDate(created)) +
            '</span>';
        container.appendChild(link);
    });
}

function updateDashboardDateTime() {
    const now = new Date();
    const hour = now.getHours();
    const greetingKey =
        hour < 6
            ? 'dashboard.greetingNight'
            : hour < 12
              ? 'dashboard.greetingMorning'
              : hour < 18
                ? 'dashboard.greetingAfternoon'
                : 'dashboard.greetingEvening';
    const greetingEl = document.getElementById('dashboard-greeting');
    const dateEl = document.getElementById('dashboard-date');
    if (greetingEl) greetingEl.textContent = tr(greetingKey);
    if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat(getDashboardLocale(), {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        }).format(now);
    }
}

async function loadWorkspaceOverview() {
    updateDashboardDateTime();

    let projectCount = readStoredCollection(['gameui-projects']).length;
    let assetCount = readStoredCollection(['assetLibrary_v1', 'asset-library']).length;
    const generations = readStoredCollection(['generatedImages']);

    const responses = await Promise.allSettled([
        fetch('/api/projects?page=1&limit=100&summary=1', { credentials: 'include' }).then((response) =>
            response.ok ? response.json() : null
        ),
        fetch('/api/asset-library', { credentials: 'include' }).then((response) =>
            response.ok ? response.json() : null
        ),
        navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve(null),
    ]);

    const projectData = responses[0].status === 'fulfilled' ? responses[0].value : null;
    const assetData = responses[1].status === 'fulfilled' ? responses[1].value : null;
    const storageData = responses[2].status === 'fulfilled' ? responses[2].value : null;
    if (Array.isArray(projectData?.projects)) projectCount = projectData.total ?? projectData.projects.length;
    if (Array.isArray(assetData?.assets)) assetCount = assetData.total ?? assetData.assets.length;

    const assignments = {
        statProjects: projectCount,
        statAssets: assetCount,
        statGenerations: generations.length,
        statStorage: formatStorage(storageData?.usage || 0),
    };
    Object.entries(assignments).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    });
    renderRecentGenerations(generations);

    const nextText = document.getElementById('dashboard-next-step');
    const nextButton = document.getElementById('dashboard-next-action');
    if (nextText && nextButton) {
        const target =
            projectCount === 0 ? 'project-management' : generations.length === 0 ? 'ai-generate' : 'asset-library';
        nextText.textContent =
            target === 'project-management'
                ? tr('dashboard.nextCreateProject')
                : target === 'ai-generate'
                  ? tr('dashboard.nextGenerate')
                  : tr('dashboard.nextOrganize');
        nextButton.onclick = () => window.navManager?.navigateTo(target);
    }
}

function improveDashboardAccessibility() {
    document.querySelectorAll('.tool-card[data-target]').forEach(function (card) {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                card.click();
            }
        });
    });
    document.querySelectorAll('.workspace-hero-actions [data-target]').forEach(function (button) {
        button.addEventListener('click', () => window.navManager?.navigateTo(button.dataset.target));
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await GameUiUserScope.ensure();
    } catch (e) {
        console.warn('用户态校验失败，继续渲染主页：', e);
    }

    if (window.PageEffects) {
        window.PageEffects.initPointerGlow();
        window.PageEffects.initCardSpotlight('.tool-card, .project-card');
    }

    if (window.ParticleNetwork) {
        ParticleNetwork.init({ container: document.body, particleCount: 70 });
    }

    renderRecentProjects();
    loadWorkspaceOverview().catch((error) => console.warn('[Dashboard] overview failed:', error));
    improveDashboardAccessibility();

    window.setInterval(updateDashboardDateTime, 60 * 1000);
    window.addEventListener('languageChanged', function () {
        renderRecentProjects();
        loadWorkspaceOverview().catch((error) => console.warn('[Dashboard] language refresh failed:', error));
    });
});
