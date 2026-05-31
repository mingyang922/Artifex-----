/**
 * Artifex — 统一日志模块
 * 生产环境只输出 warn/error，开发环境输出全部
 */
'use strict';

const isProd = (process.env.NODE_ENV || 'development') === 'production';

const logger = {
    info: (...args) => { if (!isProd) console.log('[INFO]', ...args); },
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => { if (!isProd) console.log('[DEBUG]', ...args); },
};

module.exports = logger;
