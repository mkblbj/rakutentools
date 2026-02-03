import { CopyOutlined, EditOutlined } from "@ant-design/icons"
import { Bubble } from "@ant-design/x"
import { Button, message, Tooltip } from "antd"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  status?: "pending" | "streaming" | "done" | "error"
}

interface MessageItemProps {
  message: ChatMessage
  onFillToReply: (content: string) => void
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

export const MessageItem = ({ message: msg, onFillToReply }: MessageItemProps) => {
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
        content={msg.content}
        avatar={isUser ? undefined : <AIAvatar />}
        variant="shadow"
        styles={{
          content: {
            maxWidth: "85%",
            backgroundColor: isUser ? "#2478AE" : "#fff",
            color: isUser ? "#fff" : "#333",
            padding: "10px 14px",
            fontSize: "13px",
            lineHeight: "1.5",
          },
        }}
      />

      {/* AI 消息的操作按钮 */}
      {msg.role === "assistant" && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "4px",
            marginLeft: "40px",
          }}
        >
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
        </div>
      )}
    </div>
  )
}

export default MessageItem
