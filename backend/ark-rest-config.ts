/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 官方 REST 接入：读取 config/ark-rest-api.local.json（与 curl 一致），不依赖系统环境变量。
 * 文档：图片生成 API https://www.volcengine.com/docs/82379/1541523
 */

import fs from 'fs';
import path from 'path';

// ── 接口定义 ──

interface ArkRestConfig {
    endpoint?: string;
    apiKey?: string;
    model?: string;
    useRestApiOnly?: boolean;
    defaults?: Record<string, unknown>;
    [key: string]: unknown;
}

const CONFIG_NAME: string = 'ark-rest-api.local.json';

function getConfigPath(): string {
    return path.join(__dirname, '..', 'config', CONFIG_NAME);
}

/**
 * 加载 Ark REST API 配置文件
 * @returns 配置对象，若文件不存在或解析失败则返回 null
 */
function loadArkRestConfig(): ArkRestConfig | null {
    const p: string = getConfigPath();
    if (!fs.existsSync(p)) {
        return null;
    }
    try {
        const raw: string = fs.readFileSync(p, 'utf8');
        const j: ArkRestConfig = JSON.parse(raw);
        if (j && typeof j === 'object') {
            for (const k of Object.keys(j)) {
                if (k.startsWith('_')) {
                    delete j[k];
                }
            }
        }
        return j;
    } catch (e: unknown) {
        const message: string = e instanceof Error ? e.message : String(e);
        console.warn(`[即梦 REST] 读取 ${CONFIG_NAME} 失败:`, message);
        return null;
    }
}

function hasRestFile(): boolean {
    return fs.existsSync(getConfigPath());
}

export {
    loadArkRestConfig,
    hasRestFile,
    CONFIG_NAME,
};

export type { ArkRestConfig };
