#!/bin/bash
# ============================================
# Artifex 服务器更新脚本
# 用法：在服务器上执行 bash update.sh
# ============================================

set -e

DEPLOY_DIR="/var/www/artifex"
BACKUP_DIR="/var/www/artifex-backup-$(date +%Y%m%d%H%M%S)"

echo "=========================================="
echo "  Artifex 更新脚本"
echo "=========================================="
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查部署目录
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}[警告] 未找到 $DEPLOY_DIR，尝试其他路径...${NC}"
    if [ -d "/srv/artifex" ]; then
        DEPLOY_DIR="/srv/artifex"
    elif [ -d "$HOME/artifex" ]; then
        DEPLOY_DIR="$HOME/artifex"
    else
        echo "[错误] 未找到部署目录，请手动指定"
        exit 1
    fi
fi

echo -e "${GREEN}[信息] 部署目录: $DEPLOY_DIR${NC}"

# 备份当前版本
echo -e "${GREEN}[1/5] 备份当前版本...${NC}"
cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
echo "  备份完成: $BACKUP_DIR"

# 停止服务
echo -e "${GREEN}[2/5] 停止服务...${NC}"
cd "$DEPLOY_DIR"
pm2 stop artifex-backend 2>/dev/null || true
echo "  服务已停止"

# 解压新版本（覆盖更新）
echo -e "${GREEN}[3/5] 更新代码...${NC}"
if [ -f "/tmp/artifex-deploy.tar.gz" ]; then
    # 保留 .env 和 data 目录
    cp backend/.env /tmp/.env.backup 2>/dev/null || true
    cp -r backend/data /tmp/data.backup 2>/dev/null || true

    # 解压新代码
    tar -xzf /tmp/artifex-deploy.tar.gz -C "$DEPLOY_DIR" --overwrite

    # 恢复 .env 和 data
    cp /tmp/.env.backup backend/.env 2>/dev/null || true
    cp -r /tmp/data.backup/* backend/data/ 2>/dev/null || true
    rm -f /tmp/.env.backup
    rm -rf /tmp/data.backup

    echo "  代码更新完成"
else
    echo "[错误] 未找到 /tmp/artifex-deploy.tar.gz"
    echo "  请先上传: scp artifex-deploy.tar.gz root@服务器IP:/tmp/"
    exit 1
fi

# 安装依赖
echo -e "${GREEN}[4/5] 安装依赖...${NC}"
cd "$DEPLOY_DIR"
npm install --omit=dev
echo "  依赖安装完成"

# 重启服务
echo -e "${GREEN}[5/5] 重启服务...${NC}"
pm2 restart artifex-backend 2>/dev/null || pm2 start backend/ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo -e "  ${GREEN}更新完成！${NC}"
echo "=========================================="
echo ""
echo "服务状态:"
pm2 status
echo ""
echo "查看日志: pm2 logs artifex-backend"
echo "回滚版本: cp -r $BACKUP_DIR/* $DEPLOY_DIR/"
