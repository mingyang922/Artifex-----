/**
 * Applies the persisted regional theme before stylesheets paint the first frame.
 * The full theme engine takes over after DOMContentLoaded.
 */
'use strict';

(function () {
    const bootstrapScript = document.currentScript;
    const stylesBaseUrl = bootstrapScript?.src
        ? new URL('../styles/', bootstrapScript.src)
        : new URL('/styles/', window.location.origin);
    const THEME_CLASSES = {
        china: 'theme-china',
        japan: 'theme-japan',
        korea: 'theme-korea',
        uk: 'theme-uk',
        tc: 'theme-china',
    };
    const THEME_COLORS = {
        china: '#c82e3b',
        japan: '#e8607a',
        korea: '#b088f9',
        uk: '#d4af37',
        tc: '#e8a838',
    };

    function getUserCountry() {
        try {
            const config = JSON.parse(localStorage.getItem('userConfig') || 'null');
            return String(config?.personalInfo?.country || '').toLowerCase();
        } catch (_error) {
            return '';
        }
    }

    function resolveThemeId(lang, country) {
        const normalizedLang = String(lang || '').toLowerCase();
        const normalizedCountry = String(country || '').toLowerCase();
        if (normalizedLang === 'ja' || normalizedCountry === 'jp') return 'japan';
        if (normalizedLang === 'ko' || normalizedCountry === 'kr') return 'korea';
        if (normalizedLang === 'zht' || normalizedCountry === 'tw') return 'tc';
        if (normalizedLang === 'en') return 'uk';
        if (normalizedLang === 'zh' || normalizedCountry === 'cn') return 'china';
        return 'off';
    }

    function ensureThemeStyles(id) {
        if (!THEME_CLASSES[id] || document.querySelector(`link[data-artifex-theme="${id}"]`)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            const styleId = id === 'tc' ? 'china' : id;
            link.href = new URL(`theme-${styleId}.css`, stylesBaseUrl).href;
            link.dataset.artifexTheme = id;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`主题样式加载失败: ${id}`));
            document.head.appendChild(link);
        });
    }

    let mode = 'off';
    try {
        mode = localStorage.getItem('artifex-region-theme') || 'off';
    } catch (_error) {
        // Storage can be unavailable in private browsing contexts.
    }

    let themeId = mode;
    if (mode === 'auto') {
        let lang = 'zh';
        try {
            lang = localStorage.getItem('artifex-lang') || 'zh';
        } catch (_error) {
            // Keep the default language.
        }
        themeId = resolveThemeId(lang, getUserCountry());
    }

    const themeClass = THEME_CLASSES[themeId];
    if (themeClass) {
        ensureThemeStyles(themeId).catch(() => {});
        document.documentElement.classList.add(themeClass);
        document.documentElement.dataset.regionThemeBootstrap = themeId;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta && THEME_COLORS[themeId]) meta.setAttribute('content', THEME_COLORS[themeId]);
    }

    window.ArtifexThemeBootstrap = {
        resolveThemeId,
        ensureThemeStyles,
        themeId,
    };
})();
