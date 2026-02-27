# Notion Image Worker 🚀

Notion Image Worker 是一个基于 Notion Workers Alpha 框架开发的非官方 AI 工具，旨在无缝整合 Notion AI 与 Google Gemini 的图像生成能力。

本项目将简单的图像描述转换为包含全面细节（人物、环境、光影效果、相机参数等）的高质量“Nano Banana Pro”提示词，随后直接生成精美图片，并利用 Notion API 原生无痕地将该图片以及详细说明插回你的 Notion 页面中。

## 🌟 核心特性
1. **自动扩展绘画提示词 (Prompt Expansion)**：结合当前业内沉淀的 Nano Banana Pro 高端提示词模板，通过 `gemini-2.5-flash` 将极其简短的想法扩写为专业级的摄影/插画参数。
2. **文本到图像直出 (Text-to-Image)**：对接 Gemini Imagen（如 `imagen-3.0-generate-002`）模型引擎直接生成图像数据。
3. **原生无缝嵌入 (Native Image Blocks)**：利用 `@notionhq/client` 直接转换图像原始字节成为 Base64 Data URI，在 Notion 对应的页面（Page）生成原生的 Image Block 和富文本块，彻底无需依赖繁琐的第三方图床！

---

## 🛠️ 前置条件

1. **Notion 开发者集成 (Notion Integration)**
   - 前往 [Notion Integrations](https://www.notion.so/my-integrations) 页面创建一个新的集成 (Integration)。
   - 记录下 `Internal Integration Secret` (即下文的 `NOTION_API_KEY`)。
   - **非常重要**：确保在 Notion 应用中，向你要插入图片的具体页面（Page）邀请并添加该集成！

2. **Google Gemini API Key**
   - 前往 Google AI 开发平台申请你自己的 Gemini API Key。

3. **Node.js 和 npm 环境**
   - 依赖 Node `>=22.0.0` 及现代版的 npm。

---

## 🚀 本地开发与部署运行

### 1. 安装依赖
克隆项目后运行：
\`\`\`bash
npm install
\`\`\`

### 2. 环境配置
使用 Notion 官方的 Workers CLI (ntn) 或者在项目根目录手动新建 `.env` 文件：
\`\`\`env
# 核心所需的环境变量
GEMINI_API_KEY=your_google_gemini_api_key_here
NOTION_API_KEY=your_notion_integration_secret_here

# (可选) 模型配置参数
GEMINI_PROMPT_MODEL=gemini-3-flash
GEMINI_IMAGE_MODEL=imagen-3.0-generate-002
\`\`\`
*注：你也可以通过 `ntn workers env set <KEY>=<VALUE>` 来安全地管理部署用的机密数据。*

### 3. 本地编译
\`\`\`bash
npm run build
\`\`\`

### 4. 登录和部署到 Notion AI
使用官方 CLI 将该工具部署并注册入您的 Notion 工作区：
\`\`\`bash
npm i -g ntn
ntn login
ntn workers deploy
\`\`\`

---

## 💻 如何在 Notion 中使用它？

1. 打开 Notion，在你授权给 Integration 的页面（Page）中呼出 **Notion AI** (例如按下空格键或点击 AI 星星图标)。
2. 选择 **"Connect a tool"**（连接一个工具），你会看到已经部署就绪的 `Generate Nano Banana Image` 工具。
3. 对 AI 提出生成指令，**必须提供当前页面的 ID (page_id)**，例如：
   > "请帮我画一只戴着赛博朋克墨镜的橘猫。这是当前页面ID：xxxxxx"
4. AI 会调用工具进行扩展、生成并上传，完成后图片会自动附带扩展后的 Prompt 作为块状元素出现在文章中！

## 📄 注意事项
- 由于直接原生转化 `base64` Data URI 并回传到页面里，图片如果过于复杂文件可能会轻微受限于 Notion SDK 的 Block 支持上限。建议商业或持久化项目，可修改 `src/index.ts` 接入 AWS S3/Cloudinary/自定义图床换回固定公网链接。

## 📜 许可证
遵循 MIT 许可证开放源码。
