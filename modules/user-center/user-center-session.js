/**
 * User center authenticated session and profile synchronization.
 */
'use strict';

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

window.UserCenterSession = Object.freeze({ syncSessionAndProfile });
