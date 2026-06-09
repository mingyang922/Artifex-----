/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * Opens the local login URL in the default browser (Windows / macOS / Linux).
 * Used by npm run start:open after wait-on succeeds.
 */
const { exec } = require('child_process');
const url = process.env.LOGIN_URL || 'http://localhost:3000/login.html';
let cmd;
if (process.platform === 'win32') {
    cmd = `cmd /c start "" "${url}"`;
} else if (process.platform === 'darwin') {
    cmd = `open "${url}"`;
} else {
    cmd = `xdg-open "${url}"`;
}
exec(cmd, (err) => {
    if (err) console.error(err);
    process.exit(err ? 1 : 0);
});
