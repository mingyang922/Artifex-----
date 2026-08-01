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
    let renderOnboardingSlide = null;

    const routes = [
        {
            id: 'home',
            labelKey: 'productivity.routeHome',
            detailKey: 'productivity.routeHomeDetail',
            icon: 'fa-house',
            href: '/dashboard.html',
        },
        {
            id: 'projects',
            labelKey: 'productivity.routeProjects',
            detailKey: 'productivity.routeProjectsDetail',
            icon: 'fa-diagram-project',
            href: '/modules/project-management/index.html',
        },
        {
            id: 'generate',
            labelKey: 'productivity.routeGenerate',
            detailKey: 'productivity.routeGenerateDetail',
            icon: 'fa-wand-magic-sparkles',
            href: '/modules/ai-generate/ai-generator-new.html',
        },
        {
            id: 'assets',
            labelKey: 'productivity.routeAssets',
            detailKey: 'productivity.routeAssetsDetail',
            icon: 'fa-images',
            href: '/modules/asset-library/asset-library.html',
        },
        {
            id: 'workflow',
            labelKey: 'productivity.routeWorkflow',
            detailKey: 'productivity.routeWorkflowDetail',
            icon: 'fa-layer-group',
            href: '/modules/workflow-hub/index.html',
        },
        {
            id: 'presets',
            labelKey: 'productivity.routePresets',
            detailKey: 'productivity.routePresetsDetail',
            icon: 'fa-swatchbook',
            href: '/modules/style-presets/style-presets.html',
        },
        {
            id: 'account',
            labelKey: 'productivity.routeAccount',
            detailKey: 'productivity.routeAccountDetail',
            icon: 'fa-user-gear',
            href: '/modules/user-center/userCenter.html',
        },
    ];

    function tr(key, values) {
        let text = window.i18n?.t ? window.i18n.t(key) : key;
        Object.entries(values || {}).forEach(([name, value]) => {
            text = text.split(`{${name}}`).join(String(value));
        });
        return text;
    }

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
        toast(tr(isReducedMotion() ? 'productivity.motionReduced' : 'productivity.motionRestored'), 'success');
    }

    function commands() {
        return routes
            .map((route) => ({
                ...route,
                label: tr(route.labelKey),
                detail: tr(route.detailKey),
                type: tr('productivity.typePage'),
                run: () => (location.href = route.href),
            }))
            .concat([
                {
                    id: 'new-project',
                    label: tr('productivity.newProject'),
                    detail: tr('productivity.newProjectDetail'),
                    icon: 'fa-circle-plus',
                    type: tr('productivity.typeAction'),
                    run: () => (location.href = '/modules/project-management/index.html?action=create'),
                },
                {
                    id: 'motion',
                    label: tr(isReducedMotion() ? 'productivity.restoreMotion' : 'productivity.reduceMotion'),
                    detail: tr('productivity.motionDetail'),
                    icon: 'fa-person-walking',
                    type: tr('productivity.typeSetting'),
                    run: toggleMotion,
                },
                {
                    id: 'tour',
                    label: tr('productivity.replayTour'),
                    detail: tr('productivity.replayTourDetail'),
                    icon: 'fa-compass',
                    type: tr('productivity.typeHelp'),
                    run: () => showOnboarding(true),
                },
            ]);
    }

    function filteredCommands(query) {
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        return commands().filter((command) =>
            words.every((word) => `${command.label} ${command.detail} ${command.type}`.toLowerCase().includes(word))
        );
    }

    function renderCommands() {
        const list = filteredCommands(commandInput.value);
        activeCommandIndex = Math.min(activeCommandIndex, Math.max(0, list.length - 1));
        commandResults.innerHTML = '';
        if (!list.length) {
            const empty = document.createElement('div');
            empty.className = 'ux-command-empty';
            empty.textContent = tr('productivity.commandEmpty');
            commandResults.appendChild(empty);
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
            button.addEventListener('click', () => {
                closeCommands();
                command.run();
            });
            commandResults.appendChild(button);
        });
    }

    function openCommands(seed) {
        if (!commandBackdrop) return;
        if (!commandBackdrop.contains(document.activeElement)) {
            previousFocus = document.activeElement?.matches?.('.top-bar .search-bar input')
                ? null
                : document.activeElement;
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

    function refreshCommandTranslations() {
        if (!commandBackdrop) return;
        const dialog = commandBackdrop.querySelector('.ux-command-dialog');
        const footer = commandBackdrop.querySelector('.ux-command-footer');
        if (dialog) dialog.setAttribute('aria-label', tr('productivity.globalSearch'));
        if (commandInput) {
            commandInput.placeholder = tr('productivity.commandPlaceholder');
            commandInput.setAttribute('aria-label', tr('productivity.searchCommands'));
        }
        if (footer) footer.textContent = tr('productivity.commandFooter');
        document.querySelectorAll('.top-bar .search-bar input').forEach((input) => {
            input.setAttribute('title', tr('productivity.openSearchTitle'));
        });
        renderCommands();
    }

    function initCommandPalette() {
        commandBackdrop = document.createElement('div');
        commandBackdrop.className = 'ux-command-backdrop';
        commandBackdrop.setAttribute('aria-hidden', 'true');
        commandBackdrop.innerHTML = `<div class="ux-command-dialog" role="dialog" aria-modal="true"><div class="ux-command-input-wrap"><i class="fas fa-search"></i><input class="ux-command-input" type="search" autocomplete="off"><span class="ux-command-hint">ESC</span></div><div class="ux-command-results"></div><div class="ux-command-footer"></div></div>`;
        document.body.appendChild(commandBackdrop);
        commandInput = commandBackdrop.querySelector('.ux-command-input');
        commandResults = commandBackdrop.querySelector('.ux-command-results');
        refreshCommandTranslations();
        commandInput.addEventListener('input', () => {
            activeCommandIndex = 0;
            renderCommands();
        });
        commandInput.addEventListener('keydown', (event) => {
            const count = filteredCommands(commandInput.value).length;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                activeCommandIndex = Math.min(activeCommandIndex + 1, count - 1);
                renderCommands();
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                activeCommandIndex = Math.max(activeCommandIndex - 1, 0);
                renderCommands();
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                commandResults.querySelectorAll('.ux-command-item')[activeCommandIndex]?.click();
            }
        });
        commandBackdrop.addEventListener('mousedown', (event) => {
            if (event.target === commandBackdrop) closeCommands();
        });
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                openCommands();
            }
            if (event.key === 'Escape' && commandBackdrop.classList.contains('is-open')) closeCommands();
        });

        document.querySelectorAll('.top-bar .search-bar input').forEach((input) => {
            input.setAttribute('title', tr('productivity.openSearchTitle'));
            input.addEventListener('focus', () => {
                input.blur();
                openCommands(input.value);
            });
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
            ['productivity.tourProjectTitle', 'productivity.tourProjectDetail', 'fa-diagram-project'],
            ['productivity.tourGenerateTitle', 'productivity.tourGenerateDetail', 'fa-wand-magic-sparkles'],
            ['productivity.tourSearchTitle', 'productivity.tourSearchDetail', 'fa-keyboard'],
        ];
        let index = 0;
        const backdrop = document.createElement('div');
        backdrop.className = 'ux-onboarding-backdrop is-open';
        backdrop.innerHTML = '<div class="ux-onboarding-card" role="dialog" aria-modal="true"></div>';
        document.body.appendChild(backdrop);
        const card = backdrop.querySelector('.ux-onboarding-card');
        const render = () => {
            const slide = slides[index];
            card.innerHTML = `<div class="ux-onboarding-step">${tr('productivity.quickStart', { current: index + 1, total: slides.length })}</div><h2>${tr(slide[0])}</h2><p>${tr(slide[1])}</p><div class="ux-onboarding-visual"><i class="fas ${slide[2]}"></i></div><div class="ux-onboarding-actions"><button type="button" class="ux-tool-button" data-tour-skip>${tr('productivity.later')}</button>${index ? `<button type="button" class="ux-tool-button" data-tour-prev>${tr('productivity.previous')}</button>` : ''}<button type="button" class="ux-tool-button is-active" data-tour-next>${tr(index === slides.length - 1 ? 'productivity.startUsing' : 'productivity.next')}</button></div>`;
            card.querySelector('[data-tour-skip]').addEventListener('click', () => {
                sessionStorage.setItem(ONBOARDING_SNOOZE_KEY, '1');
                renderOnboardingSlide = null;
                backdrop.remove();
            });
            card.querySelector('[data-tour-prev]')?.addEventListener('click', () => {
                index -= 1;
                render();
            });
            card.querySelector('[data-tour-next]').addEventListener('click', () => {
                if (index < slides.length - 1) {
                    index += 1;
                    render();
                    return;
                }
                localStorage.setItem(ONBOARDING_KEY, 'done');
                renderOnboardingSlide = null;
                backdrop.remove();
            });
        };
        renderOnboardingSlide = render;
        render();
    }

    function readAiWorkflow() {
        const ids = [
            'imageType',
            'imageStyle',
            'imageColorScheme',
            'imageSize',
            'apiProvider',
            'imageDescription',
            'wanxModelSelect',
            'qwenModelSelect',
            'img2imgStrength',
            'proPromptTextarea',
        ];
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
        toolbar.innerHTML =
            '<span class="ux-toolbar-label"><i class="fas fa-bolt"></i> <span data-i18n="productivity.workflowTools"></span></span><button class="ux-tool-button" type="button" data-ai-check><i class="fas fa-list-check"></i> <span data-i18n="productivity.preflightCheck"></span></button><button class="ux-tool-button" type="button" data-ai-save><i class="fas fa-bookmark"></i> <span data-i18n="productivity.saveParameters"></span></button><button class="ux-tool-button" type="button" data-ai-restore><i class="fas fa-rotate-left"></i> <span data-i18n="productivity.reuseParameters"></span></button><button class="ux-tool-button" type="button" data-ai-copy><i class="fas fa-copy"></i> <span data-i18n="productivity.copyPrompt"></span></button>';
        anchor.insertAdjacentElement('afterend', toolbar);
        window.i18n?.applyTranslations?.();
        toolbar.querySelector('[data-ai-save]').addEventListener('click', () => {
            localStorage.setItem(scopedPreferenceKey(AI_WORKFLOW_KEY), JSON.stringify(readAiWorkflow()));
            toast(tr('productivity.parametersSaved'), 'success');
        });
        toolbar.querySelector('[data-ai-restore]').addEventListener('click', () => {
            const saved = localStorage.getItem(scopedPreferenceKey(AI_WORKFLOW_KEY));
            if (!saved) return toast(tr('productivity.noSavedParameters'), 'error');
            try {
                applyAiWorkflow(JSON.parse(saved));
                toast(tr('productivity.parametersRestored'), 'success');
            } catch (_error) {
                toast(tr('productivity.parametersUnreadable'), 'error');
            }
        });
        toolbar.querySelector('[data-ai-copy]').addEventListener('click', async () => {
            const prompt =
                document.getElementById('imageDescription')?.value ||
                document.getElementById('proPromptTextarea')?.value ||
                '';
            if (!prompt.trim()) return toast(tr('productivity.promptRequired'), 'error');
            if (!navigator.clipboard?.writeText) return toast(tr('productivity.copyUnsupported'), 'error');
            await navigator.clipboard
                .writeText(prompt)
                .then(() => toast(tr('productivity.promptCopied'), 'success'))
                .catch(() => toast(tr('productivity.copyDenied'), 'error'));
        });
        toolbar.querySelector('[data-ai-check]').addEventListener('click', () => {
            const state = readAiWorkflow();
            const missing = [];
            if (!state.imageDescription && !state.proPromptTextarea) missing.push(tr('productivity.fieldPrompt'));
            if (!state.apiProvider) missing.push(tr('productivity.fieldProvider'));
            if (!state.imageSize) missing.push(tr('productivity.fieldOutputSize'));
            const missingText = new Intl.ListFormat(document.documentElement.lang || 'zh-CN').format(missing);
            toast(
                missing.length
                    ? tr('productivity.preflightMissing', { items: missingText })
                    : tr('productivity.preflightReady'),
                missing.length ? 'error' : 'success'
            );
        });
    }

    function initAssetTools() {
        if (page !== 'asset-library') return;
        const grid = document.getElementById('assetGrid');
        const anchor = document.querySelector('.top-row');
        if (!grid || !anchor) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'ux-library-toolbar';
        toolbar.innerHTML =
            '<span class="ux-toolbar-label"><i class="fas fa-layer-group"></i> <span data-i18n="productivity.assetView"></span> <span class="ux-library-count"></span></span><button type="button" class="ux-tool-button is-active" data-view="grid"><i class="fas fa-grip"></i> <span data-i18n="productivity.gridView"></span></button><button type="button" class="ux-tool-button" data-view="list"><i class="fas fa-list"></i> <span data-i18n="productivity.listView"></span></button><button type="button" class="ux-tool-button" data-clear-filters><i class="fas fa-filter-circle-xmark"></i> <span data-i18n="productivity.clearFilters"></span></button>';
        anchor.insertAdjacentElement('afterend', toolbar);
        window.i18n?.applyTranslations?.();
        const count = toolbar.querySelector('.ux-library-count');
        const updateCount = () => {
            count.textContent = tr('productivity.currentItems', { count: grid.querySelectorAll('.asset-card').length });
        };
        new MutationObserver(updateCount).observe(grid, { childList: true, subtree: false });
        updateCount();
        toolbar.querySelectorAll('[data-view]').forEach((button) =>
            button.addEventListener('click', () => {
                const isList = button.dataset.view === 'list';
                grid.classList.toggle('ux-list-view', isList);
                toolbar
                    .querySelectorAll('[data-view]')
                    .forEach((item) => item.classList.toggle('is-active', item === button));
                localStorage.setItem(scopedPreferenceKey('artifex-asset-view'), isList ? 'list' : 'grid');
            })
        );
        if (localStorage.getItem(scopedPreferenceKey('artifex-asset-view')) === 'list')
            toolbar.querySelector('[data-view="list"]').click();
        toolbar.querySelector('[data-clear-filters]').addEventListener('click', () => {
            ['typeFilter', 'categoryFilter'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = 'all';
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            const sort = document.getElementById('sortOrder');
            if (sort) {
                sort.value = 'newest';
                sort.dispatchEvent(new Event('change', { bubbles: true }));
            }
            document.querySelector('.tag-filter-chip.is-active')?.click();
            const search = document.getElementById('assetSearch');
            if (search) {
                search.value = '';
                search.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast(tr('productivity.filtersCleared'), 'success');
        });
    }

    applyMotionPreference();
    document.addEventListener('DOMContentLoaded', () => {
        initCommandPalette();
        initAiWorkflowTools();
        initAssetTools();
        if (page === 'home') window.setTimeout(() => showOnboarding(false), 500);
    });
    window.addEventListener('languageChanged', () => {
        refreshCommandTranslations();
        renderOnboardingSlide?.();
        const count = document.querySelector('.ux-library-count');
        const grid = document.getElementById('assetGrid');
        if (count && grid) {
            count.textContent = tr('productivity.currentItems', {
                count: grid.querySelectorAll('.asset-card').length,
            });
        }
    });

    window.ArtifexProductivity = { openCommands, showOnboarding, toast, toggleMotion };
})();
