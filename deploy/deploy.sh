#!/bin/bash

# ============================================
# Artifex 云服务器一键部署脚本
# 适用于：腾讯云 Ubuntu 22.04 LTS
# ============================================

set -e

# ============ 请修改以下配置 ============
DOMAIN="yourdomain.com"           # 你的域名
EMAIL="your-email@example.com"    # 用于 SSL 证书申请的邮箱
REPO_URL=""                       # Git 仓库地址（可选，留空则使用本地上传）
# ========================================

echo "=========================================="
echo "  Artifex 服务器部署脚本"
echo "=========================================="
echo ""
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo "运行: sudo bash deploy.sh"
    exit 1
fi

echo -e "${YELLOW}[1/8] 更新系统...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] 安装 Node.js 22...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
else
    echo "Node.js 已安装: $(node --version)"
fi

echo -e "${YELLOW}[3/8] 安装 Nginx 和工具...${NC}"
apt install -y nginx git

echo -e "${YELLOW}[4/8] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 已安装"
fi

echo -e "${YELLOW}[5/8] 部署项目代码...${NC}"
DEPLOY_DIR="/var/www/artifex"

if [ -n "$REPO_URL" ]; then
    # 从 Git 仓库克隆
    if [ -d "$DEPLOY_DIR" ]; then
        echo "目录已存在，更新代码..."
        cd "$DEPLOY_DIR"
        git pull
    else
        git clone "$REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
    fi
else
    # 使用本地上传的代码
    if [ ! -d "$DEPLOY_DIR" ]; then
        echo -e "${RED}错误: 项目目录不存在${NC}"
        echo "请先将项目代码上传到 $DEPLOY_DIR"
        echo "或设置 REPO_URL 变量"
        exit 1
    fi
    cd "$DEPLOY_DIR"
fi

echo -e "${YELLOW}[6/8] 安装依赖并配置环境...${NC}"
npm install --production

# 创建环境配置
if [ ! -f "config/.env" ]; then
    cat > config/.env << EOF
# 生产环境配置
NODE_ENV=production
PORT=3000
SESSION_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# 请填写你的 API Key
# HUNYUAN_SECRET_ID=
# HUNYUAN_SECRET_KEY=
# DASHSCOPE_API_KEY=
# IMAGE_API_KEY=
EOF
    echo -e "${GREEN}已创建 config/.env，请填写 API Key${NC}"
fi

echo -e "${YELLOW}[7/8] 配置 PM2...${NC}"
# 停止旧进程（如果有）
pm2 delete artifex 2>/dev/null || true

# 启动应用
pm2 start backend/proxy.js --name artifex --max-memory-restart 512M

# 保存 PM2 配置并设置开机自启
pm2 save
pm2 startup

echo -e "${YELLOW}[8/8] 配置 Nginx...${NC}"
# 创建 Nginx 配置
cat > /etc/nginx/sites-available/artifex << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    client_max_body_size 50M;
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/artifex /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# 配置防火墙
echo -e "${YELLOW}配置防火墙...${NC}"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable

echo ""
echo "=========================================="
echo -e "${GREEN}  部署完成！${NC}"
echo "=========================================="
echo ""
echo "访问地址: http://${DOMAIN}"
echo ""
echo "下一步："
echo "1. 配置域名 DNS 解析到服务器 IP"
echo "2. 编辑 /var/www/artifex/config/.env 填写 API Key"
echo "3. 运行以下命令申请 SSL 证书（HTTPS）:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "常用命令:"
echo "  pm2 status          - 查看应用状态"
echo "  pm2 logs artifex    - 查看日志"
echo "  pm2 restart artifex - 重启应用"
echo ""
