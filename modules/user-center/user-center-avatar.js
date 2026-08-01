/**
 * User center avatar history and avatar interaction module.
 */
'use strict';

const DEFAULT_AVATAR_ICON_HTML = '<i class="fas fa-user" aria-hidden="true"></i>';

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

window.UserCenterAvatar = Object.freeze({
    getAvatarHistoryFromStorage,
    addToAvatarHistory,
    renderAvatarHistory,
    setCurrentAvatar,
    initDeleteAvatarFunctionality,
});
