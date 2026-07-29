/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

const { spawnSync } = require('child_process');

function sqliteOk() {
    try {
        const Database = require('better-sqlite3');
        new Database(':memory:').close();
        return true;
    } catch {
        return false;
    }
}

if (sqliteOk()) {
    process.exit(0);
}

console.log('[Artifex] 正在为当前 Node 重编 better-sqlite3...');
const result = spawnSync('npm', ['rebuild', 'better-sqlite3'], {
    stdio: 'inherit',
    shell: true,
});

if (sqliteOk()) {
    process.exit(0);
}

if (result.status !== 0) {
    console.warn(
        '[Artifex] better-sqlite3 重编未成功。若后端正在运行，请先关闭再执行 npm install；也可双击「一键启动.cmd」自动修复。'
    );
}

process.exit(0);
