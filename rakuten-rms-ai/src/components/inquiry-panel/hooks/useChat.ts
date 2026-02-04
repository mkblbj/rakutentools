import { useState, useCallback, useRef } from "react"
import type { ChatMessage } from "~types"
import type { InquiryData } from "~utils/dom-selectors"
import { useStreamChat } from "./useStreamChat"

interface UseChatOptions {
  inquiryData: InquiryData | null
}

interface UseChatReturn {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isLoading: boolean
  isStreaming: boolean
  isThinking: boolean
  currentStreamingContent: string
  currentThinkingContent: string
  sendMessage: (content: string) => Promise<void>
  abortGeneration: () => void
  retryLastMessage: () => Promise<void>
  clearMessages: () => void
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 构建系统提示词
 */
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

/**
 * 聊天 Hook
 * 管理多轮对话状态，集成流式响应，支持 thinking + content 分离
 */
export function useChat({ inquiryData }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const streamingMessageIdRef = useRef<string | null>(null)
  const lastUserMessageRef = useRef<string>("")

  // 流式聊天 hook（支持 thinking + content 分离）
  const {
    isStreaming,
    isThinking,
    currentContent,
    currentThinking,
    startStream,
    abortStream,
  } = useStreamChat({
    onComplete: ({ content, thinking }) => {
      // 更新消息状态为完成
      if (streamingMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageIdRef.current
              ? { ...msg, content, thinking, status: "done" }
              : msg
          )
        )
      }
      streamingMessageIdRef.current = null
      setIsLoading(false)
    },
    onError: (error) => {
      // 更新消息状态为错误
      if (streamingMessageIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageIdRef.current
              ? { ...msg, content: `错误: ${error}`, status: "error" }
              : msg
          )
        )
      }
      streamingMessageIdRef.current = null
      setIsLoading(false)
    },
  })

  // 发送消息
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      lastUserMessageRef.current = content

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
        status: "done",
      }

      // 创建助手消息占位
      const assistantMessageId = generateId()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        thinking: "",
        timestamp: Date.now(),
        status: "streaming",
      }

      streamingMessageIdRef.current = assistantMessageId

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsLoading(true)

      // 构建消息历史（包含系统提示）
      const systemPrompt = buildSystemPrompt(inquiryData)
      const allMessages = [
        { role: "system", content: systemPrompt },
        ...messages
          .filter((m) => m.status === "done")
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: content.trim() },
      ]

      try {
        await startStream(allMessages)
      } catch (error) {
        console.error("发送消息失败:", error)
      }
    },
    [inquiryData, isLoading, messages, startStream]
  )

  // 中断生成
  const abortGeneration = useCallback(() => {
    abortStream()
    if (streamingMessageIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageIdRef.current
            ? {
                ...msg,
                content: currentContent || "（已中断）",
                thinking: currentThinking,
                status: "done",
              }
            : msg
        )
      )
    }
    streamingMessageIdRef.current = null
    setIsLoading(false)
  }, [abortStream, currentContent, currentThinking])

  // 重试最后一条消息
  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return

    // 移除最后的错误消息
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1]
      if (lastMsg?.status === "error") {
        return prev.slice(0, -1)
      }
      return prev
    })

    // 重新发送
    const content = lastUserMessageRef.current
    lastUserMessageRef.current = ""
    await sendMessage(content)
  }, [sendMessage])

  // 清空消息
  const clearMessages = useCallback(() => {
    abortGeneration()
    setMessages([])
    lastUserMessageRef.current = ""
  }, [abortGeneration])

  return {
    messages,
    setMessages,
    isLoading,
    isStreaming,
    isThinking,
    currentStreamingContent: currentContent,
    currentThinkingContent: currentThinking,
    sendMessage,
    abortGeneration,
    retryLastMessage,
    clearMessages,
  }
}
