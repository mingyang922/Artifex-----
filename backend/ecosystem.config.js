/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
'use strict';

// PM2 不支持 env_file 选项，.env 由 proxy.js 通过 dotenv 自动加载
// 生产环境须在 backend/.env 中设置 SESSION_SECRET、ALLOWED_ORIGINS

module.exports = {
    apps: [
        {
            name: 'artifex-backend',
            script: 'proxy.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '1024M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
        },
    ],
};
