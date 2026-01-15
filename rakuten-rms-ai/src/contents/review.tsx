import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useState, useEffect } from "react"
import { extractReviewData, REVIEW_SELECTORS } from "~utils/dom-selectors"
import type { GenerateResponse, ReviewContext } from "~types"

// 匹配 Rakuten Review 页面
export const config: PlasmoCSConfig = {
  matches: ["https://review.rms.rakuten.co.jp/*"],
  all_frames: false,
}

// 获取所有需要注入按钮的位置（每个评论的回复框）
export const getInlineAnchorList: PlasmoGetInlineAnchorList = async () => {
  const textareas = document.querySelectorAll<HTMLTextAreaElement>(
    REVIEW_SELECTORS.REPLY_TEXTAREA
  )

  return Array.from(textareas).map((textarea) => ({
    element: textarea,
    insertPosition: "afterend",
  }))
}

// 获取 Shadow Host 的样式（使按钮显示在评论框旁边）
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

// UO AI 按钮组件
const ReviewAIButton = () => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")

  const handleGenerateReply = async () => {
    // 获取当前按钮对应的 textarea
    const button = document.activeElement as HTMLElement
    const container = button?.closest("td") || button?.closest("div")
    const textarea = container?.querySelector<HTMLTextAreaElement>(
      REVIEW_SELECTORS.REPLY_TEXTAREA
    )

    if (!textarea) {
      setStatus("❌ 回复框未找到")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    // 查找包含该 textarea 的评论容器
    let reviewContainer: Element | null = textarea
    for (let i = 0; i < 15; i++) {
      reviewContainer = reviewContainer?.parentElement || null
      if (!reviewContainer) break

      const detailDiv = reviewContainer.querySelector(REVIEW_SELECTORS.DETAIL_CONTAINER)
      if (detailDiv) {
        reviewContainer = reviewContainer // 找到了包含评论详情的容器
        break
      }
    }

    if (!reviewContainer) {
      setStatus("❌ 评论容器未找到")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    // 提取评论数据
    const detailDiv = reviewContainer.querySelector(REVIEW_SELECTORS.DETAIL_CONTAINER)
    if (!detailDiv) {
      setStatus("❌ 评论详情未找到")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    const reviewData = extractReviewData(detailDiv as HTMLElement)
    if (!reviewData) {
      setStatus("❌ 评论数据提取失败")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    // 检查是否已有回复
    if (reviewData.hasExistingReply) {
      const confirmed = confirm("この評価は既に返信があります。再生成しますか？")
      if (!confirmed) return
    }

    setLoading(true)
    setStatus("🤖 AI 生成中...")

    try {
      const context: ReviewContext = {
        reviewContent: reviewData.reviewContent,
        rating: reviewData.rating.toString(),
        productName: reviewData.productName,
      }

      const response: GenerateResponse = await chrome.runtime.sendMessage({
        action: "generate_reply",
        data: {
          type: "review",
          context,
        },
      })

      if (response.success && response.data) {
        // 填充回复到 textarea
        textarea.value = response.data
        textarea.dispatchEvent(new Event("input", { bubbles: true }))
        textarea.dispatchEvent(new Event("change", { bubbles: true }))

        setStatus("✅ 生成成功")
        setTimeout(() => setStatus(""), 3000)
      } else {
        setStatus(`❌ ${response.error || "生成失败"}`)
        setTimeout(() => setStatus(""), 5000)
      }
    } catch (error: any) {
      console.error("生成回复失败:", error)
      setStatus(`❌ ${error.message || "通信失败"}`)
      setTimeout(() => setStatus(""), 5000)
    } finally {
      setLoading(false)
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
        onClick={handleGenerateReply}
        disabled={loading}
        style={{
          padding: "6px 12px",
          backgroundColor: loading ? "#9CA3AF" : "#2478AE",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
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
            生成中...
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
            color: status.includes("✅") ? "#059669" : "#DC2626",
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

console.log("UO Rakutentools: Review page content script loaded")

