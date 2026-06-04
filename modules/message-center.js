/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function () {
    'use strict';

    class MessageCenter {
        constructor() {
            this.init();
        }

        init() {
            this.bindEvents();
            this.updateUnreadCount();
        }

        bindEvents() {
            document.getElementById('closeMessageCenter').addEventListener('click', () => {
                this.close();
            });

            document.querySelectorAll('.message-tab').forEach((tab) => {
                tab.addEventListener('click', () => {
                    this.switchTab(tab.dataset.messageTab);
                });
            });

            document.querySelectorAll('.message-action-btn').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const messageItem = btn.closest('.message-item');

                    if (action === 'mark-read') {
                        this.markAsRead(messageItem);
                    } else if (action === 'delete') {
                        this.deleteMessage(messageItem);
                    }
                });
            });

            document.querySelectorAll('.message-item').forEach((item) => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.message-actions')) {
                        this.handleMessageClick(item);
                    }
                });
            });
        }

        switchTab(tabType) {
            document.querySelectorAll('.message-tab').forEach((tab) => {
                tab.classList.remove('active');
            });
            document.querySelector(`[data-message-tab="${tabType}"]`).classList.add('active');

            const messages = document.querySelectorAll('.message-item');
            messages.forEach((message) => {
                const category = message.dataset.category;
                const isUnread = message.classList.contains('unread');

                let shouldShow = true;

                if (tabType === 'unread' && !isUnread) {
                    shouldShow = false;
                } else if (tabType === 'system' && category !== 'system') {
                    shouldShow = false;
                }

                message.style.display = shouldShow ? 'flex' : 'none';
            });
        }

        markAsRead(messageItem) {
            messageItem.classList.remove('unread');
            this.updateUnreadCount();
            this.showToast('消息已标记为已读', 'success');
        }

        async deleteMessage(messageItem) {
            const ok = await window.TechUI.confirm('确定要删除这条消息吗？', '删除消息', '删除', '取消');
            if (!ok) return;
            messageItem.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                messageItem.remove();
                this.updateUnreadCount();
                this.showToast('消息已删除', 'success');
            }, 300);
        }

        handleMessageClick(messageItem) {
            const title = messageItem.querySelector('.message-title').textContent;

            if (title === '新用户注册') {
                this.showToast('跳转到用户管理界面', 'info');
            } else if (title === '安全提醒') {
                this.showToast('跳转到安全设置', 'info');
            } else if (title === '系统更新' || title === '功能更新') {
                this.showToast('跳转到系统设置', 'info');
            }

            this.markAsRead(messageItem);
        }

        updateUnreadCount() {
            const unreadCount = document.querySelectorAll('.message-item.unread').length;
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                badge.textContent = unreadCount > 0 ? unreadCount : '';
                badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }
        }

        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#2ed573' : type === 'error' ? '#ff4757' : '#00f0ff'};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 2000);
        }

        close() {
            const referrer = document.referrer;
            const urlParams = new URLSearchParams(window.location.search);
            const fromPage = urlParams.get('from');

            if (fromPage) {
                this.navigateToPage(fromPage);
                return;
            }

            if (referrer && referrer !== window.location.href) {
                window.location.href = referrer;
                return;
            }

            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '../dashboard.html';
            }
        }

        navigateToPage(pagePath) {
            let finalPath = pagePath;

            if (pagePath === 'dashboard.html') {
                finalPath = '../dashboard.html';
            } else if (pagePath === 'ai-generator-new.html') {
                finalPath = './ai-generate/ai-generator-new.html';
            } else if (pagePath === 'asset-library.html') {
                finalPath = './asset-library/asset-library.html';
            } else if (pagePath === 'style-presets.html') {
                finalPath = './style-presets/style-presets.html';
            } else if (pagePath === 'index.html') {
                finalPath = './project-management/index.html';
            } else if (pagePath === 'userCenter.html') {
                finalPath = './user-center/userCenter.html';
            } else {
                finalPath = pagePath;
            }

            this.showReturnTransition(() => {
                window.location.href = finalPath;
            });
        }

        showReturnTransition(callback) {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            const returnIcon = document.createElement('div');
            returnIcon.style.cssText = `
                width: 40px;
                height: 40px;
                border: 3px solid rgba(0, 240, 255, 0.3);
                border-right: 3px solid #00f0ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);

            overlay.appendChild(returnIcon);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });

            setTimeout(() => {
                callback();
            }, 500);
        }
    }

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', () => {
        new MessageCenter();
    });
})();
