# Artifex 绑定自有域名（腾讯云服务器）

> **说明**：域名需在注册商处**实名购买**，本仓库无法代你下单。购买后按本文在 DNS、Nginx、`.env` 中配置即可用域名访问。

当前服务器公网 IP（示例）：`82.156.244.66`  
代码目录：`/srv/game-management/current`  
Nginx 静态根目录：`/var/www/game-management`

---

## 一、购买域名（自行完成）

任选其一（与现有腾讯云机器同账号较方便）：

| 平台 | 入口 |
|------|------|
| 腾讯云 DNSPod | [域名注册](https://dnspod.cloud.tencent.com/) |
| 阿里云万网 | [域名控制台](https://dc.console.aliyun.com/) |
| 其他 | Cloudflare、Namecheap 等 |

建议：

- 选 **`.com` / `.cn` / `.top`** 等常见后缀，首年通常几十元级。
- **备案**：服务器在中国大陆时，用域名对外提供网站往往需 **ICP 备案**（`.cn` 与国内机房尤甚）。仅 IP 访问可不绑备案域名；以当地与云厂商要求为准。
- 记下你买到的域名，下文用 `artifex.example.com` 作占位，请换成真实域名。

---

## 二、DNS 解析（把域名指到服务器）

在域名控制台添加 **A 记录**：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| A | `@` | `82.156.244.66` | 600 |
| A | `www` | `82.156.244.66` | 600（可选） |

生效时间：几分钟到数小时。本地可测：

```bash
ping artifex.example.com
```

应解析到 `82.156.244.66`。

---

## 三、Nginx 配置（服务器 SSH）

```bash
sudo nano /etc/nginx/sites-available/artifex
```

写入（**替换** `artifex.example.com` 和 `root` 路径）：

```nginx
server {
    listen 80;
    server_name artifex.example.com www.artifex.example.com;

    root /var/www/game-management;
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

启用并重载：

```bash
sudo ln -sf /etc/nginx/sites-available/artifex /etc/nginx/sites-enabled/artifex
# 若旧站点冲突，可去掉默认站：sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

浏览器访问：`http://artifex.example.com/login.html`

---

## 四、后端 `.env`（登录与 CORS 必填）

编辑：

```bash
sudo nano /srv/game-management/current/backend/.env
```

`ALLOWED_ORIGINS` 须包含**带协议、无末尾斜杠**的域名，例如：

```env
ALLOWED_ORIGINS=http://artifex.example.com,https://artifex.example.com,http://82.156.244.66
```

保存后：

```bash
pm2 restart game-management-backend
curl -s http://127.0.0.1:3000/api/health
```

---

## 五、HTTPS（推荐，免费证书）

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d artifex.example.com -d www.artifex.example.com
```

按提示选择重定向到 HTTPS。完成后用：

`https://artifex.example.com/login.html`

若启用 HTTPS，请把 `.env` 中 `ALLOWED_ORIGINS` 以 **`https://`** 为主。

证书自动续期一般已配置；可检查：

```bash
sudo certbot renew --dry-run
```

---

## 六、验收清单

- [ ] `ping 你的域名` → 服务器 IP
- [ ] `http://你的域名/login.html` 可打开
- [ ] `http://你的域名/api/health` 返回 JSON（非 502）
- [ ] 能注册/登录
- [ ] （可选）`https://` 正常、浏览器无证书告警

---

## 七、答辩 / 演示话术（可选）

> 平台部署在腾讯云，通过 **A 记录** 将自有域名解析到云主机，**Nginx** 提供静态页面并反代 **Node** 的 `/api`；生产环境配置 **SESSION_SECRET** 与 **ALLOWED_ORIGINS**，并使用 **Let’s Encrypt** 启用 HTTPS。

---

## 八、常见问题

| 现象 | 处理 |
|------|------|
| 域名打不开、IP 能开 | DNS 未生效；检查 A 记录与备案状态 |
| 页面能开、登录 502 | `pm2 status` 非 online；查 `SESSION_SECRET` |
| 登录报跨域 | `ALLOWED_ORIGINS` 未含当前访问的 `http(s)://域名` |
| certbot 失败 | 80 端口须能从公网访问；`server_name` 与域名一致 |

更多部署见：`docs/DEPLOY_TENCENT_SINGLE_SERVER.md`、`backend/.env.production.example`。
