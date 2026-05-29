# Spine / Unity 导入说明

本平台导出的**精灵图 (PNG)**、**ZIP（按动作 / 按帧）** 和 **Credits** 可用于游戏引擎。以下说明如何导入 **Spine** 与 **Unity**。

---

## 一、导出物说明（参考 LPC 格式）

| 导出项 | 说明 |
|--------|------|
| **Spritesheet (PNG)** | 单张 PNG，所有动作帧按行排列（每行一个动作，从左到右为帧序）。透明背景，便于裁剪。 |
| **Credits (TXT)** | 纯文本署名清单，含生成时间、提示词、API 来源等，便于遵守使用条款。 |
| **Credits (JSON)** | 同上信息的机器可读格式，便于工具或管线使用。 |
| **ZIP 按动作** | 每个动作一个文件夹（如 `idle/`、`run/`），文件夹内为帧图 `0.png`, `1.png` … |
| **ZIP 按帧** | 所有帧平铺或按 `动作名_帧号.png` 命名，便于按需导入。 |

---

## 二、导入 Spine

1. **准备精灵图**
   - 使用本平台导出的 **Spritesheet (PNG)**，或使用 **ZIP 按动作** 中的单帧图在 Spine 外先拼成一张图（保持帧尺寸一致）。
   - 建议单帧尺寸统一（如 256×256 或 512×512），便于在 Spine 中设置「网格」或「切片」。

2. **在 Spine 中创建图集**
   - 打开 Spine → **Texture Atlas**（图集）→ 将导出的 PNG 添加为图集资源。
   - 若使用单张 Spritesheet：在 **Atlas** 中可自动或手动按网格切割为多张 **Region**（每帧一个 region）。
   - 若使用多张单帧：将每张图加入同一图集即可。

3. **绑定到骨骼并做动画**
   - 在 **Skeleton** 中为角色创建骨骼，将对应 region 挂到骨骼上。
   - 在 **Animation** 中按「动作」建立动画（如 idle、run、jump、attack），每一帧切换为对应 region，或使用网格序列。
   - 帧率与平台导出的「每动作帧数」一致即可（如 4 帧/动作、8 帧/动作）。

4. **导出与使用**
   - 导出为 Spine 的 `.skel` + 图集，在目标引擎（Unity / Cocos 等）中通过 Spine 官方 runtime 使用。

---

## 三、导入 Unity

### 方式 A：使用 Spritesheet 单张图

1. 将导出的 **Spritesheet (PNG)** 放入 Unity 项目（如 `Assets/Art/Character/`）。
2. 在 Inspector 中：
   - **Texture Type** 设为 **Sprite (2D and UI)**。
   - **Sprite Mode** 设为 **Multiple**。
   - 点击 **Sprite Editor**，按「每帧尺寸」做 **Slice**（如 512×512），或按行/列自动切分。
3. 应用后即可在场景中使用单个 Sprite，或通过 **Animation** 窗口切换不同 Sprite 做帧动画。

### 方式 B：使用 ZIP 按动作

1. 解压 **ZIP 按动作**，得到如 `idle/0.png, 1.png`、`run/0.png, 1.png` 等。
2. 将对应文件夹放入 Unity（如 `Assets/Art/Character/idle/`、`run/`）。
3. 每张图在 Inspector 中设为 **Sprite (2D and UI)**，**Sprite Mode** 可为 **Single**。
4. 在 **Animation** 窗口：
   - 为角色创建 **Animator** 与 **Animation Clip**（如 Idle、Run、Jump、Attack）。
   - 每个 Clip 内按帧添加关键帧，将 **Sprite Renderer.sprite** 切换为对应帧的 Sprite。

### 帧率与事件

- 本平台导出的「每动作帧数」（如 4 帧）可直接对应 Unity 中该动画的帧数；按需设置 **Sample Rate**（如 8 FPS）即可。
- 若需「攻击动作衔接待机」等事件，可在对应帧上添加 **Animation Event** 调用游戏逻辑。

---

## 四、署名与许可（Credits）

- 使用本平台生成素材时，请保留或附带导出的 **Credits (TXT)** 或 **Credits (JSON)**。
- 若使用或参考了 Liberated Pixel Cup (LPC) 等开源素材规范，请同时遵守其许可（如 CC-BY-SA、GPL）并注明出处。
- 本平台生成内容的具体许可以平台说明为准；商用前请确认 API 服务商（如腾讯云）的使用条款。

---

## 五、常见问题

- **透明背景**：导出 PNG 为 RGBA，透明处在 Spine/Unity 中会正常显示为透明。
- **尺寸不一致**：若各动作帧尺寸不一致，建议在导出前统一选择「单帧尺寸」，或在 Unity/Spine 中按最大尺寸留白后裁剪。
- **动作衔接**：提示词中可写明「攻击动作需衔接待机」等，以提升生成连贯性；导入引擎后可在时间轴上微调关键帧。

---

*本文档随本平台导出格式更新而更新。最后更新：与当前「角色动作组」功能一致。*
