/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

// 支持 Node 22 LTS 及更高版本（含 24）
const MIN_MAJOR = 22;
const MIN_MINOR = 14;

const parts = process.versions.node.split('.').map((n) => parseInt(n, 10));
const major = parts[0];
const minor = parts[1] || 0;

if (major < MIN_MAJOR) {
    console.error(`[Artifex] 需要 Node.js >= ${MIN_MAJOR}.${MIN_MINOR}.0，当前为 ${process.version}`);
    console.error('[Artifex] 推荐 Node.js 22 LTS 或更高版本');
    process.exit(1);
}

if (major === MIN_MAJOR && minor < MIN_MINOR) {
    console.error(`[Artifex] 需要 Node.js >= ${MIN_MAJOR}.${MIN_MINOR}.0，当前为 ${process.version}`);
    process.exit(1);
}

// Node 24+ 仅提示，不阻断
if (major > 22) {
    console.log(`[Artifex] 当前 Node.js ${process.version}（高于 LTS），兼容运行中。`);
}
