import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { extractInquiryData, type InquiryData } from "~utils/dom-selectors"
import { InquiryPanel } from "./inquiry-panel"

// 匹配 Rakuten R-Messe 问询详情页
export const config: PlasmoCSConfig = {
  matches: ["https://rmesse.rms.rakuten.co.jp/inquiry/*"],
  all_frames: false,
}

// 面板容器（挂载到 body，独立于按钮）
let panelContainer: HTMLDivElement | null = null
let panelRoot: ReturnType<typeof createRoot> | null = null
let panelShadowRoot: ShadowRoot | null = null

// 创建面板容器
const createPanelContainer = () => {
  if (panelContainer) return

  panelContainer = document.createElement("div")
  panelContainer.id = "uo-inquiry-panel-container"
  document.body.appendChild(panelContainer)

  // 使用 Shadow DOM 隔离样式
  panelShadowRoot = panelContainer.attachShadow({ mode: "open" })

  // 添加基础样式
  const style = document.createElement("style")
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
  `
  panelShadowRoot.appendChild(style)

  // 创建 React 根节点
  const rootDiv = document.createElement("div")
  panelShadowRoot.appendChild(rootDiv)
  panelRoot = createRoot(rootDiv)
}

// 渲染面板
const renderPanel = (isOpen: boolean, inquiryData: InquiryData | null, onClose: () => void) => {
  if (!panelRoot || !panelShadowRoot) return

  if (isOpen) {
    panelRoot.render(
      <InquiryPanel
        shadowRoot={panelShadowRoot}
        inquiryData={inquiryData}
        onClose={onClose}
      />
    )
  } else {
    panelRoot.render(null)
  }
}

// UO AI 悬浮球组件
const InquiryAIButton = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [inquiryData, setInquiryData] = useState<InquiryData | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // 初始化面板容器
  useEffect(() => {
    createPanelContainer()
    // 提取问询数据
    const data = extractInquiryData()
    setInquiryData(data)
    
    // 检查是否在问询详情页
    const isInquiryDetailPage = /\/inquiry\/\d+-\d+-\d+[ot]/.test(window.location.pathname)
    if (!isInquiryDetailPage) {
      console.log("Not in inquiry detail page, hiding button")
    }
  }, [])

  // 同步面板状态
  useEffect(() => {
    renderPanel(isPanelOpen, inquiryData, () => setIsPanelOpen(false))
  }, [isPanelOpen, inquiryData])

  const handleTogglePanel = () => {
    if (isPanelOpen) {
      setIsPanelOpen(false)
    } else {
      // 每次打开时重新提取数据
      const data = extractInquiryData()
      setInquiryData(data)
      setIsPanelOpen(true)
    }
  }

  // 悬浮球样式
  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 2147483646,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* 主按钮 */}
      <button
        onClick={handleTogglePanel}
        title={isPanelOpen ? "关闭 AI 助手" : "打开 AI 助手"}
        style={{
          width: "56px",
          height: "56px",
          backgroundColor: isPanelOpen ? "#1e6292" : "#2478AE",
          color: "white",
          border: "none",
          borderRadius: "50%",
          fontSize: "24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 4px 12px rgba(36,120,174,0.4)",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#1e6292"
          e.currentTarget.style.transform = "scale(1.1)"
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(36,120,174,0.5)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isPanelOpen ? "#1e6292" : "#2478AE"
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(36,120,174,0.4)"
        }}
      >
        {isPanelOpen ? "✕" : "🤖"}
      </button>
      
      {/* 小标签 */}
      {!isPanelOpen && (
        <div
          style={{
            backgroundColor: "#fff",
            color: "#2478AE",
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "500",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            textAlign: "center",
            whiteSpace: "nowrap",
            position: "absolute",
            right: "64px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          UO AI
        </div>
      )}
    </div>
  )
}

export default InquiryAIButton

console.log("UO Rakutentools: Inquiry detail page - AI assistant loaded")
