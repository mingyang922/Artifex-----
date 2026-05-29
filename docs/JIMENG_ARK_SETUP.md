# 即梦（火山方舟 Seedream）接入说明

本项目的「角色动作组」在 **API 服务商** 中选择 **「即梦 Seedream（火山方舟 API）」** 时，会由后端 `proxy.js` 调用火山方舟**文生图**接口，适合批量生成动作帧（无需本地 GPU）。

### 文档对应关系（请对照官方最新版）

| 文档 | 说明 |
|------|------|
| [即梦 AI - 图片生成 4.0 - 接口文档](https://www.volcengine.com/docs/85621/1817045) | **产品线说明**、计费与能力范围（即梦 AI 文档中心）。 |
| [火山方舟 - 图片生成 API](https://www.volcengine.com/docs/82379/1541523) | **实际 HTTP 调用**：`POST .../images/generations`、`Authorization: Bearer <API Key>`、请求体字段等（与本项目实现一致）。 |

本项目使用 **方舟 API Key（`sk-`）** + **方舟图片生成网关**，与「即梦 4.0」在能力上对应；若控制台中的 **模型 ID** 与下表默认值不一致，请以控制台 **复制模型 ID** 为准，并在 `JIMENG_MODEL` 中配置。

**调用方式**：后端**仅**使用官方 **REST**（`axios` 发 `POST`，与 curl 一致），不再使用 OpenAI SDK。

复制 `config/ark-rest-api.local.json.example` 为 **`config/ark-rest-api.local.json`**，填写 **`apiKey`**、`model`（一般为接入点 **`ep-m-...`**）、以及 **`defaults`**（如 `sequential_image_generation`、`stream`、`watermark`、`size` 等）。详见 [图片生成 API](https://www.volcengine.com/docs/82379/1541523)。该文件已加入 `.gitignore`。若未使用 JSON，可仅在 `config/.env` 中配置 `JIMENG_API_KEY` / `JIMENG_MODEL` 等作为回退。

---

## 推荐模型（默认）

| 模型 ID | 说明 |
|--------|------|
| **`doubao-seedream-4.0-250828`** | **即梦 4.0（Doubao-Seedream-4.0）**，与控制台「快速 API 接入」示例一致；综合质量与指令遵循较好。 |

在 `config/.env` 中可通过 `JIMENG_MODEL` 覆盖为控制台中已开通的其他 Seedream 版本（需与方舟控制台展示 **模型名称** 完全一致）。

### 使用「自定义推理接入点」（与控制台「API 接入」示例对齐）

若在 **方舟 → 在线推理 → 自定义推理接入点** 中创建了接入点（ID 形如 **`ep-20240413194920-xxxx`**）：

1. 点击该接入点右侧 **「API 接入」**，查看示例中的 **`model` 字段**。  
2. 若示例写的是 **`ep-...`** 而不是 `doubao-seedream-...`，请在 `.env` 中设置：  
   **`JIMENG_MODEL=ep-你的接入点ID`**（与示例完全一致）。  
3. **`JIMENG_IMAGE_API_URL`** 仍以示例为准；多数情况下仍为 `https://ark.cn-beijing.volces.com/api/v3/images/generations`（区域需与控制台一致）。

---

## 1. 获取 API Key（重要：不是 IAM 访问密钥）

即梦 / 方舟 **图片生成** 使用 **`Authorization: Bearer <API Key>`**，与 [火山方舟 · 获取 API Key 并配置](https://www.volcengine.com/docs/82379/1541594) 一致。

| 能用 | 不能用 |
|------|--------|
| **火山方舟 → API Key 管理** 中创建的密钥（通常 **`sk-` 开头**） | **访问控制（IAM）→ API 访问密钥** 里的 **Access Key ID（`AKLT...`）** 与 **Secret Access Key** |

**请勿**把 IAM 的 `AKLT...` 或 Secret 填进 `JIMENG_API_KEY`；若误填会导致 **401**。若需用 IAM 调 **管控面**（如 [GetApiKey](https://www.volcengine.com/docs/82379/1262825)），属于另一套 **签名** 流程，**不能**替代上述 Bearer 出图。

步骤：

1. 打开 [火山引擎控制台](https://console.volcengine.com/) 并登录。
2. 进入 **火山方舟**（ARK）产品。
3. 在 **API Key 管理** 中创建密钥（形如 **`sk-xxxx`**）。
4. 确认账号已开通 **图片生成 / Seedream（即梦）** 相关模型与计费（以控制台实际为准）。

官方 HTTP 接口说明（若链接变更请以控制台为准）：  
[火山方舟 · 图片生成 API](https://www.volcengine.com/docs/82379/1541523)

---

## 2. 配置本项目

在 **`GameManagement-platform/config/.env`** 中增加或修改（由 `backend/proxy.js` 加载该文件）：

```env
# 必填：与方舟控制台 API Key 一致（二选一即可）
# 可写完整 sk-...；若控制台只复制到 UUID（xxxxxxxx-xxxx-...），不写 sk- 亦可，后端会自动补 sk- 前缀
JIMENG_API_KEY=sk-你的密钥
# 若你习惯沿用官方示例变量名，也可只配下面这一行：
# ARK_API_KEY=sk-你的密钥

# 可选：覆盖默认模型（默认已适合动作组批量）
JIMENG_MODEL=doubao-seedream-4.0-250828

# 可选：若官方文档更新了网关地址，可整段替换（一般无需改）
# JIMENG_IMAGE_API_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations

# 可选：使用 1K / 2K / 4K 档位代替像素宽高（需模型支持）
# JIMENG_SIZE=2K

# 可选：为生成图加水印（按方舟参数说明）
# JIMENG_WATERMARK=1
```

保存后**重启** Node：`node backend/proxy.js`。

---

## 3. 验证是否接通

浏览器或 curl 访问：

```text
http://127.0.0.1:3000/api/jimeng/status
```

若返回 `"configured": true` 且 `model` 正确，说明 Key 已被读取。

---

## 4. 在界面中使用

1. 打开 `modules/ai-generate/ai-generator-new.html` 对应页面（通过平台导航进入 **AI 生成 → 角色动作组**）。
2. **API 服务商** 选择 **「即梦 Seedream（火山方舟 API）」**。
3. 填写 **角色造型描述**、选择动作与 **动作组预设**，点击 **批量生成动作组**。

说明：

- **「生成三视图」** 为 **图生图**，当前仍仅对接 **本地 SD WebUI**；即梦在本页用于 **文生图批量**。
- 若需「草图 → 三视图」，请继续用 **SD WebUI** 完成三视图，再用即梦或 SD 批量动作帧。

---

## 5. 请求与扩展参数

前端会对每次请求附带 `jimeng: { response_format: 'url' }`。  
可在 `payload.jimeng` 中扩展官方支持的字段，后端会合并进请求体，例如：

- `sequential_image_generation` / `sequential_image_generation_options`（组图等，以 [图片生成 API](https://www.volcengine.com/docs/82379/1541523) 为准）
- `extra_body`：对象，会 **展开合并** 到请求根级（兼容部分示例里嵌套一层扩展字段的写法）

详见 `proxy.js` 中 `callJimengImageAPI`。

---

## 6. 常见问题

| 现象 | 处理 |
|------|------|
| `未配置 JIMENG_API_KEY` | 检查 `.env` 路径是否为 `config/.env`，且变量名正确，重启 Node。 |
| `未解析到图片 URL` | 方舟返回 JSON 结构可能更新：查看终端日志中的 `Jimeng response`；对照最新官方文档调整 `parseJimengImageResponse` 或设置正确的 `JIMENG_IMAGE_API_URL`。 |
| 403 / 401 | Key 无效、未开通图片生成权限或欠费。**若长期 401**：在方舟 **API Key 管理** 里 **新建** 一把 Key（不要用旧表里的半截展示），创建弹窗里 **只显示一次** 时整段复制；确认 **同一账号** 已在方舟 **模型广场** 开通对应 Seedream/即梦模型；账户 **余额充足**。可在 `.env` 临时加 `JIMENG_LIVE_TEST=1`，重启后浏览器访问 `http://127.0.0.1:3000/api/jimeng/live-test` 查看方舟返回的 `httpStatus` 与 `body`（调完请删 `JIMENG_LIVE_TEST`）。 |
| 仍想试「仅 UUID、无 sk-」 | 在 `.env` 设 `JIMENG_BEARER_WITHOUT_SK_PREFIX=1`（极少需要），重启后再试。 |
| **控制台「安全审计 / KMS 访问」有记录，但 HTTP 仍 401** | **KMS 审计**表示接入点侧对**模型密钥材料**的解密等内部操作（例如模型部署、控制台相关流程），**不能**等同于「HTTP 网关已认可你的 Bearer」。`POST .../api/v3/images/generations` 仍必须在 **`Authorization: Bearer <方舟 API Key 管理里的 sk->`** 上校验通过。请以 `GET /api/jimeng/live-test` 的 **`httpStatus` 是否为 200** 为准；若为 401，仍须在 [API Key 管理](https://www.volcengine.com/docs/82379/1541594) 新建并完整复制整段 `sk-`，勿与 IAM、AK/SK、或控制台示例里的短 token 混用。 |
| 尺寸报错 | 将 `JIMENG_SIZE` 设为 `2K` / `1K` / `4K`，或使用 **1280×720～4096×4096** 范围内的像素（项目内会对宽高做下限约束，与 Seedream 文档区间对齐）。 |

---

## 7. 与本地 SD WebUI 的选用建议

| 场景 | 建议 |
|------|------|
| 有本地显卡 + LoRA 强一致 | 优先 **SD WebUI**，可控性最高。 |
| 无显卡 / 要云端批量 / 试效果 | 使用 **即梦**。 |

两者可在同一页面分别选用，三视图走 SD，动作组走即梦亦可。
