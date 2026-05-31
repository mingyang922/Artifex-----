/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
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
        document.getElementById(tabId).style.display = 'block';

        // 保存当前选中的选项卡
        saveTabSelection(tabId);
    });
});

// 保存配置到localStorage
// 修改saveUserConfig函数以包含性别字段
function saveUserConfig() {
    const usernameInput = document.getElementById('username');
    const countrySelect = document.getElementById('country');
    const countryOtherInput = document.getElementById('country-other');
    const genderSelect = document.getElementById('gender');

    // 处理国家/地区值
    let countryValue = countrySelect.value;
    if (countryValue === 'other') {
        countryValue = countryOtherInput.value.trim() || '其他';
    }

    const config = {
        // 用户ID
        userId: usernameInput ? usernameInput.value : '',
        // 个人信息
        personalInfo: {
            email: document.getElementById('email').value,
            nickname: document.getElementById('nickname').value,
            gender: genderSelect.value,
            bio: document.getElementById('bio').value,
            country: countryValue, // 使用处理后的国家值
            language: document.getElementById('language').value,
        },
        // 权限设置
        permissions: Array.from(document.querySelectorAll('.permissions-grid input[type="checkbox"]')).map(
            (checkbox, index) => checkbox.checked
        ),
        // 当前头像
        currentAvatar: document.getElementById('current-avatar').querySelector('img')
            ? document.getElementById('current-avatar').querySelector('img').src
            : null,
        // 头像历史记录
        avatarHistory: getAvatarHistoryFromStorage(),
    };

    localStorage.setItem('userConfig', JSON.stringify(config));
    const serverProfile = {
        personalInfo: config.personalInfo,
        permissions: config.permissions,
        currentAvatar: config.currentAvatar,
        avatarHistory: config.avatarHistory,
    };
    getCsrfToken()
        .then((csrfToken) =>
            fetch('/api/me/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({ profile: serverProfile }),
            })
        )
        .catch(() => {});
}

// 修改loadUserConfig函数以加载性别字段
function loadUserConfig() {
    const savedConfig = localStorage.getItem('userConfig');
    if (!savedConfig) return;

    const config = JSON.parse(savedConfig);

    // 加载用户ID
    const usernameInput = document.getElementById('username');
    if (usernameInput && config.userId) {
        usernameInput.value = config.userId;
    }

    // 加载个人信息
    if (config.personalInfo) {
        const { email, nickname, gender, bio, country, language } = config.personalInfo;
        document.getElementById('email').value = email;
        document.getElementById('nickname').value = nickname;
        document.getElementById('gender').value = gender || '';
        document.getElementById('bio').value = bio;
        document.getElementById('language').value = language;

        // 处理国家/地区加载
        const countrySelect = document.getElementById('country');
        const countryOtherInput = document.getElementById('country-other');

        // 查找国家是否在标准列表中
        const countryOption = countrySelect.querySelector(`option[value="${country}"]`);
        if (countryOption) {
            countrySelect.value = country;
        } else {
            // 如果不在标准列表中，设置为"其他"并填充自定义值
            countrySelect.value = 'other';
            countryOtherInput.value = country;
        }
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
        const config = JSON.parse(savedConfig);
        return config.avatarHistory || [];
    }
    return [];
}

// 向历史记录中添加新头像
function addToAvatarHistory(avatarSrc) {
    // 获取现有的头像历史
    let history = getAvatarHistoryFromStorage();

    // 检查是否已经存在于历史记录中（避免重复）
    const exists = history.some((item) => item.src === avatarSrc);

    // 即使存在也要添加到历史记录中，因为用户可能想要多次使用同一张图片
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
        config = JSON.parse(savedConfig);
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
            config = JSON.parse(savedConfig);
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
        this.tooltips.forEach((cleanup, element) => {
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
const currentAvatar = document.getElementById('current-avatar');

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
const changePasswordForm = document.getElementById('change-password-form');
const savePermissionsBtn = document.getElementById('save-permissions');
const cancelChangesBtn = document.getElementById('cancel-changes');
const cancelPasswordChangeBtn = document.getElementById('cancel-password-change');

if (personalInfoForm) {
    personalInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 验证表单数据
        const email = document.getElementById('email').value;
        const nickname = document.getElementById('nickname').value;
        const bio = document.getElementById('bio').value;

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

// 密码安全管理系统
class PasswordSecurityManager {
    constructor() {
        this.initPasswordSecurity();
    }

    initPasswordSecurity() {
        this.setupPasswordToggles();
        this.setupPasswordValidation();
        this.setupFormSubmission();
    }

    // 设置密码显示/隐藏切换
    setupPasswordToggles() {
        const toggles = document.querySelectorAll('.password-toggle');
        toggles.forEach((toggle) => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const input = toggle.parentElement.querySelector('input');
                const icon = toggle.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    // 设置密码验证
    setupPasswordValidation() {
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const currentPasswordInput = document.getElementById('current-password');

        // 新密码强度检查
        newPasswordInput.addEventListener('input', () => {
            this.checkPasswordStrength(newPasswordInput.value);
            this.validateForm();
        });

        // 确认密码检查
        confirmPasswordInput.addEventListener('input', () => {
            this.checkPasswordConfirmation();
            this.validateForm();
        });

        // 当前密码检查
        currentPasswordInput.addEventListener('input', () => {
            this.validateForm();
        });
    }

    // 检查密码强度
    checkPasswordStrength(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };

        // 更新要求检查显示
        Object.keys(requirements).forEach((req) => {
            const element = document.querySelector(`[data-requirement="${req}"]`);
            if (element) {
                if (requirements[req]) {
                    element.classList.add('valid');
                } else {
                    element.classList.remove('valid');
                }
            }
        });

        // 计算密码强度
        const score = Object.values(requirements).filter(Boolean).length;
        this.updatePasswordStrengthBar(score);

        return score >= 4; // 至少满足4个要求
    }

    // 更新密码强度条
    updatePasswordStrengthBar(score) {
        const fill = document.getElementById('password-strength-fill');
        const text = document.getElementById('password-strength-text');

        const percentages = [0, 20, 40, 60, 80, 100];
        const colors = ['#ff7875', '#ff7875', '#ffb404', '#ffb404', '#52c41a', '#52c41a'];
        const texts = ['弱', '弱', '中', '中', '强', '强'];

        const percentage = percentages[score] || 0;
        const color = colors[score] || '#ff7875';
        const textValue = texts[score] || '弱';

        fill.style.width = percentage + '%';
        fill.style.background = color;
        text.textContent = textValue;
        text.style.color = color;
    }

    // 检查密码确认
    checkPasswordConfirmation() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorElement = document.getElementById('confirm-password-error');

        if (confirmPassword && newPassword !== confirmPassword) {
            this.showError('confirm-password-error', '两次输入的密码不一致');
            return false;
        } else {
            this.hideError('confirm-password-error');
            return true;
        }
    }

    // 验证表单
    validateForm() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn = document.getElementById('submit-password-change');

        // 验证当前密码（只检查是否为空，实际验证由服务器完成）
        if (currentPassword.length === 0) {
            this.showError('current-password-error', '请输入当前密码');
            return false;
        } else {
            this.hideError('current-password-error');
        }

        // 基本验证条件
        const isCurrentPasswordValid = currentPassword.length > 0;
        const isNewPasswordValid = newPassword.length >= 6;
        const isConfirmPasswordValid = confirmPassword.length > 0 && newPassword === confirmPassword;
        const isPasswordDifferent = currentPassword !== newPassword && currentPassword.length > 0;

        // 密码强度检查（作为额外验证，但不阻止提交）
        const strengthScore = this.getPasswordStrengthScore(newPassword);
        const isStrongPassword = strengthScore >= 3;

        // 显示密码强度建议
        if (newPassword.length > 0 && !isStrongPassword) {
            this.showPasswordStrengthWarning();
        } else {
            this.hidePasswordStrengthWarning();
        }

        const isFormValid =
            isCurrentPasswordValid && isNewPasswordValid && isConfirmPasswordValid && isPasswordDifferent;

        submitBtn.disabled = !isFormValid;

        // 如果表单有效但密码强度不够，显示警告
        if (isFormValid && !isStrongPassword) {
            this.showWeakPasswordWarning();
        } else {
            this.hideWeakPasswordWarning();
        }

        return isFormValid;
    }

    // 获取密码强度分数
    getPasswordStrengthScore(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };

        return Object.values(requirements).filter(Boolean).length;
    }

    // 显示密码强度警告
    showPasswordStrengthWarning() {
        const warningDiv = document.getElementById('password-strength-warning');
        if (!warningDiv) {
            const warning = document.createElement('div');
            warning.id = 'password-strength-warning';
            warning.style.cssText = `
                        background: rgba(255, 180, 4, 0.08);
                        border: 1px solid rgba(255, 180, 4, 0.25);
                        border-radius: 6px;
                        padding: 10px;
                        margin-top: 10px;
                        font-size: 12px;
                        color: #ffb404;
                    `;
            warning.innerHTML =
                '<i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>建议使用更强的密码以提高安全性';

            const newPasswordGroup = document.getElementById('new-password').closest('.form-group');
            newPasswordGroup.appendChild(warning);
        }
    }

    // 隐藏密码强度警告
    hidePasswordStrengthWarning() {
        const warningDiv = document.getElementById('password-strength-warning');
        if (warningDiv) {
            warningDiv.remove();
        }
    }

    // 显示弱密码警告
    showWeakPasswordWarning() {
        const submitBtn = document.getElementById('submit-password-change');
        submitBtn.style.background = '#ffb404';
        submitBtn.title = '密码强度较弱，建议使用更强的密码';
    }

    // 隐藏弱密码警告
    hideWeakPasswordWarning() {
        const submitBtn = document.getElementById('submit-password-change');
        submitBtn.style.background = '';
        submitBtn.title = '';
    }

    // 显示错误信息
    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // 隐藏错误信息
    hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // 设置表单提交
    setupFormSubmission() {
        const form = document.getElementById('change-password-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }
    }

    // 处理密码修改
    async handlePasswordChange() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // 最终验证
        if (!this.validateForm()) {
            return;
        }

        // 调用服务器 API 修改密码
        try {
            const csrfToken = await getCsrfToken();
            const res = await fetch('/api/me/change-password', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                this.showError('current-password-error', data.error || '密码修改失败');
                return;
            }
            // 修改成功
            this.showSuccessMessage();
            document.getElementById('change-password-form').reset();
            document.getElementById('submit-password-change').disabled = true;
        } catch (err) {
            this.showError('current-password-error', '网络错误，请稍后重试');
        }
    }

    // 验证当前密码（通过服务器）
    async verifyCurrentPassword(password) {
        // 简单验证：密码不为空即可，实际验证在提交时由服务器完成
        return password && password.length > 0;
    }

    // 显示成功消息
    showSuccessMessage() {
        if (window.TechUI) {
            window.TechUI.toast('密码修改成功！', 'success');
            return;
        }
        // 备用方案
        const successDiv = document.createElement('div');
        successDiv.className = 'toast-message toast-message--success';
        successDiv.innerHTML = '<i class="fas fa-check-circle"></i>密码修改成功！';
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    // 设置当前密码验证
    setupCurrentPasswordValidation() {
        // 当前密码验证提示功能已删除
        return;
    }

    // 验证当前密码
    validateCurrentPassword(password) {
        // 当前密码验证提示功能已删除
        return;
    }

    // 隐藏当前密码提示
    hideCurrentPasswordHint() {
        // 当前密码验证提示功能已删除
        return;
    }

    // 设置忘记密码功能
    setupForgotPassword() {
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }
    }

    // 显示忘记密码模态框（演示功能，实际密码重置需管理员处理）
    showForgotPasswordModal() {
        // 创建模态框HTML
        const modalHTML = `
                    <div class="forgot-password-modal" id="forgot-password-modal">
                        <div class="forgot-password-content">
                            <button class="forgot-password-close" id="close-forgot-modal">&times;</button>
                            <h3 style="color: #00f0ff; margin-bottom: 20px; text-align: center;">
                                <i class="fas fa-key" style="margin-right: 8px;"></i>
                                忘记密码
                            </h3>
                            <div style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                                <p style="color: #b0b0c0; font-size: 14px; margin: 0 0 10px 0;">
                                    <i class="fas fa-info-circle" style="color: #00f0ff; margin-right: 8px;"></i>
                                    我们将通过以下方式帮您重置密码：
                                </p>
                                <ul style="color: #b0b0c0; font-size: 13px; margin: 0; padding-left: 20px;">
                                    <li>发送重置链接到您的注册邮箱</li>
                                    <li>通过手机短信验证身份</li>
                                    <li>回答安全问题验证</li>
                                </ul>
                            </div>
                            
                            <div class="form-group">
                                <label for="reset-email">注册邮箱</label>
                                <input type="email" id="reset-email" class="form-input" placeholder="请输入您的注册邮箱">
                                <div id="reset-email-error" class="error-message" style="display: none;"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="reset-phone">手机号码</label>
                                <input type="tel" id="reset-phone" class="form-input" placeholder="请输入您的手机号码">
                                <div id="reset-phone-error" class="error-message" style="display: none;"></div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; margin-top: 20px;">
                                <button type="button" class="btn btn-primary" id="submit-reset-request" style="flex: 1;">
                                    <i class="fas fa-paper-plane" style="margin-right: 5px;"></i>
                                    发送重置请求
                                </button>
                                <button type="button" class="btn btn-secondary" id="cancel-reset-request">
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 显示模态框
        const modal = document.getElementById('forgot-password-modal');
        modal.style.display = 'flex';
        modal.style.animation = 'fadeIn 0.3s ease-in-out';

        // 设置事件监听器
        this.setupForgotPasswordModalEvents();
    }

    // 设置忘记密码模态框事件
    setupForgotPasswordModalEvents() {
        const modal = document.getElementById('forgot-password-modal');
        const closeBtn = document.getElementById('close-forgot-modal');
        const cancelBtn = document.getElementById('cancel-reset-request');
        const submitBtn = document.getElementById('submit-reset-request');

        // 关闭模态框
        const closeModal = () => {
            modal.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                modal.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // 提交重置请求
        submitBtn.addEventListener('click', () => {
            this.handlePasswordResetRequest();
        });

        // 添加实时验证
        this.setupRealTimeValidation();
    }

    // 处理密码重置请求（演示功能：仅做前端校验，实际密码重置需管理员处理）
    handlePasswordResetRequest() {
        const email = document.getElementById('reset-email').value.trim();
        const phone = document.getElementById('reset-phone').value.trim();

        // 清除之前的错误提示
        this.hideError('reset-email-error');
        this.hideError('reset-phone-error');

        // 验证输入
        if (!email && !phone) {
            this.showError('reset-email-error', '请至少填写邮箱或手机号中的一项');
            this.hideError('reset-phone-error'); // 只显示一个错误提示
            return;
        }

        let hasError = false;

        // 验证邮箱（如果填写了）
        if (email) {
            const emailValidation = this.validateEmail(email);
            if (!emailValidation.isValid) {
                this.showError('reset-email-error', emailValidation.message);
                hasError = true;
            }
        }

        // 验证手机号（如果填写了）
        if (phone) {
            const phoneValidation = this.validatePhone(phone);
            if (!phoneValidation.isValid) {
                this.showError('reset-phone-error', phoneValidation.message);
                hasError = true;
            }
        }

        if (hasError) {
            return;
        }

        // 密码重置功能暂未开放，提示用户联系管理员
        this.showResetSuccessMessage();

        // 关闭模态框
        const modal = document.getElementById('forgot-password-modal');
        modal.remove();
    }

    // 验证邮箱格式（详细版本）
    validateEmail(email) {
        if (!email) {
            return { isValid: false, message: '请输入邮箱地址' };
        }

        if (email.length < 5) {
            return { isValid: false, message: '邮箱地址太短，请输入完整的邮箱地址' };
        }

        if (email.length > 100) {
            return { isValid: false, message: '邮箱地址太长，请输入有效的邮箱地址' };
        }

        // 检查是否包含@符号
        if (!email.includes('@')) {
            return { isValid: false, message: '邮箱格式不正确，缺少@符号' };
        }

        // 检查@符号的数量
        const atCount = (email.match(/@/g) || []).length;
        if (atCount > 1) {
            return { isValid: false, message: '邮箱格式不正确，@符号不能重复' };
        }

        // 检查@符号的位置
        const atIndex = email.indexOf('@');
        if (atIndex === 0) {
            return { isValid: false, message: '邮箱格式不正确，@符号前必须有用户名' };
        }

        if (atIndex === email.length - 1) {
            return { isValid: false, message: '邮箱格式不正确，@符号后必须有域名' };
        }

        // 检查域名部分
        const domain = email.split('@')[1];
        if (!domain.includes('.')) {
            return { isValid: false, message: '邮箱格式不正确，域名必须包含点号(.)' };
        }

        // 最终正则验证
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: '邮箱格式不正确，请输入有效的邮箱地址（如：user@example.com）' };
        }

        return { isValid: true, message: '邮箱格式正确' };
    }

    // 验证手机号格式（详细版本）
    validatePhone(phone) {
        if (!phone) {
            return { isValid: false, message: '请输入手机号码' };
        }

        // 移除所有非数字字符
        const cleanPhone = phone.replace(/\D/g, '');

        if (cleanPhone.length === 0) {
            return { isValid: false, message: '手机号格式不正确，请输入数字' };
        }

        if (cleanPhone.length < 11) {
            return { isValid: false, message: `手机号长度不足，当前${cleanPhone.length}位，需要11位数字` };
        }

        if (cleanPhone.length > 11) {
            return { isValid: false, message: `手机号长度过长，当前${cleanPhone.length}位，需要11位数字` };
        }

        // 检查是否以1开头
        if (!cleanPhone.startsWith('1')) {
            return { isValid: false, message: '手机号格式不正确，必须以1开头' };
        }

        // 检查第二位数字
        const secondDigit = cleanPhone[1];
        if (!['3', '4', '5', '6', '7', '8', '9'].includes(secondDigit)) {
            return { isValid: false, message: `手机号格式不正确，第二位数字必须是3-9，当前是${secondDigit}` };
        }

        // 检查是否全为相同数字
        if (/^(\d)\1{10}$/.test(cleanPhone)) {
            return { isValid: false, message: '手机号格式不正确，不能全为相同数字' };
        }

        // 最终验证
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(cleanPhone)) {
            return { isValid: false, message: '手机号格式不正确，请输入有效的11位手机号码（如：13812345678）' };
        }

        return { isValid: true, message: '手机号格式正确' };
    }

    // 设置实时验证
    setupRealTimeValidation() {
        const emailInput = document.getElementById('reset-email');
        const phoneInput = document.getElementById('reset-phone');

        if (emailInput) {
            let emailTimeout;
            emailInput.addEventListener('input', () => {
                clearTimeout(emailTimeout);
                const email = emailInput.value.trim();

                if (email.length === 0) {
                    this.hideError('reset-email-error');
                    this.updateInputStyle(emailInput, 'normal');
                    return;
                }

                // 延迟验证，避免频繁检查
                emailTimeout = setTimeout(() => {
                    const validation = this.validateEmail(email);
                    if (validation.isValid) {
                        this.hideError('reset-email-error');
                        this.updateInputStyle(emailInput, 'success');
                    } else {
                        this.showError('reset-email-error', validation.message);
                        this.updateInputStyle(emailInput, 'error');
                    }
                }, 500);
            });
        }

        if (phoneInput) {
            let phoneTimeout;
            phoneInput.addEventListener('input', () => {
                clearTimeout(phoneTimeout);
                const phone = phoneInput.value.trim();

                if (phone.length === 0) {
                    this.hideError('reset-phone-error');
                    this.updateInputStyle(phoneInput, 'normal');
                    return;
                }

                // 延迟验证，避免频繁检查
                phoneTimeout = setTimeout(() => {
                    const validation = this.validatePhone(phone);
                    if (validation.isValid) {
                        this.hideError('reset-phone-error');
                        this.updateInputStyle(phoneInput, 'success');
                    } else {
                        this.showError('reset-phone-error', validation.message);
                        this.updateInputStyle(phoneInput, 'error');
                    }
                }, 500);
            });
        }
    }

    // 更新输入框样式
    updateInputStyle(input, status) {
        // 移除之前的样式类
        input.classList.remove('input-success', 'input-error');

        switch (status) {
            case 'success':
                input.classList.add('input-success');
                break;
            case 'error':
                input.classList.add('input-error');
                break;
            case 'normal':
            default:
                // 保持默认样式
                break;
        }
    }

    // 显示重置提示消息（密码重置功能暂未开放，提示联系管理员）
    showResetSuccessMessage() {
        const msg = '密码重置功能暂未开放，请联系管理员';
        if (window.TechUI) {
            window.TechUI.toast(msg, 'info');
            return;
        }
        // 备用方案
        const successDiv = document.createElement('div');
        successDiv.className = 'toast-message toast-message--info';
        successDiv.innerHTML = `<i class="fas fa-info-circle"></i><span>${msg}</span>`;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }
}

// 初始化密码安全管理系统
let passwordSecurityManager;

if (changePasswordForm) {
    passwordSecurityManager = new PasswordSecurityManager();
}

if (savePermissionsBtn) {
    savePermissionsBtn.addEventListener('click', () => {
        window.TechUI.toast('权限设置已保存', 'success');
        // 保存配置
        saveUserConfig();
    });
}

if (cancelChangesBtn) {
    cancelChangesBtn.addEventListener('click', () => {
        if (personalInfoForm) {
            personalInfoForm.reset();
        }
        window.TechUI.toast('已取消修改', 'info');
    });
}

if (cancelPasswordChangeBtn) {
    cancelPasswordChangeBtn.addEventListener('click', () => {
        if (changePasswordForm) {
            changePasswordForm.reset();
        }
        window.TechUI.toast('已取消修改密码', 'info');
    });
}

// 加载注册时间
function loadRegistrationTime() {
    const registrationData = localStorage.getItem('userRegistrationData');
    const registrationTimeElement = document.getElementById('registration-time');

    if (registrationData) {
        const data = JSON.parse(registrationData);
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
            const title = item.querySelector('.notification-title').textContent;

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

    // 查看所有通知 —— 消息中心已集成在本页面，直接滚动到消息中心区域
    const viewAllNotifications = document.getElementById('viewAllNotifications');
    viewAllNotifications.addEventListener('click', (e) => {
        e.preventDefault();
        // 关闭通知下拉框
        notificationDropdown.classList.remove('show');
        // 滚动到页面内嵌的消息中心面板
        const messageCenter = document.querySelector('.message-center-panel') || document.querySelector('.message-center');
        if (messageCenter) {
            messageCenter.scrollIntoView({ behavior: 'smooth' });
        }
    });

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
function showMessageCenter() {
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
            window.location.href = '../../login.html';
            return false;
        }
        if (!r.ok) throw new Error('me');
        const data = await r.json();
        try {
            localStorage.setItem('gameui-session-user-id', String(data.id));
        } catch (e) {
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
        window.location.href = '../../login.html';
        return false;
    }
}

function getApiFormSchema(provider) {
    if (provider === 'tencent') {
        return {
            field1: { key: 'secretId', label: 'SecretId', placeholder: 'AKID...' },
            field2: { key: 'secretKey', label: 'SecretKey', placeholder: '请输入 SecretKey' },
            field3: null,
        };
    }
    if (provider === 'sdwebui') {
        return {
            field1: { key: 'baseUrl', label: 'WebUI 地址', placeholder: 'http://127.0.0.1:7860' },
            field2: { key: 'apiKey', label: 'API Key（可选）', placeholder: '未设置可留空' },
            field3: null,
        };
    }
    if (provider === 'alibaba') {
        return {
            field1: { key: 'apiKey', label: 'API Key', placeholder: 'sk-...' },
            field2: { key: 'model', label: '文生图模型（可选）', placeholder: 'wanx-v1 / wanx2.1-t2i-turbo' },
            field3: { key: 'visionModel', label: '多模态模型（可选）', placeholder: 'qwen-vl-plus' },
        };
    }
    return {
        field1: { key: 'apiKey', label: 'API Key', placeholder: 'sk-...' },
        field2: { key: 'model', label: '模型（可选）', placeholder: 'doubao-seedream-4.0-250828' },
        field3: {
            key: 'endpoint',
            label: '接口地址（可选）',
            placeholder: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        },
    };
}

function updateApiSettingsFields(provider) {
    const schema = getApiFormSchema(provider);
    const f1 = document.getElementById('api-field-1');
    const f1Label = document.getElementById('api-field-1-label');
    const f2Wrap = document.getElementById('api-field-2-wrap');
    const f2 = document.getElementById('api-field-2');
    const f2Label = document.getElementById('api-field-2-label');
    const f3Wrap = document.getElementById('api-field-3-wrap');
    const f3 = document.getElementById('api-field-3');
    const f3Label = document.getElementById('api-field-3-label');
    if (!f1 || !f1Label || !f2Wrap || !f2 || !f2Label || !f3Wrap || !f3 || !f3Label) return;
    f1Label.textContent = schema.field1.label;
    f1.placeholder = schema.field1.placeholder;
    f2.value = '';
    f3.value = '';
    if (schema.field2) {
        f2Wrap.style.display = '';
        f2Label.textContent = schema.field2.label;
        f2.placeholder = schema.field2.placeholder;
    } else {
        f2Wrap.style.display = 'none';
    }
    if (schema.field3) {
        f3Wrap.style.display = '';
        f3Label.textContent = schema.field3.label;
        f3.placeholder = schema.field3.placeholder;
    } else {
        f3Wrap.style.display = 'none';
    }
}

function buildApiCredentialPayload(provider) {
    const schema = getApiFormSchema(provider);
    const f1 = document.getElementById('api-field-1');
    const f2 = document.getElementById('api-field-2');
    const f3 = document.getElementById('api-field-3');
    if (!f1 || !f2 || !f3) return null;
    const payload = {};
    if (schema.field1 && String(f1.value || '').trim()) payload[schema.field1.key] = String(f1.value || '').trim();
    if (schema.field2 && String(f2.value || '').trim()) payload[schema.field2.key] = String(f2.value || '').trim();
    if (schema.field3 && String(f3.value || '').trim()) payload[schema.field3.key] = String(f3.value || '').trim();
    return payload;
}

async function refreshApiSettingsStatus() {
    const statusEl = document.getElementById('api-settings-status');
    if (!statusEl) return null;
    try {
        const r = await fetch('/api/me/api-settings/status', { credentials: 'include' });
        if (r.status === 401) {
            window.location.href = '../../login.html';
            return null;
        }
        const data = await r.json();
        const status = data.status || {};
        const parts = ['jimeng', 'alibaba', 'tencent', 'sdwebui'].map((k) => `${k}:${status[k] ? '已配置' : '未配置'}`);
        statusEl.textContent = `配置状态：${parts.join(' | ')}${data.isAdmin ? ' | 角色:管理员' : ' | 角色:普通用户'}`;
        return data;
    } catch (e) {
        statusEl.textContent = '配置状态读取失败，请稍后重试';
        return null;
    }
}

function initApiSettingsCenter() {
    const providerSelect = document.getElementById('api-provider-select');
    const saveBtn = document.getElementById('save-api-settings-btn');
    const clearBtn = document.getElementById('clear-api-settings-btn');
    const refreshBtn = document.getElementById('refresh-api-settings-btn');
    const field1 = document.getElementById('api-field-1');
    if (!providerSelect || !saveBtn || !clearBtn || !refreshBtn || !field1) return;

    const syncSchema = () => {
        updateApiSettingsFields(providerSelect.value);
        field1.value = '';
    };
    providerSelect.addEventListener('change', syncSchema);
    syncSchema();

    saveBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const credentials = buildApiCredentialPayload(provider);
        if (!credentials || Object.keys(credentials).length === 0) {
            window.TechUI.toast('请至少填写一个有效字段', 'error');
            return;
        }
        const csrfToken = await getCsrfToken();
        const r = await fetch('/api/me/api-settings', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
            body: JSON.stringify({ provider, credentials }),
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            window.TechUI.toast((err && err.message) || '保存失败', 'error');
            return;
        }
        window.TechUI.toast('API 配置已保存', 'success');
        refreshApiSettingsStatus();
    });

    clearBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const csrfToken = await getCsrfToken();
        const r = await fetch(`/api/me/api-settings/${encodeURIComponent(provider)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-XSRF-Token': csrfToken },
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            window.TechUI.toast((err && err.message) || '清空失败', 'error');
            return;
        }
        window.TechUI.toast('当前服务商配置已清空', 'success');
        refreshApiSettingsStatus();
    });

    refreshBtn.addEventListener('click', () => {
        refreshApiSettingsStatus();
    });

    refreshApiSettingsStatus();
}

// 页面加载时加载保存的配置
window.addEventListener('DOMContentLoaded', async () => {
    const ok = await syncSessionAndProfile();
    if (!ok) return;
    initUserId(); // 初始化用户ID（已有服务端用户名则不再随机生成）
    loadUserConfig();
    loadTabSelection();
    loadRegistrationTime(); // 加载注册时间
    initNotificationSystem(); // 初始化通知系统

    // 初始化编辑信息功能
    initEditInfoFunctionality();

    // 初始化删除头像功能
    initDeleteAvatarFunctionality();

    // 加载上次登录时间
    loadLastLoginTime();
    initApiSettingsCenter();

    // 检查管理员权限，显示管理面板入口
    try {
        const res = await fetch('/api/me/api-settings/status', { credentials: 'include' });
        const data = await res.json();
        if (data.isAdmin) {
            const adminItem = document.getElementById('admin-nav-item');
            if (adminItem) adminItem.style.display = '';
        }
    } catch (e) { /* ignore */ }
});

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

            // 启用编辑模式
            inputs.forEach((input) => {
                if (input.id !== 'username') {
                    // 用户名不允许修改
                    // 对于select元素，只需要移除disabled属性
                    if (input.tagName === 'SELECT') {
                        input.removeAttribute('disabled');
                    } else {
                        // 对于input和textarea元素，移除readonly属性
                        input.removeAttribute('readonly');
                    }
                } else {
                    // 确保用户ID输入框始终保持禁用状态
                    input.setAttribute('disabled', 'disabled');
                    input.setAttribute('readonly', 'readonly');
                }
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

            // 恢复只读状态
            const inputs = personalInfoForm.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                if (input.id !== 'username') {
                    // 用户名不允许修改
                    if (input.tagName === 'SELECT') {
                        input.setAttribute('disabled', 'disabled');
                    } else {
                        input.setAttribute('readonly', 'readonly');
                    }
                } else {
                    // 确保用户ID输入框始终保持禁用状态
                    input.setAttribute('disabled', 'disabled');
                    input.setAttribute('readonly', 'readonly');
                }
            });

            // 隐藏保存和取消按钮
            saveChangesBtn.style.display = 'none';
            cancelChangesBtn.style.display = 'none';

            // 显示修改信息按钮
            editInfoBtn.style.display = 'inline-block';

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

            // 恢复只读状态
            inputs.forEach((input) => {
                if (input.id !== 'username') {
                    // 用户名不允许修改
                    if (input.tagName === 'SELECT') {
                        input.setAttribute('disabled', 'disabled');
                    } else {
                        input.setAttribute('readonly', 'readonly');
                    }
                } else {
                    // 确保用户ID输入框始终保持禁用状态
                    input.setAttribute('disabled', 'disabled');
                    input.setAttribute('readonly', 'readonly');
                }
            });

            // 隐藏保存和取消按钮
            saveChangesBtn.style.display = 'none';
            cancelChangesBtn.style.display = 'none';

            // 显示修改信息按钮
            editInfoBtn.style.display = 'inline-block';

            window.TechUI.toast('已取消修改', 'info');
        });
    }
}
