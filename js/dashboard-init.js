/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
            // escapeHtml 由 js/html-utils.js 提供（全局函数）

            function formatDate(dateString) {
                if (!dateString) return '';
                var d = new Date(dateString);
                if (isNaN(d.getTime())) return '';
                var y = d.getFullYear();
                var m = String(d.getMonth() + 1).padStart(2, '0');
                var day = String(d.getDate()).padStart(2, '0');
                return y + '-' + m + '-' + day;
            }

            function getProjectTypeName(type) {
                var map = {
                    ui: 'UI设计',
                    game: '游戏界面',
                    other: '其他',
                };
                return map[type] || type || '';
            }

            function renderRecentProjects() {
                var grid = document.getElementById('recent-projects-grid');
                if (!grid) return;

                grid.innerHTML = '<p style="color:#666;text-align:center;">加载中...</p>';

                fetch('/api/projects?page=1&limit=3', { credentials: 'include' })
                    .then(function (res) {
                        if (!res.ok) throw new Error('API ' + res.status);
                        return res.json();
                    })
                    .then(function (data) {
                        var projects = [];
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
                var projects = [];
                try {
                    var raw = localStorage.getItem(GameUiUserScope.key('gameui-projects'));
                    if (raw) projects = JSON.parse(raw) || [];
                } catch (e) { /* ignore */ }
                renderProjectCards(grid, projects);
            }

            function renderProjectCards(grid, projects) {
                grid.innerHTML = '';

                if (!projects.length) {
                    grid.innerHTML =
                        '<p style="color:#666;text-align:center;">暂无项目数据，请在"项目管理"中创建项目。</p>';
                    return;
                }

                var recent = projects.slice(0, 3);

                recent.forEach(function (project) {
                    var statusText = '进行中';
                    if (project.status === 'done') statusText = '已完成';
                    if (project.status === 'paused') statusText = '已暂停';

                    var card = document.createElement('div');
                    card.className = 'project-card';

                    card.innerHTML =
                        '<div class="project-thumbnail">' +
                        '<span class="project-status">' +
                        statusText +
                        '</span>' +
                        '</div>' +
                        '<div class="project-info">' +
                        '<h3 class="project-title">' +
                        (project.name ? escapeHtml(project.name) : '未命名项目') +
                        '</h3>' +
                        '<p class="project-desc">' +
                        (project.desc ? escapeHtml(project.desc) : '无描述') +
                        '</p>' +
                        '<div class="project-meta">' +
                        '<div class="project-date">' +
                        '<i class="fas fa-clock"></i>' +
                        '<span>' +
                        escapeHtml(formatDate(project.createTime)) +
                        '</span>' +
                        '</div>' +
                        '<div class="project-actions">' +
                        '<button class="project-action" title="打开项目"><i class="fas fa-arrow-right"></i></button>' +
                        '</div>' +
                        '</div>' +
                        '</div>';

                    var openDetail = function () {
                        if (!project.id) return;
                        window.location.href =
                            'modules/project-management/project-detail.html?id=' + encodeURIComponent(project.id);
                    };

                    card.addEventListener('click', function (e) {
                        openDetail();
                    });
                    grid.appendChild(card);
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
            });
