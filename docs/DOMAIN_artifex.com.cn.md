# artifex.com.cn 部署命令速查

服务器公网 IP（若未变）：`82.156.244.66`  
代码目录（按你机器实际路径调整）：`/srv/game-management/current`

---

## 一、在你自己电脑上（检查 DNS）

```bash
ping artifex.com.cn
```

Windows PowerShell 也可：

```powershell
Resolve-DnsName artifex.com.cn
curl.exe -I https://artifex.com.cn/login.html
```

---

## 二、SSH 登录服务器后

```bash
ssh root@82.156.244.66
# 或你的实际用户名与 IP
```

### 1. 编辑 Nginx

```bash
sudo nano /etc/nginx/sites-available/artifex
```

`server_name` 至少包含：

```nginx
server_name artifex.com.cn www.artifex.com.cn;
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 2. 编辑后端环境变量

```bash
cd /srv/game-management/current
sudo nano backend/.env
```

生产环境建议至少包含（`SESSION_SECRET` 换成你自己的随机串）：

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=请改为至少32位随机字符串
ALLOWED_ORIGINS=https://artifex.com.cn,https://www.artifex.com.cn,http://artifex.com.cn,http://www.artifex.com.cn
```

### 3. 重启后端

```bash
cd /srv/game-management/current
pm2 restart game-management-backend
# 若进程名不同：pm2 list 后 pm2 restart <name>
```

### 4. 本机健康检查（在服务器上执行）

```bash
curl -s http://127.0.0.1:3000/api/health
curl -sI http://artifex.com.cn/api/health
```

### 5. 申请 HTTPS（推荐）

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d artifex.com.cn -d www.artifex.com.cn
```

证书生效后，再次确认 `.env` 里已有 `https://artifex.com.cn`，然后：

```bash
pm2 restart game-management-backend
```

浏览器访问：`https://artifex.com.cn/login.html`

---

## 三、本地开发（与本机调试，不是改服务器）

```powershell
cd "c:\Users\yang\Desktop\Artifex软著申请版"
nvm use 22.22.0
npm install
npm start
```

浏览器：`http://localhost:3000/login.html`

---

## 四、关闭「HTTP 强制跳 HTTPS」（备案前用 IP 访问）

当前若访问 `http://82.156.244.66` 被 301 到 `https://...` 导致电脑打不开，可在服务器使用仓库内配置：

```bash
cd /srv/game-management/current   # 换成你的项目路径
bash deploy/apply-nginx-http-only.sh
```

或手动：

```bash
sudo cp deploy/nginx-artifex-http-only.conf /etc/nginx/sites-available/artifex
sudo ln -sf /etc/nginx/sites-available/artifex /etc/nginx/sites-enabled/artifex
sudo nginx -t && sudo systemctl reload nginx
```

验证（应返回 **200**，且无 `Location: https`）：

```bash
curl -sI http://82.156.244.66/login.html
```

备案完成并配置证书后，再执行 `certbot --nginx` 恢复 HTTPS。

---

## 五、常见报错

| 现象 | 处理 |
|------|------|
| 页面能开，登录 502 | 看 `pm2 logs`，补全 `SESSION_SECRET` 与 `ALLOWED_ORIGINS` 后 `pm2 restart` |
| 跨域错误 | `ALLOWED_ORIGINS` 必须包含你浏览器地址栏里的完整来源（含 `https://`） |
| `NODE_MODULE_VERSION` | 在服务器项目目录执行 `npm rebuild better-sqlite3` 后重启 pm2 |
