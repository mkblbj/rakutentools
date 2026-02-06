import { useState, useEffect, useMemo } from "react"
import { Rnd } from "react-rnd"
import { ConfigProvider, App } from "antd"
import { StyleProvider, createCache } from "@ant-design/cssinjs"
import { CloseOutlined, MinusOutlined } from "@ant-design/icons"
import { ChatPanel } from "./ChatPanel"
import { usePanelState } from "./hooks/usePanelState"
import type { InquiryData } from "~utils/dom-selectors"

interface InquiryPanelProps {
  shadowRoot: ShadowRoot
  inquiryData: InquiryData | null
  onClose: () => void
}

// 默认面板尺寸和位置
const DEFAULT_SIZE = { width: 420, height: 520 }
const DEFAULT_POSITION = { x: window.innerWidth - 440, y: window.innerHeight - 560 }
const MIN_SIZE = { width: 320, height: 400 }

export const InquiryPanel = ({ shadowRoot, inquiryData, onClose }: InquiryPanelProps) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const { position, size, updatePosition, updateSize } = usePanelState(
    DEFAULT_POSITION,
    DEFAULT_SIZE
  )

  // 创建样式缓存，指向 Shadow DOM
  const cache = useMemo(() => createCache(), [])

  // 面板标题
  const panelTitle = inquiryData?.inquiryNumber 
    ? `问询 ${inquiryData.inquiryNumber.slice(-8)}`
    : "AI 助手"

  return (
    <StyleProvider container={shadowRoot} cache={cache}>
      <ConfigProvider
        getPopupContainer={() => shadowRoot as any}
        theme={{
          token: {
            colorPrimary: "#2478AE",
            borderRadius: 8,
          },
        }}
      >
        <App>
          <Rnd
            size={isMinimized ? { width: 200, height: 40 } : size}
            position={position}
            onDragStop={(e, d) => updatePosition({ x: d.x, y: d.y })}
            onResizeStop={(e, direction, ref, delta, pos) => {
              if (!isMinimized) {
                updateSize({
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                })
                updatePosition(pos)
              }
            }}
            minWidth={isMinimized ? 200 : MIN_SIZE.width}
            minHeight={isMinimized ? 40 : MIN_SIZE.height}
            bounds="window"
            dragHandleClassName="panel-drag-handle"
            enableResizing={!isMinimized}
            style={{
              zIndex: 2147483647,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* 面板头部 */}
              <div
                className="panel-drag-handle"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: "#2478AE",
                  color: "#fff",
                  cursor: "move",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>🤖</span>
                  <span style={{ fontWeight: 500, fontSize: "14px" }}>{panelTitle}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <MinusOutlined style={{ fontSize: "12px" }} />
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <CloseOutlined style={{ fontSize: "12px" }} />
                  </button>
                </div>
              </div>

              {/* 面板内容 */}
              {!isMinimized && (
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <ChatPanel inquiryData={inquiryData} />
                </div>
              )}
            </div>
          </Rnd>
        </App>
      </ConfigProvider>
    </StyleProvider>
  )
}

export default InquiryPanel
