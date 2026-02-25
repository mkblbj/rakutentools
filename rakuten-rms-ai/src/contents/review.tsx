import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useState, useRef } from "react"
import { extractReviewData, REVIEW_SELECTORS } from "~utils/dom-selectors"
import type { ReviewContext, StreamChunk } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://review.rms.rakuten.co.jp/*"],
  all_frames: false,
}

export const getInlineAnchorList: PlasmoGetInlineAnchorList = async () => {
  const textareas = document.querySelectorAll<HTMLTextAreaElement>(
    REVIEW_SELECTORS.REPLY_TEXTAREA
  )
  return Array.from(textareas).map((textarea) => ({
    element: textarea,
    insertPosition: "afterend",
  }))
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    #plasmo-inline {
      display: inline-block;
      z-index: 9999;
    }
  `
  return style
}

interface ReviewAIButtonProps {
  anchor?: {
    element?: Element | null
  }
}

const ReviewAIButton = ({ anchor }: ReviewAIButtonProps) => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")
  const portRef = useRef<chrome.runtime.Port | null>(null)

  const handleAbort = () => {
    if (portRef.current) {
      portRef.current.disconnect()
      portRef.current = null
    }
    setLoading(false)
    setStatus("中断しました")
    setTimeout(() => setStatus(""), 3000)
  }

  const handleGenerateReply = async () => {
    const textarea =
      anchor?.element instanceof HTMLTextAreaElement ? anchor.element : null

    if (!textarea) {
      setStatus("回复框未找到")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    let reviewContainer: Element | null = textarea
    let detailDiv: Element | null = null
    for (let i = 0; i < 15; i++) {
      reviewContainer = reviewContainer?.parentElement || null
      if (!reviewContainer) break
      const textareas = reviewContainer.querySelectorAll(REVIEW_SELECTORS.REPLY_TEXTAREA)
      const details = reviewContainer.querySelectorAll(REVIEW_SELECTORS.DETAIL_CONTAINER)
      if (textareas.length === 1 && details.length === 1 && textareas[0] === textarea) {
        detailDiv = details[0]
        break
      }
    }

    if (!reviewContainer || !detailDiv) {
      setStatus("評価容器未找到")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    const reviewData = extractReviewData(detailDiv as HTMLElement)
    if (!reviewData) {
      setStatus("評価データ取得失敗")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    if (reviewData.hasExistingReply) {
      const confirmed = confirm("この評価は既に返信があります。再生成しますか？")
      if (!confirmed) return
    }

    setLoading(true)
    setStatus("AI 生成中...")
    textarea.value = ""

    const context: ReviewContext = {
      reviewContent: reviewData.reviewContent,
      rating: reviewData.rating.toString(),
      productName: reviewData.productName,
    }

    try {
      const port = chrome.runtime.connect({ name: "review_stream" })
      portRef.current = port

      port.onMessage.addListener((msg: StreamChunk & { streamId?: string }) => {
        if (msg.type === "chunk" && msg.content) {
          textarea.value += msg.content
          textarea.dispatchEvent(new Event("input", { bubbles: true }))
        } else if (msg.type === "done") {
          textarea.dispatchEvent(new Event("change", { bubbles: true }))
          setLoading(false)
          setStatus("生成完了")
          portRef.current = null
          port.disconnect()
          setTimeout(() => setStatus(""), 3000)
        } else if (msg.type === "error") {
          setLoading(false)
          setStatus(msg.error || "生成失敗")
          portRef.current = null
          port.disconnect()
          setTimeout(() => setStatus(""), 5000)
        }
      })

      port.onDisconnect.addListener(() => {
        if (loading) {
          setLoading(false)
          setStatus("")
        }
        portRef.current = null
      })

      port.postMessage({
        action: "start_review_stream",
        context,
      })
    } catch (error: unknown) {
      console.error("生成回复失败:", error)
      setLoading(false)
      setStatus(error instanceof Error ? error.message : "通信失敗")
      setTimeout(() => setStatus(""), 5000)
    }
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginLeft: "8px",
        marginTop: "4px",
      }}>
      <button
        onClick={loading ? handleAbort : handleGenerateReply}
        style={{
          padding: "6px 12px",
          backgroundColor: loading ? "#DC2626" : "#2478AE",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = "#1e6292"
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = "#2478AE"
          }
        }}>
        {loading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                border: "2px solid white",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            中断
          </>
        ) : (
          <>
            <span style={{ fontSize: "14px" }}>🤖</span>
            UO AI 返信
          </>
        )}
      </button>
      {status && (
        <span
          style={{
            fontSize: "12px",
            color: status.includes("完了") ? "#059669" : status.includes("中断") ? "#D97706" : "#DC2626",
            fontWeight: "500",
          }}>
          {status}
        </span>
      )}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

export default ReviewAIButton
