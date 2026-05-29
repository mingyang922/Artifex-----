/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 Artifex Team
 * 版本: 1.0.0 */
/**
 * AvatarManager类 - 统一管理所有页面的头像显示和更新
 */
class AvatarManager {
    constructor() {
        this.avatarKey = 'userAvatar';
        this.defaultAvatar = 'JD';
        this.avatarElements = [];
        this.init();
    }

    /**
     * 初始化头像管理器
     */
    init() {
        // 延迟初始化，确保DOM完全加载
        setTimeout(() => {
            this.findAvatarElements();
            this.loadAvatarFromStorage();
            this.setupAvatarSync();
        }, 200);
    }

    /**
     * 查找所有头像元素
     */
    findAvatarElements() {
        this.avatarElements = document.querySelectorAll('.user-avatar');
    }

    /**
     * 从本地存储加载头像
     */
    loadAvatarFromStorage() {
        const savedAvatar = localStorage.getItem(this.avatarKey);
        if (savedAvatar) {
            this.updateAllAvatars(savedAvatar);
        }
    }

    /**
     * 设置头像同步监听
     */
    setupAvatarSync() {
        // 监听存储变化，实现跨页面同步
        window.addEventListener('storage', (e) => {
            if (e.key === this.avatarKey) {
                this.updateAllAvatars(e.newValue);
            }
        });

        // 监听自定义头像更新事件
        window.addEventListener('avatarUpdated', (e) => {
            this.updateAllAvatars(e.detail.avatar);
        });
    }

    /**
     * 更新所有头像显示
     * @param {string} avatar - 头像内容（图片URL或文字）
     */
    updateAllAvatars(avatar) {
        this.avatarElements.forEach((element) => {
            this.updateSingleAvatar(element, avatar);
        });
    }

    /**
     * 更新单个头像元素
     * @param {HTMLElement} element - 头像元素
     * @param {string} avatar - 头像内容
     */
    updateSingleAvatar(element, avatar) {
        if (!element) return;

        // 清空现有内容
        element.innerHTML = '';

        // 检查是否为图片URL
        if (this.isImageUrl(avatar)) {
            const img = document.createElement('img');
            img.src = avatar;
            img.alt = '用户头像';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            element.appendChild(img);
        } else {
            // 显示文字头像
            element.textContent = avatar || this.defaultAvatar;
        }
    }

    /**
     * 检查是否为有效的图片URL
     * @param {string} url - 要检查的URL
     * @returns {boolean}
     */
    isImageUrl(url) {
        if (!url || typeof url !== 'string') return false;

        // 检查是否为base64图片
        if (url.startsWith('data:image/')) return true;

        // 检查是否为有效的图片URL
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return imageExtensions.test(url) || url.startsWith('http');
    }

    /**
     * 设置新头像
     * @param {string} avatar - 新头像内容
     */
    setAvatar(avatar) {
        // 保存到本地存储
        localStorage.setItem(this.avatarKey, avatar);

        // 更新所有头像
        this.updateAllAvatars(avatar);

        // 触发自定义事件
        window.dispatchEvent(
            new CustomEvent('avatarUpdated', {
                detail: { avatar: avatar },
            })
        );
    }

    /**
     * 获取当前头像
     * @returns {string}
     */
    getCurrentAvatar() {
        return localStorage.getItem(this.avatarKey) || this.defaultAvatar;
    }

    /**
     * 重置为默认头像
     */
    resetToDefault() {
        this.setAvatar(this.defaultAvatar);
    }

    /**
     * 刷新头像显示（重新查找元素并更新）
     */
    refresh() {
        this.findAvatarElements();
        this.loadAvatarFromStorage();
    }
}

// 创建全局头像管理器实例
window.avatarManager = new AvatarManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.avatarManager) {
        window.avatarManager = new AvatarManager();
    } else {
        // 如果已经存在，重新初始化
        window.avatarManager.refresh();
    }
});

// 页面完全加载后再次初始化
window.addEventListener('load', () => {
    if (window.avatarManager) {
        window.avatarManager.refresh();
    }
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarManager;
}
