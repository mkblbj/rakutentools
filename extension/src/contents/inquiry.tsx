import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import { useState } from "react"
import { extractInquiryData } from "~utils/dom-selectors"
import type { GenerateResponse, InquiryContext } from "~types"

// 匹配 Rakuten R-Messe 页面
export const config: PlasmoCSConfig = {
  matches: ["https://rmesse.rms.rakuten.co.jp/*"],
  all_frames: false,
}

// 获取注入按钮的位置（问询回复框）
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  // 等待页面加载完成
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 查找回复输入框
  const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
  const replyTextarea = textareas.find((ta) => {
    const placeholder = ta.placeholder || ta.getAttribute("placeholder") || ""
    return placeholder.includes("返信") || placeholder.includes("記入")
  })

  if (replyTextarea) {
    return {
      element: replyTextarea,
      insertPosition: "afterend",
    }
  }

  return null
}

// 获取 Shadow Host 的样式
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    #plasmo-inline {
      display: block;
      margin-top: 8px;
      z-index: 9999;
    }
  `
  return style
}

// UO AI 按钮组件
const InquiryAIButton = () => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")

  const handleGenerateReply = async () => {
    setLoading(true)
    setStatus("🤖 AI 生成中...")

    try {
      // 提取问询数据
      const inquiryData = extractInquiryData()

      if (!inquiryData) {
        setStatus("❌ 问询数据提取失败")
        setTimeout(() => setStatus(""), 3000)
        setLoading(false)
        return
      }

      if (!inquiryData.inquiryContent) {
        setStatus("❌ 未找到问询内容")
        setTimeout(() => setStatus(""), 3000)
        setLoading(false)
        return
      }

      // 构建上下文（传递所有提取的数据）
      const context: InquiryContext = {
        inquiryContent: inquiryData.inquiryContent,
        customerName: inquiryData.customerName,
        category: inquiryData.category,
        orderNumber: inquiryData.orderNumber,
        inquiryNumber: inquiryData.inquiryNumber,
        receivedTime: inquiryData.receivedTime,
      }

      // 调用 Background 生成回复
      const response: GenerateResponse = await chrome.runtime.sendMessage({
        action: "generate_reply",
        data: {
          type: "inquiry",
          context,
        },
      })

      if (response.success && response.data) {
        // 查找回复输入框
        const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
        const replyTextarea = textareas.find((ta) => {
          const placeholder = ta.placeholder || ta.getAttribute("placeholder") || ""
          return placeholder.includes("返信") || placeholder.includes("記入")
        })

        if (replyTextarea) {
          // 填充回复
          replyTextarea.value = response.data
          replyTextarea.dispatchEvent(new Event("input", { bubbles: true }))
          replyTextarea.dispatchEvent(new Event("change", { bubbles: true }))

          // 聚焦到输入框
          replyTextarea.focus()

          setStatus("✅ 生成成功")
          setTimeout(() => setStatus(""), 3000)
        } else {
          setStatus("❌ 回复输入框未找到")
          setTimeout(() => setStatus(""), 3000)
        }
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
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "8px",
      }}>
      <button
        onClick={handleGenerateReply}
        disabled={loading}
        style={{
          padding: "8px 16px",
          backgroundColor: loading ? "#9CA3AF" : "#2478AE",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
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
                width: "14px",
                height: "14px",
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
            <span style={{ fontSize: "16px" }}>🤖</span>
            UO AI 返信を生成
          </>
        )}
      </button>
      {status && (
        <span
          style={{
            fontSize: "13px",
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

export default InquiryAIButton

console.log("UO Rakutentools: Inquiry page content script loaded")

