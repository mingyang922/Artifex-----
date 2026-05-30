/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
'use strict';
/**
 * 通知组件 - 可复用的通知下拉菜单
 */

/** 转义 HTML 特殊字符，防止 XSS */
function escapeNotificationHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

class NotificationComponent {
    constructor() {
        this.notifications = [
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
        ];

        this.init();
    }

    /**
     * 初始化通知组件
     */
    init() {
        // 检查是否在用户中心页面，如果是则不初始化
        if (this.isUserCenterPage()) {
            return;
        }

        // 延迟初始化，确保DOM完全加载
        setTimeout(() => {
            this.setupNotificationButtons();
            this.createNotificationDropdowns();
            this.bindEvents();
        }, 100);
    }

    /**
     * 检查是否在用户中心页面
     */
    isUserCenterPage() {
        return window.location.pathname.includes('userCenter.html');
    }

    /**
     * 设置通知按钮
     */
    setupNotificationButtons() {
        const notificationBtns = document.querySelectorAll('.notification-btn');

        notificationBtns.forEach((btn) => {
            // 确保按钮有正确的容器结构
            if (!btn.parentElement.classList.contains('notification-container')) {
                const container = document.createElement('div');
                container.className = 'notification-container';
                btn.parentNode.insertBefore(container, btn);
                container.appendChild(btn);
            }
        });
    }

    /**
     * 创建通知下拉菜单
     */
    createNotificationDropdowns() {
        const containers = document.querySelectorAll('.notification-container');

        containers.forEach((container) => {
            const btn = container.querySelector('.notification-btn');
            // 检查是否已经有下拉菜单
            if (!btn || btn.__notificationDropdown) {
                return;
            }

            const dropdown = this.createNotificationDropdown();
            // 挂到 body，避免被页面内部层叠上下文/特效影响
            document.body.appendChild(dropdown);
            btn.__notificationDropdown = dropdown;
        });
    }

    /**
     * 创建通知下拉菜单HTML
     */
    createNotificationDropdown() {
        const dropdown = document.createElement('div');
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h4>消息通知</h4>
                <button class="mark-all-read">全部已读</button>
            </div>
            <div class="notification-list">
                ${this.renderNotificationItems()}
            </div>
            <div class="notification-footer">
                <a href="#" class="view-all-notifications" data-message-center>查看所有通知</a>
            </div>
        `;

        return dropdown;
    }

    /**
     * 渲染通知项
     */
    renderNotificationItems() {
        return this.notifications
            .map(
                (notification) => `
            <div class="notification-item ${notification.unread ? 'unread' : ''}" data-id="${notification.id}">
                <div class="notification-icon">
                    <i class="${escapeNotificationHtml(notification.icon)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeNotificationHtml(notification.title)}</div>
                    <div class="notification-message">${escapeNotificationHtml(notification.message)}</div>
                    <div class="notification-time">${escapeNotificationHtml(notification.time)}</div>
                </div>
            </div>
        `
            )
            .join('');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 通知按钮点击事件
        const notificationBtns = document.querySelectorAll('.notification-btn');
        notificationBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                const dropdown = btn.__notificationDropdown || null;
                if (dropdown) {
                    const willShow = !dropdown.classList.contains('show');
                    document.querySelectorAll('.notification-dropdown.show').forEach((d) => d.classList.remove('show'));
                    dropdown.classList.toggle('show', willShow);
                    if (willShow) {
                        this.positionDropdown(btn, dropdown);
                    }

                    // 如果有通知管理器，使用管理器更新内容
                    if (window.notificationManager && dropdown.classList.contains('show')) {
                        window.notificationManager.updateSingleDropdown(dropdown);
                    }
                }
            });
        });
        window.addEventListener('resize', () => this.repositionVisibleDropdowns());
        window.addEventListener('scroll', () => this.repositionVisibleDropdowns(), true);

        // 全部已读按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mark-all-read')) {
                this.markAllAsRead();
            }
        });

        // 通知项点击事件
        document.addEventListener('click', (e) => {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                this.handleNotificationClick(notificationItem);
            }
        });

        // 查看所有通知点击事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-all-notifications') || e.target.closest('.view-all-notifications')) {
                e.preventDefault();
                this.navigateToMessageCenter();
            }
        });

        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-container')) {
                const dropdowns = document.querySelectorAll('.notification-dropdown');
                dropdowns.forEach((dropdown) => {
                    dropdown.classList.remove('show');
                });
            }
        });
    }

    positionDropdown(btn, dropdown) {
        if (!btn || !dropdown) return;
        const rect = btn.getBoundingClientRect();
        const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
        const width = Math.min(380, Math.max(320, viewportW - 24));
        const rightGap = 12;
        const top = Math.max(8, Math.min(rect.bottom + 8, viewportH - 420));
        const maxHeight = Math.max(200, viewportH - top - 12);

        dropdown.style.width = width + 'px';
        dropdown.style.left = 'auto';
        dropdown.style.right = rightGap + 'px';
        dropdown.style.top = top + 'px';

        const list = dropdown.querySelector('.notification-list');
        if (list) {
            list.style.maxHeight = Math.min(420, Math.max(160, maxHeight - 98)) + 'px';
        }
    }

    repositionVisibleDropdowns() {
        document.querySelectorAll('.notification-container').forEach((container) => {
            const btn = container.querySelector('.notification-btn');
            const dropdown = container.querySelector('.notification-dropdown.show');
            if (btn && dropdown) this.positionDropdown(btn, dropdown);
        });
    }

    /**
     * 处理通知项点击
     */
    handleNotificationClick(item) {
        const id = parseInt(item.dataset.id);
        const notification = this.notifications.find((n) => n.id === id);

        if (notification) {
            // 标记为已读
            notification.unread = false;
            item.classList.remove('unread');
            this.updateNotificationBadge();

            // 如果有通知管理器，同步到管理器
            if (window.notificationManager) {
                window.notificationManager.markNotificationAsRead(id);
            }

            // 根据通知类型处理
            this.handleNotificationAction(notification);
        }
    }

    /**
     * 处理通知动作
     */
    handleNotificationAction(notification) {
        switch (notification.title) {
            case '新用户注册':
                window.TechUI && window.TechUI.toast('跳转到用户管理界面', 'info');
                break;
            case '安全提醒':
                window.TechUI && window.TechUI.toast('跳转到安全设置界面', 'info');
                break;
            case '系统更新':
                window.TechUI && window.TechUI.toast('跳转到系统信息界面', 'info');
                break;
            default:
                break;
        }
    }

    /**
     * 标记所有通知为已读
     */
    markAllAsRead() {
        this.notifications.forEach((notification) => {
            notification.unread = false;
        });

        // 更新UI
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach((item) => {
            item.classList.remove('unread');
        });

        this.updateNotificationBadge();

        // 如果有通知管理器，同步到管理器
        if (window.notificationManager) {
            window.notificationManager.markAllAsRead();
        }
    }

    /**
     * 更新通知徽章
     */
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter((n) => n.unread).length;
        const badges = document.querySelectorAll('.notification-badge');

        badges.forEach((badge) => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    /**
     * 跳转到消息中心
     */
    navigateToMessageCenter() {
        // 消息中心已集成在用户中心页面，跳转到用户中心
        let userCenterPath;

        // 简化的路径计算
        const currentPath = window.location.pathname;

        if (currentPath.includes('dashboard.html')) {
            userCenterPath = 'modules/user-center/userCenter.html';
        } else if (currentPath.includes('modules/')) {
            userCenterPath = 'user-center/userCenter.html';
        } else {
            userCenterPath = 'modules/user-center/userCenter.html';
        }

        // 显示跳转过渡效果
        this.showTransition(() => {
            window.location.href = userCenterPath;
        });
    }

    /**
     * 显示跳转过渡效果
     */
    showTransition(callback) {
        // 创建过渡遮罩层
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

        // 添加加载动画
        const loader = document.createElement('div');
        loader.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid rgba(0, 240, 255, 0.3);
            border-top: 3px solid #00f0ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;

        // 添加旋转动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(loader);
        document.body.appendChild(overlay);

        // 显示过渡效果
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // 延迟执行跳转
        setTimeout(() => {
            callback();
        }, 500);
    }
}

// 添加通知下拉菜单的CSS样式
const notificationStyles = `
    /* 通知下拉框样式 */
    .notification-container {
        position: relative;
        z-index: 2147483000;
    }

    .notification-dropdown {
        position: fixed;
        top: 60px;
        right: auto;
        left: 8px;
        width: 350px;
        background: #132342;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 2147483000;
        display: none;
        margin-top: 0;
        opacity: 1;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        isolation: isolate;
        mix-blend-mode: normal;
    }

    .notification-dropdown.show {
        display: block;
    }

    .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: #132342;
    }

    .notification-header h4 {
        color: white;
        margin: 0;
        font-size: 16px;
    }

    .mark-all-read {
        background: none;
        border: none;
        color: #00f0ff;
        font-size: 12px;
        cursor: pointer;
        transition: color 0.3s ease;
    }

    .mark-all-read:hover {
        color: #00d4ff;
    }

    .notification-list {
        max-height: 300px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 240, 255, 0.75) rgba(10, 18, 34, 0.95);
        background: #173154;
    }
    .notification-list::-webkit-scrollbar {
        width: 10px;
    }
    .notification-list::-webkit-scrollbar-track {
        background: rgba(10, 18, 34, 0.95);
        border-left: 1px solid rgba(0, 240, 255, 0.18);
        border-radius: 10px;
    }
    .notification-list::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgba(0, 240, 255, 0.88), rgba(139, 92, 246, 0.78));
        border-radius: 10px;
        border: 2px solid rgba(10, 18, 34, 0.95);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    }
    .notification-list::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, rgba(0, 240, 255, 0.98), rgba(139, 92, 246, 0.9));
    }

    .notification-item {
        display: flex;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        background: #173154;
        mix-blend-mode: normal;
    }

    .notification-item:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateX(2px);
    }

    .notification-item.unread {
        background: #1b3d68;
        border-left: 3px solid #00f0ff;
    }

    .notification-item.unread::before {
        content: '';
        position: absolute;
        top: 50%;
        right: 15px;
        width: 8px;
        height: 8px;
        background: #00f0ff;
        border-radius: 50%;
        transform: translateY(-50%);
    }

    .notification-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 240, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        flex-shrink: 0;
    }

    .notification-icon i {
        color: #00f0ff;
        font-size: 16px;
    }

    .notification-content {
        flex: 1;
        min-width: 0;
    }

    .notification-title {
        color: white;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
    }

    .notification-message {
        color: #b0b0c0;
        font-size: 12px;
        line-height: 1.4;
        margin-bottom: 4px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .notification-time {
        color: #888;
        font-size: 11px;
    }

    .notification-footer {
        padding: 15px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        background: #132342;
    }

    .view-all-notifications {
        color: #00f0ff;
        text-decoration: none;
        font-size: 12px;
        transition: color 0.3s ease;
    }

    .view-all-notifications:hover {
        color: #00d4ff;
    }
`;

// 将样式添加到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// 页面加载完成后初始化通知组件
document.addEventListener('DOMContentLoaded', function () {
    window.notificationComponent = new NotificationComponent();
});
