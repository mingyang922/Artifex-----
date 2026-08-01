# Artifex 生产工作流与扩展接口

更新日期：2026-08-01

## 入口

- 生产工作台：`/modules/workflow-hub/index.html`
- 线稿转成品图：`/modules/ai-generate/ai-generator-new.html?workflow=sketch`
- 只读交付页：由生产工作台创建，格式为 `/modules/workflow-hub/shared.html?token=...`

## 功能说明

### 生成任务

每次通过 AI 图片生成器提交任务时，服务端会记录提示词、角色、模板、模式、服务商、参数、输出、状态、错误和预估成本。复制或重试只会创建可复现草稿；用户必须从草稿返回生成器并真实提交，系统不会制造没有执行器的假队列。

| 方法 | 路径                                    | 用途                                         |
| ---- | --------------------------------------- | -------------------------------------------- |
| GET  | `/api/generation-jobs`                  | 查询当前用户生成历史                         |
| POST | `/api/generation-jobs`                  | 创建可复现草稿，客户端不能指定完成状态或成本 |
| PUT  | `/api/generation-jobs/:jobId`           | 已停用；状态、输出和错误由图片生成后端维护   |
| POST | `/api/generation-jobs/:jobId/retry`     | 基于原参数创建可复现草稿                     |
| POST | `/api/generation-jobs/:jobId/duplicate` | 复制参数为草稿                               |
| GET  | `/api/generation-jobs/:jobId/replay`    | 读取复现参数                                 |
| GET  | `/api/generation-jobs/:jobId/diagnosis` | 获取错误分类和处理建议                       |

### 角色一致性

角色档案是**简化版约束注入**：可保存描述、固定配色、Seed、风格提示词、禁止变化项和多张参考图 URL。点击“使用角色”后，这些约束会自动注入 AI 生成器，但它不包含角色 embedding 或多参考图一致性模型，也不承诺跨批次像素级一致。

`POST /api/characters/:characterId/evaluate` 可以根据生成 Prompt、人工观察到的特征和配色文本，计算锁定特征覆盖率并返回匹配项、缺失项与建议。该方法标识为 `metadata-heuristic-v1`，是可解释的实验辅助工具，不冒充视觉模型。

| 方法         | 路径                           |
| ------------ | ------------------------------ |
| GET / POST   | `/api/characters`              |
| PUT / DELETE | `/api/characters/:characterId` |

### 研究工作台、模板与示例

- `GET /api/workflow-templates`：7 类结构化游戏美术模板。
- `GET /api/me/workflow-metrics`：生成成功率、平均耗时、失败量、服务商分布和一致性平均分。
- `POST /api/demo-workspace`：幂等创建“墨影”示例项目、角色和生成记录。
- `DELETE /api/demo-workspace`：只删除带系统标记的示例数据。

### 服务端工作区备份

- `GET /api/workspace-export`：导出项目及素材、角色档案、最近生成记录和素材库。
- `POST /api/workspace-import`：校验版本和 20MB 上限后，以追加方式导入项目、角色与素材。

服务端 JSON 备份解决用户级迁移和演示复现，不等同于运维层面的 SQLite 文件快照。

### 项目协作、审核和版本

项目支持 `owner`、`editor`、`reviewer`、`viewer` 四类访问角色。`owner` 管理成员、邀请与交付，`editor` 可编辑和恢复版本，`reviewer` 可批注并设置“需修改/已通过”，`viewer` 仅可读。新版本快照同时保存项目字段与素材内容，恢复时在同一 SQLite 事务中完成。

| 方法       | 路径                                          | 用途                 |
| ---------- | --------------------------------------------- | -------------------- |
| GET        | `/api/collaboration/projects`                 | 查询拥有或参与的项目 |
| GET / POST | `/api/projects/:id/members`                   | 查询或添加成员       |
| DELETE     | `/api/projects/:id/members/:userId`           | 移除成员             |
| GET / POST | `/api/projects/:id/invites`                   | 查询或创建邀请/分享  |
| DELETE     | `/api/projects/:id/invites/:token`            | 撤销邀请/分享        |
| POST       | `/api/project-invites/:token/accept`          | 接受成员邀请         |
| GET        | `/api/shared-projects/:token`                 | 读取公开只读项目     |
| GET / POST | `/api/projects/:id/comments`                  | 查询或创建批注       |
| PUT        | `/api/projects/:id/review`                    | 更新项目审核状态     |
| PUT        | `/api/projects/:id/assets/:assetId/review`    | 更新资产审核状态     |
| GET        | `/api/projects/:id/versions`                  | 查询版本             |
| GET        | `/api/projects/:id/versions/:version/diff`    | 查询版本差异         |
| POST       | `/api/projects/:id/versions/:version/restore` | 恢复版本并生成新版本 |

### 素材库

素材库 API 支持服务端搜索、类型/来源/标签/状态/收藏筛选、排序、100 条分页、批量更新、内容哈希重复检测、软删除与恢复。前端素材库会自动逐页加载，不再只显示第一页。

### LoRA 训练

LoRA 训练只在外部 Worker 真实可用时开放。系统要求同时配置以下环境变量；缺少任一项时，生产工作台会禁用提交，`POST /api/lora-jobs` 返回 `503 ERR_SERVICE_UNAVAILABLE`，不会留下永远无法执行的假队列：

```dotenv
LORA_TRAINING_WEBHOOK_URL=https://worker.example.com/jobs
LORA_WORKER_TOKEN=至少32位随机字符串
LORA_DISPATCH_TIMEOUT_MS=10000
```

Worker 接收 `jobId`、`name`、`provider`、`images`、`params` 和 `callbackUrl`，完成后使用同一个 Bearer Token 回调：

平台派发使用稳定的 `Idempotency-Key`，单次请求默认 10 秒超时并最多尝试 3 次；派发全部失败后任务会转为 `failed` 并写入通知。用户只能取消等待或执行中的 LoRA 任务，完成状态和模型路径只能由 Worker 回调更新。

```http
POST /api/lora-jobs/:jobId/callback
Authorization: Bearer <LORA_WORKER_TOKEN>
Content-Type: application/json

{
  "status": "completed",
  "progress": 100,
  "modelPath": "models/artifex_style.safetensors"
}
```

### 运行时能力状态

`GET /api/capabilities` 返回当前部署的实际功能状态、说明与限制。生产工作台据此显示“简化版”“Worker 已连接”或“未配置训练 Worker”，并对不可用功能采用失败关闭策略。

### 密码重置

`POST /api/auth/forgot-password` 始终返回通用成功提示，避免泄露邮箱是否注册。开发环境会返回一次性重置链接；生产环境建议配置 `PASSWORD_RESET_WEBHOOK_URL`，由邮件或消息服务发送链接。重置令牌 30 分钟过期且只能使用一次。

### 通知与成本

- `GET /api/notifications`：最近 100 条通知。
- `PUT /api/notifications/read-all`：全部已读。
- `PUT /api/notifications/:id/read`：单条已读。
- `DELETE /api/notifications/:id`：删除通知。
- `GET /api/me/cost-summary`：按服务商汇总生成次数、记录成本和配额预警。

生成完成、生成失败、协作批注、审核变化及 LoRA 完成/失败会持久化通知；生产工作台通过 WebSocket 实时刷新。

## 安全约定

- 除公开分享和 LoRA Worker 回调外，接口均要求登录会话。
- 写接口要求 `X-XSRF-Token`。
- 公开分享可过期、可撤销，只返回交付所需字段。
- LoRA 回调仅接受配置的 Bearer Token。
- 生产环境的 `SESSION_SECRET`、`ENCRYPTION_KEY`、`LORA_WORKER_TOKEN` 不应提交到仓库。
