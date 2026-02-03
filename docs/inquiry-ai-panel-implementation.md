# 问询 AI 面板重构实施方案

## 概述

将现有的「UO AI 按钮 + 输入框」升级为嵌入式 AI 聊天助手面板，支持多轮对话、流式响应、按问询隔离会话。

## 技术栈

| 组件 | 技术选型 |
|------|---------|
| 框架 | Plasmo (现有) |
| 悬浮窗口 | `react-rnd` (拖动+缩放) |
| 聊天 UI | `@ant-design/x` |
| AI 后端 | OpenAI-compatible API (现有 CustomProvider 架构) |
| 流式响应 | SSE (Server-Sent Events) |
| 状态管理 | React useState + Context |
| 持久化 | chrome.storage.local (按问询番号) |

## 复用现有架构

### 保持不变的部分
- `CustomProvider` 的 base URL + API Key 配置机制
- `StorageService` 的设置存储
- `options.tsx` 中的配置 UI

### 新增/修改的部分
- 新增 `CustomProvider.generateReplyStream()` 方法支持流式响应
- 面板内增加模型选择下拉框
- 新增聊天专用的消息格式（多轮对话）

## 功能需求

### 核心功能

1. **悬浮面板**
   - 可拖动、可缩放
   - 默认位置：页面右下角
   - 记住用户调整的位置和大小

2. **多轮对话**
   - 支持追问、修改、迭代
   - 自动携带问询上下文
   - 流式响应（打字机效果）

3. **按问询隔离**
   - 每个问询番号独立会话
   - 切换问询自动切换会话
   - 会话持久化到 storage

4. **填充功能**
   - 每条 AI 消息有「填充到回复框」按钮
   - 点击后自动填充到页面的回复 textarea

5. **模型选择**
   - 面板顶部显示当前模型
   - 可切换模型（复用现有 CustomProvider 配置）
   - 支持从 API 获取可用模型列表

### 上下文信息

自动注入的问询上下文（现有 `extractInquiryData`）：
- 问询番号 (inquiryNumber)
- 问询类别 (category)
- 客户姓名 (customerName)
- 问询内容 (inquiryContent)
- 受付时间 (receivedTime)
- 订单号 (orderNumber)

## 文件结构

```
rakuten-rms-ai/src/
├── contents/
│   ├── inquiry.tsx              # 重构：面板入口按钮
│   └── inquiry-panel/           # 新增：面板组件目录
│       ├── index.tsx            # 面板主组件（Rnd 容器）
│       ├── ChatPanel.tsx        # 聊天面板（ant-design/x）
│       ├── PanelHeader.tsx      # 面板头部（模型选择、关闭按钮）
│       ├── MessageItem.tsx      # 消息条目（含填充按钮）
│       ├── hooks/
│       │   ├── useChat.ts       # 聊天逻辑 hook（多轮对话状态）
│       │   ├── useStreamChat.ts # 流式响应 hook
│       │   └── useInquiryContext.ts  # 问询上下文 hook
│       └── styles.ts            # 样式（Shadow DOM 兼容）
├── services/
│   ├── providers/
│   │   └── custom.ts            # 修改：新增 generateReplyStream 方法
│   └── chat-service.ts          # 新增：聊天服务（封装流式调用）
├── background/
│   └── index.ts                 # 修改：新增流式消息处理
└── types/
    ├── index.ts                 # 修改：新增聊天相关类型
    └── chat.ts                  # 新增：ChatMessage, ChatSession 类型
```

## 实施阶段

### Phase 1: 基础设施 (1)

**目标**: 搭建悬浮窗口骨架

**任务**:
- [ ] 1.1 安装依赖 (`react-rnd`, `@ant-design/x`)
- [ ] 1.2 创建 `inquiry-panel/index.tsx` 悬浮窗口容器
- [ ] 1.3 重构 `inquiry.tsx`，将按钮改为打开面板
- [ ] 1.4 实现窗口位置/大小持久化

**验收**:
- 点击按钮可打开/关闭悬浮面板
- 面板可拖动、可缩放
- 刷新后位置保持

### Phase 2: 聊天 UI (2)

**目标**: 集成 @ant-design/x 聊天组件

**任务**:
- [ ] 2.1 创建 `ChatPanel.tsx`，集成 Bubble、Sender
- [ ] 2.2 创建 `MessageItem.tsx`，添加「填充」按钮
- [ ] 2.3 实现消息列表渲染
- [ ] 2.4 实现输入框和发送功能

**验收**:
- 可以输入消息并显示
- UI 样式正常
- 「填充」按钮可点击

### Phase 3: AI 集成 (3)

**目标**: 接入 OpenAI-compatible 流式 API（复用现有 CustomProvider）

**任务**:
- [ ] 3.1 扩展 `CustomProvider`，新增 `generateReplyStream()` 方法
- [ ] 3.2 Background 新增流式消息处理（使用 chrome.runtime port 长连接）
- [ ] 3.3 创建 `useStreamChat.ts` hook，处理 SSE 流
- [ ] 3.4 创建 `useChat.ts` hook，管理多轮对话状态
- [ ] 3.5 实现流式响应渲染（打字机效果）
- [ ] 3.6 实现错误处理、中断、重试

**技术细节**:
```typescript
// CustomProvider.generateReplyStream() 核心逻辑
async *generateReplyStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const response = await fetch(`${this.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
    body: JSON.stringify({ model: this.model, messages, stream: true })
  })
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    // 解析 SSE: data: {"choices":[{"delta":{"content":"..."}}]}
    yield parseSSEChunk(chunk)
  }
}
```

**验收**:
- 发送消息能收到 AI 回复
- 回复以流式方式逐字显示
- 可中断正在生成的回复
- 网络错误有提示

### Phase 4: 上下文与模型选择 (4)

**目标**: 问询上下文自动注入 + 模型选择功能

**任务**:
- [ ] 4.1 创建 `useInquiryContext.ts`，整合 extractInquiryData
- [ ] 4.2 实现系统 prompt 注入问询上下文（作为对话首条 system message）
- [ ] 4.3 面板头部显示当前问询摘要（番号、客户名、类别）
- [ ] 4.4 实现「填充到回复框」功能
- [ ] 4.5 面板头部添加模型选择下拉框
- [ ] 4.6 复用 `CustomProvider.fetchModels()` 获取可用模型列表

**系统 Prompt 结构**:
```typescript
const systemMessage = {
  role: "system",
  content: `你是一个日本电商客服助手。

当前问询信息：
- 问询番号: ${inquiryNumber}
- 客户姓名: ${customerName}
- 问询类别: ${category}
- 问询内容: ${inquiryContent}
- 订单号: ${orderNumber}

请根据以上信息，用专业、礼貌的日语回复客户。`
}
```

**验收**:
- AI 能感知当前问询内容
- 生成的回复与问询相关
- 点击填充能正确填入
- 可切换模型，切换后新对话使用新模型

### Phase 5: 会话持久化 (5)

**目标**: 按问询隔离会话

**任务**:
- [ ] 5.1 设计 storage 数据结构
- [ ] 5.2 实现会话保存/加载逻辑
- [ ] 5.3 实现问询切换时自动切换会话
- [ ] 5.4 实现清空会话功能

**验收**:
- 刷新页面对话不丢失
- 不同问询有独立会话
- 可以清空当前会话

### Phase 6: 测试与优化 (6)

**目标**: 确保稳定可用

**任务**:
- [ ] 6.1 编写单元测试（hooks、utils）
- [ ] 6.2 编写 E2E 测试（Playwright）
- [ ] 6.3 性能优化（虚拟滚动、懒加载）
- [ ] 6.4 移除旧的 inquiry.tsx 代码
- [ ] 6.5 更新文档

**验收**:
- 测试覆盖率 > 70%
- 无明显性能问题
- 文档完整

## 测试策略

### 单元测试 (Vitest)

```typescript
// __tests__/hooks/useChat.test.ts
describe('useChat', () => {
  it('should add user message', () => {})
  it('should handle streaming response', () => {})
  it('should handle error', () => {})
})

// __tests__/utils/openai-stream.test.ts
describe('openaiStream', () => {
  it('should parse SSE chunks', () => {})
  it('should handle abort', () => {})
})
```

### E2E 测试 (Playwright)

```typescript
// e2e/inquiry-panel.spec.ts
test('should open panel on button click', async () => {})
test('should send message and receive response', async () => {})
test('should fill reply textarea', async () => {})
test('should persist conversation', async () => {})
```

### 手动测试清单

- [ ] 在真实问询页面打开面板
- [ ] 发送消息并观察流式响应
- [ ] 点击填充按钮
- [ ] 刷新页面检查会话恢复
- [ ] 切换不同问询检查会话隔离
- [ ] 拖动和缩放面板
- [ ] 关闭面板再打开

## 数据结构

### 聊天消息类型 (types/chat.ts)

```typescript
// 聊天消息
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: 'pending' | 'streaming' | 'done' | 'error'
}

// 会话存储结构
interface ChatSession {
  inquiryNumber: string
  messages: ChatMessage[]
  model: string              // 使用的模型
  createdAt: number
  updatedAt: number
}

// Storage key: `inquiry_chat_${inquiryNumber}`
```

### 面板状态

```typescript
interface PanelState {
  isOpen: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  selectedModel?: string     // 当前选择的模型
}

// Storage key: `inquiry_panel_state`
```

### 流式消息协议 (Background ↔ Content Script)

```typescript
// Content Script → Background: 开始聊天
interface StartChatRequest {
  action: 'start_chat_stream'
  data: {
    messages: ChatMessage[]
    model?: string           // 可选，不传则用默认
  }
}

// Background → Content Script: 流式响应（通过 Port）
interface StreamChunk {
  type: 'chunk' | 'done' | 'error'
  content?: string           // type=chunk 时的内容片段
  error?: string             // type=error 时的错误信息
}
```

## 依赖安装

```bash
cd rakuten-rms-ai

# 核心依赖
pnpm add react-rnd @ant-design/x

# ant-design/x 的 peer dependencies
pnpm add antd @ant-design/icons dayjs

# 测试依赖
pnpm add -D @testing-library/react vitest @vitest/coverage-v8
```

## 关键实现代码片段

### 流式响应解析 (services/stream-parser.ts)

```typescript
/**
 * 解析 OpenAI SSE 流
 */
export function parseSSELine(line: string): string | null {
  if (!line.startsWith('data: ')) return null
  if (line === 'data: [DONE]') return null
  
  try {
    const json = JSON.parse(line.slice(6))
    return json.choices?.[0]?.delta?.content || null
  } catch {
    return null
  }
}

/**
 * 从 ReadableStream 读取并解析 SSE
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      const content = parseSSELine(line.trim())
      if (content) yield content
    }
  }
}
```

### Background Port 通信 (background/index.ts)

```typescript
// 处理流式聊天请求
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'chat_stream') return
  
  port.onMessage.addListener(async (request: StartChatRequest) => {
    try {
      const provider = await ModelFactory.createCurrentProvider()
      const stream = provider.generateReplyStream(request.data.messages)
      
      for await (const chunk of stream) {
        port.postMessage({ type: 'chunk', content: chunk })
      }
      port.postMessage({ type: 'done' })
    } catch (error) {
      port.postMessage({ type: 'error', error: error.message })
    }
  })
})
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| @ant-design/x 与 Plasmo Shadow DOM 样式冲突 | 使用 `ConfigProvider` + `StyleProvider` 注入样式到 Shadow DOM |
| 流式响应在 content script 中受限 | 使用 `chrome.runtime.connect()` Port 长连接，由 background 中转 |
| 会话数据过大 | 限制每个会话最多 50 条消息，超出自动清理最旧的 |
| 模型列表获取失败 | 缓存上次成功获取的列表，失败时使用缓存 |
| 网络中断导致流式响应卡死 | 设置 30s 超时，超时自动断开并提示 |

## Shadow DOM 样式注入方案

```tsx
// inquiry-panel/index.tsx
import { ConfigProvider, App } from 'antd'
import { StyleProvider, createCache } from '@ant-design/cssinjs'

const InquiryPanel = ({ shadowRoot }: { shadowRoot: ShadowRoot }) => {
  // 创建样式缓存，指向 Shadow DOM
  const cache = useMemo(() => createCache(), [])
  
  return (
    <StyleProvider container={shadowRoot} cache={cache}>
      <ConfigProvider
        getPopupContainer={() => shadowRoot as any}
        theme={{ token: { colorPrimary: '#2478AE' } }}
      >
        <App>
          <ChatPanel />
        </App>
      </ConfigProvider>
    </StyleProvider>
  )
}
```

## 时间线（参考）

- Phase 1-2: 基础 UI 框架
- Phase 3-4: AI 功能集成
- Phase 5-6: 持久化与测试

## 下一步

确认本方案后，从 Phase 1 开始实施。
