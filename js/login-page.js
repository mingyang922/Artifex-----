/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.0.0 */
'use strict';

/**
 * 登录页逻辑
 * 处理登录/注册表单提交、密码强度检测、表单切换
 * 注意：getCsrfToken 已移至 js/api-utils.js
 */

function setupPasswordToggles() {
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

function switchForm(formId) {
    document.querySelectorAll('.form-wrapper').forEach((form) => {
        form.classList.add('hidden');
    });
    document.getElementById(formId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = 'message ' + type;
    message.classList.add('show');

    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

function setupPasswordStrength() {
    const registerPassword = document.getElementById('registerPassword');
    if (!registerPassword) return;

    registerPassword.addEventListener('input', function (e) {
        const password = e.target.value;
        const strengthFill = document.getElementById('registerStrengthFill');
        const strengthText = document.getElementById('registerStrengthText');

        let strength = 0;
        let strengthClass = '';
        let strengthLabel = '';

        if (password.length >= 8) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^A-Za-z0-9]/)) strength++;

        switch (strength) {
            case 0:
            case 1:
                strengthClass = 'weak';
                strengthLabel = '密码强度: 弱';
                break;
            case 2:
            case 3:
                strengthClass = 'medium';
                strengthLabel = '密码强度: 中';
                break;
            case 4:
                strengthClass = 'strong';
                strengthLabel = '密码强度: 强';
                break;
        }

        strengthFill.className = 'strength-fill ' + strengthClass;
        strengthText.textContent = strengthLabel;
    });
}

function setupFormSwitchLinks() {
    document.querySelectorAll('[data-switch-form]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-switch-form');
            switchForm(target);
        });
    });
}

function setupLoginForm() {
    const loginForm = document.getElementById('login');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = this.querySelector('.btn');
        btn.classList.add('loading');
        try {
            const csrfToken = await getCsrfToken();
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({
                    email: document.getElementById('loginEmail').value,
                    password: document.getElementById('loginPassword').value,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showMessage(data.error || '登录失败', 'error');
                return;
            }
            if (data.user && data.user.id !== null) {
                try {
                    localStorage.setItem('gameui-session-user-id', String(data.user.id));
                } catch (e) {
                    /* ignore */
                }
            }
            showMessage('登录成功！正在跳转到主控制台...', 'success');
            setTimeout(() => {
                sessionStorage.removeItem('artifex-boot-seen');
                window.location.href = 'dashboard.html';
            }, 600);
        } catch (err) {
            showMessage('无法连接服务器，请确认已运行 npm start', 'error');
        } finally {
            btn.classList.remove('loading');
        }
    });
}

function setupRegisterForm() {
    const registerForm = document.getElementById('register');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = this.querySelector('.btn');
        btn.classList.add('loading');
        try {
            const csrfToken = await getCsrfToken();
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-Token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({
                    username: document.getElementById('registerUsername').value,
                    email: document.getElementById('registerEmail').value,
                    password: document.getElementById('registerPassword').value,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showMessage(data.error || '注册失败', 'error');
                return;
            }
            if (data.user && data.user.id !== null) {
                try {
                    localStorage.setItem('gameui-session-user-id', String(data.user.id));
                } catch (e) {
                    /* ignore */
                }
            }
            const registrationTime = new Date(
                data.user && data.user.created_at ? data.user.created_at : Date.now()
            );
            const registrationData = {
                registrationDate: registrationTime.toISOString(),
                registrationDateFormatted:
                    registrationTime.getFullYear() +
                    '/' +
                    (registrationTime.getMonth() + 1) +
                    '/' +
                    registrationTime.getDate(),
                username: data.user && data.user.username,
                email: data.user && data.user.email,
            };
            localStorage.setItem('userRegistrationData', JSON.stringify(registrationData));
            showMessage('注册成功！已自动登录，正在进入控制台...', 'success');
            setTimeout(() => {
                sessionStorage.removeItem('artifex-boot-seen');
                window.location.href = 'dashboard.html';
            }, 800);
        } catch (err) {
            showMessage('无法连接服务器，请确认已运行 npm start', 'error');
        } finally {
            btn.classList.remove('loading');
        }
    });
}

function setupForgotPassword() {
    const forgotLink = document.querySelector('.forgot-password');
    if (!forgotLink) return;

    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showMessage('请联系管理员重置密码', 'error');
    });
}

document.addEventListener('DOMContentLoaded', function () {
    setupPasswordToggles();
    setupPasswordStrength();
    setupFormSwitchLinks();
    setupLoginForm();
    setupRegisterForm();
    setupForgotPassword();
});
