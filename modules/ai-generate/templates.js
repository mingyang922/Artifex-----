/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0
 *
 * templates.js - 游戏 UI 模板库
 * 提供预设的游戏 UI 模式模板，点击即可填入 prompt 并设置参数。
 */
'use strict';

const TEMPLATES = {
    'rpg-hud': {
        name: 'RPG 血条与状态栏',
        icon: 'fa-heart',
        prompts: {
            healthBar: {
                label: '血条',
                prompt: '像素风格 RPG 血条，绿色到红色渐变，精致边框，奇幻风格',
            },
            manaBar: {
                label: '魔法条',
                prompt: '像素风格 RPG 魔法条，蓝色渐变，发光魔法效果',
            },
            statusPanel: {
                label: '状态面板',
                prompt: '像素风格 RPG 角色状态面板，等级 HP MP 属性值，中世纪奇幻风格',
            },
        },
    },
    inventory: {
        name: '背包系统',
        icon: 'fa-box',
        prompts: {
            slot: {
                label: '物品槽',
                prompt: '像素风格游戏物品槽，网格单元格，物品占位符，游戏 UI',
            },
            bag: {
                label: '背包图标',
                prompt: '像素风格背包图标，皮革质感，奇幻 RPG 风格',
            },
            grid: {
                label: '物品网格',
                prompt: '像素风格物品网格，4x4 格子，深色背景，细边框',
            },
        },
    },
    buttons: {
        name: '游戏按钮',
        icon: 'fa-square',
        prompts: {
            primary: {
                label: '主按钮',
                prompt: '像素风格游戏按钮，按下状态，霓虹发光，赛博朋克风格',
            },
            disabled: {
                label: '禁用按钮',
                prompt: '像素风格游戏按钮，禁用状态，灰色暗淡，低调',
            },
            iconBtn: {
                label: '圆形图标按钮',
                prompt: '像素风格圆形图标按钮，游戏 UI，极简设计',
            },
        },
    },
    minimap: {
        name: '小地图',
        icon: 'fa-map',
        prompts: {
            frame: {
                label: '地图边框',
                prompt: '像素风格小地图边框，圆形，精致边框，奇幻风格',
            },
            compass: {
                label: '指南针',
                prompt: '像素风格指南针，东南西北方向标，游戏 UI 元素',
            },
            fog: {
                label: '战争迷雾',
                prompt: '像素风格战争迷雾叠加层，半透明，暗色边缘',
            },
        },
    },
    dialog: {
        name: '对话框',
        icon: 'fa-comments',
        prompts: {
            box: {
                label: '对话框体',
                prompt: '像素风格 RPG 对话框，深色背景，精致边框，奇幻 UI',
            },
            portrait: {
                label: '头像框',
                prompt: '像素风格角色头像框，圆形，金色边框，游戏 UI',
            },
            choice: {
                label: '选项按钮',
                prompt: '像素风格对话选项按钮，悬停状态，RPG 菜单风格',
            },
        },
    },
    icons: {
        name: '游戏图标',
        icon: 'fa-gem',
        prompts: {
            sword: {
                label: '武器图标',
                prompt: '像素风格剑图标，游戏背包物品，简洁设计，透明背景',
            },
            potion: {
                label: '药水图标',
                prompt: '像素风格生命药水，红色液体，玻璃瓶，游戏物品图标',
            },
            shield: {
                label: '盾牌图标',
                prompt: '像素风格盾牌图标，金属质感，游戏背包，简洁设计',
            },
        },
    },
};

/**
 * 初始化模板 UI：在图片生成页的描述区下方插入模板选择网格。
 * 点击分类卡片展开子项，点击子项将 prompt 填入描述框。
 */
function initTemplateUI() {
    const container = document.getElementById('templateSection');
    if (!container) return;

    // 构建模板网格
    const grid = document.createElement('div');
    grid.className = 'template-grid';

    Object.entries(TEMPLATES).forEach(([catKey, cat]) => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.category = catKey;

        const subKeys = Object.keys(cat.prompts);

        card.innerHTML = `
            <div class="template-card-icon"><i class="fas ${ImageGenerator.escapeHtml(cat.icon)}"></i></div>
            <div class="template-card-name">${ImageGenerator.escapeHtml(cat.name)}</div>
            <div class="template-card-hint">${subKeys.length} 个模板 · 点击展开</div>
            <div class="template-sub-list">
                ${subKeys
                    .map(
                        (sk) => `
                    <div class="template-sub-item" data-cat="${ImageGenerator.escapeHtml(catKey)}" data-sub="${ImageGenerator.escapeHtml(sk)}">
                        <i class="fas fa-chevron-right"></i>
                        <span class="template-sub-item-text">${ImageGenerator.escapeHtml(cat.prompts[sk].label)}</span>
                        <span class="template-sub-item-key">${ImageGenerator.escapeHtml(sk)}</span>
                    </div>
                `
                    )
                    .join('')}
            </div>
        `;

        // 卡片点击：展开/收起
        card.addEventListener('click', (e) => {
            // 如果点击的是子项，不切换展开
            if (e.target.closest('.template-sub-item')) return;
            card.classList.toggle('is-expanded');
        });

        // 追光效果
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--card-x', x + '%');
            card.style.setProperty('--card-y', y + '%');
        });
        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--card-x', '50%');
            card.style.setProperty('--card-y', '50%');
        });

        grid.appendChild(card);
    });

    // 子项点击：填入 prompt
    grid.addEventListener('click', (e) => {
        const subItem = e.target.closest('.template-sub-item');
        if (!subItem) return;
        const catKey = subItem.dataset.cat;
        const subKey = subItem.dataset.sub;
        const cat = TEMPLATES[catKey];
        if (!cat || !cat.prompts[subKey]) return;

        const promptText =
            typeof window.aiGeneratorTranslate === 'function'
                ? window.aiGeneratorTranslate(cat.prompts[subKey].prompt)
                : cat.prompts[subKey].prompt;
        const descEl = document.getElementById('imageDescription');
        if (descEl) {
            descEl.value = promptText;
            descEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // 设置推荐参数
        const imageTypeEl = document.getElementById('imageType');
        const imageStyleEl = document.getElementById('imageStyle');
        const colorSchemeEl = document.getElementById('imageColorScheme');

        if (imageTypeEl) {
            // 根据模板类别推断图片类型
            const typeMap = {
                'rpg-hud': 'UI界面',
                inventory: 'UI界面',
                buttons: '按钮',
                minimap: 'UI界面',
                dialog: '卡片',
                icons: '图标',
            };
            if (typeMap[catKey]) {
                imageTypeEl.value = typeMap[catKey];
                imageTypeEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        if (imageStyleEl) {
            imageStyleEl.value = '像素风格';
            imageStyleEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (colorSchemeEl) {
            colorSchemeEl.value = '蓝绿色系';
            colorSchemeEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        themedSuccess(`已填入模板「${cat.prompts[subKey].label}」`);
    });

    container.appendChild(grid);
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    initTemplateUI();
});
