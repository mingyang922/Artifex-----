/**
 * Artifex - 统一错误响应格式
 *
 * 标准格式：{ error: { code: string, message: string, details?: any } }
 * 向后兼容：前端仍可读 error.message 获取用户提示
 */
'use strict';

/**
 * 发送统一格式的错误响应
 * @param {import('express').Response} res
 * @param {number} status - HTTP 状态码
 * @param {string} code - 业务错误码（如 ERR_VALIDATION, ERR_AUTH_EXPIRED）
 * @param {string} message - 用户可读的错误消息
 * @param {*} [details] - 附加信息（如 provider、quota 等）
 */
function sendError(res, status, code, message, details) {
    const body = {
        error: {
            code: code,
            message: message,
        },
    };
    if (details !== undefined) body.error.details = details;
    return res.status(status).json(body);
}

// 常用错误码
const ERR = {
    VALIDATION: 'ERR_VALIDATION',
    AUTH_REQUIRED: 'ERR_AUTH_REQUIRED',
    AUTH_EXPIRED: 'ERR_AUTH_EXPIRED',
    FORBIDDEN: 'ERR_FORBIDDEN',
    NOT_FOUND: 'ERR_NOT_FOUND',
    CONFLICT: 'ERR_CONFLICT',
    RATE_LIMITED: 'ERR_RATE_LIMITED',
    QUOTA_EXCEEDED: 'ERR_QUOTA_EXCEEDED',
    PROVIDER_ERROR: 'ERR_PROVIDER_ERROR',
    INTERNAL: 'ERR_INTERNAL',
    NO_CREDENTIALS: 'ERR_NO_CREDENTIALS',
};

module.exports = { sendError, ERR };
