#!/bin/bash
# Artifex 平台 Docker 部署脚本
set -e

echo "=========================================="
echo "  Artifex 平台 Docker 部署"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未安装 Docker"
    echo "请先安装 Docker：https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! docker compose version &> /dev/null; then
    echo "❌ 错误：Docker Compose 不可用"
    echo "请更新 Docker 到最新版本"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 env.example 创建..."
    cp env.example .env
    echo "📝 请编辑 .env 文件填写配置后重新运行此脚本"
    echo ""
    echo "必填配置项："
    echo "  - SESSION_SECRET: 会话密钥（使用 openssl rand -hex 32 生成）"
    echo "  - ENCRYPTION_KEY: API 凭证加密密钥（另行使用 openssl rand -hex 32 生成）"
    echo "  - ALLOWED_ORIGINS: 你的域名（例如 https://artifex.example.com）"
    echo ""
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 构建并启动
echo "🔨 正在构建 Docker 镜像..."
docker compose build

echo ""
echo "🚀 正在启动服务..."
docker compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 健康检查
echo "🏥 执行健康检查..."
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo ""
    echo "=========================================="
    echo "  ✅ 部署成功！"
    echo "=========================================="
    echo ""
    echo "  访问地址：http://localhost:3000"
    echo "  健康检查：http://localhost:3000/api/health"
    echo ""
    echo "  常用命令："
    echo "    查看日志：docker compose logs -f"
    echo "    停止服务：docker compose down"
    echo "    重启服务：docker compose restart"
    echo "    更新部署：git pull && docker compose up -d --build"
    echo ""
else
    echo ""
    echo "⚠️  服务可能还在启动中，请稍后检查："
    echo "    curl http://localhost:3000/api/health"
    echo ""
    echo "  查看日志排查问题："
    echo "    docker compose logs -f"
fi
