/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
function initPointerGlow() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let scheduled = false;
    let lx = 0;
    let ly = 0;
    document.addEventListener('mousemove', (e) => {
        lx = e.clientX;
        ly = e.clientY;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            document.documentElement.style.setProperty('--mx', lx + 'px');
            document.documentElement.style.setProperty('--my', ly + 'px');
            document.body.classList.add('pointer-glow-active');
        });
    });
    document.documentElement.addEventListener('mouseleave', () => {
        document.body.classList.remove('pointer-glow-active');
    });
}

function initCardSpotlight(selector) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!selector) return;
    const bind = (el) => {
        if (!el || el.dataset.cardGlowBound === '1') return;
        el.dataset.cardGlowBound = '1';
        el.addEventListener('pointermove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            el.style.setProperty('--px', `${x}px`);
            el.style.setProperty('--py', `${y}px`);
        });
        el.addEventListener('pointerleave', () => {
            el.style.removeProperty('--px');
            el.style.removeProperty('--py');
        });
    };
    document.querySelectorAll(selector).forEach(bind);
}

window.PageEffects = {
    initPointerGlow,
    initCardSpotlight,
};
