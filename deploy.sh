#!/bin/bash
# Artifex 一键部署脚本
# 用法: bash deploy.sh

set -e

echo "🚀 开始部署 Artifex..."

# 1. 安装 Node.js (如果没有)
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 2. 安装 PM2 (如果没有)
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    sudo npm i -g pm2
fi

# 3. 安装依赖
echo "📦 安装项目依赖..."
npm install --production

# 4. 配置环境变量
if [ ! -f backend/.env ]; then
    echo "⚠️  请配置 backend/.env 文件"
    echo "   至少需要设置: NODE_ENV, PORT, SESSION_SECRET"
    cp backend/.env.example backend/.env 2>/dev/null || true
fi

# 5. 启动服务
echo "🔧 启动服务..."
pm2 start backend/ecosystem.config.js --name artifex
pm2 save

# 6. 设置开机自启
pm2 startup 2>/dev/null || true

echo "✅ 部署完成！"
echo "   访问: http://$(hostname -I | awk '{print $1}'):3000"
echo "   查看日志: pm2 logs artifex"
echo "   重启服务: pm2 restart artifex"
