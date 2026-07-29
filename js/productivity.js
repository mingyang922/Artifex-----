/** Shared productivity features: command palette, onboarding and page tools. */
'use strict';

(function () {
    const MOTION_KEY = 'artifex-reduced-motion';
    const ONBOARDING_KEY = 'artifex-onboarding-v2';
    const ONBOARDING_SNOOZE_KEY = 'artifex-onboarding-snoozed';
    const AI_WORKFLOW_KEY = 'artifex-ai-workflow-v1';
    const root = document.documentElement;
    const page = document.body.dataset.appPage || (location.pathname.includes('ai-generator') ? 'ai-generate' : '');
    let commandBackdrop = null;
    let commandInput = null;
    let commandResults = null;
    let activeCommandIndex = 0;
    let previousFocus = null;

    const routes = [
        { id: 'home', label: '工作台', detail: '查看最近项目和工作概览', icon: 'fa-house', href: '/dashboard.html' },
        { id: 'projects', label: '项目管理', detail: '创建、整理和跟踪项目', icon: 'fa-diagram-project', href: '/modules/project-management/index.html' },
        { id: 'generate', label: 'AI 生成器', detail: '生成、编辑和导出游戏美术资产', icon: 'fa-wand-magic-sparkles', href: '/modules/ai-generate/ai-generator-new.html' },
        { id: 'assets', label: '素材库', detail: '搜索、筛选和批量管理素材', icon: 'fa-images', href: '/modules/asset-library/asset-library.html' },
        { id: 'presets', label: '风格预设', detail: '管理可复用的设计风格', icon: 'fa-swatchbook', href: '/modules/style-presets/style-presets.html' },
        { id: 'account', label: '账户与 API', detail: '管理个人资料和服务商配置', icon: 'fa-user-gear', href: '/modules/user-center/userCenter.html' },
    ];

    function toast(message, type) {
        let stack = document.querySelector('.ux-toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'ux-toast-stack';
            stack.setAttribute('aria-live', 'polite');
            document.body.appendChild(stack);
        }
        const item = document.createElement('div');
        item.className = 'ux-toast' + (type ? ' is-' + type : '');
        item.textContent = message;
        stack.appendChild(item);
        window.setTimeout(() => item.remove(), 2800);
    }

    function scopedPreferenceKey(base) {
        if (window.GameUiUserScope && typeof window.GameUiUserScope.key === 'function') {
            return window.GameUiUserScope.key(base);
        }
        return base;
    }

    function isReducedMotion() {
        return localStorage.getItem(MOTION_KEY) === '1';
    }

    function applyMotionPreference() {
        root.classList.toggle('reduce-motion', isReducedMotion());
    }

    function toggleMotion() {
        localStorage.setItem(MOTION_KEY, isReducedMotion() ? '0' : '1');
        applyMotionPreference();
        toast(isReducedMotion() ? '已减少界面动态效果' : '已恢复界面动态效果', 'success');
    }

    function commands() {
        return routes
            .map((route) => ({ ...route, type: '页面', run: () => (location.href = route.href) }))
            .concat([
                { id: 'new-project', label: '新建项目', detail: '进入项目管理并创建项目', icon: 'fa-circle-plus', type: '操作', run: () => (location.href = '/modules/project-management/index.html?action=create') },
                { id: 'motion', label: isReducedMotion() ? '恢复动态效果' : '减少动态效果', detail: '切换动画和视觉运动偏好', icon: 'fa-person-walking', type: '设置', run: toggleMotion },
                { id: 'tour', label: '重新查看新手引导', detail: '快速了解 Artifex 的核心工作流', icon: 'fa-compass', type: '帮助', run: () => showOnboarding(true) },
            ]);
    }

    function filteredCommands(query) {
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        return commands().filter((command) => words.every((word) => `${command.label} ${command.detail} ${command.type}`.toLowerCase().includes(word)));
    }

    function renderCommands() {
        const list = filteredCommands(commandInput.value);
        activeCommandIndex = Math.min(activeCommandIndex, Math.max(0, list.length - 1));
        commandResults.innerHTML = '';
        if (!list.length) {
            commandResults.innerHTML = '<div class="ux-command-empty">没有找到匹配的页面或操作</div>';
            return;
        }
        list.forEach((command, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'ux-command-item' + (index === activeCommandIndex ? ' is-active' : '');
            button.innerHTML = `<span class="ux-command-icon"><i class="fas ${command.icon}"></i></span><span class="ux-command-copy"><strong>${command.label}</strong><small>${command.detail}</small></span><span class="ux-command-type">${command.type}</span>`;
            button.addEventListener('mouseenter', () => {
                activeCommandIndex = index;
                commandResults.querySelector('.ux-command-item.is-active')?.classList.remove('is-active');
                button.classList.add('is-active');
            });
            button.addEventListener('click', () => { closeCommands(); command.run(); });
            commandResults.appendChild(button);
        });
    }

    function openCommands(seed) {
        if (!commandBackdrop) return;
        if (!commandBackdrop.contains(document.activeElement)) {
            previousFocus = document.activeElement?.matches?.('.top-bar .search-bar input') ? null : document.activeElement;
        }
        commandBackdrop.classList.add('is-open');
        commandBackdrop.setAttribute('aria-hidden', 'false');
        commandInput.value = seed || '';
        activeCommandIndex = 0;
        renderCommands();
        commandInput.focus();
        window.setTimeout(() => commandInput.focus(), 10);
    }

    function closeCommands() {
        if (!commandBackdrop) return;
        commandBackdrop.classList.remove('is-open');
        commandBackdrop.setAttribute('aria-hidden', 'true');
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }

    function initCommandPalette() {
        commandBackdrop = document.createElement('div');
        commandBackdrop.className = 'ux-command-backdrop';
        commandBackdrop.setAttribute('aria-hidden', 'true');
        commandBackdrop.innerHTML = `<div class="ux-command-dialog" role="dialog" aria-modal="true" aria-label="全局搜索"><div class="ux-command-input-wrap"><i class="fas fa-search"></i><input class="ux-command-input" type="search" autocomplete="off" placeholder="搜索页面、功能或操作…" aria-label="搜索命令"><span class="ux-command-hint">ESC</span></div><div class="ux-command-results"></div><div class="ux-command-footer">↑↓ 选择 · Enter 打开 · Esc 关闭</div></div>`;
        document.body.appendChild(commandBackdrop);
        commandInput = commandBackdrop.querySelector('.ux-command-input');
        commandResults = commandBackdrop.querySelector('.ux-command-results');
        commandInput.addEventListener('input', () => { activeCommandIndex = 0; renderCommands(); });
        commandInput.addEventListener('keydown', (event) => {
            const count = filteredCommands(commandInput.value).length;
            if (event.key === 'ArrowDown') { event.preventDefault(); activeCommandIndex = Math.min(activeCommandIndex + 1, count - 1); renderCommands(); }
            if (event.key === 'ArrowUp') { event.preventDefault(); activeCommandIndex = Math.max(activeCommandIndex - 1, 0); renderCommands(); }
            if (event.key === 'Enter') { event.preventDefault(); commandResults.querySelectorAll('.ux-command-item')[activeCommandIndex]?.click(); }
        });
        commandBackdrop.addEventListener('mousedown', (event) => { if (event.target === commandBackdrop) closeCommands(); });
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommands(); }
            if (event.key === 'Escape' && commandBackdrop.classList.contains('is-open')) closeCommands();
        });

        document.querySelectorAll('.top-bar .search-bar input').forEach((input) => {
            input.setAttribute('title', '按 Ctrl+K 打开全局搜索');
            input.addEventListener('focus', () => { input.blur(); openCommands(input.value); });
            const hint = document.createElement('span');
            hint.className = 'ux-command-hint';
            hint.textContent = 'Ctrl K';
            input.parentElement?.appendChild(hint);
        });
    }

    function showOnboarding(force) {
        if (!force && (localStorage.getItem(ONBOARDING_KEY) || sessionStorage.getItem(ONBOARDING_SNOOZE_KEY))) return;
        document.querySelector('.ux-onboarding-backdrop')?.remove();
        const slides = [
            ['把灵感变成可管理的项目', '先创建项目，再把 AI 生成、素材与交付物集中到同一上下文中。', 'fa-diagram-project'],
            ['生成、比较、复用', '在 AI 生成器中保存参数快照，快速复用上一次成功配置。', 'fa-wand-magic-sparkles'],
            ['随时用 Ctrl+K 到达目标', '从任意页面搜索功能、切换设置或快速打开常用模块。', 'fa-keyboard'],
        ];
        let index = 0;
        const backdrop = document.createElement('div');
        backdrop.className = 'ux-onboarding-backdrop is-open';
        backdrop.innerHTML = '<div class="ux-onboarding-card" role="dialog" aria-modal="true"></div>';
        document.body.appendChild(backdrop);
        const card = backdrop.querySelector('.ux-onboarding-card');
        const render = () => {
            const slide = slides[index];
            card.innerHTML = `<div class="ux-onboarding-step">快速开始 ${index + 1} / ${slides.length}</div><h2>${slide[0]}</h2><p>${slide[1]}</p><div class="ux-onboarding-visual"><i class="fas ${slide[2]}"></i></div><div class="ux-onboarding-actions"><button type="button" class="ux-tool-button" data-tour-skip>稍后再看</button>${index ? '<button type="button" class="ux-tool-button" data-tour-prev>上一步</button>' : ''}<button type="button" class="ux-tool-button is-active" data-tour-next>${index === slides.length - 1 ? '开始使用' : '下一步'}</button></div>`;
            card.querySelector('[data-tour-skip]').addEventListener('click', () => {
                sessionStorage.setItem(ONBOARDING_SNOOZE_KEY, '1');
                backdrop.remove();
            });
            card.querySelector('[data-tour-prev]')?.addEventListener('click', () => { index -= 1; render(); });
            card.querySelector('[data-tour-next]').addEventListener('click', () => {
                if (index < slides.length - 1) { index += 1; render(); return; }
                localStorage.setItem(ONBOARDING_KEY, 'done');
                backdrop.remove();
            });
        };
        render();
    }

    function readAiWorkflow() {
        const ids = ['imageType', 'imageStyle', 'imageColorScheme', 'imageSize', 'apiProvider', 'imageDescription', 'wanxModelSelect', 'qwenModelSelect', 'img2imgStrength', 'proPromptTextarea'];
        return Object.fromEntries(ids.map((id) => [id, document.getElementById(id)?.value || '']));
    }

    function applyAiWorkflow(workflow) {
        Object.entries(workflow || {}).forEach(([id, value]) => {
            const control = document.getElementById(id);
            if (!control || value === '') return;
            control.value = value;
            control.dispatchEvent(new Event('change', { bubbles: true }));
            control.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    function initAiWorkflowTools() {
        if (page !== 'ai-generate') return;
        const container = document.querySelector('.ai-generator-container');
        const anchor = container?.querySelector('.section-subtitle');
        if (!container || !anchor) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'ux-workflow-toolbar';
        toolbar.innerHTML = '<span class="ux-toolbar-label"><i class="fas fa-bolt"></i> 工作流快捷工具</span><button class="ux-tool-button" type="button" data-ai-check><i class="fas fa-list-check"></i> 生成前检查</button><button class="ux-tool-button" type="button" data-ai-save><i class="fas fa-bookmark"></i> 保存参数</button><button class="ux-tool-button" type="button" data-ai-restore><i class="fas fa-rotate-left"></i> 复用参数</button><button class="ux-tool-button" type="button" data-ai-copy><i class="fas fa-copy"></i> 复制提示词</button>';
        anchor.insertAdjacentElement('afterend', toolbar);
        toolbar.querySelector('[data-ai-save]').addEventListener('click', () => { localStorage.setItem(scopedPreferenceKey(AI_WORKFLOW_KEY), JSON.stringify(readAiWorkflow())); toast('当前生成参数已保存', 'success'); });
        toolbar.querySelector('[data-ai-restore]').addEventListener('click', () => {
            const saved = localStorage.getItem(scopedPreferenceKey(AI_WORKFLOW_KEY));
            if (!saved) return toast('还没有保存过参数', 'error');
            try { applyAiWorkflow(JSON.parse(saved)); toast('已恢复保存的生成参数', 'success'); } catch (_error) { toast('参数快照无法读取', 'error'); }
        });
        toolbar.querySelector('[data-ai-copy]').addEventListener('click', async () => {
            const prompt = document.getElementById('imageDescription')?.value || document.getElementById('proPromptTextarea')?.value || '';
            if (!prompt.trim()) return toast('请先填写提示词', 'error');
            if (!navigator.clipboard?.writeText) return toast('当前浏览器不支持自动复制', 'error');
            await navigator.clipboard.writeText(prompt).then(() => toast('提示词已复制', 'success')).catch(() => toast('浏览器未允许复制', 'error'));
        });
        toolbar.querySelector('[data-ai-check]').addEventListener('click', () => {
            const state = readAiWorkflow();
            const missing = [];
            if (!state.imageDescription && !state.proPromptTextarea) missing.push('提示词');
            if (!state.apiProvider) missing.push('API 服务商');
            if (!state.imageSize) missing.push('输出尺寸');
            toast(missing.length ? `生成前还需检查：${missing.join('、')}` : '参数完整，可以开始生成', missing.length ? 'error' : 'success');
        });
    }

    function initAssetTools() {
        if (page !== 'asset-library') return;
        const grid = document.getElementById('assetGrid');
        const anchor = document.querySelector('.top-row');
        if (!grid || !anchor) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'ux-library-toolbar';
        toolbar.innerHTML = '<span class="ux-toolbar-label"><i class="fas fa-layer-group"></i> 素材视图 <span class="ux-library-count"></span></span><button type="button" class="ux-tool-button is-active" data-view="grid"><i class="fas fa-grip"></i> 网格</button><button type="button" class="ux-tool-button" data-view="list"><i class="fas fa-list"></i> 列表</button><button type="button" class="ux-tool-button" data-clear-filters><i class="fas fa-filter-circle-xmark"></i> 清除筛选</button>';
        anchor.insertAdjacentElement('afterend', toolbar);
        const count = toolbar.querySelector('.ux-library-count');
        const updateCount = () => { count.textContent = `· 当前 ${grid.querySelectorAll('.asset-card').length} 项`; };
        new MutationObserver(updateCount).observe(grid, { childList: true, subtree: false });
        updateCount();
        toolbar.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
            const isList = button.dataset.view === 'list';
            grid.classList.toggle('ux-list-view', isList);
            toolbar.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('is-active', item === button));
            localStorage.setItem(scopedPreferenceKey('artifex-asset-view'), isList ? 'list' : 'grid');
        }));
        if (localStorage.getItem(scopedPreferenceKey('artifex-asset-view')) === 'list') toolbar.querySelector('[data-view="list"]').click();
        toolbar.querySelector('[data-clear-filters]').addEventListener('click', () => {
            ['typeFilter', 'categoryFilter'].forEach((id) => { const el = document.getElementById(id); if (el) { el.value = 'all'; el.dispatchEvent(new Event('change', { bubbles: true })); } });
            const sort = document.getElementById('sortOrder');
            if (sort) { sort.value = 'newest'; sort.dispatchEvent(new Event('change', { bubbles: true })); }
            document.querySelector('.tag-filter-chip.is-active')?.click();
            const search = document.getElementById('assetSearch');
            if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
            toast('筛选条件已清除', 'success');
        });
    }

    applyMotionPreference();
    document.addEventListener('DOMContentLoaded', () => {
        initCommandPalette();
        initAiWorkflowTools();
        initAssetTools();
        if (page === 'home') window.setTimeout(() => showOnboarding(false), 500);
    });

    window.ArtifexProductivity = { openCommands, showOnboarding, toast, toggleMotion };
})();
