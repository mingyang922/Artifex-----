/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/** 转义 HTML 特殊字符，防止 XSS — 委托给 html-utils.js 全局函数 */
var escapeManagerHtml = (typeof escapeHtml === 'function') ? escapeHtml : function(s) { return String(s); };

/**
 * NotificationManager类 - 统一管理所有页面的消息通知显示和更新
 */
class NotificationManager {
    constructor() {
        this.notificationKey = 'userNotifications';
        this.defaultNotifications = [
            {
                id: 1,
                title: '新用户注册',
                message: '用户 "张三" 刚刚注册了账户',
                time: '2分钟前',
                icon: 'fas fa-user-plus',
                unread: true,
            },
            {
                id: 2,
                title: '安全提醒',
                message: '检测到异常登录活动，请检查账户安全',
                time: '1小时前',
                icon: 'fas fa-shield-alt',
                unread: true,
            },
            {
                id: 3,
                title: '系统更新',
                message: '系统已更新到最新版本，新增多项功能',
                time: '3小时前',
                icon: 'fas fa-cog',
                unread: false,
            },
            {
                id: 4,
                title: '项目更新',
                message: '项目 "游戏主菜单UI" 有新的版本发布',
                time: '1天前',
                icon: 'fas fa-project-diagram',
                unread: false,
            },
        ];
        this.notifications = [];
        this.notificationElements = [];
        this.badgeElements = [];
        this.init();
    }

    /**
     * 初始化通知管理器
     */
    init() {
        // 延迟初始化，确保DOM完全加载
        setTimeout(() => {
            this.findNotificationElements();
            this.loadNotificationsFromStorage();
            this.setupNotificationSync();
            this.updateAllBadges();
        }, 200);
    }

    /**
     * 查找所有通知相关元素
     */
    findNotificationElements() {
        this.notificationElements = document.querySelectorAll('.notification-btn');
        this.badgeElements = document.querySelectorAll('.notification-badge');
    }

    /**
     * 从本地存储加载通知
     */
    loadNotificationsFromStorage() {
        const savedNotifications = localStorage.getItem(this.notificationKey);
        if (savedNotifications) {
            try {
                this.notifications = JSON.parse(savedNotifications);
            } catch (e) {
                this.notifications = [...this.defaultNotifications];
                this.saveNotificationsToStorage();
            }
        } else {
            this.notifications = [...this.defaultNotifications];
            this.saveNotificationsToStorage();
        }
    }

    /**
     * 保存通知到本地存储
     */
    saveNotificationsToStorage() {
        localStorage.setItem(this.notificationKey, JSON.stringify(this.notifications));
    }

    /**
     * 设置通知同步监听
     */
    setupNotificationSync() {
        // 监听存储变化，实现跨页面同步
        window.addEventListener('storage', (e) => {
            if (e.key === this.notificationKey) {
                try {
                    this.notifications = JSON.parse(e.newValue);
                } catch (err) {
                    return;
                }
                this.updateAllBadges();
                this.updateAllDropdowns();
            }
        });

        // 监听自定义通知更新事件
        window.addEventListener('notificationUpdated', (e) => {
            this.updateAllBadges();
            this.updateAllDropdowns();
        });
    }

    /**
     * 创建下拉菜单
     * @param {HTMLElement} container - 容器元素
     * @returns {HTMLElement} 下拉菜单元素
     */
    createDropdown(container) {
        const dropdown = document.createElement('div');
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h4>消息通知</h4>
                <button class="mark-all-read">全部已读</button>
            </div>
            <div class="notification-list">
                <!-- 通知列表将通过JavaScript动态生成 -->
            </div>
            <div class="notification-footer">
                <a href="#" class="view-all-notifications" data-message-center>查看所有通知</a>
            </div>
        `;

        container.appendChild(dropdown);

        // 添加全部已读事件
        const markAllReadBtn = dropdown.querySelector('.mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // 添加查看所有通知事件
        const viewAllLink = dropdown.querySelector('.view-all-notifications');
        if (viewAllLink) {
            viewAllLink.addEventListener('click', (e) => {
                e.preventDefault();
                // 消息中心已集成在用户中心页面，跳转到用户中心
                let userCenterPath;
                const currentPath = window.location.pathname;

                if (currentPath.includes('dashboard.html')) {
                    userCenterPath = 'modules/user-center/userCenter.html';
                } else if (currentPath.includes('modules/')) {
                    userCenterPath = 'user-center/userCenter.html';
                } else {
                    userCenterPath = 'modules/user-center/userCenter.html';
                }

                window.location.href = userCenterPath;
            });
        }

        return dropdown;
    }

    /**
     * 更新所有徽章显示
     */
    updateAllBadges() {
        const unreadCount = this.notifications.filter((n) => n.unread).length;

        this.badgeElements.forEach((badge) => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    /**
     * 更新所有下拉菜单
     */
    updateAllDropdowns() {
        // 查找所有通知下拉菜单
        const dropdowns = document.querySelectorAll('.notification-dropdown');
        dropdowns.forEach((dropdown) => {
            this.updateSingleDropdown(dropdown);
        });
    }

    /**
     * 更新单个下拉菜单
     * @param {HTMLElement} dropdown - 下拉菜单元素
     */
    updateSingleDropdown(dropdown) {
        const listContainer = dropdown.querySelector('.notification-list');
        if (!listContainer) {
            return;
        }

        // 清空现有内容
        listContainer.innerHTML = '';

        if (this.notifications.length === 0) {
            listContainer.innerHTML = '<div class="notification-item">暂无新通知</div>';
            return;
        }

        // 渲染通知列表
        this.notifications.forEach((notification) => {
            const item = document.createElement('div');
            item.classList.add('notification-item');
            if (notification.unread) {
                item.classList.add('unread');
            }
            item.dataset.id = notification.id;

            item.innerHTML = `
                <div class="notification-icon">
                    <i class="${escapeManagerHtml(notification.icon)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeManagerHtml(notification.title)}</div>
                    <div class="notification-message">${escapeManagerHtml(notification.message)}</div>
                    <div class="notification-time">${escapeManagerHtml(notification.time)}</div>
                </div>
            `;

            // 添加点击事件
            item.addEventListener('click', () => {
                this.markAsRead(notification.id);
            });

            listContainer.appendChild(item);
        });
    }

    /**
     * 标记通知为已读
     * @param {number} id - 通知ID
     */
    markAsRead(id) {
        const notification = this.notifications.find((n) => n.id === id);
        if (notification && notification.unread) {
            notification.unread = false;
            this.saveNotificationsToStorage();
            this.updateAllBadges();
            this.updateAllDropdowns();

            // 触发自定义事件
            window.dispatchEvent(
                new CustomEvent('notificationUpdated', {
                    detail: { action: 'markAsRead', id: id },
                })
            );

        }
    }

    /**
     * 标记所有通知为已读
     */
    markAllAsRead() {
        this.notifications.forEach((notification) => {
            notification.unread = false;
        });
        this.saveNotificationsToStorage();
        this.updateAllBadges();
        this.updateAllDropdowns();

        // 触发自定义事件
        window.dispatchEvent(
            new CustomEvent('notificationUpdated', {
                detail: { action: 'markAllAsRead' },
            })
        );
    }

    /**
     * 标记单个通知为已读
     * @param {number} notificationId - 通知ID
     */
    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find((n) => n.id === notificationId);
        if (notification) {
            notification.unread = false;
            this.saveNotificationsToStorage();
            this.updateAllBadges();
            this.updateAllDropdowns();

            // 触发自定义事件
            window.dispatchEvent(
                new CustomEvent('notificationUpdated', {
                    detail: { action: 'markAsRead', notificationId: notificationId },
                })
            );

        }
    }

    /**
     * 添加新通知
     * @param {Object} notification - 新通知对象
     */
    addNotification(notification) {
        const newNotification = {
            id: Date.now(), // 使用时间戳作为ID
            title: notification.title || '新通知',
            message: notification.message || '',
            time: notification.time || '刚刚',
            icon: notification.icon || 'fas fa-bell',
            unread: true,
        };

        this.notifications.unshift(newNotification); // 添加到开头
        this.saveNotificationsToStorage();
        this.updateAllBadges();
        this.updateAllDropdowns();

        // 触发自定义事件
        window.dispatchEvent(
            new CustomEvent('notificationUpdated', {
                detail: { action: 'addNotification', notification: newNotification },
            })
        );
    }

    /**
     * 删除通知
     * @param {number} id - 通知ID
     */
    deleteNotification(id) {
        this.notifications = this.notifications.filter((n) => n.id !== id);
        this.saveNotificationsToStorage();
        this.updateAllBadges();
        this.updateAllDropdowns();

        // 触发自定义事件
        window.dispatchEvent(
            new CustomEvent('notificationUpdated', {
                detail: { action: 'deleteNotification', id: id },
            })
        );
    }

    /**
     * 获取未读通知数量
     * @returns {number}
     */
    getUnreadCount() {
        return this.notifications.filter((n) => n.unread).length;
    }

    /**
     * 获取所有通知
     * @returns {Array}
     */
    getAllNotifications() {
        return [...this.notifications];
    }

    /**
     * 刷新通知显示（重新查找元素并更新）
     */
    refresh() {
        this.findNotificationElements();
        this.loadNotificationsFromStorage();
        this.updateAllBadges();
        this.updateAllDropdowns();
    }

    /**
     * 重置为默认通知
     */
    resetToDefault() {
        this.notifications = [...this.defaultNotifications];
        this.saveNotificationsToStorage();
        this.updateAllBadges();
        this.updateAllDropdowns();
    }
}

// 创建全局通知管理器实例（单例模式，防止重复创建）
if (!window.notificationManager) {
    window.notificationManager = new NotificationManager();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (window.notificationManager) {
        window.notificationManager.refresh();
    }
});

// 页面完全加载后再次初始化
window.addEventListener('load', () => {
    if (window.notificationManager) {
        window.notificationManager.refresh();
    }
});

// 添加手动刷新功能，供调试使用
window.refreshNotifications = () => {
    if (window.notificationManager) {
        window.notificationManager.refresh();
    }
};

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
