import { useRef, useEffect, useState } from "react"
import { DeleteOutlined, RobotOutlined, UserOutlined, CopyOutlined, FormOutlined } from "@ant-design/icons"
import { Button, message, Tooltip, Card, Space, Typography, Flex, Avatar } from "antd"
import { Bubble, Sender, Prompts } from "@ant-design/x"
import { useXChat, OpenAIChatProvider, XRequest } from "@ant-design/x-sdk"
import { StorageService } from "~services/storage"
import type { InquiryData } from "~utils/dom-selectors"

const { Text, Title } = Typography

interface ChatPanelProps {
  inquiryData: InquiryData | null
}

// OpenAI 消息类型
interface OpenAIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

// OpenAI 请求参数
interface OpenAIRequestParams {
  messages: OpenAIMessage[]
  model?: string
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

// 构建系统提示词
function buildSystemPrompt(inquiryData: InquiryData | null): string {
  if (!inquiryData) {
    return `你是一个专业的日本电商客服助手。请用礼貌、专业的日语回复客户问询。`
  }

  return `你是一个专业的日本电商客服助手。

当前问询信息：
- 问询番号: ${inquiryData.inquiryNumber || "未知"}
- 客户姓名: ${inquiryData.customerName || "未知"}
- 问询类别: ${inquiryData.category || "未知"}
- 问询内容: ${inquiryData.inquiryContent || "未知"}
- 订单号: ${inquiryData.orderNumber || "未知"}
- 受付时间: ${inquiryData.receivedTime || "未知"}

请根据以上信息，用专业、礼貌的日语回复客户。回复应该简洁明了，解决客户的问题。`
}

// 快捷提示选项
const promptItems = [
  { key: "1", label: "生成回复", description: "根据问询内容生成专业回复" },
  { key: "2", label: "礼貌道歉", description: "生成礼貌的道歉回复" },
  { key: "3", label: "确认订单", description: "确认订单信息并回复" },
  { key: "4", label: "物流查询", description: "回复物流配送相关问题" },
]

export const ChatPanel = ({ inquiryData }: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [providerReady, setProviderReady] = useState(false)
  const [providerError, setProviderError] = useState<string | null>(null)
  const [chatProvider, setChatProvider] = useState<OpenAIChatProvider<OpenAIMessage, OpenAIRequestParams> | null>(null)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [modelName, setModelName] = useState("gpt-4o-mini")

  // 异步初始化 OpenAI ChatProvider
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const storageProvider = await StorageService.getProvider()
        const apiKey = await StorageService.getApiKey(storageProvider)
        const baseUrl = await StorageService.getCustomBaseUrl()
        const model = await StorageService.getCustomModel()

        if (cancelled) return

        if (!apiKey) {
          setProviderError(`${storageProvider.toUpperCase()} API Key 未配置`)
          return
        }

        const sysPrompt = buildSystemPrompt(inquiryData)
        setSystemPrompt(sysPrompt)
        setModelName(model || "gpt-4o-mini")

        // 创建 XRequest，使用自定义 fetch 通过 Background 代理
        const request = XRequest<OpenAIRequestParams>(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          manual: true,
          // 注意：自定义 fetch 在浏览器扩展中可能无法正常工作
          // 我们将在 onRequest 中手动处理
        })

        const provider = new OpenAIChatProvider<OpenAIMessage, OpenAIRequestParams>({
          request,
        })

        if (!cancelled) {
          setChatProvider(provider)
          setProviderReady(true)
          setProviderError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setProviderError(error instanceof Error ? error.message : "初始化失败")
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [inquiryData])

  // 使用 useXChat hook
  const {
    messages,
    onRequest,
    isRequesting,
    abort,
    setMessages,
  } = useXChat<OpenAIMessage, OpenAIMessage, OpenAIRequestParams>({
    provider: chatProvider || undefined,
    requestPlaceholder: { role: "assistant", content: "" },
    requestFallback: (_, info) => ({
      role: "assistant",
      content: `错误: ${info.error?.message || "请求失败"}`,
    }),
  })

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 发送消息
  const handleSend = async (text: string) => {
    if (!text.trim() || isRequesting || !chatProvider) return
    setInputValue("")

    const userMessage: OpenAIMessage = { role: "user", content: text.trim() }
    const historyMessages = messages
      .filter((m) => m.status === "success")
      .map((m) => m.message)

    // 构建完整的消息列表
    const allMessages: OpenAIMessage[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      userMessage,
    ]

    onRequest({
      messages: allMessages,
      model: modelName,
      stream: true,
      temperature: 0.7,
      max_tokens: 4000,
    })
  }

  // 快捷提示点击
  const handlePromptClick = (info: { data: any }) => {
    const promptTexts: Record<string, string> = {
      "1": "请根据问询内容生成一个专业、礼貌的日语回复",
      "2": "请生成一个礼貌的道歉回复，表达我们对给客户带来不便的歉意",
      "3": "请确认订单信息并生成相应的回复",
      "4": "请生成一个关于物流配送查询的回复",
    }
    handleSend(promptTexts[info.data.key] || info.data.description)
  }

  // 填充到回复框
  const handleFillToReply = (content: string) => {
    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
    const replyTextarea = textareas.find((ta) => {
      const placeholder = ta.placeholder || ta.getAttribute("placeholder") || ""
      return placeholder.includes("返信") || placeholder.includes("記入")
    })

    if (replyTextarea) {
      replyTextarea.value = content
      replyTextarea.dispatchEvent(new Event("input", { bubbles: true }))
      replyTextarea.dispatchEvent(new Event("change", { bubbles: true }))
      replyTextarea.focus()
      message.success("已填充到回复框")
    } else {
      message.error("未找到回复输入框")
    }
  }

  // 清空消息
  const clearMessages = () => {
    abort()
    setMessages([])
  }

  // 构建气泡列表
  const bubbleItems = messages.map((msg) => {
    const isUser = msg.message.role === "user"
    const isLoading = msg.status === "loading"
    const isUpdating = msg.status === "updating"
    const isError = msg.status === "error"
    const displayContent = msg.message.content

    return {
      key: String(msg.id),
      placement: isUser ? "end" as const : "start" as const,
      loading: isLoading && !displayContent,
      content: displayContent,
      avatar: isUser
        ? <Avatar icon={<UserOutlined />} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} />
        : <Avatar icon={<RobotOutlined />} style={{ background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" }} />,
      styles: {
        content: {
          background: isUser ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : isError ? "#fff1f0" : "#fff",
          color: isUser ? "#fff" : isError ? "#cf1322" : "#333",
          borderRadius: 16,
          padding: "12px 16px",
          maxWidth: 280,
          boxShadow: isUser ? "none" : "0 2px 12px rgba(0,0,0,0.08)",
          border: isError ? "1px solid #ffa39e" : "none",
        },
      },
      messageRender: isUser ? undefined : () => (
        <Flex vertical gap={8}>
          <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13 }}>
            {displayContent}
            {isUpdating && <span className="typing-cursor">▌</span>}
          </Text>
          {!isLoading && !isUpdating && displayContent && !isError && (
            <Space size={8} style={{ paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
              <Button size="small" type="primary" icon={<FormOutlined />} onClick={() => handleFillToReply(displayContent)}>
                填充
              </Button>
              <Button size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(displayContent); message.success("已复制") }}>
                复制
              </Button>
            </Space>
          )}
        </Flex>
      ),
    }
  })

  // 错误状态
  if (providerError) {
    return (
      <Flex vertical justify="center" align="center" style={{ height: "100%", padding: 40, background: "#fafafa" }}>
        <Text type="danger" style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text type="danger">{providerError}</Text>
        <Button type="primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
          刷新重试
        </Button>
      </Flex>
    )
  }

  return (
    <Flex vertical style={{ height: "100%", background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      {/* 头部工具栏 */}
      {messages.length > 0 && (
        <Flex justify="space-between" align="center" style={{ padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{messages.length} 条消息</Text>
          <Tooltip title="清空对话">
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={clearMessages} />
          </Tooltip>
        </Flex>
      )}

      {/* 消息列表 */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {messages.length === 0 ? (
          <Flex vertical justify="center" align="center" style={{ height: "100%", padding: "0 16px" }}>
            {/* Logo */}
            <Flex justify="center" align="center" style={{
              width: 72, height: 72, borderRadius: 20,
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              marginBottom: 20, boxShadow: "0 8px 24px rgba(17, 153, 142, 0.3)",
            }}>
              <RobotOutlined style={{ fontSize: 36, color: "#fff" }} />
            </Flex>

            <Title level={4} style={{ margin: "0 0 8px", color: "#1e293b" }}>AI 客服助手</Title>
            <Text type="secondary" style={{ textAlign: "center", maxWidth: 260, marginBottom: 24 }}>
              我可以帮您快速生成专业的客服回复，选择下方快捷操作开始
            </Text>

            {/* 问询上下文 */}
            {inquiryData && (
              <Card size="small" style={{ width: "100%", maxWidth: 300, marginBottom: 20, borderRadius: 12 }}>
                <Text strong style={{ color: "#11998e", fontSize: 11 }}>📋 问询上下文</Text>
                <Flex vertical gap={4} style={{ marginTop: 8, fontSize: 12 }}>
                  <Text><strong>客户:</strong> {inquiryData.customerName || "-"}</Text>
                  <Text><strong>类别:</strong> {inquiryData.category || "-"}</Text>
                  <Text type="secondary" style={{
                    marginTop: 4, padding: 8, background: "#f8fafc",
                    borderRadius: 6, fontSize: 11, maxHeight: 50, overflow: "hidden",
                  }}>
                    {inquiryData.inquiryContent?.slice(0, 80) || "-"}...
                  </Text>
                </Flex>
              </Card>
            )}

            {/* 快捷操作 */}
            <div style={{ width: "100%", maxWidth: 300 }}>
              <Prompts
                items={promptItems}
                onItemClick={handlePromptClick}
                vertical
                styles={{
                  item: { background: "#fff", borderColor: "#e2e8f0", borderRadius: 10, marginBottom: 8 },
                }}
              />
            </div>
          </Flex>
        ) : (
          <Bubble.List items={bubbleItems as any} autoScroll />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div style={{ padding: "12px 16px 16px", background: "#fff", borderTop: "1px solid #e2e8f0" }}>
        <Sender
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          onCancel={abort}
          loading={isRequesting}
          disabled={!providerReady}
          placeholder={providerReady ? "输入消息，按 Enter 发送..." : "正在初始化..."}
          style={{ borderRadius: 24 }}
        />
      </div>

      <style>{`
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .typing-cursor { animation: blink 1s infinite; color: #11998e; }
      `}</style>
    </Flex>
  )
}

export default ChatPanel
