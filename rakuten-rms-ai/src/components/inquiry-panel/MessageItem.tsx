import { CopyOutlined, EditOutlined, ReloadOutlined, LoadingOutlined } from "@ant-design/icons"
import { Bubble } from "@ant-design/x"
import { Button, message, Tooltip, Spin } from "antd"
import type { ChatMessage } from "~types"

interface MessageItemProps {
  message: ChatMessage
  streamingContent?: string // 流式内容（正在生成时）
  onFillToReply: (content: string) => void
  onRetry?: () => void
}

// AI 头像组件
const AIAvatar = () => (
  <div
    style={{
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: "#2478AE",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
    }}
  >
    🤖
  </div>
)

export const MessageItem = ({
  message: msg,
  streamingContent,
  onFillToReply,
  onRetry,
}: MessageItemProps) => {
  // 复制消息
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      message.success("已复制")
    } catch {
      message.error("复制失败")
    }
  }

  const isUser = msg.role === "user"
  const isStreaming = msg.status === "streaming"
  const isError = msg.status === "error"

  // 显示的内容：流式时用 streamingContent，否则用 msg.content
  const displayContent = isStreaming && streamingContent ? streamingContent : msg.content

  // 流式加载时显示光标
  const contentWithCursor = isStreaming ? (
    <span>
      {displayContent || ""}
      <span className="streaming-cursor" style={{ animation: "blink 1s infinite" }}>▌</span>
    </span>
  ) : (
    displayContent
  )

  return (
    <div
      style={{
        marginBottom: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
      }}
    >
      <Bubble
        placement={isUser ? "end" : "start"}
        content={contentWithCursor}
        avatar={isUser ? undefined : <AIAvatar />}
        variant="shadow"
        styles={{
          content: {
            maxWidth: "85%",
            backgroundColor: isUser ? "#2478AE" : isError ? "#fff1f0" : "#fff",
            color: isUser ? "#fff" : isError ? "#cf1322" : "#333",
            padding: "10px 14px",
            fontSize: "13px",
            lineHeight: "1.5",
            borderColor: isError ? "#ffa39e" : undefined,
          },
        }}
      />

      {/* AI 消息的操作按钮 */}
      {msg.role === "assistant" && !isStreaming && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "4px",
            marginLeft: "40px",
          }}
        >
          {isError && onRetry && (
            <Tooltip title="重试">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={onRetry}
                style={{ fontSize: "12px", color: "#cf1322" }}
              />
            </Tooltip>
          )}
          {!isError && (
            <>
              <Tooltip title="填充到回复框">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onFillToReply(msg.content)}
                  style={{ fontSize: "12px", color: "#666" }}
                />
              </Tooltip>
              <Tooltip title="复制">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(msg.content)}
                  style={{ fontSize: "12px", color: "#666" }}
                />
              </Tooltip>
            </>
          )}
        </div>
      )}

      {/* 流式加载指示器 */}
      {isStreaming && !displayContent && (
        <div style={{ marginLeft: "40px", marginTop: "4px" }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} size="small" />
          <span style={{ marginLeft: "8px", fontSize: "12px", color: "#999" }}>思考中...</span>
        </div>
      )}
    </div>
  )
}

export default MessageItem
