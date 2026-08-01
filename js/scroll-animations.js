/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
/**
 * 全局滚动渐显动画 - 所有页面共用
 * 为带 .scroll-section 的区块在进入视口时添加 .visible，触发 CSS 过渡
 */
'use strict';

const style = document.createElement('style');
style.textContent = [
    '.scroll-section {',
    '  opacity: 0;',
    '  transform: translateY(24px);',
    '  transition: opacity 0.6s ease, transform 0.6s ease;',
    '}',
    '.scroll-section.visible {',
    '  opacity: 1;',
    '  transform: translateY(0);',
    '}',
    '.scroll-section .tool-card, .scroll-section .project-card, .scroll-section .asset-card {',
    '  opacity: 0;',
    '  transform: translateY(16px);',
    '  transition: opacity 0.5s ease, transform 0.5s ease;',
    '}',
    '.scroll-section.visible .tool-card, .scroll-section.visible .project-card, .scroll-section.visible .asset-card {',
    '  opacity: 1;',
    '  transform: translateY(0);',
    '}',
    '.scroll-section .tool-card:nth-child(1) { transition-delay: 0.05s; }',
    '.scroll-section .tool-card:nth-child(2) { transition-delay: 0.1s; }',
    '.scroll-section .tool-card:nth-child(3) { transition-delay: 0.15s; }',
    '.scroll-section .tool-card:nth-child(4) { transition-delay: 0.2s; }',
    '.scroll-section .project-card:nth-child(1) { transition-delay: 0.05s; }',
    '.scroll-section .project-card:nth-child(2) { transition-delay: 0.1s; }',
    '.scroll-section .project-card:nth-child(3) { transition-delay: 0.15s; }',
].join('\n');
document.head.appendChild(style);

function run() {
    const sections = document.querySelectorAll('.scroll-section');
    if (!sections.length) return;

    if (!('IntersectionObserver' in window)) {
        sections.forEach(function (el) {
            el.classList.add('visible');
        });
        return;
    }

    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    sections.forEach(function (el) {
        observer.observe(el);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
} else {
    run();
}
