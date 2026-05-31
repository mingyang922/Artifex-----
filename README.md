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

## 开发说明

- 运行环境锁定：**Node `>=22.14.0 <23`**（见 `package.json` 的 `engines`、`.nvmrc`、`.npmrc`）。
- `npm run check:node`：单独校验当前 Node 版本。
- 环境变量示例见 `backend/.env.example`。
- 生产环境必须设置 `SESSION_SECRET`，并按需限制 `ALLOWED_ORIGINS`。
- `backend/data/*.sqlite`、`.env`、日志等本地数据不应提交到仓库。

## 相关文档

- `更新日志.md`
- `CONTRIBUTING.md` — 贡献指南
- `SECURITY.md` — 安全策略
- `docs/DEPLOY_TENCENT_SINGLE_SERVER.md`
- `docs/DOMAIN_artifex.com.cn.md`（当前域名部署命令）
- `deploy/nginx-artifex-http-only.conf`（备案前关闭 HTTP→HTTPS 强制跳转）
- `docs/DEPLOY_DOMAIN.md`
- `docs/JIMENG_ARK_SETUP.md`
