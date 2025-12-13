# RakuRip 浏览器插件复刻版 - 详细实现计划

## 1. 项目概述 (Overview)
本项目旨在开发一个跨浏览器（Chrome & Firefox）插件，通过 AI（OpenAI & Gemini）辅助 Rakuten RMS 的评论回复（Review）和咨询回复（Inquiry）。
核心目标是**无需模拟登录**，直接利用浏览器当前 Session，实现由 AI 自动生成回复草稿并填入页面。

**项目名称**: `rakutentools`  
**项目目录**: 应创建在 `/home/uo/uomain/rakutentools/extension/` 子目录下，避免根目录混乱。

## 2. 技术栈 (Tech Stack)
-   **Framework**: [Plasmo](https://docs.plasmo.com/) (React + TypeScript)
-   **UI Library**: Tailwind CSS, Headless UI (可选)
-   **State/Storage**: Plasmo Storage (chrome.storage 封装)
-   **AI SDK**:
    -   `openai` (Official Node/Browser SDK)
    -   `@google/generative-ai` (Gemini SDK)
-   **Build Target**: Chrome (Manifest V3), Firefox (Manifest V2/V3)

## 3. 详细开发阶段 (Development Phases)

### 第一阶段：项目初始化 (Initialization)
1.  **创建项目目录**: 在根目录下创建 `extension/` 子目录。
2.  **脚手架搭建**: 在 `extension/` 目录中使用 Plasmo CLI 初始化 React + TS 项目。
    ```bash
    cd /home/uo/uomain/rakutentools
    mkdir extension
    cd extension
    pnpm create plasmo --with-react
    ```
3.  **配置项目名称**: 在 `package.json` 中设置 `name: "rakutentools"`。
4.  **样式配置**: 集成 Tailwind CSS，确保 Content Script 样式隔离（Shadow DOM）。
5.  **多浏览器配置**: 在 `package.json` 配置 Chrome 和 Firefox 的构建目标。

**阶段测试**:
- [ ] 运行 `pnpm dev` 确保开发服务器正常启动
- [ ] 在 Chrome (`chrome://extensions`) 加载开发版本，验证插件显示正常
- [ ] 在 Firefox (`about:debugging`) 加载临时扩展，验证基础功能
- [ ] 检查 Tailwind 样式是否正确编译（查看 `build/` 目录）

### 第二阶段：核心服务层 (Core Services - Background)
1.  **配置存储 (Storage Service)**:
    -   设计数据结构存储 API Keys (OpenAI/Gemini)。
    -   存储用户自定义 Prompts (Review Prompt / Inquiry Prompt)。
2.  **LLM 适配器模式 (LLM Service)**:
    -   定义 `LLMProvider` 接口 (`generateReply(context, prompt)`)。
    -   实现 `OpenAIProvider`：调用 GPT-4o-mini / GPT-3.5-turbo。
    -   实现 `GeminiProvider`：调用 Gemini Pro API。
    -   实现 `ModelFactory`：根据用户设置动态切换。
3.  **消息通信**: 建立 Content Script <-> Background 的通信机制，处理跨域请求。

**阶段测试**:
- [ ] 编写单元测试验证 `StorageService` 的 get/set 功能
- [ ] 使用 mock API 测试 `OpenAIProvider` 和 `GeminiProvider`
- [ ] 验证 Background Script 能正确接收并响应来自 Content Script 的消息
- [ ] 测试错误处理：API Key 无效、网络超时等场景

### 第三阶段：设置与管理界面 (Settings UI)
1.  **Popup 页**: 简单的开关（开启/暂停插件），状态显示（当前连接的模型）。
2.  **Options 页 (核心)**:
    -   **API 设置**: 输入框管理 OpenAI Key 和 Gemini Key。
    -   **模型选择**: 下拉框选择默认使用的 AI 模型。
    -   **提示词编辑器 (Prompt Editor)**:
        -   Tab 页切换：[商品评价 Prompt] | [R-Messe 咨询 Prompt]
        -   支持变量插入：`{{review_content}}`, `{{product_name}}`, `{{buyer_name}}`
        -   一键恢复默认 (Reset to Default)。

**阶段测试**:
- [ ] 验证 API Key 保存到 `chrome.storage.local` 并能正确读取
- [ ] 测试 Prompt 编辑、保存和恢复默认功能
- [ ] 验证模型选择切换后，Background Script 使用正确的 Provider
- [ ] UI 测试：检查在不同浏览器下的样式一致性

### 第四阶段：业务逻辑注入 (Business Logic - Content Scripts)
这个阶段将针对 Rakuten 的两个不同子系统编写注入逻辑。

#### A. 商品评价页 (Reviews)
-   **Target URL**: `https://review.rms.rakuten.co.jp/*`
-   **DOM 分析**:
    -   定位每条评论的容器。
    -   提取：买家评论文本、评分 (Star Rating)、商品标题。
    -   定位：商铺回复输入框 (`textarea`)。
-   **UI 注入**:
    -   使用 Plasmo `CSUI` (Content Script UI) 在回复框上方注入 "🤖 AI回复生成" 按钮。
-   **交互流程**:
    -   点击按钮 -> 按钮变 loading -> 调用 Background AI -> 获取文本 -> 填入 textarea -> 触发 input 事件(确保 React/Vue 框架能感知变化)。

#### B. 咨询页 (R-Messe Inquiry)
-   **Target URL**: `https://rmesse.rms.rakuten.co.jp/inquiry/*`
-   **DOM 分析**:
    -   定位聊天记录容器。
    -   提取：最新的一条买家消息。
-   **交互流程**:
    -   在发送框旁边注入 "✨ 智能回复" 按钮。
    -   逻辑同上，但使用 `Inquiry Prompt` 模板。

**阶段测试**:
- [ ] **Review 页面**:
    - [ ] 验证按钮是否正确注入到每条评论旁
    - [ ] 测试上下文提取：评论文本、评分、商品名是否准确
    - [ ] 测试 AI 回复生成和自动填入功能
    - [ ] 验证 textarea 的 `input` 事件是否触发（确保框架能感知）
- [ ] **Inquiry 页面**:
    - [ ] 验证按钮注入位置正确
    - [ ] 测试最新消息提取
    - [ ] 验证使用了正确的 Inquiry Prompt
- [ ] **跨页面测试**: 在两个页面间切换，确保插件能正确识别并加载对应逻辑

### 第五阶段：集成测试与发布 (Integration Testing & Delivery)
1.  **Chrome 完整测试**:
    -   在 Review 页面和 Inquiry 页面分别测试完整流程。
    -   测试网络异常、API 限流等边界情况。
2.  **Firefox 完整测试**:
    -   验证 Firefox 下的 API 兼容性（尤其是 `browser.storage` vs `chrome.storage`）。
    -   测试 Container 环境下的运行情况。
3.  **性能测试**:
    -   测试同时处理多条评论的性能。
    -   检查插件对页面加载速度的影响（使用 Lighthouse）。
4.  **安全审计**:
    -   确认 API Key 仅存储在本地，不会被发送到第三方。
    -   检查是否存在 XSS 风险（特别是动态注入的内容）。

**最终验收测试**:
- [ ] 在真实的 Rakuten RMS 环境中测试 Review 和 Inquiry 两个场景
- [ ] 验证 OpenAI 和 Gemini 两种模型都能正常工作
- [ ] 多浏览器测试：Chrome 和 Firefox 都能正常加载和运行
- [ ] 边界测试：未登录状态、API Key 错误、网络断开等
- [ ] 用户体验测试：Loading 状态、错误提示是否友好

## 4. 测试策略 (Testing Strategy)

### 单元测试 (Unit Tests)
-   **工具**: Vitest (Plasmo 内置支持)
-   **覆盖范围**:
    -   Storage Service 的 CRUD 操作
    -   LLM Provider 的请求/响应处理
    -   Prompt 模板变量替换逻辑

### 集成测试 (Integration Tests)
-   **工具**: Playwright (用于浏览器自动化测试)
-   **覆盖范围**:
    -   Content Script 的 DOM 操作
    -   Background <-> Content 通信
    -   完整的用户交互流程

### 手动测试清单
每次发布前必须手动验证以下流程：
1.  在 Chrome 和 Firefox 中分别安装插件
2.  登录 Rakuten RMS，访问 Review 和 Inquiry 页面
3.  测试 AI 回复生成的准确性和填入的流畅性
4.  测试设置页面的所有功能（保存、恢复默认等）

## 5. 数据安全与隐私
-   所有 API Key 仅存储在用户本地浏览器 (`chrome.storage.local`)，绝不上传到任何中间服务器。
-   仅在用户点击生成按钮时，才会将当前那一条评论发送给 AI 服务商。
