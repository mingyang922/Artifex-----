/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
(function () {
    'use strict';

    const PROJECT_TEMPLATES = {
        rpg: {
            name: 'RPG 游戏',
            desc: '角色扮演游戏模板',
            type: 'game',
            assets: ['角色', '地图', 'UI', '道具'],
        },
        platformer: {
            name: '平台跳跃',
            desc: '2D 平台跳跃游戏模板',
            type: 'game',
            assets: ['角色', '背景', '平台', '道具'],
        },
        puzzle: {
            name: '消除游戏',
            desc: '三消/益智游戏模板',
            type: 'game',
            assets: ['宝石', '特效', 'UI', '背景'],
        },
        'ui-kit': {
            name: 'UI 套件',
            desc: '通用游戏 UI 组件集',
            type: 'ui',
            assets: ['按钮', '血条', '弹窗', '图标'],
        },
    };

    let selectedTemplate = 'blank';

    function initCards() {
        const cards = document.querySelectorAll('#templateCards .template-card');
        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                cards.forEach(function (c) {
                    c.style.background = 'rgba(255,255,255,0.03)';
                    c.style.borderColor = 'rgba(255,255,255,0.08)';
                });
                card.style.background = 'rgba(0,240,255,0.08)';
                card.style.borderColor = 'rgba(0,240,255,0.35)';
                selectedTemplate = card.dataset.tpl;
                applyTemplate(selectedTemplate);
            });
            card.addEventListener('mouseenter', function () {
                if (card.dataset.tpl !== selectedTemplate) {
                    card.style.background = 'rgba(255,255,255,0.06)';
                    card.style.borderColor = 'rgba(255,255,255,0.15)';
                }
            });
            card.addEventListener('mouseleave', function () {
                if (card.dataset.tpl !== selectedTemplate) {
                    card.style.background = 'rgba(255,255,255,0.03)';
                    card.style.borderColor = 'rgba(255,255,255,0.08)';
                }
            });
        });
    }

    function applyTemplate(tplKey) {
        const tpl = PROJECT_TEMPLATES[tplKey];
        if (!tpl) return;
        const nameInput = document.getElementById('project-name');
        const descInput = document.getElementById('project-desc');
        const typeInput = document.getElementById('project-type');
        if (nameInput && !nameInput.value.trim()) {
            nameInput.value = tpl.name;
        }
        if (descInput && !descInput.value.trim()) {
            descInput.value = tpl.desc;
        }
        if (typeInput) {
            typeInput.value = tpl.type;
            typeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function getSelected() {
        return selectedTemplate;
    }

    function getData(tplKey) {
        return PROJECT_TEMPLATES[tplKey] || null;
    }

    function resetSelection() {
        selectedTemplate = 'blank';
        const cards = document.querySelectorAll('#templateCards .template-card');
        cards.forEach(function (c) {
            c.style.background = c.dataset.tpl === 'blank' ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.03)';
            c.style.borderColor = c.dataset.tpl === 'blank' ? 'rgba(0,240,255,0.35)' : 'rgba(255,255,255,0.08)';
        });
    }

    window.PMTemplates = {
        TEMPLATES: PROJECT_TEMPLATES,
        initCards: initCards,
        apply: applyTemplate,
        getSelected: getSelected,
        getData: getData,
        resetSelection: resetSelection,
    };
})();
