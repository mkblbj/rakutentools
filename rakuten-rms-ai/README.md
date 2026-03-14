# 評価返信AI

基于 Plasmo 框架开发的浏览器扩展，支持 Chrome 和 Firefox。

## 功能特性

- 🤖 AI 自动生成回复（支持 OpenAI 和 Gemini）
- 📝 自定义 Prompt 模板
- 🔄 多浏览器支持（Chrome + Firefox）
- 🎯 针对评价回复的智能场景

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（Chrome）
pnpm dev

# 构建生产版本
pnpm build

# 构建 Firefox 版本
pnpm build:firefox
```

## 加载扩展

### Chrome
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 目录

### Firefox
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时加载附加组件"
3. 选择 `build/firefox-mv2-dev/manifest.json`

## 配置

1. 点击扩展图标打开 Popup
2. 点击"打开设置"
3. 配置你的 API Key
4. 自定义 Prompt 模板（可选）

## 项目结构

```
src/
├── background/        # 后台服务
│   └── index.ts      # Background Service Worker
├── contents/         # Content Scripts
│   └── review.tsx    # 评价页面注入
├── popup.tsx         # Popup 页面
├── options.tsx       # 设置页面
└── style.css         # 全局样式
```

## 技术栈

- [Plasmo](https://docs.plasmo.com/) - 浏览器扩展框架
- React 19 + TypeScript
- Tailwind CSS
- Chrome Extension API / WebExtensions API

