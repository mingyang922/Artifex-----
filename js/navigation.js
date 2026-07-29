/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
class NavigationManager {
    constructor() {
        // 模块路径映射（相对于站点根目录）
        this.modulePaths = {
            home: 'dashboard.html',
            dashboard: 'dashboard.html',
            'project-management': 'modules/project-management/index.html',
            'ai-generate': 'modules/ai-generate/ai-generator-new.html',
            'visual-workbench': 'modules/ai-generate/visual-workbench.html',
            'asset-library': 'modules/asset-library/asset-library.html',
            'style-presets': 'modules/style-presets/style-presets.html',
            'user-center': 'modules/user-center/userCenter.html',
            admin: 'modules/admin/admin.html',
        };

        this.currentPage = this.detectCurrentPage();
        this.rootPrefix = this.computeRootPrefix();
        this.init();
    }

    computeRootPrefix() {
        const loc = window.location;
        // file:// 协议或根目录页面，无需前缀
        if (loc.protocol === 'file:') return '';
        const pathname = loc.pathname;
        // dashboard.html 在根目录
        if (pathname.endsWith('dashboard.html') || pathname === '/' || pathname.endsWith('/')) {
            return '';
        }
        // modules/<name>/ 下的页面，向上两级
        if (pathname.includes('/modules/')) {
            return '../../';
        }
        return '';
    }

    getTargetPath(module) {
        const targetFile = this.modulePaths[module];
        if (!targetFile) return null;
        return this.rootPrefix + targetFile;
    }

    /**
     * 检测当前页面类型
     */
    detectCurrentPage() {
        const pathname = window.location.pathname;
        if (pathname.includes('dashboard.html')) return 'dashboard';
        if (pathname.includes('visual-workbench.html')) return 'visual-workbench';
        if (pathname.includes('ai-generator-new.html')) return 'ai-generate';
        if (pathname.includes('asset-library.html')) return 'asset-library';
        if (pathname.includes('style-presets.html')) return 'style-presets';
        if (pathname.includes('project-management/index.html')) return 'project-management';
        if (pathname.includes('userCenter.html')) return 'user-center';
        return 'dashboard';
    }

    /**
     * 初始化导航事件监听器
     */
    init() {
        const navLinks = document.querySelectorAll('.nav-link[data-module]');
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = link.getAttribute('data-module');
                this.navigateTo(module);
            });
        });

        const userAvatars = document.querySelectorAll('.user-avatar');
        userAvatars.forEach((avatar) => {
            avatar.style.cursor = 'pointer';
            avatar.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.navigateTo('user-center');
            });
        });

        const toolCards = document.querySelectorAll('.tool-card[data-target]');
        toolCards.forEach((card) => {
            const target = card.getAttribute('data-target');
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                e.preventDefault();
                if (target) this.navigateTo(target);
            });
        });

        const targetLinks = document.querySelectorAll('[data-target].view-all');
        targetLinks.forEach((link) => {
            const target = link.getAttribute('data-target');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (target) this.navigateTo(target);
            });
        });
    }

    /**
     * 导航到指定模块
     */
    navigateTo(module) {
        if (this.currentPage === module) return;
        const targetPath = this.getTargetPath(module);
        if (!targetPath) return;
        this.showTransition(() => {
            window.location.href = targetPath;
        });
    }

    /**
     * 显示跳转过渡效果
     */
    showTransition(callback) {
        document.body.classList.add('page-transition-out');
        const transitionStyle = document.createElement('style');
        transitionStyle.id = 'nav-transition-style';
        transitionStyle.textContent = `
            body.page-transition-out .dashboard-container,
            body.page-transition-out .main-content { opacity: 0; transition: opacity 0.2s ease; }
            .nav-transition-overlay { position: fixed; inset: 0; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s ease; }
            .nav-transition-overlay.show { opacity: 1; }
            .nav-transition-overlay .loader { width: 40px; height: 40px; border: 3px solid rgba(0, 240, 255, 0.3); border-top: 3px solid #00f0ff; border-radius: 50%; animation: nav-spin 0.8s linear infinite; }
            @keyframes nav-spin { to { transform: rotate(360deg); } }
        `;
        if (!document.getElementById('nav-transition-style')) {
            document.head.appendChild(transitionStyle);
        }

        const overlay = document.createElement('div');
        overlay.className = 'nav-transition-overlay';
        const loader = document.createElement('div');
        loader.className = 'loader';
        overlay.appendChild(loader);

        setTimeout(() => {
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));
        }, 180);

        setTimeout(() => {
            callback();
        }, 520);
    }

    /**
     * 设置当前页面的活动导航项
     */
    setActiveNavItem() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach((link) => link.classList.remove('active'));

        let activeModule;
        switch (this.currentPage) {
            case 'dashboard':
                activeModule = 'home';
                break;
            case 'ai-generate':
            case 'visual-workbench':
                activeModule = 'ai-generate';
                break;
            case 'asset-library':
                activeModule = 'asset-library';
                break;
            case 'style-presets':
                activeModule = 'style-presets';
                break;
            case 'project-management':
                activeModule = 'project-management';
                break;
            case 'user-center':
                return;
        }

        const activeLink = document.querySelector(`.nav-link[data-module="${activeModule}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const navManager = new NavigationManager();
    navManager.setActiveNavItem();
    window.navManager = navManager;
});
