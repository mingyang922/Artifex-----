            'use strict';
            (function () {
                function loadMain() {
                    var s = document.createElement('script');
                    s.src = './main.js';
                    document.body.appendChild(s);
                }
                function boot() {
                    GameUiUserScope.ensure().finally(function () {
                        // ensure 主要负责鉴权与写入 userId；若未登录会跳转登录页。
                        // 这里不依赖返回值，避免 main.js 因 undefined 返回值而无法加载。
                        loadMain();
                    });
                }
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', boot);
                } else {
                    boot();
                }
            })();
            document.addEventListener('DOMContentLoaded', function () {
                if (window.PageEffects) {
                    window.PageEffects.initPointerGlow();
                    window.PageEffects.initCardSpotlight('.top-bar, .project-management-module, .project-card');
                }

                // 调试：检查项目卡片操作按钮
                setTimeout(() => {
                    const projectCards = document.querySelectorAll('.project-card');
                    const actionButtons = document.querySelectorAll('.icon-btn');
                }, 1000);
            });
            document.addEventListener('DOMContentLoaded', function () {
                window.__pmQuickAction = function (action) {
                    const openCreateForm = function () {
                        const form = document.getElementById('create-project-form');
                        if (form) {
                            form.classList.remove('hidden');
                            const nameInput = document.getElementById('project-name');
                            if (nameInput) nameInput.focus();
                        }
                    };
                    if (action === 'openCreateForm') {
                        openCreateForm();
                        return;
                    }
                    if (action === 'openSketchModal') {
                        const m1 = document.getElementById('sketch-to-asset-modal');
                        if (m1) m1.classList.remove('hidden');
                        return;
                    }
                    if (action === 'openDescModal') {
                        const m2 = document.getElementById('desc-to-asset-modal');
                        if (m2) m2.classList.remove('hidden');
                        return;
                    }
                };

                const bindOnce = function (el, key, handler) {
                    if (!el || el.dataset[key] === '1') return;
                    el.dataset[key] = '1';
                    el.addEventListener('click', handler);
                };

                const openCreateForm = function () {
                    const form = document.getElementById('create-project-form');
                    if (form) {
                        form.classList.remove('hidden');
                        const nameInput = document.getElementById('project-name');
                        if (nameInput) nameInput.focus();
                    }
                };

                const createBtn = document.getElementById('create-project-btn');
                bindOnce(createBtn, 'fallbackCreateBound', openCreateForm);

                const emptyState = document.getElementById('project-empty-state');
                if (emptyState) {
                    emptyState.style.cursor = 'pointer';
                    bindOnce(emptyState, 'fallbackEmptyBound', openCreateForm);
                    if (emptyState.dataset.fallbackEmptyKeyBound !== '1') {
                        emptyState.dataset.fallbackEmptyKeyBound = '1';
                        emptyState.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openCreateForm();
                            }
                        });
                    }
                }

                const openModal = function (id) {
                    const modal = document.getElementById(id);
                    if (modal) modal.classList.remove('hidden');
                };

                bindOnce(document.getElementById('sketch-to-asset-btn'), 'fallbackSketchBound', function () {
                    openModal('sketch-to-asset-modal');
                });
                bindOnce(document.getElementById('desc-to-asset-btn'), 'fallbackDescBound', function () {
                    openModal('desc-to-asset-modal');
                });
            });
