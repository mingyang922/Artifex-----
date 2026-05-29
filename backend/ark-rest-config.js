/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 Artifex Team
 * 版本: 1.0.0 */
/**
 * 官方 REST 接入：读取 config/ark-rest-api.local.json（与 curl 一致），不依赖系统环境变量。
 * 文档：图片生成 API https://www.volcengine.com/docs/82379/1541523
 */
const fs = require('fs');
const path = require('path');

const CONFIG_NAME = 'ark-rest-api.local.json';

function getConfigPath() {
    return path.join(__dirname, '..', 'config', CONFIG_NAME);
}

/**
 * @returns {null | {
 *   endpoint?: string,
 *   apiKey?: string,
 *   model?: string,
 *   useRestApiOnly?: boolean,
 *   defaults?: Record<string, unknown>
 * }}
 */
function loadArkRestConfig() {
    const p = getConfigPath();
    if (!fs.existsSync(p)) {
        return null;
    }
    try {
        const raw = fs.readFileSync(p, 'utf8');
        const j = JSON.parse(raw);
        if (j && typeof j === 'object') {
            for (const k of Object.keys(j)) {
                if (k.startsWith('_')) {
                    delete j[k];
                }
            }
        }
        return j;
    } catch (e) {
        console.warn(`[即梦 REST] 读取 ${CONFIG_NAME} 失败:`, e.message);
        return null;
    }
}

function hasRestFile() {
    return fs.existsSync(getConfigPath());
}

module.exports = {
    loadArkRestConfig,
    hasRestFile,
    CONFIG_NAME,
};
