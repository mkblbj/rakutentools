import { useCallback, useRef, useState } from "react"
import type { StreamChunk } from "~types"

interface StreamState {
  content: string
  thinking: string
}

interface UseStreamChatOptions {
  onChunk?: (content: string) => void
  onThinking?: (thinking: string) => void
  onComplete?: (result: { content: string; thinking: string }) => void
  onError?: (error: string) => void
}

interface UseStreamChatReturn {
  isStreaming: boolean
  isThinking: boolean
  streamId: string | null
  currentContent: string
  currentThinking: string
  startStream: (messages: Array<{ role: string; content: string }>, model?: string) => Promise<void>
  abortStream: () => void
}

/**
 * 流式聊天 Hook
 * 通过 chrome.runtime.connect 与 Background 建立长连接进行流式通信
 * 支持 thinking + content 分离
 */
export function useStreamChat(options: UseStreamChatOptions = {}): UseStreamChatReturn {
  const { onChunk, onThinking, onComplete, onError } = options
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamId, setStreamId] = useState<string | null>(null)
  const [currentContent, setCurrentContent] = useState("")
  const [currentThinking, setCurrentThinking] = useState("")
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const stateRef = useRef<StreamState>({ content: "", thinking: "" })

  const abortStream = useCallback(() => {
    if (portRef.current) {
      portRef.current.disconnect()
      portRef.current = null
    }
    if (streamId) {
      // 通知 background 中断流
      chrome.runtime.sendMessage({
        action: "abort_chat_stream",
        streamId,
      })
    }
    setIsStreaming(false)
    setIsThinking(false)
    setStreamId(null)
  }, [streamId])

  const startStream = useCallback(
    async (messages: Array<{ role: string; content: string }>, model?: string) => {
      // 如果已有流在进行，先中断
      if (portRef.current) {
        abortStream()
      }

      setIsStreaming(true)
      setIsThinking(true) // 开始时先显示思考状态
      setCurrentContent("")
      setCurrentThinking("")
      stateRef.current = { content: "", thinking: "" }

      return new Promise<void>((resolve, reject) => {
        // 建立 Port 长连接
        const port = chrome.runtime.connect({ name: "chat_stream" })
        portRef.current = port

        // 设置超时（60秒，思考模型需要更长时间）
        const timeoutId = setTimeout(() => {
          onError?.("请求超时，请重试")
          abortStream()
          reject(new Error("请求超时"))
        }, 60000)

        port.onMessage.addListener((message: StreamChunk & { streamId?: string }) => {
          if (message.streamId) {
            setStreamId(message.streamId)
            return
          }

          switch (message.type) {
            case "thinking":
              if (message.thinking) {
                stateRef.current.thinking += message.thinking
                setCurrentThinking(stateRef.current.thinking)
                onThinking?.(message.thinking)
              }
              break

            case "chunk":
              // 收到内容时，思考阶段结束
              setIsThinking(false)
              if (message.content) {
                stateRef.current.content += message.content
                setCurrentContent(stateRef.current.content)
                onChunk?.(message.content)
              }
              break

            case "done":
              clearTimeout(timeoutId)
              setIsStreaming(false)
              setIsThinking(false)
              onComplete?.(stateRef.current)
              portRef.current = null
              resolve()
              break

            case "error":
              clearTimeout(timeoutId)
              setIsStreaming(false)
              setIsThinking(false)
              onError?.(message.error || "未知错误")
              portRef.current = null
              reject(new Error(message.error))
              break
          }
        })

        port.onDisconnect.addListener(() => {
          clearTimeout(timeoutId)
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || "连接断开"
            onError?.(errorMsg)
            reject(new Error(errorMsg))
          }
          setIsStreaming(false)
          setIsThinking(false)
          portRef.current = null
        })

        // 发送聊天请求
        port.postMessage({
          action: "start_chat_stream",
          data: { messages, model },
        })
      })
    },
    [abortStream, onChunk, onThinking, onComplete, onError]
  )

  return {
    isStreaming,
    isThinking,
    streamId,
    currentContent,
    currentThinking,
    startStream,
    abortStream,
  }
}
