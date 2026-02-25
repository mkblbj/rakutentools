import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useState, useRef } from "react"
import { extractReviewData, REVIEW_SELECTORS } from "~utils/dom-selectors"
import type { ReviewContext, StreamChunk } from "~types"
import { useContentI18n, type TranslationKey } from "~i18n"

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

type StatusType = "success" | "warning" | "error" | ""

const STATUS_COLORS: Record<StatusType, string> = {
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",
  "": "",
}

const ReviewAIButton = ({ anchor }: ReviewAIButtonProps) => {
  const { t } = useContentI18n()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [statusType, setStatusType] = useState<StatusType>("")
  const portRef = useRef<chrome.runtime.Port | null>(null)

  const showStatus = (key: TranslationKey, type: StatusType, timeout = 3000) => {
    setStatus(t(key))
    setStatusType(type)
    setTimeout(() => { setStatus(""); setStatusType("") }, timeout)
  }

  const handleAbort = () => {
    if (portRef.current) {
      portRef.current.disconnect()
      portRef.current = null
    }
    setLoading(false)
    showStatus("cs.aborted", "warning")
  }

  const handleGenerateReply = async () => {
    const textarea =
      anchor?.element instanceof HTMLTextAreaElement ? anchor.element : null

    if (!textarea) {
      showStatus("cs.replyBoxNotFound", "error")
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
      showStatus("cs.reviewContainerNotFound", "error")
      return
    }

    const reviewData = extractReviewData(detailDiv as HTMLElement)
    if (!reviewData) {
      showStatus("cs.reviewDataFetchFail", "error")
      return
    }

    if (reviewData.hasExistingReply) {
      const confirmed = confirm(t("cs.confirmExistingReply"))
      if (!confirmed) return
    }

    setLoading(true)
    setStatus(t("cs.generating"))
    setStatusType("")
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
          showStatus("cs.done", "success")
          portRef.current = null
          port.disconnect()
        } else if (msg.type === "error") {
          setLoading(false)
          setStatus(msg.error || t("cs.failed"))
          setStatusType("error")
          setTimeout(() => { setStatus(""); setStatusType("") }, 5000)
          portRef.current = null
          port.disconnect()
        }
      })

      port.onDisconnect.addListener(() => {
        if (loading) {
          setLoading(false)
          setStatus("")
          setStatusType("")
        }
        portRef.current = null
      })

      port.postMessage({
        action: "start_review_stream",
        context,
      })
    } catch (error: unknown) {
      console.error("Generate reply failed:", error)
      setLoading(false)
      setStatus(error instanceof Error ? error.message : t("cs.commFail"))
      setStatusType("error")
      setTimeout(() => { setStatus(""); setStatusType("") }, 5000)
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
            {t("cs.abort")}
          </>
        ) : (
          <>
            <span style={{ fontSize: "14px" }}>🤖</span>
            {t("cs.aiReply")}
          </>
        )}
      </button>
      {status && (
        <span
          style={{
            fontSize: "12px",
            color: STATUS_COLORS[statusType] || "#DC2626",
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
