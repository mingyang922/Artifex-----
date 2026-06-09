# Artifex

Artifex 是一个面向 2D 游戏资产生产的协作平台，包含登录鉴权、项目管理、AI 生成、素材库和用户中心。项目采用前后端同仓：前端为原生 HTML/CSS/JS，后端为 Node.js + Express + SQLite。

## 快速开始

### 方式 A：直接访问已部署站点

- 登录页：`https://artifex.com.cn/login.html`（部署命令见 `docs/DOMAIN_artifex.com.cn.md`）

### 方式 B：本地运行

1. 安装 **Node.js 22 LTS**（推荐 `22.22.0`，与根目录 `.nvmrc` 一致）。
2. 使用 nvm-windows 时：`nvm install 22.22.0` → `nvm use 22.22.0`。
3. 在项目根目录执行：

```bash
npm install
npm start
```

4. 打开：`http://localhost:3000/login.html`

Windows 可直接双击 `一键启动.cmd`。

> `npm install` 会校验 Node 主版本为 22，并自动重编 `better-sqlite3`。请勿拷贝 `node_modules` 到其他机器；换 Node 大版本后请删除 `node_modules` 再安装。

## 核心约定

- 所有 AI 能力都要求登录后使用。
- 普通用户默认不再使用共享免费接口，需在用户中心配置自己的服务商凭证。
- `free/mock` 仅管理员账号可用。
- 后端接口采用会话 Cookie（`express-session`），前端请求需携带 `credentials: 'include'`。

## 主要目录

```text
backend/                     Node.js 服务端
  db/users-db.js             用户与 API 凭证存储
  lib/                       鉴权/配置等后端辅助模块
  proxy.js                   服务入口与路由
  routes/                    路由模块
    auth.js                  认证路由
    image-proxy.js           图片生成路由
    projects.js              项目管理路由
    asset-library.js         素材库路由
    admin.js                 管理员路由
    ai-providers.js          AI 服务商路由
modules/
  admin/                     管理员面板
  ai-generate/               AI 生成页面
  project-management/        项目管理页面
  asset-library/             素材库页面
  style-presets/              风格预设
  user-center/               用户中心
js/                          前端共享脚本
styles/                      共享样式
docs/                        部署与接入文档
.github/                     CI/CD 与 Issue 模板
```

## 常用脚本

- `npm start`：启动后端
- `npm run dev`：开发模式（自动重启）
- `npm run lint`：ESLint 检查
- `npm run format:check`：Prettier 检查
- `npm test`：运行测试

## CI/CD

项目已配置 GitHub Actions，每次 push 到 `main` 分支会自动运行 lint 检查和测试。详见 `.github/workflows/ci.yml`。

## 后端接口摘要

### 认证与用户

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `PUT /api/me/profile`

### 用户 API 凭证

- `GET /api/me/api-settings`
- `GET /api/me/api-settings/status`
- `PUT /api/me/api-settings`
- `DELETE /api/me/api-settings/:provider`
- `POST /api/me/api-settings/validate`
- `POST /api/me/change-password`

## 开发说明

- 运行环境锁定：**Node `>=22.14.0 <23`**（见 `package.json` 的 `engines`、`.nvmrc`、`.npmrc`）。
- `npm run check:node`：单独校验当前 Node 版本。
- 环境变量示例见 `backend/.env.example`。
- 生产环境必须设置 `SESSION_SECRET`，并按需限制 `ALLOWED_ORIGINS`。
- `backend/data/*.sqlite`、`.env`、日志等本地数据不应提交到仓库。
- 可选设置 `ADMIN_USER_ID` 指定管理员用户 ID（默认首个注册用户）。
- 可选设置 `ENCRYPTION_KEY` 指定 API 密钥加密密钥（默认使用 `SESSION_SECRET`）。

## 安全特性

- API 密钥采用 **AES-256-GCM** 认证加密存储（防篡改）
- SSRF 防护：URL 校验 + DNS 解析后二次校验（防 DNS rebinding）
- CSRF 防护：Double-Submit Cookie 模式
- 密码 bcrypt 哈希加密
- 接口限流：按用户限流（图片生成 10次/分钟，登录 20次/15分钟，修改密码 5次/15分钟）

## 多语言

支持 **5 种语言**：简体中文（默认）、繁體中文、English、日本語、한국어。用户可在用户中心切换。

## 备案信息

- 京公网安备11010802048813号
- 京ICP备2026031602号

## 相关文档

- `更新日志.md` — 版本更新记录
- `docs/用户手册.md` — 用户使用指南
- `docs/软件说明书.md` — 软件功能说明
- `docs/安全审计文档.md` — 安全特性与审计结果
- `docs/性能基准文档.md` — 性能优化措施与基准数据
- `docs/openapi.json` — API 接口文档
- `docs/源代码文档.txt` — 源代码文档（软著材料）
- `CONTRIBUTING.md` — 贡献指南
- `SECURITY.md` — 安全策略
- `docs/DEPLOY_TENCENT_SINGLE_SERVER.md`
- `docs/DOMAIN_artifex.com.cn.md`（当前域名部署命令）
- `deploy/nginx-artifex-http-only.conf`（备案前关闭 HTTP→HTTPS 强制跳转）
- `docs/DEPLOY_DOMAIN.md`
- `docs/JIMENG_ARK_SETUP.md`
