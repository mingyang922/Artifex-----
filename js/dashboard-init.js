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

                var raw = null;
                try {
                    raw = window.localStorage.getItem(GameUiUserScope.key('gameui-projects'));
                } catch (e) {
                    console.warn('读取项目数据失败:', e);
                }

                var projects = [];
                if (raw) {
                    try {
                        projects = JSON.parse(raw) || [];
                    } catch (e) {
                        console.warn('解析项目数据失败:', e);
                        projects = [];
                    }
                }

                grid.innerHTML = '';

                if (!projects.length) {
                    grid.innerHTML =
                        '<p style="color:#666;text-align:center;">暂无项目数据，请在"项目管理"中创建项目。</p>';
                    return;
                }

                // 按创建时间倒序，取最近 3 个
                projects.sort(function (a, b) {
                    return new Date(b.createTime || 0) - new Date(a.createTime || 0);
                });
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
                        (project.name || '未命名项目') +
                        '</h3>' +
                        '<p class="project-desc">' +
                        (project.desc || '无描述') +
                        '</p>' +
                        '<div class="project-meta">' +
                        '<div class="project-date">' +
                        '<i class="fas fa-clock"></i>' +
                        '<span>' +
                        formatDate(project.createTime) +
                        '</span>' +
                        '</div>' +
                        '<div class="project-actions">' +
                        '<button class="project-action" title="打开项目"><i class="fas fa-arrow-right"></i></button>' +
                        '</div>' +
                        '</div>' +
                        '</div>';

                    // 点击整卡或按钮进入项目详情
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

                // 粒子网络背景
                if (window.ParticleNetwork) {
                    window.ParticleNetwork.init({ container: document.body, particleCount: 70 });
                }

                // 渲染最近项目（本地联调或 userId 为空时也应可见）
                renderRecentProjects();
            });
