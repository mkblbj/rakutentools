# RakuRip Extension 开发任务清单

**项目名称**: rakutentools  
**项目路径**: `/home/uo/uomain/rakutentools/extension/`

## Phase 1: 初始化与环境搭建
- [ ] 创建 `extension/` 子目录
- [ ] 在 `extension/` 中初始化 Plasmo 项目 (React + TS)
- [ ] 配置 `package.json` 中的项目名称为 `rakutentools`
- [ ] 配置 Tailwind CSS
- [ ] 配置 Manifest (Permissions: storage, activeTab, scripting, host_permissions)
- [ ] 创建基础目录结构 (`src/background`, `src/components`, `src/contents`)
- [ ] **测试**: 在 Chrome 和 Firefox 中加载插件，验证基础功能

## Phase 2: 核心功能 (Background & Storage)
- [ ] 实现 `StorageService`: 封装 API Key 和 Prompt 的 CRUD
- [ ] 定义 `LLMProvider` 接口
- [ ] 实现 `GeminiProvider` (调用 Google API)
- [ ] 实现 `OpenAIProvider` (调用 OpenAI API)
- [ ] 实现 `Background` 消息监听器 (`onMessage` 处理 `generate_reply`)
- [ ] **测试**:
    - [ ] 编写单元测试验证 StorageService 功能
    - [ ] 使用 mock 数据测试两个 Provider
    - [ ] 验证 Background Script 消息通信

## Phase 3: 设置页面 (Options UI)
- [ ] 创建 Options 页面布局 (Sidebar + Main Content)
- [ ] 实现 "API 设置" 模块 (输入框 + 保存/验证)
- [ ] 实现 "Prompt 编辑器" 模块
    - [ ] 文本域：支持变量高亮或说明
    - [ ] 重置按钮功能
- [ ] **测试**:
    - [ ] 验证 API Key 保存和读取
    - [ ] 测试 Prompt 编辑和恢复默认
    - [ ] UI 在 Chrome/Firefox 中的样式一致性

## Phase 4: 业务注入 (Content Scripts)
- [ ] **Review 页面注入**
    - [ ] 编写 DOM 选择器 (定位评论和输入框)
    - [ ] 创建 `AIReviewButton` 组件
    - [ ] 实现点击提取上下文 (`text`, `rating`)
    - [ ] 实现文本回填 (`textarea.value` + `dispatchEvent`)
- [ ] **测试**:
    - [ ] Review 页：验证按钮注入、上下文提取、文本填入
    - [ ] 测试 textarea 的 input 事件触发

## Phase 5: 集成测试与优化
- [ ] **Chrome 集成测试**
    - [ ] 在真实 Review 页面测试完整流程
    - [ ] 测试 OpenAI 和 Gemini 模型切换
- [ ] **Firefox 集成测试**
    - [ ] 验证 API 兼容性（browser.* vs chrome.*）
    - [ ] 测试 Container 环境运行
- [ ] **边界测试**
    - [ ] API Key 错误/网络错误处理
    - [ ] 未登录状态检测
    - [ ] Prompt 变量为空处理
- [ ] **性能测试**
    - [ ] 测试同时处理多条评论
    - [ ] 使用 Lighthouse 检查页面性能影响
- [ ] **安全审计**
    - [ ] 确认 API Key 仅存储本地
    - [ ] 检查 XSS 风险
- [ ] Loading 状态与 UI 优化
