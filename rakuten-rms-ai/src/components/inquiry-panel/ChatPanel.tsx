import { useState, useRef, useEffect } from "react"
import { SendOutlined } from "@ant-design/icons"
import { Button, Input, message } from "antd"
import { MessageItem, type ChatMessage } from "./MessageItem"
import type { InquiryData } from "~utils/dom-selectors"

const { TextArea } = Input

interface ChatPanelProps {
  inquiryData: InquiryData | null
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

export const ChatPanel = ({ inquiryData, messages, setMessages }: ChatPanelProps) => {
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息（Phase 3 实现真正的 AI 调用）
  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setLoading(true)

    // TODO: Phase 3 实现真正的流式 AI 调用
    // 目前用模拟响应测试 UI
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `[Phase 3 实现] 收到你的消息: "${text}"\n\n当前问询信息:\n- 番号: ${inquiryData?.inquiryNumber || "未知"}\n- 客户: ${inquiryData?.customerName || "未知"}\n- 类别: ${inquiryData?.category || "未知"}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setLoading(false)
    }, 800)
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              padding: "40px 20px",
              fontSize: "13px",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>💬</div>
            <div>发送消息开始对话</div>
            {inquiryData && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: "8px", color: "#333" }}>
                  当前问询上下文
                </div>
                <div>客户: {inquiryData.customerName || "-"}</div>
                <div>类别: {inquiryData.category || "-"}</div>
                <div
                  style={{
                    marginTop: "4px",
                    maxHeight: "60px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  内容: {inquiryData.inquiryContent?.slice(0, 100) || "-"}...
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} onFillToReply={handleFillToReply} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#fff",
          display: "flex",
          gap: "8px",
          alignItems: "flex-end",
        }}
      >
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="输入消息... (Shift+Enter 换行)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
          style={{ flex: 1, resize: "none" }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!inputValue.trim()}
        />
      </div>
    </div>
  )
}

export default ChatPanel
