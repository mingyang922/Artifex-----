/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
class AvatarManager {
    constructor() {
        this.avatarKey = 'userAvatar';
        this.defaultAvatar = 'JD';
        this.avatarElements = [];
        this.init();
    }

    init() {
        // 延迟初始化，确保DOM完全加载
        setTimeout(() => {
            this.findAvatarElements();
            this.loadAvatarFromStorage();
            this.setupAvatarSync();
        }, 200);
    }

    findAvatarElements() {
        this.avatarElements = document.querySelectorAll('.user-avatar');
    }

    loadAvatarFromStorage() {
        const savedAvatar = localStorage.getItem(this.avatarKey);
        if (savedAvatar) {
            this.updateAllAvatars(savedAvatar);
        }
    }

    setupAvatarSync() {
        // 监听存储变化，实现跨页面同步
        window.addEventListener('storage', (e) => {
            if (e.key === this.avatarKey) {
                this.updateAllAvatars(e.newValue);
            }
        });

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

        element.innerHTML = '';

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

        if (url.startsWith('data:image/')) return true;

        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return imageExtensions.test(url) || url.startsWith('http');
    }

    /**
     * 设置新头像
     * @param {string} avatar - 新头像内容
     */
    setAvatar(avatar) {
        localStorage.setItem(this.avatarKey, avatar);
        this.updateAllAvatars(avatar);
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

    resetToDefault() {
        this.setAvatar(this.defaultAvatar);
    }

    refresh() {
        this.findAvatarElements();
        this.loadAvatarFromStorage();
    }
}

window.avatarManager = new AvatarManager();

document.addEventListener('DOMContentLoaded', () => {
    window.avatarManager.refresh();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvatarManager;
}
