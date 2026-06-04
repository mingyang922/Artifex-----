/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
            'use strict';
            function initTechSelects() {
                if (window.__techSelectGlobalBound !== true) {
                    window.__techSelectGlobalBound = true;
                    document.addEventListener('click', (e) => {
                        document.querySelectorAll('.tech-select.is-open').forEach((wrap) => {
                            const portalMenu = wrap.__portalMenu;
                            const clickedInside =
                                wrap.contains(e.target) || (portalMenu && portalMenu.contains(e.target));
                            if (!clickedInside) {
                                if (typeof wrap.__closeTechSelect === 'function') {
                                    wrap.__closeTechSelect();
                                } else {
                                    wrap.classList.remove('is-open');
                                }
                            }
                        });
                    });
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            document.querySelectorAll('.tech-select.is-open').forEach((wrap) => {
                                if (typeof wrap.__closeTechSelect === 'function') {
                                    wrap.__closeTechSelect();
                                } else {
                                    wrap.classList.remove('is-open');
                                }
                            });
                        }
                    });
                }

                const selects = document.querySelectorAll('select:not(.tech-select-native)');
                selects.forEach((select) => {
                    const oldWrap =
                        select.nextElementSibling && select.nextElementSibling.classList.contains('tech-select')
                            ? select.nextElementSibling
                            : null;
                    if (oldWrap) {
                        if (typeof oldWrap.__closeTechSelect === 'function') oldWrap.__closeTechSelect();
                        oldWrap.remove();
                    }

                    select.classList.add('tech-select-native');

                    const wrapper = document.createElement('div');
                    wrapper.className = 'tech-select';

                    const trigger = document.createElement('button');
                    trigger.type = 'button';
                    trigger.className = 'tech-select-trigger';
                    trigger.setAttribute('aria-haspopup', 'listbox');
                    trigger.setAttribute('aria-expanded', 'false');

                    const value = document.createElement('span');
                    value.className = 'tech-select-value';
                    trigger.appendChild(value);

                    const menu = document.createElement('div');
                    menu.className = 'tech-select-menu';
                    menu.setAttribute('role', 'listbox');
                    wrapper.__portalMenu = menu;

                    Array.from(select.options).forEach((opt) => {
                        const item = document.createElement('button');
                        item.type = 'button';
                        item.className = 'tech-select-option';
                        item.textContent = opt.textContent;
                        item.dataset.value = opt.value;
                        if (opt.disabled) item.disabled = true;
                        if (opt.value === '' || opt.value === 'all') item.classList.add('is-placeholder');
                        menu.appendChild(item);
                    });

                    select.insertAdjacentElement('afterend', wrapper);
                    wrapper.appendChild(trigger);
                    wrapper.appendChild(menu);

                    const syncUI = () => {
                        const current = select.options[select.selectedIndex];
                        const currentText = current ? current.textContent : '请选择';
                        value.textContent = currentText;
                        value.classList.toggle('is-placeholder', !select.value || select.value === 'all');
                        menu.querySelectorAll('.tech-select-option').forEach((item) => {
                            item.classList.toggle('is-selected', item.dataset.value === select.value);
                        });
                    };

                    const positionPortalMenu = () => {
                        if (!wrapper.classList.contains('is-open')) return;
                        const rect = trigger.getBoundingClientRect();
                        const viewportW = window.innerWidth;
                        const viewportH = window.innerHeight;
                        const safeLeft = Math.max(8, Math.min(rect.left, viewportW - rect.width - 8));
                        const spaceBelow = viewportH - rect.bottom - 10;
                        const spaceAbove = rect.top - 10;
                        const openDown = spaceBelow >= 180 || spaceBelow >= spaceAbove;
                        const maxHeight = Math.max(120, Math.min(280, openDown ? spaceBelow : spaceAbove));
                        let top = openDown ? rect.bottom + 6 : rect.top - maxHeight - 6;
                        top = Math.max(8, Math.min(top, viewportH - maxHeight - 8));
                        menu.style.left = safeLeft + 'px';
                        menu.style.top = top + 'px';
                        menu.style.width = rect.width + 'px';
                        menu.style.maxHeight = maxHeight + 'px';
                    };

                    const handleViewportChange = () => {
                        if (wrapper.classList.contains('is-open')) {
                            positionPortalMenu();
                        }
                    };

                    const closeMenu = () => {
                        wrapper.classList.remove('is-open');
                        trigger.setAttribute('aria-expanded', 'false');
                        window.removeEventListener('resize', handleViewportChange);
                        document.removeEventListener('scroll', handleViewportChange, true);
                        if (menu.parentElement !== wrapper) {
                            wrapper.appendChild(menu);
                        }
                        menu.classList.remove('tech-select-menu--portal');
                        menu.style.left = '';
                        menu.style.top = '';
                        menu.style.width = '';
                        menu.style.maxHeight = '';
                    };
                    wrapper.__closeTechSelect = closeMenu;

                    trigger.addEventListener('click', () => {
                        const willOpen = !wrapper.classList.contains('is-open');
                        document.querySelectorAll('.tech-select.is-open').forEach((el) => {
                            if (typeof el.__closeTechSelect === 'function') {
                                el.__closeTechSelect();
                            } else {
                                el.classList.remove('is-open');
                            }
                        });
                        if (!willOpen) {
                            closeMenu();
                            return;
                        }
                        wrapper.classList.add('is-open');
                        trigger.setAttribute('aria-expanded', 'true');
                        if (menu.parentElement !== document.body) {
                            document.body.appendChild(menu);
                        }
                        menu.classList.add('tech-select-menu--portal');
                        positionPortalMenu();
                        window.addEventListener('resize', handleViewportChange);
                        document.addEventListener('scroll', handleViewportChange, true);
                    });

                    menu.addEventListener('click', (e) => {
                        const item = e.target.closest('.tech-select-option');
                        if (!item || item.disabled) return;
                        const nextValue = item.dataset.value || '';
                        if (select.value !== nextValue) {
                            select.value = nextValue;
                            select.dispatchEvent(new Event('input', { bubbles: true }));
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        syncUI();
                        closeMenu();
                    });

                    select.addEventListener('change', syncUI);
                    syncUI();
                });
            }

            window.refreshTechSelects = initTechSelects;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    initTechSelects();
                });
            } else {
                initTechSelects();
            }
