# 贡献指南

感谢你对 Artifex 的关注！以下是参与贡献的基本流程。

## 开发环境

1. Fork 本仓库
2. Clone 到本地：`git clone https://github.com/你的用户名/Artifex-----.git`
3. 安装依赖：`npm install`
4. 创建分支：`git checkout -b feature/你的功能名`

## 提交规范

- Commit message 使用中文或英文均可，清晰描述改动内容
- 示例：`feat: 添加素材库搜索功能` / `fix: 修复登录页样式问题`

## 代码规范

- 后端代码遵循 ESLint 配置（`npm run lint`）
- 提交前建议运行 `npm run lint` 检查
- 前端代码保持现有风格，缩进使用 4 空格

## Pull Request

1. 确保代码能正常运行：`npm start`
2. 确保 lint 检查通过：`npm run lint`
3. 推送分支并创建 PR
4. 简要说明改动内容和测试情况

## 问题反馈

- Bug 反馈请使用 Issue 模板
- 功能建议也欢迎提 Issue
