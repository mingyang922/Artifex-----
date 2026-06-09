/**
 * Artifex — 统一日志模块
 * 生产环境只输出 warn/error，开发环境输出全部
 */
'use strict';

interface Logger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
}

const isProd: boolean = (process.env.NODE_ENV || 'development') === 'production';

const logger: Logger = {
    info: (...args: unknown[]): void => { if (!isProd) console.log('[INFO]', ...args); },
    warn: (...args: unknown[]): void => console.warn('[WARN]', ...args),
    error: (...args: unknown[]): void => console.error('[ERROR]', ...args),
    debug: (...args: unknown[]): void => { if (!isProd) console.log('[DEBUG]', ...args); },
};

export default logger;
