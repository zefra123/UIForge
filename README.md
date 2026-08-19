# UIForge — AI 组件工坊

> 输入一句自然语言，AI 为你生成可运行的 React + Tailwind 组件，代码实时编辑、画布即时预览。

基于 [rapidpages](https://github.com/rapidpages/rapidpages)（MIT）二次开发魔改。原项目为 AI 生成 UI 的 Web 应用，本仓库在此基础上完成了：无登录体验、全中文界面、UIForge 品牌、动态粒子背景、以及完整的安全加固。

## ✨ 功能

- 🧠 **AI 生成组件**：中文自然语言描述 → AI（OpenAI 兼容接口）生成 TSX 组件
- 📝 **代码编辑**：CodeMirror 实时编辑，浏览器内 Babel 编译
- 🖥 **实时预览**：iframe 沙箱渲染（`sandbox="allow-scripts"` 隔离，AI 代码不可访问父页面）
- 🎨 **动态界面**：canvas 粒子背景、framer-motion 动画、生成成功彩带
- 🔒 **安全加固**：无登录权限隔离（匿名 clientId）、接口限流、输入长度校验、iframe sandbox

## 🛠 技术栈

Next.js 13 · React 18 · TypeScript · Tailwind CSS · tRPC · Prisma (SQLite) · CodeMirror · Babel standalone · framer-motion · canvas-confetti

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置模型服务（OpenAI 兼容接口，支持中转站 / DeepSeek 等）
cp .env.example .env
# 填写：OPENAI_API_KEY、OPENAI_BASE_URL（如 https://api.deepseek.com/v1）、OPENAI_MODEL

# 3. 初始化数据库
node node_modules/prisma/build/index.js db push

# 4. 启动
node node_modules/next/dist/bin/next dev
# 打开 http://localhost:3000
```

## 🔧 环境变量

| 变量 | 说明 |
|---|---|
| `OPENAI_API_KEY` | OpenAI 兼容接口的 Key |
| `OPENAI_BASE_URL` | 接口地址（中转站或 DeepSeek，需带 /v1） |
| `OPENAI_MODEL` | 模型名（默认 gpt-4-0613，可填 claude-sonnet-4-6 等） |
| `DATABASE_URL` | SQLite 路径（默认 file:./dev.db） |

## 🔒 安全说明

- 匿名用户通过本地生成的 clientId 隔离归属，只能修改/复制自己的组件
- 匿名仅能浏览 PUBLIC 组件
- 所有写接口有调用频率限制（内存限流）
- 预览 iframe 使用 `sandbox="allow-scripts"`，AI 生成的代码无法访问父页面 Cookie / localStorage / 同源 API
- AI 生成代码存在语法错误时显示友好错误提示，不崩溃页面

## 📄 License

MIT（原项目 rapidpages 为 MIT）
