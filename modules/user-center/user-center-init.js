/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
// 生成用户ID的函数
function generateUserId() {
    // 生成2个随机字母（从26个字母中选择）
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomLetters = '';
    for (let i = 0; i < 2; i++) {
        randomLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // 生成8位数字编号（从00000000开始）
    const userIdCounter = getUserIdCounter();
    const numberPart = String(userIdCounter).padStart(8, '0');

    // 组合用户ID
    return randomLetters + numberPart;
}

// 获取用户ID计数器
function getUserIdCounter() {
    const counter = localStorage.getItem('userIdCounter');
    if (counter) {
        const newCounter = parseInt(counter) + 1;
        localStorage.setItem('userIdCounter', newCounter);
        return newCounter;
    } else {
        // 初始化计数器
        localStorage.setItem('userIdCounter', '1');
        return 1;
    }
}

// 检查用户ID是否唯一
function isUserIdUnique(userId) {
    try {
        const usedIds = JSON.parse(localStorage.getItem('usedUserIds') || '[]');
        return !usedIds.includes(userId);
    } catch (_e) {
        return true; // 解析失败时视为唯一
    }
}

// 保存已使用的用户ID
function saveUsedUserId(userId) {
    try {
        const usedIds = JSON.parse(localStorage.getItem('usedUserIds') || '[]');
        usedIds.push(userId);
        localStorage.setItem('usedUserIds', JSON.stringify(usedIds));
    } catch (_e) {
        // localStorage 满或被污染时静默降级
    }
}

// 生成唯一用户ID
function generateUniqueUserId() {
    let userId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100; // 防止无限循环

    while (!isUnique && attempts < maxAttempts) {
        userId = generateUserId();
        isUnique = isUserIdUnique(userId);
        attempts++;
    }

    if (isUnique) {
        saveUsedUserId(userId);
        return userId;
    } else {
        throw new Error('无法生成唯一的用户ID');
    }
}

// 初始化用户ID（由 user-center-page.js 调用）
// 注意：saveUserConfig / loadUserConfig 已统一在 user-center-page.js 中
// eslint-disable-next-line no-unused-vars
function initUserId() {
    const usernameInput = document.getElementById('username');
    if (!usernameInput) return;

    // 检查是否已经有服务端下发的用户名
    // （syncSessionAndProfile 会写入 userConfig.userId）
    const savedConfig = localStorage.getItem('userConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            if (config.userId) {
                usernameInput.value = config.userId;
                return;
            }
        } catch (_e) {
            /* ignore */
        }
    }

    // 生成新的用户 ID（仅本地场景兜底）
    try {
        const userId = generateUniqueUserId();
        usernameInput.value = userId;
    } catch (error) {
        console.error('生成用户ID时出错:', error);
        usernameInput.value = 'ID-00000000';
    }
}

// 初始化 API 设置下拉框为 tech-select 样式
function initApiTechSelect() {
    const select = document.getElementById('api-provider-select');
    if (!select || select.dataset.techSelectReady === '1') return;
    select.dataset.techSelectReady = '1';
    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'tech-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tech-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');

    const value = document.createElement('span');
    value.className = 'tech-select-value';
    trigger.appendChild(value);

    const menu = document.createElement('div');
    menu.className = 'tech-select-menu';
    menu.setAttribute('role', 'listbox');

    Array.from(select.options).forEach((opt) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'tech-select-option';
        item.setAttribute('role', 'option');
        item.textContent = opt.textContent;
        item.dataset.value = opt.value;
        menu.appendChild(item);
    });

    select.insertAdjacentElement('afterend', wrapper);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    const syncUI = () => {
        const current = select.options[select.selectedIndex];
        value.textContent = current ? current.textContent : '请选择';
        menu.querySelectorAll('.tech-select-option').forEach((item) => {
            const on = item.dataset.value === select.value;
            item.classList.toggle('is-selected', on);
            item.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('is-open');
        document.querySelectorAll('.tech-select.is-open').forEach((w) => {
            w.classList.remove('is-open');
            const g = w.closest('.form-group');
            if (g) g.classList.remove('tech-select-open');
        });
        if (!isOpen) {
            wrapper.classList.add('is-open');
            const group = wrapper.closest('.form-group');
            if (group) group.classList.add('tech-select-open');
            // 定位菜单
            const rect = trigger.getBoundingClientRect();
            menu.style.minWidth = rect.width + 'px';
            menu.style.left = rect.left + 'px';
            menu.style.top = rect.bottom + 4 + 'px';
        }
    });

    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.tech-select-option');
        if (!item) return;
        select.value = item.dataset.value;
        select.dispatchEvent(new Event('change'));
        wrapper.classList.remove('is-open');
        const group = wrapper.closest('.form-group');
        if (group) group.classList.remove('tech-select-open');
        syncUI();
    });

    // 点击外部关闭下拉（使用 AbortController 防止重复绑定）
    if (!document._apiTechSelectOutsideBound) {
        document._apiTechSelectOutsideBound = true;
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.tech-select.is-open').forEach((w) => {
                if (!w.contains(e.target)) {
                    w.classList.remove('is-open');
                    const g = w.closest('.form-group');
                    if (g) g.classList.remove('tech-select-open');
                }
            });
        });
    }

    select.addEventListener('change', syncUI);
    syncUI();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initApiTechSelect, 300);
});
