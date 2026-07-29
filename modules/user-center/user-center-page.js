/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
const DEFAULT_AVATAR_ICON_HTML = '<i class="fas fa-user" aria-hidden="true"></i>';
if (window.PageEffects && typeof window.PageEffects.initPointerGlow === 'function') {
    window.PageEffects.initPointerGlow();
}

// 注意：getCsrfToken 已移至 js/api-utils.js

// 选项卡切换功能
const tabs = document.querySelectorAll('.user-center-tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        // 移除所有选项卡的active类
        tabs.forEach((t) => t.classList.remove('active'));

        // 隐藏所有选项卡内容
        tabContents.forEach((content) => (content.style.display = 'none'));

        // 激活当前选项卡
        tab.classList.add('active');

        // 显示对应内容
        const tabId = tab.getAttribute('data-tab');
        const tabContent = document.getElementById(tabId);
        if (tabContent) tabContent.style.display = 'block';

        // 保存当前选中的选项卡
        saveTabSelection(tabId);
    });
});

// ── 自定义下拉框初始化 ──
function initTechSelects() {
    // 初始化已有的 tech-select（如性别）
    document.querySelectorAll('.tech-select').forEach((select) => {
        if (select.dataset.initialized) return;
        select.dataset.initialized = '1';
        const trigger = select.querySelector('.tech-select-trigger');
        const _menu = select.querySelector('.tech-select-menu');
        const options = select.querySelectorAll('.tech-select-option');
        const hiddenId = select.id.replace('Select', '');
        const hiddenInput = document.getElementById(hiddenId);

        if (!trigger) return; // 结构不完整，跳过

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = select.classList.contains('is-open');
            document.querySelectorAll('.tech-select.is-open').forEach((s) => s.classList.remove('is-open'));
            if (!isOpen) select.classList.add('is-open');
        });

        options.forEach((opt) => {
            opt.addEventListener('click', () => {
                const value = opt.dataset.value;
                const text = opt.textContent;
                select.dataset.value = value;
                trigger.textContent = text;
                options.forEach((o) => o.classList.remove('is-selected'));
                opt.classList.add('is-selected');
                select.classList.remove('is-open');
                if (hiddenInput) hiddenInput.value = value;
            });
        });
    });

    // 点击外部关闭所有下拉（只绑定一次）
    if (!document._techSelectOutsideBound) {
        document._techSelectOutsideBound = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.tech-select.is-open').forEach((s) => s.classList.remove('is-open'));
        });
    }

    // 将带 tech-select-native 类的原生 select 转为自定义下拉
    document.querySelectorAll('select.tech-select-native').forEach((nativeSelect) => {
        if (nativeSelect.dataset.converted) return;
        nativeSelect.dataset.converted = '1';
        nativeSelect.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'tech-select';
        wrapper.dataset.value = nativeSelect.value;

        const trigger = document.createElement('div');
        trigger.className = 'tech-select-trigger';
        const selectedOpt = nativeSelect.options[nativeSelect.selectedIndex];
        trigger.textContent = selectedOpt ? selectedOpt.text : '请选择';

        const menu = document.createElement('div');
        menu.className = 'tech-select-menu';

        Array.from(nativeSelect.options).forEach((opt) => {
            const item = document.createElement('div');
            item.className = 'tech-select-option' + (opt.value === nativeSelect.value ? ' is-selected' : '');
            item.dataset.value = opt.value;
            item.textContent = opt.text;
            item.addEventListener('click', () => {
                nativeSelect.value = opt.value;
                wrapper.dataset.value = opt.value;
                trigger.textContent = opt.text;
                menu.querySelectorAll('.tech-select-option').forEach((o) => o.classList.remove('is-selected'));
                item.classList.add('is-selected');
                wrapper.classList.remove('is-open');
                nativeSelect.dispatchEvent(new Event('change'));
            });
            menu.appendChild(item);
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('is-open');
            document.querySelectorAll('.tech-select.is-open').forEach((s) => s.classList.remove('is-open'));
            if (!isOpen) wrapper.classList.add('is-open');
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect.nextSibling);
    });
}

function syncNativeTechSelect(nativeSelect) {
    if (!nativeSelect) return;
    const wrapper = nativeSelect.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains('tech-select')) return;

    const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
    const trigger = wrapper.querySelector('.tech-select-trigger');
    if (trigger && selectedOption) trigger.textContent = selectedOption.text;
    wrapper.dataset.value = nativeSelect.value;
    wrapper.querySelectorAll('.tech-select-option').forEach((option) => {
        option.classList.toggle('is-selected', option.dataset.value === nativeSelect.value);
    });
}

// 保存配置到localStorage（服务端同步防抖）
let _saveUserConfigTimer = null;
let _saveUserConfigPending = false;

// 保存配置到localStorage
// 修改saveUserConfig函数以包含性别字段
function saveUserConfig() {
    const usernameInput = document.getElementById('username');
    const countrySelect = document.getElementById('country');
    const countryOtherInput = document.getElementById('country-other');
    const genderSelect = document.getElementById('gender');

    // 处理国家/地区值
    let countryValue = countrySelect ? countrySelect.value : '';
    if (countryValue === 'other') {
        countryValue = countryOtherInput ? countryOtherInput.value.trim() || '其他' : '其他';
    }

    const config = {
        // 用户ID
        userId: usernameInput ? usernameInput.value : '',
        // 个人信息
        personalInfo: {
            email: (document.getElementById('email') || {}).value || '',
            nickname: (document.getElementById('nickname') || {}).value || '',
            gender: genderSelect ? genderSelect.value : '',
            bio: (document.getElementById('bio') || {}).value || '',
            country: countryValue, // 使用处理后的国家值
            language: (document.getElementById('language') || {}).value || '',
        },
        // 权限设置
        permissions: Array.from(document.querySelectorAll('.permissions-grid input[type="checkbox"]')).map(
            (checkbox, _index) => checkbox.checked
        ),
        // 当前头像
        currentAvatar: (function () {
            var el = document.getElementById('current-avatar');
            var img = el ? el.querySelector('img') : null;
            return img ? img.src : null;
        })(),
        // 头像历史记录
        avatarHistory: getAvatarHistoryFromStorage(),
    };

    localStorage.setItem('userConfig', JSON.stringify(config));

    // 防抖：300ms 内多次调用只同步最后一次到服务端
    const serverProfile = {
        personalInfo: config.personalInfo,
        permissions: config.permissions,
        currentAvatar: config.currentAvatar,
        avatarHistory: config.avatarHistory,
    };
    if (typeof getCsrfToken !== 'function') return;
    if (_saveUserConfigTimer) clearTimeout(_saveUserConfigTimer);
    _saveUserConfigTimer = setTimeout(function () {
        _saveUserConfigTimer = null;
        if (_saveUserConfigPending) return; // 上一次请求还未完成，跳过
        _saveUserConfigPending = true;
        getCsrfToken()
            .then((csrfToken) =>
                fetch('/api/me/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                    credentials: 'include',
                    body: JSON.stringify({ profile: serverProfile }),
                })
            )
            .then((res) => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then((data) => {
                if (!data.ok) throw new Error(data.error || '保存失败');
                if (window.TechUI && typeof window.TechUI.toast === 'function')
                    window.TechUI.toast('个人资料已保存', 'success');
            })
            .catch(() => {
                if (window.TechUI && typeof window.TechUI.toast === 'function')
                    window.TechUI.toast('保存个人资料失败', 'error');
            })
            .finally(() => {
                _saveUserConfigPending = false;
            });
    }, 300);
}

// 修改loadUserConfig函数以加载性别字段
function loadUserConfig() {
    const savedConfig = localStorage.getItem('userConfig');
    if (!savedConfig) return;

    let config;
    try {
        config = JSON.parse(savedConfig);
    } catch (e) {
        console.warn('[user-center] userConfig JSON 解析失败:', e.message);
        return;
    }

    // 加载用户ID
    const usernameInput = document.getElementById('username');
    if (usernameInput && config.userId) {
        usernameInput.value = config.userId;
    }

    // 加载个人信息
    if (config.personalInfo) {
        const { email, nickname, gender, bio, country, language } = config.personalInfo;
        const elEmail = document.getElementById('email');
        const elNickname = document.getElementById('nickname');
        const elGender = document.getElementById('gender');
        const elBio = document.getElementById('bio');
        const elLanguage = document.getElementById('language');
        if (elEmail) elEmail.value = email || '';
        if (elNickname) elNickname.value = nickname || '';
        if (elGender) elGender.value = gender || '';
        if (elBio) elBio.value = bio || '';
        if (elLanguage) elLanguage.value = language || '';

        // 同步自定义下拉框显示
        const genderSelect = document.getElementById('genderSelect');
        if (genderSelect) {
            const genderOpt = genderSelect.querySelector(`.tech-select-option[data-value="${gender || ''}"]`);
            if (genderOpt) {
                const genderTrigger = genderSelect.querySelector('.tech-select-trigger');
                if (genderTrigger) genderTrigger.textContent = genderOpt.textContent;
                genderSelect.dataset.value = gender || '';
                genderSelect.querySelectorAll('.tech-select-option').forEach((o) => o.classList.remove('is-selected'));
                genderOpt.classList.add('is-selected');
            }
        }

        // 处理国家/地区加载
        const countrySelect = document.getElementById('country');
        const countryOtherInput = document.getElementById('country-other');

        if (countrySelect) {
            // 查找国家是否在标准列表中
            const countryOption = countrySelect.querySelector(`option[value="${country}"]`);
            if (countryOption) {
                countrySelect.value = country;
            } else if (countryOtherInput) {
                // 如果不在标准列表中，设置为"其他"并填充自定义值
                countrySelect.value = 'other';
                countryOtherInput.value = country;
            }
        }

        // 同步国家/语言自定义下拉框
        document.querySelectorAll('select.tech-select-native').forEach(syncNativeTechSelect);
    }

    // 加载权限设置
    if (config.permissions && config.permissions.length > 0) {
        const checkboxes = document.querySelectorAll('.permissions-grid input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            if (index < config.permissions.length) {
                checkbox.checked = config.permissions[index];
            }
        });
    }

    // 加载当前头像
    if (config.currentAvatar) {
        setCurrentAvatar(config.currentAvatar);
    }

    // 加载并渲染头像历史记录
    const avatarHistory = config.avatarHistory || [];
    renderAvatarHistory(avatarHistory);
}

// 从存储中获取头像历史记录
function getAvatarHistoryFromStorage() {
    const savedConfig = localStorage.getItem('userConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            return config.avatarHistory || [];
        } catch (_) {
            /* ignore parse errors */
        }
    }
    return [];
}

// 向历史记录中添加新头像
function addToAvatarHistory(avatarSrc) {
    // 获取现有的头像历史
    let history = getAvatarHistoryFromStorage();

    // 添加新头像到历史记录开头，包含时间戳
    history.unshift({
        src: avatarSrc,
        timestamp: new Date().getTime(),
    });

    // 限制历史记录数量为20个
    if (history.length > 20) {
        history = history.slice(0, 20);
    }

    // 更新存储中的历史记录
    const savedConfig = localStorage.getItem('userConfig');
    let config = {};
    if (savedConfig) {
        try {
            config = JSON.parse(savedConfig);
        } catch (_) {
            /* ignore */
        }
    }
    config.avatarHistory = history;
    localStorage.setItem('userConfig', JSON.stringify(config));

    // 渲染头像历史
    renderAvatarHistory(history);
}

// 从历史记录中删除头像
function removeAvatarFromHistory(index) {
    let history = getAvatarHistoryFromStorage();

    // 从历史记录中移除指定索引的头像
    if (index >= 0 && index < history.length) {
        history.splice(index, 1);

        // 更新存储中的历史记录
        const savedConfig = localStorage.getItem('userConfig');
        let config = {};
        if (savedConfig) {
            try {
                config = JSON.parse(savedConfig);
            } catch (_) {
                /* ignore */
            }
        }
        config.avatarHistory = history;
        localStorage.setItem('userConfig', JSON.stringify(config));

        // 重新渲染头像历史
        renderAvatarHistory(history);
    }
}

// 渲染头像历史记录
function renderAvatarHistory(history) {
    const historyContainer = document.getElementById('avatar-history-container');
    if (!historyContainer) return;

    // 清理所有旧的工具提示
    tooltipManager.clearAll();

    historyContainer.innerHTML = '';

    if (history && history.length > 0) {
        history.forEach((avatarItem, index) => {
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'avatar-container avatar-history-item';
            avatarContainer.style.width = '80px';
            avatarContainer.style.height = '80px';
            avatarContainer.style.borderWidth = '2px';
            avatarContainer.style.cursor = 'pointer';
            avatarContainer.style.position = 'relative';
            avatarContainer.style.display = 'inline-block';
            avatarContainer.style.overflow = 'hidden';

            // 检查是否为当前头像
            const currentAvatarElement = document.getElementById('current-avatar');
            const isCurrentAvatar =
                currentAvatarElement &&
                currentAvatarElement.querySelector('img') &&
                currentAvatarElement.querySelector('img').src === avatarItem.src;

            // 当前头像高亮显示
            if (isCurrentAvatar) {
                avatarContainer.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                avatarContainer.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.5)';
            }

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'current-avatar';
            avatarDiv.style.width = '100%';
            avatarDiv.style.height = '100%';
            avatarDiv.style.position = 'relative';

            const img = document.createElement('img');
            img.src = avatarItem.src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';

            avatarDiv.appendChild(img);
            avatarContainer.appendChild(avatarDiv);

            // 添加操作按钮容器 - 放在头像外面
            const actionContainer = document.createElement('div');
            actionContainer.style.display = 'flex';
            actionContainer.style.gap = '4px';
            actionContainer.style.justifyContent = 'center';
            actionContainer.style.marginTop = '8px';

            // 添加设为当前头像按钮
            const setCurrentBtn = document.createElement('button');
            setCurrentBtn.innerHTML = '✓';
            setCurrentBtn.style.width = '24px';
            setCurrentBtn.style.height = '24px';
            setCurrentBtn.style.borderRadius = '50%';
            setCurrentBtn.style.border = 'none';
            setCurrentBtn.style.backgroundColor = isCurrentAvatar ? '#00f0ff' : 'rgba(0, 240, 255, 0.8)';
            setCurrentBtn.style.color = '#1a1a2e';
            setCurrentBtn.style.fontSize = '14px';
            setCurrentBtn.style.fontWeight = 'bold';
            setCurrentBtn.style.cursor = isCurrentAvatar ? 'not-allowed' : 'pointer';
            setCurrentBtn.style.display = 'flex';
            setCurrentBtn.style.alignItems = 'center';
            setCurrentBtn.style.justifyContent = 'center';
            setCurrentBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            setCurrentBtn.style.transition = 'all 0.2s ease';
            setCurrentBtn.disabled = isCurrentAvatar;

            // 添加悬停效果
            if (!isCurrentAvatar) {
                setCurrentBtn.addEventListener('mouseenter', function () {
                    this.style.transform = 'scale(1.1)';
                    this.style.backgroundColor = '#00f0ff';
                });
                setCurrentBtn.addEventListener('mouseleave', function () {
                    this.style.transform = 'scale(1)';
                    this.style.backgroundColor = 'rgba(0, 240, 255, 0.8)';
                });
            }

            // 添加删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '×';
            deleteButton.style.width = '24px';
            deleteButton.style.height = '24px';
            deleteButton.style.borderRadius = '50%';
            deleteButton.style.border = 'none';
            deleteButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            deleteButton.style.color = 'white';
            deleteButton.style.fontSize = '14px';
            deleteButton.style.fontWeight = 'bold';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.display = 'flex';
            deleteButton.style.alignItems = 'center';
            deleteButton.style.justifyContent = 'center';
            deleteButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            deleteButton.style.transition = 'all 0.2s ease';

            // 添加悬停效果
            deleteButton.addEventListener('mouseenter', function () {
                this.style.transform = 'scale(1.1)';
                this.style.backgroundColor = 'rgba(255, 0, 0, 1)';
            });
            deleteButton.addEventListener('mouseleave', function () {
                this.style.transform = 'scale(1)';
                this.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            });

            actionContainer.appendChild(setCurrentBtn);
            actionContainer.appendChild(deleteButton);

            // 添加自定义工具提示
            createTooltip(setCurrentBtn, isCurrentAvatar ? '当前头像' : '更换头像');
            createTooltip(deleteButton, '删除头像');

            // 创建一个包装容器来包含头像和按钮
            const wrapperContainer = document.createElement('div');
            wrapperContainer.style.display = 'flex';
            wrapperContainer.style.flexDirection = 'column';
            wrapperContainer.style.alignItems = 'center';
            wrapperContainer.style.marginRight = '10px';
            wrapperContainer.style.marginBottom = '10px';

            wrapperContainer.appendChild(avatarContainer);
            wrapperContainer.appendChild(actionContainer);

            // 添加时间戳信息
            const date = new Date(avatarItem.timestamp);
            avatarContainer.title = `上传于 ${date.toLocaleDateString()}\n${isCurrentAvatar ? '当前头像' : '点击设为当前头像'}`;

            // 点击头像设为当前头像
            avatarContainer.addEventListener('click', (e) => {
                // 如果点击的是按钮，则不触发设为当前头像
                if (!e.target.closest('button')) {
                    if (!isCurrentAvatar) {
                        setCurrentAvatar(avatarItem.src);
                        // 重新渲染历史记录以更新高亮状态
                        renderAvatarHistory(history);
                    }
                }
            });

            // 点击设为当前头像按钮
            setCurrentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isCurrentAvatar) {
                    setCurrentAvatar(avatarItem.src);
                    // 重新渲染历史记录以更新高亮状态
                    renderAvatarHistory(history);
                }
            });

            // 点击删除按钮删除头像
            deleteButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = await window.TechUI.confirm('确定要删除这个头像吗？', '删除头像', '删除', '取消');
                if (!ok) return;
                removeAvatarFromHistory(index);
            });

            historyContainer.appendChild(wrapperContainer);
        });
    } else {
        // 如果没有历史记录，显示提示信息
        const noHistoryText = document.createElement('p');
        noHistoryText.textContent = '暂无头像历史记录';
        noHistoryText.style.color = '#888';
        noHistoryText.style.fontStyle = 'italic';
        noHistoryText.style.margin = '10px 0';
        historyContainer.appendChild(noHistoryText);
    }
}

function syncResetDefaultAvatarButton() {
    const resetBtn = document.getElementById('resetDefaultAvatarBtn');
    const currentAvatarElement = document.getElementById('current-avatar');
    if (!resetBtn || !currentAvatarElement) return;
    const hasCustom = !!currentAvatarElement.querySelector('img');
    resetBtn.disabled = !hasCustom;
    resetBtn.title = hasCustom ? '移除自定义头像，恢复为人形默认图标' : '当前已是默认头像';
}

// 设置当前头像
function setCurrentAvatar(src) {
    const currentAvatarElement = document.getElementById('current-avatar');
    const topRightAvatarElement = document.getElementById('top-right-avatar');
    const deleteBtn = document.getElementById('deleteCurrentAvatarBtn');

    if (!currentAvatarElement || !topRightAvatarElement) return;

    // 使用头像管理器更新所有页面的头像
    if (window.avatarManager) {
        window.avatarManager.setAvatar(src);
    }

    // 更新用户中心页面的头像显示
    currentAvatarElement.innerHTML = '';
    topRightAvatarElement.innerHTML = '';

    if (src) {
        // 创建新的图片元素
        const img = document.createElement('img');
        img.src = src;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';

        // 为右上角头像创建另一个图片元素
        const topRightImg = document.createElement('img');
        topRightImg.src = src;
        topRightImg.style.width = '100%';
        topRightImg.style.height = '100%';
        topRightImg.style.objectFit = 'cover';
        topRightImg.style.borderRadius = '50%';

        // 添加到两个位置
        currentAvatarElement.appendChild(img);
        topRightAvatarElement.appendChild(topRightImg);
        topRightAvatarElement.classList.remove('user-avatar--placeholder');

        if (deleteBtn) {
            deleteBtn.style.display = 'block';
        }
    } else {
        currentAvatarElement.innerHTML = DEFAULT_AVATAR_ICON_HTML;
        topRightAvatarElement.innerHTML = DEFAULT_AVATAR_ICON_HTML;
        topRightAvatarElement.classList.add('user-avatar--placeholder');

        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }

    // 保存配置
    saveUserConfig();
    syncResetDefaultAvatarButton();
}

// 删除当前头像 / 恢复默认头像
function initDeleteAvatarFunctionality() {
    const deleteBtn = document.getElementById('deleteCurrentAvatarBtn');
    const resetDefaultBtn = document.getElementById('resetDefaultAvatarBtn');
    const currentAvatarElement = document.getElementById('current-avatar');
    const topRightAvatarElement = document.getElementById('top-right-avatar');

    async function confirmAndRestoreDefault() {
        const ok = await window.TechUI.confirm(
            '确定恢复为默认头像吗？将移除当前自定义头像。',
            '恢复默认头像',
            '确定',
            '取消'
        );
        if (!ok) return;
        setCurrentAvatar(null);
        const avatarHistory = getAvatarHistoryFromStorage();
        renderAvatarHistory(avatarHistory);
    }

    if (deleteBtn && currentAvatarElement && topRightAvatarElement) {
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            confirmAndRestoreDefault();
        });
    }

    if (resetDefaultBtn) {
        resetDefaultBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (resetDefaultBtn.disabled) return;
            confirmAndRestoreDefault();
        });
    }

    syncResetDefaultAvatarButton();
}

// 访问时间管理函数
function updateLastLoginTime() {
    // 获取当前时间
    const now = new Date();

    // 保存当前访问时间到localStorage（作为下次访问时的"上次登录时间"）
    localStorage.setItem('lastLoginTime', now.toISOString());
}

// 加载上次登录时间
function loadLastLoginTime() {
    const lastLoginElement = document.getElementById('last-login-time');
    if (!lastLoginElement) return;

    // 从localStorage获取上次登录时间
    const savedTime = localStorage.getItem('lastLoginTime');
    if (savedTime) {
        const lastLogin = new Date(savedTime);
        const timeString = lastLogin.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
        lastLoginElement.textContent = timeString;
    } else {
        // 如果没有保存的时间，显示"首次访问"
        lastLoginElement.textContent = '首次访问';
    }
}

// 全局工具提示管理
const tooltipManager = {
    tooltips: new Map(),

    // 清理所有工具提示
    clearAll() {
        this.tooltips.forEach((cleanup, _element) => {
            cleanup();
        });
        this.tooltips.clear();
    },

    // 为元素创建工具提示
    create(element, text) {
        // 如果元素已有工具提示，先清理
        if (this.tooltips.has(element)) {
            this.tooltips.get(element)();
        }

        const tooltip = document.createElement('div');
        tooltip.textContent = text;
        tooltip.className = 'custom-tooltip';
        tooltip.style.left = '-9999px';
        tooltip.style.top = '-9999px';

        document.body.appendChild(tooltip);

        function showTooltip() {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = rect.left + rect.width / 2 + 'px';
            tooltip.style.top = rect.top - 10 + 'px';
            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
            tooltip.classList.add('visible');
        }

        function hideTooltip() {
            tooltip.classList.remove('visible');
        }

        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);

        // 清理函数
        const cleanup = () => {
            element.removeEventListener('mouseenter', showTooltip);
            element.removeEventListener('mouseleave', hideTooltip);
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        };

        this.tooltips.set(element, cleanup);
        return cleanup;
    },
};

// 创建自定义工具提示
function createTooltip(element, text) {
    return tooltipManager.create(element, text);
}

// 保存当前选中的选项卡
function saveTabSelection(tabId) {
    localStorage.setItem('activeTab', tabId);
}

// 加载保存的选项卡
function loadTabSelection() {
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        const tab = document.querySelector(`.user-center-tab[data-tab="${activeTab}"]`);
        if (tab && !tab.classList.contains('active')) {
            tab.click();
        }
    }
}

// 头像上传功能
const avatarContainer = document.querySelector('.avatar-upload-overlay');
const avatarInput = document.getElementById('avatar-input');
const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
const _currentAvatar = document.getElementById('current-avatar');

if (avatarContainer) {
    avatarContainer.addEventListener('click', () => {
        if (avatarInput) avatarInput.click();
    });
}

if (uploadAvatarBtn) {
    uploadAvatarBtn.addEventListener('click', () => {
        if (avatarInput) avatarInput.click();
    });
}

if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // 检查文件类型
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                window.TechUI.toast('请上传JPG、PNG或GIF格式的图片', 'error');
                return;
            }

            // 检查文件大小（限制为5MB）
            if (file.size > 5 * 1024 * 1024) {
                window.TechUI.toast('上传的图片大小不能超过5MB', 'error');
                return;
            }

            const reader = new FileReader();

            reader.onload = function (e) {
                const imageData = e.target.result;

                // 创建图片对象以获取原始尺寸
                const img = new Image();
                img.onload = function () {
                    // 压缩图片到指定尺寸（200x200）
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    // 设置画布尺寸为200x200
                    canvas.width = 200;
                    canvas.height = 200;

                    // 计算缩放比例以保持图片比例
                    const scale = Math.min(img.width, img.height) / 200;
                    const scaledWidth = img.width / scale;
                    const scaledHeight = img.height / scale;

                    // 在画布中心绘制图片
                    ctx.drawImage(img, (200 - scaledWidth) / 2, (200 - scaledHeight) / 2, scaledWidth, scaledHeight);

                    // 将压缩后的图片转换为base64
                    const compressedImageData = canvas.toDataURL('image/jpeg', 0.8);

                    // 设置为当前头像
                    setCurrentAvatar(compressedImageData);

                    // 添加到头像历史记录
                    addToAvatarHistory(compressedImageData);

                    // 显示成功提示
                    window.TechUI.toast('头像上传成功！', 'success');
                };

                img.src = imageData;
            };

            reader.readAsDataURL(file);
        }
    });
}

// 表单提交事件
const personalInfoForm = document.getElementById('personal-info-form');
const _changePasswordForm = document.getElementById('change-password-form');
const _savePermissionsBtn = document.getElementById('save-permissions');
const _cancelChangesBtn = document.getElementById('cancel-changes');
const _cancelPasswordChangeBtn = document.getElementById('cancel-password-change');

if (personalInfoForm) {
    personalInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 验证表单数据
        const email = (document.getElementById('email') || {}).value || '';
        const nickname = (document.getElementById('nickname') || {}).value || '';
        const bio = (document.getElementById('bio') || {}).value || '';

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            window.TechUI.toast('请输入有效的邮箱地址', 'error');
            return;
        }

        // 验证昵称长度
        if (nickname && nickname.length > 20) {
            window.TechUI.toast('昵称长度不能超过20个字符', 'error');
            return;
        }

        // 验证个人简介长度
        if (bio && bio.length > 200) {
            window.TechUI.toast('个人简介长度不能超过200个字符', 'error');
            return;
        }

        window.TechUI.toast('个人信息已保存', 'success');
        // 保存配置
        saveUserConfig();
    });
}

// PasswordSecurityManager 类已提取到 password-security.js

// 加载注册时间
function loadRegistrationTime() {
    const registrationData = localStorage.getItem('userRegistrationData');
    const registrationTimeElement = document.getElementById('registration-time');
    if (!registrationTimeElement) return;

    if (registrationData) {
        let data;
        try {
            data = JSON.parse(registrationData);
        } catch (_) {
            return;
        }
        if (data.registrationDateFormatted) {
            registrationTimeElement.textContent = data.registrationDateFormatted;
        } else {
            // 如果没有格式化日期，使用原始日期
            const date = new Date(data.registrationDate);
            registrationTimeElement.textContent =
                date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
        }
    } else {
        // 如果没有注册数据，显示默认时间
        registrationTimeElement.textContent = '2024/1/1';
    }
}

// 通知功能
function initNotificationSystem() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const markAllReadBtn = document.getElementById('markAllRead');
    const notificationItems = document.querySelectorAll('.notification-item');
    const notificationBadge = document.querySelector('.notification-badge');

    if (!notificationBtn || !notificationDropdown) return;

    // 切换通知下拉框
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('show');
    });

    // 点击通知项处理
    notificationItems.forEach((item) => {
        item.addEventListener('click', () => {
            // 使用通知管理器标记为已读
            const notificationId = parseInt(item.dataset.id);
            if (window.notificationManager && notificationId) {
                window.notificationManager.markAsRead(notificationId);
            } else {
                // 回退到原有逻辑
                item.classList.remove('unread');
                updateNotificationBadge();
            }

            // 根据通知类型跳转到相应界面
            const titleEl = item.querySelector('.notification-title');
            const title = titleEl ? titleEl.textContent : '';

            if (title === '新用户注册') {
                // 跳转到用户管理界面
                window.TechUI.toast('跳转到用户管理界面', 'info');
                // 这里可以添加实际的跳转逻辑
                // window.location.href = 'userManagement.html';
            } else if (title === '安全提醒') {
                // 跳转到修改密码选项卡
                const changePasswordTab = document.querySelector('[data-tab="change-password"]');
                if (changePasswordTab) {
                    changePasswordTab.click();
                }
            } else if (title === '系统更新') {
                // 跳转到系统设置界面
                window.TechUI.toast('跳转到系统设置界面', 'info');
                // 这里可以添加实际的跳转逻辑
            }

            // 关闭通知下拉框
            notificationDropdown.classList.remove('show');
        });
    });

    // 全部已读
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            if (window.notificationManager) {
                window.notificationManager.markAllAsRead();
            } else {
                // 回退到原有逻辑
                notificationItems.forEach((item) => {
                    item.classList.remove('unread');
                });
                updateNotificationBadge();
            }
        });
    }

    // 查看所有通知 —— 消息中心已集成在本页面，直接滚动到消息中心区域
    const viewAllNotifications = document.getElementById('viewAllNotifications');
    if (viewAllNotifications) {
        viewAllNotifications.addEventListener('click', (e) => {
            e.preventDefault();
            // 关闭通知下拉框
            notificationDropdown.classList.remove('show');
            // 滚动到页面内嵌的消息中心面板
            const messageCenter =
                document.querySelector('.message-center-panel') || document.querySelector('.message-center');
            if (messageCenter) {
                messageCenter.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // 更新通知徽章
    function updateNotificationBadge() {
        const unreadCount = document.querySelectorAll('.notification-item.unread').length;
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }

    // 点击页面其他地方关闭通知
    document.addEventListener('click', (e) => {
        if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // 初始化徽章
    updateNotificationBadge();
}

// 显示消息中心
function _showMessageCenter() {
    // 创建消息中心模态框
    const messageCenterModal = document.createElement('div');
    messageCenterModal.className = 'message-center-modal';
    messageCenterModal.innerHTML = `
                <div class="message-center-overlay">
                    <div class="message-center-container">
                        <div class="message-center-header">
                            <h2>消息中心</h2>
                            <button class="close-message-center" id="closeMessageCenter">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="message-center-content">
                            <div class="message-center-tabs">
                                <div class="message-tab active" data-message-tab="all">全部消息</div>
                                <div class="message-tab" data-message-tab="unread">未读消息</div>
                                <div class="message-tab" data-message-tab="system">系统通知</div>
                            </div>
                            <div class="message-center-list">
                                <!-- 以下为占位/演示数据，实际使用时应从后端 API 获取真实通知 -->
                                <div class="message-item unread">
                                    <div class="message-icon">
                                        <i class="fas fa-user-plus"></i>
                                    </div>
                                    <div class="message-content">
                                        <div class="message-title">新用户注册</div>
                                        <div class="message-text">用户 "张三" 刚刚注册了账户，请及时审核</div>
                                        <div class="message-time">2025/1/15 14:30</div>
                                    </div>
                                    <div class="message-actions">
                                        <button class="message-action-btn" title="标记为已读">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="message-action-btn" title="删除">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="message-item unread">
                                    <div class="message-icon">
                                        <i class="fas fa-shield-alt"></i>
                                    </div>
                                    <div class="message-content">
                                        <div class="message-title">安全提醒</div>
                                        <div class="message-text">检测到异常登录活动，请检查账户安全设置</div>
                                        <div class="message-time">2025/1/15 13:45</div>
                                    </div>
                                    <div class="message-actions">
                                        <button class="message-action-btn" title="标记为已读">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="message-action-btn" title="删除">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="message-item">
                                    <div class="message-icon">
                                        <i class="fas fa-cog"></i>
                                    </div>
                                    <div class="message-content">
                                        <div class="message-title">系统更新</div>
                                        <div class="message-text">系统已更新到最新版本，新增多项功能</div>
                                        <div class="message-time">2025/1/15 10:20</div>
                                    </div>
                                    <div class="message-actions">
                                        <button class="message-action-btn" title="标记为已读">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="message-action-btn" title="删除">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
                .message-center-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                }

                .message-center-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .message-center-container {
                    background: #16213e;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 800px;
                    max-height: 80vh;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }

                .message-center-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 30px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .message-center-header h2 {
                    color: white;
                    margin: 0;
                    font-size: 20px;
                }

                .close-message-center {
                    background: none;
                    border: none;
                    color: #b0b0c0;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }

                .close-message-center:hover {
                    color: #00f0ff;
                    background: rgba(0, 240, 255, 0.1);
                }

                .message-center-content {
                    padding: 0;
                }

                .message-center-tabs {
                    display: flex;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .message-tab {
                    padding: 15px 25px;
                    color: #b0b0c0;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.3s ease;
                }

                .message-tab.active {
                    color: #00f0ff;
                    border-bottom-color: #00f0ff;
                }

                .message-tab:hover {
                    color: #00f0ff;
                }

                .message-center-list {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .message-item {
                    display: flex;
                    padding: 20px 30px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .message-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .message-item.unread {
                    background: rgba(0, 240, 255, 0.05);
                    border-left: 3px solid #00f0ff;
                }

                .message-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(0, 240, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                    flex-shrink: 0;
                }

                .message-icon i {
                    color: #00f0ff;
                    font-size: 20px;
                }

                .message-content {
                    flex: 1;
                    min-width: 0;
                }

                .message-title {
                    color: white;
                    font-weight: 600;
                    font-size: 16px;
                    margin-bottom: 5px;
                }

                .message-text {
                    color: #b0b0c0;
                    font-size: 14px;
                    line-height: 1.4;
                    margin-bottom: 5px;
                }

                .message-time {
                    color: #888;
                    font-size: 12px;
                }

                .message-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .message-action-btn {
                    background: none;
                    border: none;
                    color: #b0b0c0;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }

                .message-action-btn:hover {
                    color: #00f0ff;
                    background: rgba(0, 240, 255, 0.1);
                }
            `;

    document.head.appendChild(style);
    document.body.appendChild(messageCenterModal);

    // 关闭消息中心
    const closeBtn = document.getElementById('closeMessageCenter');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(messageCenterModal);
        document.head.removeChild(style);
    });

    // 点击遮罩层关闭
    messageCenterModal.addEventListener('click', (e) => {
        if (e.target === messageCenterModal) {
            document.body.removeChild(messageCenterModal);
            document.head.removeChild(style);
        }
    });
}

// 从服务器同步会话与资料（未登录则跳转登录页）
async function syncSessionAndProfile() {
    try {
        const r = await fetch('/api/me', { credentials: 'include' });
        if (r.status === 401) {
            window.location.href = loginHtmlPath();
            return false;
        }
        if (!r.ok) throw new Error('me');
        const data = await r.json();
        try {
            localStorage.setItem('gameui-session-user-id', String(data.id));
        } catch (_e) {
            /* ignore */
        }
        const profile = data.profile || {};
        const pi = profile.personalInfo || {};
        const config = {
            userId: data.username,
            personalInfo: {
                email: pi.email || data.email || '',
                nickname: pi.nickname || '',
                gender: pi.gender || '',
                bio: pi.bio || '',
                country: pi.country || '',
                language: pi.language || '',
            },
            permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
            currentAvatar: profile.currentAvatar !== null ? profile.currentAvatar : null,
            avatarHistory: Array.isArray(profile.avatarHistory) ? profile.avatarHistory : [],
        };
        localStorage.setItem('userConfig', JSON.stringify(config));
        // 更新身份显示
        const roleEl = document.getElementById('userRole');
        if (roleEl) {
            const isAdmin = data.role === 'admin';
            const roleSpan = roleEl.querySelector('span');
            const roleIcon = roleEl.querySelector('i');
            if (roleSpan) roleSpan.textContent = isAdmin ? '管理员' : '普通用户';
            roleEl.style.borderColor = isAdmin ? 'rgba(139, 92, 246, 0.4)' : 'rgba(0, 240, 255, 0.2)';
            roleEl.style.color = isAdmin ? '#8b5cf6' : '#00f0ff';
            roleEl.style.background = isAdmin ? 'rgba(139, 92, 246, 0.08)' : 'rgba(0, 240, 255, 0.06)';
            if (roleIcon) roleIcon.className = isAdmin ? 'fas fa-crown' : 'fas fa-shield-alt';
        }
        const created = new Date(data.created_at);
        localStorage.setItem(
            'userRegistrationData',
            JSON.stringify({
                registrationDate: data.created_at,
                registrationDateFormatted:
                    created.getFullYear() + '/' + (created.getMonth() + 1) + '/' + created.getDate(),
                username: data.username,
                email: data.email,
            })
        );
        return true;
    } catch (e) {
        console.error(e);
        window.location.href = loginHtmlPath();
        return false;
    }
}

// 页面加载时加载保存的配置
// 注意：API 设置管理已拆分至 user-center-api.js（window.UserCenterApi）
window.addEventListener('DOMContentLoaded', async () => {
    const ok = await syncSessionAndProfile();
    if (!ok) return;
    initUserId(); // 初始化用户ID（已有服务端用户名则不再随机生成）
    loadUserConfig();
    initTechSelects(); // 初始化自定义下拉框
    loadTabSelection();
    loadRegistrationTime(); // 加载注册时间
    initNotificationSystem(); // 初始化通知系统

    // 初始化编辑信息功能
    initEditInfoFunctionality();

    // 初始化删除头像功能
    initDeleteAvatarFunctionality();

    // 加载上次登录时间
    loadLastLoginTime();
    if (window.UserCenterApi) window.UserCenterApi.initApiSettingsCenter();

    // 初始化活动日志（已拆分至 user-center-activity.js）
    if (window.UserCenterActivity) window.UserCenterActivity.initActivityLog();

    // 初始化语言选择器（i18n）
    initLanguageSelector();

    // 初始化主题风格选择器
    initThemeSelector();

    // 检查管理员权限，显示管理面板入口
    try {
        const res = await fetch('/api/me/api-settings/status', { credentials: 'include' });
        const data = await res.json();
        if (data.isAdmin) {
            const adminItem = document.getElementById('admin-nav-item');
            if (adminItem) adminItem.style.display = '';
        }
    } catch (_e) {
        /* ignore */
    }
});

// 初始化语言选择器
function initLanguageSelector() {
    const langSelect = document.getElementById('language');
    if (!langSelect) return;

    // 设置当前语言
    if (window.i18n) {
        langSelect.value = window.i18n.getLanguage();
    }

    // 监听语言切换
    langSelect.addEventListener('change', function () {
        if (window.i18n) {
            window.i18n.setLanguage(this.value);
        }
    });

    // 监听语言变更事件，同步 select 值
    window.addEventListener('languageChanged', function (e) {
        langSelect.value = e.detail.lang;
    });
}

// 初始化主题风格选择器
function initThemeSelector() {
    const themeSelect = document.getElementById('region-theme-select');
    if (!themeSelect) return;
    if (!window.RegionThemes) return; // region-themes.js 尚未加载

    // 设置当前模式
    themeSelect.value = window.RegionThemes.getMode();
    syncNativeTechSelect(themeSelect);

    // 监听主题切换
    themeSelect.addEventListener('change', function () {
        if (window.RegionThemes) {
            window.RegionThemes.setMode(this.value);
            syncNativeTechSelect(this);
        }
    });

    // 监听主题变化（由 region-themes.js 派发，避免重复 storage 监听）
    window.addEventListener('regionThemeChanged', function (e) {
        themeSelect.value = e.detail.mode || 'off';
        syncNativeTechSelect(themeSelect);
    });
}

// 页面卸载时更新登录时间
window.addEventListener('beforeunload', () => {
    updateLastLoginTime();
});

// 页面可见性变化时更新访问时间
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏时更新访问时间
        updateLastLoginTime();
    }
});

// 初始化编辑信息功能
function initEditInfoFunctionality() {
    const editInfoBtn = document.getElementById('edit-info-btn');
    const saveChangesBtn = document.getElementById('save-changes-btn');
    const cancelChangesBtn = document.getElementById('cancel-changes-btn');
    const personalInfoForm = document.getElementById('personal-info-form');

    // 存储原始值的对象
    let originalValues = {};

    if (editInfoBtn && personalInfoForm) {
        // 点击修改信息按钮
        editInfoBtn.addEventListener('click', () => {
            // 保存当前值
            const inputs = personalInfoForm.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                originalValues[input.id] = input.value;
            });

            // 启用编辑模式（排除用户名和主题选择器）
            inputs.forEach((input) => {
                if (input.id === 'username' || input.id === 'region-theme-select') {
                    input.setAttribute('disabled', 'disabled');
                    input.setAttribute('readonly', 'readonly');
                } else if (input.tagName === 'SELECT') {
                    input.removeAttribute('disabled');
                } else {
                    input.removeAttribute('readonly');
                }
            });

            // 启用自定义下拉框
            document.querySelectorAll('.tech-select').forEach((ts) => {
                ts.classList.remove('tech-select-disabled');
            });

            // 显示保存和取消按钮
            if (saveChangesBtn) saveChangesBtn.style.display = 'inline-block';
            if (cancelChangesBtn) cancelChangesBtn.style.display = 'inline-block';

            // 隐藏修改信息按钮
            editInfoBtn.style.display = 'none';
        });
    }

    if (saveChangesBtn && personalInfoForm) {
        // 点击保存更改按钮
        saveChangesBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // 保存配置
            saveUserConfig();

            // 恢复只读状态（排除用户名和主题选择器）
            const inputs = personalInfoForm.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                if (input.id === 'username' || input.id === 'region-theme-select') {
                    input.setAttribute('disabled', 'disabled');
                    input.setAttribute('readonly', 'readonly');
                } else if (input.tagName === 'SELECT') {
                    input.setAttribute('disabled', 'disabled');
                } else {
                    input.setAttribute('readonly', 'readonly');
                }
            });

            // 隐藏保存和取消按钮
            saveChangesBtn.style.display = 'none';
            cancelChangesBtn.style.display = 'none';

            // 显示修改信息按钮
            editInfoBtn.style.display = 'inline-block';

            if (window.TechUI && typeof window.TechUI.toast === 'function')
                window.TechUI.toast('个人信息已保存', 'success');
        });
    }

    if (cancelChangesBtn && personalInfoForm) {
        // 点击取消按钮
        cancelChangesBtn.addEventListener('click', () => {
            // 恢复原始值
            const inputs = personalInfoForm.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                if (originalValues[input.id] !== undefined) {
                    input.value = originalValues[input.id];
                }
            });

            // 恢复只读状态（排除用户名和主题选择器）
            inputs.forEach((input) => {
                if (input.id === 'username' || input.id === 'region-theme-select') {
                    input.setAttribute('disabled', 'disabled');
                    input.setAttribute('readonly', 'readonly');
                } else if (input.tagName === 'SELECT') {
                    input.setAttribute('disabled', 'disabled');
                } else {
                    input.setAttribute('readonly', 'readonly');
                }
            });

            // 禁用自定义下拉框
            document.querySelectorAll('.tech-select').forEach((ts) => {
                ts.classList.add('tech-select-disabled');
            });

            // 隐藏保存和取消按钮
            saveChangesBtn.style.display = 'none';
            cancelChangesBtn.style.display = 'none';

            // 显示修改信息按钮
            editInfoBtn.style.display = 'inline-block';

            if (window.TechUI && typeof window.TechUI.toast === 'function') window.TechUI.toast('已取消修改', 'info');
        });
    }
}

// ── 活动日志 ── 已拆分至 user-center-activity.js（window.UserCenterActivity）
