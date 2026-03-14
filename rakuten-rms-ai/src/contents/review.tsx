import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useState, useRef } from "react"
import { extractReviewData, REVIEW_SELECTORS } from "~utils/dom-selectors"
import type { ReviewContext, StreamChunk } from "~types"
import { useContentI18n, type TranslationKey } from "~i18n"
import { stripTrailingMeta } from "~utils/text-cleanup"

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
          textarea.value = stripTrailingMeta(textarea.value).trim()
          textarea.dispatchEvent(new Event("input", { bubbles: true }))
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
        className={`uo-glow-btn${loading ? " uo-glow-btn--abort" : ""}`}>
        {loading ? (
          <>
            <span className="uo-glow-spinner" />
            {t("cs.abort")}
          </>
        ) : (
          t("cs.aiReply")
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
          .uo-glow-btn {
            --glow-color: rgb(120, 190, 255);
            --glow-spread-color: rgba(80, 160, 255, 0.65);
            --btn-color: #185f9f;
            border: 0.15em solid var(--glow-color);
            padding: 0.45em 1.25em;
            color: var(--glow-color);
            font-size: 13px;
            font-weight: 600;
            background-color: var(--btn-color);
            border-radius: 0.6em;
            outline: none;
            box-shadow: 0 0 0.6em 0.15em var(--glow-color),
              0 0 2em 0.5em var(--glow-spread-color),
              inset 0 0 0.4em 0.15em var(--glow-color);
            text-shadow: 0 0 0.5em var(--glow-color);
            position: relative;
            transition: all 0.3s;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .uo-glow-btn::after {
            pointer-events: none;
            content: "";
            position: absolute;
            top: 120%;
            left: 0;
            height: 100%;
            width: 100%;
            background-color: var(--glow-spread-color);
            filter: blur(1.2em);
            opacity: 0.4;
            transform: perspective(1.5em) rotateX(35deg) scale(1, 0.6);
          }
          .uo-glow-btn:hover {
            color: var(--btn-color);
            background-color: var(--glow-color);
            box-shadow: 0 0 0.6em 0.15em var(--glow-color),
              0 0 2.5em 1em var(--glow-spread-color),
              inset 0 0 0.4em 0.15em var(--glow-color);
          }
          .uo-glow-btn:active {
            box-shadow: 0 0 0.4em 0.15em var(--glow-color),
              0 0 1.5em 1em var(--glow-spread-color),
              inset 0 0 0.3em 0.15em var(--glow-color);
          }
          .uo-glow-btn--abort {
            --glow-color: rgb(255, 150, 150);
            --glow-spread-color: rgba(255, 100, 100, 0.5);
            --btn-color: rgb(150, 40, 40);
          }
          .uo-glow-spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid currentColor;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }
        `}
      </style>
    </div>
  )
}

export default ReviewAIButton
