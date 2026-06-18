/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

/**
 * 按用户限流器
 * 使用内存存储，重启后重置
 */

class UserRateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000; // 默认 1 分钟
        this.maxRequests = options.maxRequests || 30; // 默认每窗口 30 次
        this.message = options.message || '请求过于频繁，请稍后再试';
        this.store = new Map(); // userId -> { count, resetTime }

        // 定期清理过期记录，保存引用以便销毁时清理
        this._cleanupInterval = setInterval(() => this.cleanup(), this.windowMs * 2);
        // 允许 Node.js 正常退出，不因定时器阻塞
        if (this._cleanupInterval.unref) this._cleanupInterval.unref();
    }

    /**
     * 销毁限流器，清理定时器
     */
    destroy() {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }
        this.store.clear();
    }

    /**
     * 检查用户是否超过限流
     * @param {number|string} userId - 用户 ID
     * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
     */
    check(userId) {
        const now = Date.now();
        const key = String(userId);
        let entry = this.store.get(key);

        if (!entry || now > entry.resetTime) {
            // 新窗口或窗口已过期
            entry = { count: 0, resetTime: now + this.windowMs };
            this.store.set(key, entry);
        }

        entry.count++;
        const remaining = Math.max(0, this.maxRequests - entry.count);
        const allowed = entry.count <= this.maxRequests;

        return { allowed, remaining, resetTime: entry.resetTime };
    }

    /**
     * 清理过期记录
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.resetTime) {
                this.store.delete(key);
            }
        }
    }

    /**
     * 获取限流中间件
     * @returns {Function} Express 中间件
     */
    middleware() {
        return (req, res, next) => {
            // Unauthenticated requests get IP-based limiting
            const userId = (req.currentUser && req.currentUser.id)
                ? req.currentUser.id
                : `ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`;

            const result = this.check(userId);

            // 设置限流头
            res.set('X-RateLimit-Limit', String(this.maxRequests));
            res.set('X-RateLimit-Remaining', String(result.remaining));
            res.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

            if (!result.allowed) {
                const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
                res.set('Retry-After', String(retryAfter));
                return res.status(429).json({
                    error: '请求过于频繁',
                    message: this.message,
                    retryAfter,
                });
            }

            next();
        };
    }
}

// 创建默认实例：每分钟 30 次请求
const defaultLimiter = new UserRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'API 调用过于频繁，请稍后再试',
});

// 创建图片生成专用限流器：每分钟 10 次
const imageGenerationLimiter = new UserRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '图片生成过于频繁，请稍后再试',
});

module.exports = {
    UserRateLimiter,
    defaultLimiter,
    imageGenerationLimiter,
};
