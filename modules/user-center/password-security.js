/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 密码安全管理系统
 * 处理密码修改、强度验证、忘记密码等功能
 */

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
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                this.checkPasswordStrength(newPasswordInput.value);
                this.validateForm();
            });
        }

        // 确认密码检查
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordConfirmation();
                this.validateForm();
            });
        }

        // 当前密码检查
        if (currentPasswordInput) {
            currentPasswordInput.addEventListener('input', () => {
                this.validateForm();
            });
        }
    }

    // 检查密码强度
    checkPasswordStrength(password) {
        const requirements = {
            length: password.length >= 6,
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
        if (!fill || !text) return;

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
        const newPwdEl = document.getElementById('new-password');
        const confirmPwdEl = document.getElementById('confirm-password');
        if (!newPwdEl || !confirmPwdEl) return true;
        const newPassword = newPwdEl.value;
        const confirmPassword = confirmPwdEl.value;

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
        const currentPwdEl = document.getElementById('current-password');
        const newPwdEl = document.getElementById('new-password');
        const confirmPwdEl = document.getElementById('confirm-password');
        const submitBtn = document.getElementById('submit-password-change');
        if (!currentPwdEl || !newPwdEl || !confirmPwdEl) return false;

        const currentPassword = currentPwdEl.value;
        const newPassword = newPwdEl.value;
        const confirmPassword = confirmPwdEl.value;

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

        if (submitBtn) submitBtn.disabled = !isFormValid;

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
            length: password.length >= 6,
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
            const data = await res.json().catch(() => ({}));
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

// 初始化密码安全管理系统（包裹在 DOMContentLoaded 中，确保 DOM 和依赖变量就绪）
let passwordSecurityManager;

document.addEventListener('DOMContentLoaded', () => {
    // 安全获取可能由 user-center-page.js 定义的变量
    const _changePasswordForm = typeof changePasswordForm !== 'undefined' ? changePasswordForm : document.getElementById('change-password-form');
    const _savePermissionsBtn = typeof savePermissionsBtn !== 'undefined' ? savePermissionsBtn : null;
    const _cancelChangesBtn = typeof cancelChangesBtn !== 'undefined' ? cancelChangesBtn : null;
    const _cancelPasswordChangeBtn = typeof cancelPasswordChangeBtn !== 'undefined' ? cancelPasswordChangeBtn : null;
    const _personalInfoForm = typeof personalInfoForm !== 'undefined' ? personalInfoForm : null;

    if (_changePasswordForm) {
        passwordSecurityManager = new PasswordSecurityManager();
    }

    if (_savePermissionsBtn) {
        _savePermissionsBtn.addEventListener('click', () => {
            window.TechUI.toast('权限设置已保存', 'success');
            if (typeof saveUserConfig === 'function') saveUserConfig();
        });
    }

    if (_cancelChangesBtn) {
        _cancelChangesBtn.addEventListener('click', () => {
            if (_personalInfoForm) _personalInfoForm.reset();
            window.TechUI.toast('已取消修改', 'info');
        });
    }

    if (_cancelPasswordChangeBtn) {
        _cancelPasswordChangeBtn.addEventListener('click', () => {
            if (_changePasswordForm) _changePasswordForm.reset();
            window.TechUI.toast('已取消修改密码', 'info');
        });
    }
});
