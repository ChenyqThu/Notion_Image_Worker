# Notion Image Worker

基于 [Notion Workers (alpha)](https://developers.notion.com/) 框架开发的 AI 图像生成工具，将 Notion AI 与 Google Gemini 图像生成能力无缝整合。

输入简短的图像描述，自动扩展为专业级 "Nano Banana Pro" 提示词，生成高质量图片，并通过 Notion File Upload API 原生嵌入到你的页面中。

> **Warning**
> Notion Workers 目前为 alpha 阶段，需要工作区管理员开启 Custom Agents 功能。

## 核心特性

- **提示词扩展** — 通过 Gemini 文本模型将简短描述扩写为包含场景、主体、环境、光影、镜头参数的专业提示词
- **图像生成** — 对接 Gemini Image 模型直接生成图像数据
- **原生嵌入** — 使用 Notion File Upload API 上传图片，无需第三方图床，图片永久保存在 Notion 中

## 前置条件

1. **Notion Integration** — 在 [My Integrations](https://www.notion.so/my-integrations) 创建集成，获取 `Internal Integration Secret`，并将集成添加到目标页面
2. **Gemini API Key** — 从 [Google AI Studio](https://aistudio.google.com/) 获取
3. **Node.js** >= 22.0.0, **npm** >= 10.9.2

## 快速开始

```shell
# 安装依赖
npm install

# 配置环境变量（编辑填入你的 API Keys）
cat > .env << 'EOF'
GEMINI_API_KEY=your_google_gemini_api_key_here
NOTION_API_KEY=your_notion_integration_secret_here
EOF

# 编译
npm run build

# 安装 Notion CLI 并部署
npm i -g ntn
ntn login
ntn workers deploy

# 推送环境变量到远端
ntn workers env set GEMINI_API_KEY=your_key
ntn workers env set NOTION_API_KEY=your_key
```

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `GEMINI_API_KEY` | 是 | — | Google Gemini API 密钥 |
| `NOTION_API_KEY` | 是 | — | Notion Integration Secret |
| `GEMINI_PROMPT_MODEL` | 否 | `gemini-2.5-flash` | 提示词扩展模型 |
| `GEMINI_IMAGE_MODEL` | 否 | `gemini-3.1-flash-image-preview` | 图像生成模型 |
| `GEMINI_IMAGE_ASPECT_RATIO` | 否 | `1:1` | 图像宽高比 |
| `GEMINI_IMAGE_SIZE` | 否 | — | 默认分辨率档位（`1K`/`2K`/`4K`） |

## 使用方法

1. 在 Notion 中打开已授权集成的页面，呼出 **Notion AI**
2. 选择 **Connect a tool** > **Generate Nano Banana Image**
3. 提供描述和页面 ID，例如：

   > "画一只戴着赛博朋克墨镜的橘猫，页面ID：abc123..."

4. 工具自动完成：提示词扩展 → 图像生成 → 上传嵌入，图片和扩展后的 Prompt 会出现在页面中

### 控制插入位置

- 传入 `target_block_id` 可将图片插入到指定 block 下方（作为子块）
- 不传则默认追加到 `page_id` 页面末尾
- 建议 Agent 调用时：若用户指定了位置，解析并传 `target_block_id`；否则仅传 `page_id`

### 控制比例与分辨率（可由 Agent 决策）

- 可选参数：
  - `aspect_ratio`: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`
  - `image_size`: `1K`, `2K`, `4K`
- 推荐规则：
  - 用户提到竖图/手机壁纸：`aspect_ratio=9:16`
  - 用户提到横幅/风景：`aspect_ratio=16:9`
  - 未指定时：使用默认 `1:1`
  - 快速低成本：`image_size=1K`；高质量：`2K`；高清细节：`4K`

## 开发命令

```shell
npm run build                          # 编译 TypeScript
npm run check                          # 类型检查
ntn workers deploy                     # 部署到 Notion
ntn workers exec generateNanoBananaImage --local -d '{"short_description":"a cat","page_id":"xxx"}'  # 本地测试
ntn workers runs list                  # 查看运行记录
ntn workers runs logs <runId>          # 查看运行日志
```

## 架构

```
src/
├── index.ts    # Worker 入口，工具定义，Notion File Upload 集成
└── gemini.ts   # Gemini API 封装（提示词扩展 + 图像生成）
```

**执行流程：**
```
用户描述 → expandPrompt() → generateImage() → uploadImageToNotion() → 追加 Notion 块
```

## 许可证

MIT
