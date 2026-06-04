/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function () {
    'use strict';
    if (window.TechUI) return;

    function createButton(text, type) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tech-ui-btn' + (type === 'primary' ? ' tech-ui-btn--primary' : '');
        btn.textContent = text;
        return btn;
    }

    function getFocusable(root) {
        const sel =
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(root.querySelectorAll(sel)).filter((el) => el.getAttribute('aria-hidden') !== 'true');
    }

    function openDialog(options) {
        const opts = Object.assign(
            {
                title: '操作提示',
                message: '',
                confirmText: '确定',
                cancelText: '取消',
                showCancel: false,
            },
            options || {}
        );

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'tech-ui-overlay';

            const dialogEl = document.createElement('div');
            dialogEl.className = 'tech-ui-dialog';
            dialogEl.setAttribute('role', 'dialog');
            dialogEl.setAttribute('aria-modal', 'true');

            const header = document.createElement('div');
            header.className = 'tech-ui-header';
            header.textContent = opts.title;
            const titleId = 'tech-ui-dlg-title-' + Math.random().toString(36).slice(2, 11);
            header.id = titleId;
            dialogEl.setAttribute('aria-labelledby', titleId);

            const body = document.createElement('div');
            body.className = 'tech-ui-body';
            String(opts.message || '')
                .split('\n')
                .forEach((line) => {
                    const row = document.createElement('div');
                    row.textContent = line;
                    body.appendChild(row);
                });

            const footer = document.createElement('div');
            footer.className = 'tech-ui-footer';

            const cancelBtn = createButton(opts.cancelText, 'default');
            const confirmBtn = createButton(opts.confirmText, 'primary');

            const prevActive =
                document.activeElement && typeof document.activeElement.focus === 'function'
                    ? document.activeElement
                    : null;

            let done = false;
            const cleanup = () => {
                document.removeEventListener('keydown', onDocKeydown);
                dialogEl.removeEventListener('keydown', onTrapKeydown);
            };
            const close = (result) => {
                if (done) return;
                done = true;
                cleanup();
                overlay.remove();
                if (prevActive) {
                    try {
                        prevActive.focus();
                    } catch (_) {
                        /* ignore */
                    }
                }
                resolve(result);
            };

            const onTrapKeydown = (e) => {
                if (e.key !== 'Tab') return;
                const nodes = getFocusable(dialogEl);
                if (nodes.length === 0) return;
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };

            const onDocKeydown = (e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    close(false);
                }
            };

            document.addEventListener('keydown', onDocKeydown);
            dialogEl.addEventListener('keydown', onTrapKeydown);

            confirmBtn.addEventListener('click', () => close(true));
            cancelBtn.addEventListener('click', () => close(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });

            if (opts.showCancel) footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);
            dialogEl.appendChild(header);
            dialogEl.appendChild(body);
            dialogEl.appendChild(footer);
            overlay.appendChild(dialogEl);
            document.body.appendChild(overlay);

            setTimeout(() => {
                confirmBtn.focus();
            }, 0);
        });
    }

    function openPrompt(options) {
        const opts = Object.assign(
            {
                title: '请输入',
                label: '内容',
                value: '',
                confirmText: '确定',
                cancelText: '取消',
            },
            options || {}
        );

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'tech-ui-overlay';

            const dialogEl = document.createElement('div');
            dialogEl.className = 'tech-ui-dialog';
            dialogEl.setAttribute('role', 'dialog');
            dialogEl.setAttribute('aria-modal', 'true');

            const header = document.createElement('div');
            header.className = 'tech-ui-header';
            header.textContent = opts.title;
            const titleId = 'tech-ui-prm-title-' + Math.random().toString(36).slice(2, 11);
            header.id = titleId;
            dialogEl.setAttribute('aria-labelledby', titleId);

            const body = document.createElement('div');
            body.className = 'tech-ui-body';

            const field = document.createElement('div');
            field.className = 'tech-ui-field';
            const label = document.createElement('div');
            label.className = 'tech-ui-field-label';
            label.textContent = opts.label;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tech-ui-input';
            input.value = opts.value || '';
            field.appendChild(label);
            field.appendChild(input);
            body.appendChild(field);

            const footer = document.createElement('div');
            footer.className = 'tech-ui-footer';
            const cancelBtn = createButton(opts.cancelText, 'default');
            const confirmBtn = createButton(opts.confirmText, 'primary');

            const prevActive =
                document.activeElement && typeof document.activeElement.focus === 'function'
                    ? document.activeElement
                    : null;

            let done = false;
            const cleanup = () => {
                document.removeEventListener('keydown', onDocKeydown);
                dialogEl.removeEventListener('keydown', onTrapKeydown);
            };
            const close = (result) => {
                if (done) return;
                done = true;
                cleanup();
                overlay.remove();
                if (prevActive) {
                    try {
                        prevActive.focus();
                    } catch (_) {
                        /* ignore */
                    }
                }
                resolve(result);
            };

            const onTrapKeydown = (e) => {
                if (e.key === 'Enter' && e.target === input) {
                    e.preventDefault();
                    close(input.value);
                    return;
                }
                if (e.key !== 'Tab') return;
                const nodes = getFocusable(dialogEl);
                if (nodes.length === 0) return;
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };

            const onDocKeydown = (e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    close(null);
                }
            };

            document.addEventListener('keydown', onDocKeydown);
            dialogEl.addEventListener('keydown', onTrapKeydown);

            cancelBtn.addEventListener('click', () => close(null));
            confirmBtn.addEventListener('click', () => close(input.value));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(null);
            });

            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);
            dialogEl.appendChild(header);
            dialogEl.appendChild(body);
            dialogEl.appendChild(footer);
            overlay.appendChild(dialogEl);
            document.body.appendChild(overlay);
            setTimeout(() => input.focus(), 0);
        });
    }

    function toast(message, type, ms) {
        const wrapId = 'tech-ui-toast-wrap';
        let wrap = document.getElementById(wrapId);
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = wrapId;
            wrap.className = 'tech-ui-toast-wrap';
            document.body.appendChild(wrap);
        }
        const node = document.createElement('div');
        node.className = 'tech-ui-toast' + (type ? ` tech-ui-toast--${type}` : '');
        node.textContent = message || '';
        wrap.appendChild(node);
        setTimeout(() => node.remove(), typeof ms === 'number' ? ms : 2200);
    }

    window.TechUI = {
        alert(message, title) {
            return openDialog({
                title: title || '操作提示',
                message: message || '',
                confirmText: '确定',
            });
        },
        confirm(message, title, confirmText, cancelText) {
            return openDialog({
                title: title || '请确认',
                message: message || '',
                confirmText: confirmText || '确定',
                cancelText: cancelText || '取消',
                showCancel: true,
            });
        },
        prompt(title, label, value, confirmText, cancelText) {
            return openPrompt({
                title: title || '请输入',
                label: label || '内容',
                value: value || '',
                confirmText: confirmText || '确定',
                cancelText: cancelText || '取消',
            });
        },
        toast(message, type, ms) {
            toast(message, type, ms);
        },
    };
})();
