/**
 * Artifex i18n runtime - language state and DOM bindings.
 */
'use strict';

const i18nData = window.ArtifexI18nData;
if (!i18nData || !i18nData.languages || !i18nData.translations) {
    throw new Error('Artifex i18n dictionaries must load before the runtime.');
}
const LANGUAGES = i18nData.languages;
const TRANSLATIONS = i18nData.translations;

let currentLang = localStorage.getItem('artifex-lang') || 'zh';

function t(key, variables) {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    let value = entry[currentLang] || entry.zh || key;
    if (variables && typeof value === 'string') {
        Object.keys(variables).forEach(function (name) {
            value = value.replace(new RegExp('\\{' + name + '\\}', 'g'), String(variables[name]));
        });
    }
    return value;
}

function setLanguage(lang) {
    if (!LANGUAGES[lang]) return;
    currentLang = lang;
    try {
        localStorage.setItem('artifex-lang', lang);
    } catch (_e) {
        /* Safari private */
    }
    applyTranslations();
    document.documentElement.lang = { zh: 'zh-CN', zht: 'zh-Hant', en: 'en', ja: 'ja', ko: 'ko' }[lang] || lang;
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function getLanguage() {
    return currentLang;
}

function getLanguages() {
    return LANGUAGES;
}

function applyTranslations() {
    document.documentElement.lang =
        { zh: 'zh-CN', zht: 'zh-Hant', en: 'en', ja: 'ja', ko: 'ko' }[currentLang] || currentLang;
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (el.tagName === 'INPUT' && el.type !== 'submit' && el.type !== 'checkbox') {
            el.placeholder = text;
        } else if (el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });
    // Translate elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    // Translate elements with data-i18n-aria attribute
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
}

// Auto-apply on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
} else {
    applyTranslations();
}

// Expose globally
window.i18n = {
    t: t,
    setLanguage: setLanguage,
    getLanguage: getLanguage,
    getLanguages: getLanguages,
    applyTranslations: applyTranslations,
};
