# 腾讯云同机部署（前端+后端在同一台服务器）


## 1. 服务器初始化

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 2. 拉取项目并安装依赖

```bash
cd /var/www
sudo git clone <你的仓库地址> GameManagement-platform
sudo chown -R $USER:$USER /var/www/GameManagement-platform
cd /var/www/GameManagement-platform
npm install
```

## 3. 配置后端环境变量

```bash
cd /var/www/GameManagement-platform/backend
cp .env.example .env
nano .env
```

把 `.env` 至少改成：

```env
NODE_ENV=production
PORT=3000
HUNYUAN_SECRET_ID=你的腾讯混元ID
HUNYUAN_SECRET_KEY=你的腾讯混元KEY
DASHSCOPE_API_KEY=你的通义千问/万相KEY
ALLOWED_ORIGINS=https://你的域名
```

## 4. 启动 Node 后端（PM2）

```bash
cd /var/www/GameManagement-platform/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

健康检查：

```bash
curl http://127.0.0.1:3000/api/health
```

## 5. 配置 Nginx（静态前端 + /api 反代）

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/game-management
```

写入以下内容（把 `your-domain.com` 换成你的域名）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/GameManagement-platform;
    index login.html index.html;

    location / {
        try_files $uri $uri/ /login.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点并重载：

```bash
sudo ln -s /etc/nginx/sites-available/game-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 配 HTTPS（推荐）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. 验证

- 前端页面：`https://your-domain.com/login.html`
- 后端健康检查：`https://your-domain.com/api/health`
- AI 生成页会自动请求同域 `/api/*`，无需额外改前端地址。

