/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
(function () {
    'use strict';

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    function initHolographic() {
        const selectors = '.tool-card, .project-card, .stat-card, .asset-card, .ai-feature-card';
        document.querySelectorAll(selectors).forEach(bindCard);
        // Observe for dynamically added cards (debounced)
        let debounceTimer = null;
        const observer = new MutationObserver(() => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                document.querySelectorAll(selectors).forEach(bindCard);
            }, 200);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => observer.disconnect());
    }

    function bindCard(card) {
        if (card.dataset.holographic) return;
        card.dataset.holographic = '1';
        card.style.transition = card.style.transition || 'transform 0.2s ease, box-shadow 0.3s ease';

        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotateX = (0.5 - y) * 10;
            const rotateY = (x - 0.5) * 10;
            card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            const hue = Math.round(x * 360);
            card.style.boxShadow = `0 0 20px hsla(${hue}, 100%, 50%, 0.15), 0 8px 32px rgba(0,0,0,0.3)`;
        });

        card.addEventListener('pointerleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHolographic);
    } else {
        initHolographic();
    }
})();
