import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import { useState } from "react"
import { extractInquiryData } from "~utils/dom-selectors"
import type { GenerateResponse, InquiryContext } from "~types"

// 匹配 Rakuten R-Messe 页面
export const config: PlasmoCSConfig = {
  matches: ["https://rmesse.rms.rakuten.co.jp/*"],
  all_frames: false,
}

// 获取注入按钮的位置（楽天「AIで回答文を生成」按钮的容器右边）
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  // 等待页面加载完成
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // 查找楽天的「AIで回答文を生成」按钮
  const buttons = Array.from(document.querySelectorAll("button"))
  const rakutenAIButton = buttons.find((btn) => {
    const text = btn.textContent || ""
    return text.includes("AIで回答文を生成")
  })

  if (rakutenAIButton) {
    // 获取按钮的父容器（e637），我们要插入到这个容器的后面
    const parentContainer = rakutenAIButton.parentElement
    if (parentContainer) {
      return {
        element: parentContainer,
        insertPosition: "afterend",
      }
    }
  }

  // 备选：如果找不到楽天按钮，找回复输入框
  const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
  const replyTextarea = textareas.find((ta) => {
    const placeholder = ta.placeholder || ta.getAttribute("placeholder") || ""
    return placeholder.includes("返信") || placeholder.includes("記入")
  })

  if (replyTextarea) {
    return {
      element: replyTextarea,
      insertPosition: "beforebegin",
    }
  }

  return null
}

// 获取 Shadow Host 的样式
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    #plasmo-inline {
      display: inline-flex;
      vertical-align: middle;
      margin-left: 8px;
      z-index: 9999;
    }
  `
  return style
}

// UO AI 按钮组件
const InquiryAIButton = () => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [userInstruction, setUserInstruction] = useState<string>("")

  const handleGenerateReply = async () => {
    if (loading) {
      console.log("⚠️ 已经在生成中，忽略重复点击")
      return
    }
    
    setLoading(true)
    setStatus("🤖 AI 生成中...")
    console.log("🎯 开始生成问询回复")

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
        userInstruction: userInstruction.trim() || undefined,
      }

      // 调用 Background 生成回复
      const response: GenerateResponse = await chrome.runtime.sendMessage({
        action: "generate_reply",
        data: {
          type: "inquiry",
          context,
        },
      })

      console.log("📨 收到 AI 回复:", response)

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
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}>
      {/* 按钮 - 更紧凑 */}
      <button
        onClick={handleGenerateReply}
        disabled={loading}
        style={{
          padding: "6px 12px",
          backgroundColor: loading ? "#9CA3AF" : "#2478AE",
          color: "white",
          border: "none",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "500",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = "#1e6292"
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(36,120,174,0.3)"
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = "#2478AE"
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"
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
            生成中
          </>
        ) : (
          <>
            <span style={{ fontSize: "14px" }}>🤖</span>
            UO AI
          </>
        )}
      </button>

      {/* 用户指示输入框 - 更紧凑 */}
      <input
        type="text"
        value={userInstruction}
        onChange={(e) => setUserInstruction(e.target.value)}
        placeholder="追加情報（例: 明日発送）"
        style={{
          width: "160px",
          padding: "6px 10px",
          border: "1px solid #E5E7EB",
          borderRadius: "20px",
          fontSize: "12px",
          outline: "none",
          transition: "all 0.2s",
          backgroundColor: "#F9FAFB",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#2478AE"
          e.currentTarget.style.backgroundColor = "#fff"
          e.currentTarget.style.width = "220px"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#E5E7EB"
          e.currentTarget.style.backgroundColor = "#F9FAFB"
          if (!e.currentTarget.value) {
            e.currentTarget.style.width = "160px"
          }
        }}
      />

      {/* 状态 */}
      {status && (
        <span
          style={{
            fontSize: "12px",
            color: status.includes("✅") ? "#059669" : "#DC2626",
            fontWeight: "500",
            padding: "4px 8px",
            backgroundColor: status.includes("✅") ? "#ECFDF5" : "#FEF2F2",
            borderRadius: "12px",
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

