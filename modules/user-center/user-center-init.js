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
    const usedIds = JSON.parse(localStorage.getItem('usedUserIds') || '[]');
    return !usedIds.includes(userId);
}

// 保存已使用的用户ID
function saveUsedUserId(userId) {
    const usedIds = JSON.parse(localStorage.getItem('usedUserIds') || '[]');
    usedIds.push(userId);
    localStorage.setItem('usedUserIds', JSON.stringify(usedIds));
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

// 初始化用户ID
function initUserId() {
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        // 检查是否已经有用户ID
        const savedConfig = localStorage.getItem('userConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            if (config.userId) {
                usernameInput.value = config.userId;
                return;
            }
        }

        // 生成新的用户ID
        try {
            const userId = generateUniqueUserId();
            usernameInput.value = userId;

            // 保存用户ID到配置中
            saveUserConfig();
        } catch (error) {
            console.error('生成用户ID时出错:', error);
            usernameInput.value = 'ID-00000000';
        }
    }
}

// 修改saveUserConfig函数以包含用户ID
function saveUserConfig() {
    const usernameInput = document.getElementById('username');
    const config = {
        // 用户ID
        userId: usernameInput ? usernameInput.value : '',
        // 个人信息
        personalInfo: {
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            nickname: document.getElementById('nickname').value,
            bio: document.getElementById('bio').value,
            country: document.getElementById('country').value,
            language: document.getElementById('language').value,
        },
        // 权限设置
        permissions: Array.from(
            document.querySelectorAll('.permissions-grid input[type="checkbox"]')
        ).map((checkbox, index) => checkbox.checked),
        // 当前头像
        currentAvatar: currentAvatar.querySelector('img')
            ? currentAvatar.querySelector('img').src
            : null,
        // 头像历史记录
        avatarHistory: getAvatarHistoryFromStorage(),
    };

    localStorage.setItem('userConfig', JSON.stringify(config));
}

// 修改loadUserConfig函数以加载用户ID
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
        const { email, phone, nickname, bio, country, language } =
            config.personalInfo;
        document.getElementById('email').value = email;
        document.getElementById('phone').value = phone;
        document.getElementById('nickname').value = nickname;
        document.getElementById('bio').value = bio;
        document.getElementById('country').value = country;
        document.getElementById('language').value = language;
    }

    // 加载权限设置
    if (config.permissions && config.permissions.length > 0) {
        const checkboxes = document.querySelectorAll(
            '.permissions-grid input[type="checkbox"]'
        );
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

// 页面加载时加载保存的配置
window.addEventListener('DOMContentLoaded', () => {
    initUserId(); // 初始化用户ID
    loadUserConfig();
    loadTabSelection();

    // 初始化编辑信息功能
    initEditInfoFunctionality();
});

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
            menu.style.top = (rect.bottom + 4) + 'px';
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

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('is-open');
            const group = wrapper.closest('.form-group');
            if (group) group.classList.remove('tech-select-open');
        }
    });

    select.addEventListener('change', syncUI);
    syncUI();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initApiTechSelect, 300);
});
