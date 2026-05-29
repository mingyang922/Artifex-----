/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 Artifex Team
 * 版本: 1.0.0 */
const path = require('path');

module.exports = {
    apps: [
        {
            name: 'game-management-backend',
            script: 'proxy.js',
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            // 从 backend/.env 加载；生产环境须在 .env 中设置 SESSION_SECRET、ALLOWED_ORIGINS
            env_file: path.join(__dirname, '.env'),
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
        },
    ],
};
