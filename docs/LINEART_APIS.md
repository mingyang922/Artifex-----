# 线稿/草图 → 成品图：可调用的付费 API 推荐

本平台已在「图片生成」页支持**线稿转成品图（图生图）**。选择「线稿/草图 → 成品图」模式并上传图片后，后端会调用图生图能力。以下为可完成线稿/草图生成、且支持 API 调用的**可付费**服务推荐，便于后续扩展或替换。

---

## 1. 腾讯云混元生图（已集成）

- **产品**：[腾讯混元生图 - 图像风格化（图生图）](https://cloud.tencent.com/document/product/1668/88066)
- **能力**：根据输入图像 + 文本描述生成风格化/上色图，适合线稿→成品、草图→成图。
- **计费**：按张计费，具体见 [产品定价](https://cloud.tencent.com/document/product/1668/88079)。
- **本平台**：已在后端使用同一套 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`（与文生图共用），在「图片生成」选「腾讯云」+「线稿/草图→成品图」即可使用。

---

## 2. 阿里云通义万相（万相 2.0）

- **产品**：[通义万相 - 图像生成](https://help.aliyun.com/zh/dashscope/developer-reference/image-synthesis)
- **能力**：支持图生图、风格迁移，可做线稿上色/草图成图。
- **计费**：按调用次数/分辨率计费，需在阿里云开通 DashScope。
- **集成方式**：使用 `image` 参数传入参考图（URL 或 Base64），配合 `prompt` 做图生图；需在后端增加万相图生图接口封装。

---

## 3. 百度文心一格（文生图 / 图生图）

- **产品**：[百度文心一格 / 千帆大模型平台 - 图像生成](https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Nlks5kzha)
- **能力**：文生图为主，部分模型支持以图为参考的生成/编辑，可做线稿、草图类需求。
- **计费**：按调用量计费，需在百度智能云开通。
- **集成方式**：调用对应图生图/编辑 API，传入图片与提示词；需在后端新增百度图生图路由。

---

## 4. OpenAI DALL·E 2 / 3（Edit / Variations）

- **产品**：[DALL·E API](https://platform.openai.com/docs/guides/images)（Images API 中的 edit 与 variations）
- **能力**：Edit 支持「原图 + 提示词」生成新图，适合线稿上色、局部重绘。
- **计费**：按分辨率与张数计费，需 OpenAI 账号并开通 API。
- **集成方式**：使用 `image`（文件或 Base64）+ `prompt` 调用 Edit 接口；需在后端增加 OpenAI 图生图分支。

---

## 5. Stability AI（已集成）

- **产品**：[Stability AI API](https://platform.stability.ai/docs/api-reference)（text-to-image / image-to-image）
- **能力**：Stable Diffusion XL 文生图 + 图生图，非常适合线稿→成图、草图→精细图，可调「生成自由度」控制变化程度。
- **计费**：按积分/张数计费，新账号有免费额度；密钥见 [API Keys](https://platform.stability.ai/account/keys)。
- **本平台**：在「图片生成」Tab 选择 API 服务商 **Stability AI** 即可。需在 `config/.env` 中设置 **`STABILITY_API_KEY`**（Bearer 密钥）。

---

## 6. Replicate（多模型托管）

- **产品**：[Replicate](https://replicate.com/)（托管多种图生图/线稿上色模型）
- **能力**：可调用社区上的线稿上色、草图成图类模型（如 ControlNet、Scribble 等），按模型计费。
- **计费**：按模型与运行时长计费。
- **集成方式**：通过 Replicate HTTP API 调用对应 model 的 predict，传入图片与参数；需在后端增加 Replicate 代理。

---

## 使用建议

- **本平台当前**：图生图使用**腾讯云混元图像风格化**，与文生图共用密钥，在「图片生成」Tab 选择「线稿/草图→成品图」并上传图片即可。
- **扩展其他厂商**：在 `backend/proxy.js` 的 `/api/image-proxy` 中，当 `mode === 'img2img'` 时按 `provider` 分支调用上述任一家 API，并统一返回 `image_url` 即可。
- **成本控制**：优先在控制台查看各家的按量定价与免费额度，再决定接入顺序；演示或轻量使用可继续使用腾讯云或 mock 图生图。
