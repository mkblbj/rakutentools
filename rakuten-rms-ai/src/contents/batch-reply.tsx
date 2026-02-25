import type { PlasmoCSConfig } from "plasmo"
import { useState, useRef, useCallback } from "react"
import { extractAllReviews, type ReviewData } from "~utils/dom-selectors"
import type { ReviewContext, StreamChunk } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://review.rms.rakuten.co.jp/*"],
  all_frames: false,
}

export const getOverlayAnchor = () => document.body

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    #plasmo-overlay { z-index: 99999; }
    @keyframes uo-spin {
      to { transform: rotate(360deg); }
    }
  `
  return style
}

const MAX_CONCURRENT = 3

interface TaskState {
  total: number
  completed: number
  failed: number
  current: number
}

function generateForTextarea(
  textarea: HTMLTextAreaElement,
  context: ReviewContext,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"))

    const port = chrome.runtime.connect({ name: "review_stream" })
    textarea.value = ""

    const cleanup = () => {
      try { port.disconnect() } catch {}
    }

    signal.addEventListener("abort", () => {
      cleanup()
      reject(new Error("aborted"))
    }, { once: true })

    port.onMessage.addListener((msg: StreamChunk) => {
      if (msg.type === "chunk" && msg.content) {
        textarea.value += msg.content
        textarea.dispatchEvent(new Event("input", { bubbles: true }))
      } else if (msg.type === "done") {
        textarea.dispatchEvent(new Event("change", { bubbles: true }))
        cleanup()
        resolve()
      } else if (msg.type === "error") {
        cleanup()
        reject(new Error(msg.error || "生成失敗"))
      }
    })

    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      }
    })

    port.postMessage({ action: "start_review_stream", context })
  })
}

function BatchReplyFAB() {
  const [running, setRunning] = useState(false)
  const [task, setTask] = useState<TaskState | null>(null)
  const [confirmInfo, setConfirmInfo] = useState<{ count: number; onConfirm: () => void } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startBatch = useCallback(async (targets: ReviewData[]) => {
    setConfirmInfo(null)
    setRunning(true)
    const ac = new AbortController()
    abortRef.current = ac

    const state: TaskState = { total: targets.length, completed: 0, failed: 0, current: 0 }
    setTask({ ...state })

    const queue = [...targets]
    let idx = 0

    const runOne = async (): Promise<void> => {
      while (true) {
        if (ac.signal.aborted) return
        const i = idx++
        if (i >= queue.length) return
        const review = queue[i]

        state.current = i + 1
        setTask({ ...state })

        const context: ReviewContext = {
          reviewContent: review.reviewContent,
          rating: review.rating.toString(),
          productName: review.productName,
        }

        try {
          await generateForTextarea(review.replyTextarea!, context, ac.signal)
          state.completed++
        } catch {
          state.failed++
        }
        setTask({ ...state })
      }
    }

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, targets.length) }, () => runOne())
    await Promise.all(workers)

    setRunning(false)
    abortRef.current = null
  }, [])

  const handleBatchReply = useCallback(() => {
    const allReviews = extractAllReviews()
    const targets = allReviews.filter((r) => {
      if (!r.replyTextarea) return false
      if (r.hasExistingReply) return false
      if (r.replyTextarea.value.trim().length > 0) return false
      return true
    })

    if (targets.length === 0) {
      setConfirmInfo(null)
      setNotice("対象の評価がありません（すべて回復済み、またはテキストエリアなし）")
      return
    }

    setConfirmInfo({ count: targets.length, onConfirm: () => startBatch(targets) })
  }, [startBatch])

  const handleAbort = useCallback(() => {
    abortRef.current?.abort()
    setRunning(false)
    setTask(null)
  }, [])

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    right: "20px",
    bottom: "80px",
    zIndex: 99999,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  }

  if (notice) {
    return (
      <div style={fabStyle}>
        <div style={{
          backgroundColor: "#fff", borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          padding: "16px 20px", minWidth: "240px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <img src="https://pic.x-yue.top/i/2026/02/25/h7ipmv.png" alt="UO AI" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>UO AI</span>
          </div>
          <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.6", marginBottom: "14px" }}>
            {notice}
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{
              width: "100%", padding: "8px", backgroundColor: "#f3f4f6",
              color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>
            OK
          </button>
        </div>
      </div>
    )
  }

  if (running && task) {
    return (
      <div style={fabStyle}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          padding: "16px 20px",
          minWidth: "220px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{
              display: "inline-block", width: "14px", height: "14px",
              border: "2.5px solid #2478AE", borderTopColor: "transparent",
              borderRadius: "50%", animation: "uo-spin 0.6s linear infinite",
            }} />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
              一括生成中...
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.6" }}>
            進捗: {task.completed + task.failed} / {task.total}<br />
            成功: {task.completed}　失敗: {task.failed}
          </div>
          <div style={{
            marginTop: "8px", height: "4px", borderRadius: "2px",
            backgroundColor: "#e5e7eb", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: "2px",
              backgroundColor: "#2478AE", transition: "width 0.3s",
              width: `${((task.completed + task.failed) / task.total) * 100}%`,
            }} />
          </div>
          <button
            onClick={handleAbort}
            style={{
              marginTop: "10px", width: "100%", padding: "6px",
              backgroundColor: "#DC2626", color: "#fff", border: "none",
              borderRadius: "6px", fontSize: "12px", fontWeight: 600,
              cursor: "pointer",
            }}>
            中断する
          </button>
        </div>
      </div>
    )
  }

  if (confirmInfo) {
    return (
      <div style={fabStyle}>
        <div style={{
          backgroundColor: "#fff", borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          padding: "16px 20px", minWidth: "240px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <img src="https://pic.x-yue.top/i/2026/02/25/h7ipmv.png" alt="UO AI" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>UO AI 一括返信</span>
          </div>
          <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.6", marginBottom: "14px" }}>
            未回復 <strong>{confirmInfo.count}</strong> 件に AI 返信を生成します。<br />
            ※ API を {confirmInfo.count} 回呼び出します。
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setConfirmInfo(null)}
              style={{
                flex: 1, padding: "8px", backgroundColor: "#f3f4f6",
                color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>
              キャンセル
            </button>
            <button
              onClick={confirmInfo.onConfirm}
              style={{
                flex: 1, padding: "8px", backgroundColor: "#2478AE",
                color: "#fff", border: "none", borderRadius: "6px",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>
              生成する
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={fabStyle}>
      <button
        onClick={() => handleBatchReply()}
        style={{
          width: "52px", height: "52px", borderRadius: "50%",
          backgroundColor: "#fff", border: "none", cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)"
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.15)"
        }}
        title="UO AI 一括返信（未回復のみ）">
        <img src="https://pic.x-yue.top/i/2026/02/25/h7ipmv.png" alt="UO AI" style={{ width: "36px", height: "36px", borderRadius: "6px" }} />
      </button>
    </div>
  )
}

export default BatchReplyFAB
