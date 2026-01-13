import { useEffect, useRef, useState } from "react"

interface Shop {
  shopName: string
  loginId: string
  loginPass: string
  userId: string
  userPass: string
}

interface MercariLink {
  name: string
  url: string
}

interface AupayShop {
  name: string
  loginId: string
  password: string
}

interface TemuShop {
  name: string
  phone: string
  password: string
}

interface ExportData {
  version: string
  exportDate: string
  shops: Shop[]
  mercariLinks?: MercariLink[]
  aupayShops?: AupayShop[]
  temuShops?: TemuShop[]
}

function OptionsPage() {
  const [inputPin, setInputPin] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 本地状态管理
  const [localShops, setLocalShops] = useState<Shop[]>(() =>
    Array.from({ length: 20 }, () => ({
      shopName: "",
      loginId: "",
      loginPass: "",
      userId: "",
      userPass: ""
    }))
  )

  const [localPinCode, setLocalPinCode] = useState("")

  // メルカリ 链接状态
  const [mercariLinks, setMercariLinks] = useState<MercariLink[]>(() =>
    Array.from({ length: 5 }, () => ({ name: "", url: "" }))
  )
  const [visibleMercariCount, setVisibleMercariCount] = useState(1)

  // auPay Market 状态
  const [aupayShops, setAupayShops] = useState<AupayShop[]>(() =>
    Array.from({ length: 5 }, () => ({ name: "", loginId: "", password: "" }))
  )
  const [visibleAupayCount, setVisibleAupayCount] = useState(1)

  // TEMU 状态
  const [temuShops, setTemuShops] = useState<TemuShop[]>(() =>
    Array.from({ length: 5 }, () => ({ name: "", phone: "", password: "" }))
  )
  const [visibleTemuCount, setVisibleTemuCount] = useState(1)

  // 同步 storage 数据到本地状态
  useEffect(() => {
    chrome.storage.local.get(["rms", "rmsPinCode", "mercariLinks", "aupayShops", "temuShops"], (data) => {
      if (data.rms && Array.isArray(data.rms)) {
        const normalized = Array.from({ length: 20 }, (_, i) => {
          const shop = data.rms[i]
          return shop || {
            shopName: "",
            loginId: "",
            loginPass: "",
            userId: "",
            userPass: ""
          }
        })
        setLocalShops(normalized)
        
        // 更新显示数量
        const filledCount = normalized.reduce((acc, shop, i) => {
          if (shop.shopName || shop.loginId || shop.loginPass || shop.userId || shop.userPass) {
            return i + 1
          }
          return acc
        }, 0)
        setVisibleCount(Math.max(filledCount, 1))
      }
      if (data.rmsPinCode) {
        setLocalPinCode(data.rmsPinCode)
      }
      if (data.mercariLinks && Array.isArray(data.mercariLinks)) {
        const normalized = Array.from({ length: 5 }, (_, i) => {
          const link = data.mercariLinks[i]
          return link || { name: "", url: "" }
        })
        setMercariLinks(normalized)
        
        const filledCount = normalized.reduce((acc, link, i) => {
          if (link.name || link.url) return i + 1
          return acc
        }, 0)
        setVisibleMercariCount(Math.max(filledCount, 1))
      }
      if (data.aupayShops && Array.isArray(data.aupayShops)) {
        const normalized = Array.from({ length: 5 }, (_, i) => {
          const shop = data.aupayShops[i]
          return shop || { name: "", loginId: "", password: "" }
        })
        setAupayShops(normalized)
        
        const filledCount = normalized.reduce((acc, shop, i) => {
          if (shop.name || shop.loginId || shop.password) return i + 1
          return acc
        }, 0)
        setVisibleAupayCount(Math.max(filledCount, 1))
      }
      if (data.temuShops && Array.isArray(data.temuShops)) {
        const normalized = Array.from({ length: 5 }, (_, i) => {
          const shop = data.temuShops[i]
          return shop || { name: "", phone: "", password: "" }
        })
        setTemuShops(normalized)
        
        const filledCount = normalized.reduce((acc, shop, i) => {
          if (shop.name || shop.phone || shop.password) return i + 1
          return acc
        }, 0)
        setVisibleTemuCount(Math.max(filledCount, 1))
      }
    })
  }, [])

  const handleSave = () => {
    if (inputPin.length === 0) {
      alert("PINコードが入力されていません。")
      return
    }

    if (localPinCode !== "" && inputPin !== localPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    // 验证输入
    for (let i = 0; i < localShops.length; i++) {
      const shop = localShops[i]
      const hasAnyField =
        shop.shopName ||
        shop.loginId ||
        shop.loginPass ||
        shop.userId ||
        shop.userPass

      if (hasAnyField) {
        if (
          !shop.shopName ||
          !shop.loginId ||
          !shop.loginPass ||
          !shop.userId ||
          !shop.userPass
        ) {
          alert(`No.${i + 1} に未入力の項目があるため保存できません。`)
          return
        }
      }
    }

    chrome.storage.local.set({ rms: localShops, rmsPinCode: inputPin, mercariLinks, aupayShops, temuShops }, () => {
      setLocalPinCode(inputPin)
      setStatus("設定を保存しました")
      setTimeout(() => setStatus(""), 5000)
    })
  }

  const updateMercariLink = (index: number, field: keyof MercariLink, value: string) => {
    const newLinks = [...mercariLinks]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setMercariLinks(newLinks)
  }

  const handleAddMercari = () => {
    if (visibleMercariCount < 5) {
      setVisibleMercariCount(prev => prev + 1)
    }
  }

  const updateAupayShop = (index: number, field: keyof AupayShop, value: string) => {
    const newShops = [...aupayShops]
    newShops[index] = { ...newShops[index], [field]: value }
    setAupayShops(newShops)
  }

  const handleAddAupay = () => {
    if (visibleAupayCount < 5) {
      setVisibleAupayCount(prev => prev + 1)
    }
  }

  const updateTemuShop = (index: number, field: keyof TemuShop, value: string) => {
    const newShops = [...temuShops]
    newShops[index] = { ...newShops[index], [field]: value }
    setTemuShops(newShops)
  }

  const handleAddTemu = () => {
    if (visibleTemuCount < 5) {
      setVisibleTemuCount(prev => prev + 1)
    }
  }

  const updateShop = (index: number, field: keyof Shop, value: string) => {
    const newShops = [...localShops]
    newShops[index] = { ...newShops[index], [field]: value }
    setLocalShops(newShops)
  }

  const handleExportFile = () => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      return
    }

    if (localPinCode !== "" && inputPin !== localPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    const exportData: ExportData = {
      version: "0.1.4",
      exportDate: new Date().toISOString(),
      shops: localShops,
      mercariLinks,
      aupayShops,
      temuShops
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `rms-login-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setStatus("データをファイルにエクスポートしました")
    setTimeout(() => setStatus(""), 3000)
  }

  const handleExportClipboard = async () => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      return
    }

    if (localPinCode !== "" && inputPin !== localPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    const exportData: ExportData = {
      version: "0.1.4",
      exportDate: new Date().toISOString(),
      shops: localShops,
      mercariLinks,
      aupayShops,
      temuShops
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
      setStatus("データをクリップボードにコピーしました")
      setTimeout(() => setStatus(""), 3000)
    } catch (err) {
      alert("クリップボードへのコピーに失敗しました")
    }
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    processImportData(file)
  }

  const processImportData = (source: File | string) => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    if (localPinCode !== "" && inputPin !== localPinCode) {
      alert("PINコードが間違っています。")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const processContent = (content: string, sourceName: string) => {
      try {
        const importData: ExportData = JSON.parse(content)

        if (!importData.shops || !Array.isArray(importData.shops)) {
          throw new Error("無効なデータ形式です")
        }

        // 确保有 20 个元素
        const newShops = Array(20)
          .fill(null)
          .map((_, i) => {
            const shop = importData.shops[i]
            return shop || {
              shopName: "",
              loginId: "",
              loginPass: "",
              userId: "",
              userPass: ""
            }
          })

        const confirmed = confirm(
          `${sourceName} からデータをインポートしますか？\n現在のデータは上書きされます。`
        )

        if (confirmed) {
          // 处理 mercariLinks
          const newMercariLinks = Array(5).fill(null).map((_, i) => {
            const link = importData.mercariLinks?.[i]
            return link || { name: "", url: "" }
          })

          // 处理 aupayShops
          const newAupayShops = Array(5).fill(null).map((_, i) => {
            const shop = importData.aupayShops?.[i]
            return shop || { name: "", loginId: "", password: "" }
          })

          // 处理 temuShops
          const newTemuShops = Array(5).fill(null).map((_, i) => {
            const shop = importData.temuShops?.[i]
            return shop || { name: "", phone: "", password: "" }
          })

          chrome.storage.local.set({ rms: newShops, mercariLinks: newMercariLinks, aupayShops: newAupayShops, temuShops: newTemuShops }, () => {
            setLocalShops(newShops)
            setMercariLinks(newMercariLinks)
            setAupayShops(newAupayShops)
            setTemuShops(newTemuShops)
            
            const filledMercariCount = newMercariLinks.reduce((acc, link, i) => {
              if (link.name || link.url) return i + 1
              return acc
            }, 0)
            setVisibleMercariCount(Math.max(filledMercariCount, 1))
            
            const filledAupayCount = newAupayShops.reduce((acc, shop, i) => {
              if (shop.name || shop.loginId || shop.password) return i + 1
              return acc
            }, 0)
            setVisibleAupayCount(Math.max(filledAupayCount, 1))
            
            const filledTemuCount = newTemuShops.reduce((acc, shop, i) => {
              if (shop.name || shop.phone || shop.password) return i + 1
              return acc
            }, 0)
            setVisibleTemuCount(Math.max(filledTemuCount, 1))
            
            setStatus("データをインポートしました")
            setTimeout(() => setStatus(""), 3000)
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー"
        alert("データの読み込みに失敗しました: " + message)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    if (source instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => processContent(e.target?.result as string, source.name)
      reader.onerror = () => {
        alert("ファイルの読み込みに失敗しました")
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
      reader.readAsText(source)
    } else {
      processContent(source, "クリップボード")
    }
  }

  const handleImportFileClick = () => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      return
    }

    if (localPinCode !== "" && inputPin !== localPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    fileInputRef.current?.click()
  }

  const handleImportClipboard = async () => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      return
    }

    if (localPinCode !== "" && inputPin !== localPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        alert("クリップボードが空です")
        return
      }
      processImportData(text)
    } catch (err) {
      alert("クリップボードの読み取りに失敗しました")
    }
  }

  const handleClearData = () => {
    const confirmed = confirm(
      "すべてのデータを削除しますか？\nこの操作は取り消せません。"
    )
    if (confirmed) {
      chrome.storage.local.clear(() => {
        alert("データを削除しました。ページを再読み込みします。")
        window.location.reload()
      })
    }
  }

  const handleDebug = () => {
    chrome.storage.local.get(null, (data) => {
      console.log("=== Storage Debug ===")
      console.log("All storage data:", data)
      console.log("rms type:", typeof data.rms)
      console.log("rms isArray:", Array.isArray(data.rms))
      console.log("rms length:", data.rms?.length)
      console.log("rms[0]:", data.rms?.[0])
      console.log("rms[1]:", data.rms?.[1])
      console.log("rmsPinCode:", data.rmsPinCode)
      alert("デバッグ情報をコンソールに出力しました（F12で確認）")
    })
  }

  // 计算初始显示数量
  const [visibleCount, setVisibleCount] = useState(() => {
    // 初始显示所有有数据的行，如果没有数据则显示1行
    const filledCount = Array.from({ length: 20 }).reduce((acc, _, i) => {
      const shop = localShops[i]
      if (shop && (shop.shopName || shop.loginId || shop.loginPass || shop.userId || shop.userPass)) {
        return i + 1
      }
      return acc
    }, 0) as number
    return Math.max(filledCount, 1)
  })

  const handleAddShop = () => {
    if (visibleCount < 20) {
      setVisibleCount(prev => prev + 1)
    }
  }

  const visibleShops = localShops.slice(0, visibleCount)

  return (
    <div style={{ 
      padding: "24px",
      maxWidth: "1200px",
      margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif",
      background: "#f5f7fa",
      minHeight: "100vh"
    }}>
      <h1 style={{ 
        fontSize: "28px",
        fontWeight: "600",
        color: "#1a202c",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        🔐 RMS自動ログイン設定
      </h1>

      {/* PIN 码卡片 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#2d3748",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🔑 PIN コード
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="password"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            placeholder="PIN コードを入力"
            style={{
              padding: "10px 14px",
              fontSize: "14px",
              border: "2px solid #e2e8f0",
              borderRadius: "8px",
              width: "200px",
              outline: "none",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
          />
          <span style={{ fontSize: "13px", color: "#718096" }}>
            設定の変更・エクスポート・インポートに必要です
          </span>
        </div>
      </div>

      {/* 操作按钮卡片 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleSave}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              transition: "background 0.2s",
              boxShadow: "0 2px 4px rgba(0,123,255,0.2)"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#0056b3"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#007bff"}>
            💾 保存
          </button>
          
          <div style={{ display: "flex", gap: "2px" }}>
            <button
              onClick={handleExportFile}
              style={{
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px 0 0 8px",
                borderRight: "1px solid rgba(255,255,255,0.2)",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#218838"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#28a745"}
              title="ファイルにエクスポート">
              📁 エクスポート
            </button>
            <button
              onClick={handleExportClipboard}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                cursor: "pointer",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "0 8px 8px 0",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#218838"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#28a745"}
              title="クリップボードにコピー">
              📋
            </button>
          </div>

          <div style={{ display: "flex", gap: "2px" }}>
            <button
              onClick={handleImportFileClick}
              style={{
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                background: "#ffc107",
                color: "#000",
                border: "none",
                borderRadius: "8px 0 0 8px",
                borderRight: "1px solid rgba(0,0,0,0.1)",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#e0a800"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#ffc107"}
              title="ファイルからインポート">
              📁 インポート
            </button>
            <button
              onClick={handleImportClipboard}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                cursor: "pointer",
                background: "#ffc107",
                color: "#000",
                border: "none",
                borderRadius: "0 8px 8px 0",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#e0a800"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#ffc107"}
              title="クリップボードからインポート">
              📋
            </button>
          </div>

          <button
            onClick={handleClearData}
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#c82333"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#dc3545"}>
            🗑️ データ削除
          </button>

          <button
            onClick={handleDebug}
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#5a6268"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#6c757d"}>
            🐛 デバッグ
          </button>

          {status && (
            <span style={{ 
              padding: "8px 16px",
              color: "#28a745",
              fontWeight: "600",
              fontSize: "14px",
              background: "#d4edda",
              borderRadius: "8px"
            }}>
              ✓ {status}
            </span>
          )}
        </div>
      </div>

      {/* 店铺列表卡片 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <h2 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#2d3748",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            🏪 店舗情報
          </h2>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "#4a5568",
            cursor: "pointer"
          }}>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            パスワードを表示
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {visibleShops.map((shop, i) => (
            <div key={i} style={{
              background: shop.shopName ? "#f8fafc" : "white",
              border: shop.shopName ? "2px solid #e2e8f0" : "2px dashed #cbd5e0",
              borderRadius: "10px",
              padding: "16px",
              transition: "all 0.2s"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px minmax(0, 1fr)", // 添加 minmax(0, 1fr) 防止溢出
                gap: "16px",
                alignItems: "start"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: shop.shopName ? "#007bff" : "#e2e8f0",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600",
                  flexShrink: 0
                }}>
                  {i + 1}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", minWidth: 0 }}>
                  {/* 第一行：店铺名 */}
                  <div>
                    <label style={{ fontSize: "12px", color: "#4a5568", fontWeight: "600", marginBottom: "4px", display: "block" }}>
                      店舗名
                    </label>
                    <input
                      type="text"
                      value={shop.shopName}
                      onChange={(e) => updateShop(i, "shopName", e.target.value)}
                      placeholder="店舗名を入力"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "16px",
                        fontWeight: "500",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        outline: "none",
                        transition: "all 0.2s",
                        background: "#fff",
                        boxSizing: "border-box" // 防止 padding 撑大
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#007bff"
                        e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)"
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0"
                        e.target.style.boxShadow = "none"
                      }}
                    />
                  </div>

                  {/* 登录信息区域 */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1px 1fr", 
                    gap: "0",
                    background: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    width: "100%",
                    boxSizing: "border-box"
                  }}>
                    {/* 左侧：R-Login */}
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "12px",
                      padding: "20px",
                      background: "rgba(235, 248, 255, 0.3)",
                      boxSizing: "border-box"
                    }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "700", 
                        color: "#2b6cb0", 
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span style={{ fontSize: "16px" }}>🔵</span> R-Login (共通ID)
                      </div>
                      
                      <div>
                        <label style={{ fontSize: "12px", color: "#4a5568", fontWeight: "600", marginBottom: "4px", display: "block" }}>
                          R-Login ID
                        </label>
                        <input
                          type="text"
                          value={shop.loginId}
                          onChange={(e) => updateShop(i, "loginId", e.target.value)}
                          placeholder="R-Login ID"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "14px",
                            border: "1px solid #cbd5e0",
                            borderRadius: "4px",
                            background: "white",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: "12px", color: "#4a5568", fontWeight: "600", marginBottom: "4px", display: "block" }}>
                          R-Login パスワード
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={shop.loginPass}
                          onChange={(e) => updateShop(i, "loginPass", e.target.value)}
                          placeholder="パスワード"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "14px",
                            border: "1px solid #cbd5e0",
                            borderRadius: "4px",
                            background: "white",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>

                    {/* 中间分割线 */}
                    <div style={{ background: "#e2e8f0", width: "1px" }}></div>

                    {/* 右侧：楽天会員 */}
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "12px",
                      padding: "20px",
                      background: "rgba(255, 245, 245, 0.3)",
                      boxSizing: "border-box"
                    }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "700", 
                        color: "#c53030", 
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span style={{ fontSize: "16px" }}>🔴</span> 楽天会員 (個人ID)
                      </div>
                      
                      <div>
                        <label style={{ fontSize: "12px", color: "#4a5568", fontWeight: "600", marginBottom: "4px", display: "block" }}>
                          楽天会員 ユーザID
                        </label>
                        <input
                          type="text"
                          value={shop.userId}
                          onChange={(e) => updateShop(i, "userId", e.target.value)}
                          placeholder="楽天会員ID"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "14px",
                            border: "1px solid #cbd5e0",
                            borderRadius: "4px",
                            background: "white",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: "12px", color: "#4a5568", fontWeight: "600", marginBottom: "4px", display: "block" }}>
                          楽天会員 パスワード
                        </label>
                        <input
                          type="password"
                          value={shop.userPass}
                          onChange={(e) => updateShop(i, "userPass", e.target.value)}
                          placeholder="パスワード"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "14px",
                            border: "1px solid #cbd5e0",
                            borderRadius: "4px",
                            background: "white",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {visibleCount < 20 ? (
          <button
            onClick={handleAddShop}
            style={{
              width: "100%",
              padding: "16px",
              marginTop: "16px",
              background: "white",
              border: "2px dashed #cbd5e0",
              borderRadius: "10px",
              color: "#4a5568",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#007bff"
              e.currentTarget.style.color = "#007bff"
              e.currentTarget.style.background = "#f8fafc"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e0"
              e.currentTarget.style.color = "#4a5568"
              e.currentTarget.style.background = "white"
            }}>
            ➕ 店舗を追加 ({20 - visibleCount}件まで追加可能)
          </button>
        ) : (
          <div style={{
            marginTop: "16px",
            padding: "12px",
            textAlign: "center",
            color: "#718096",
            fontSize: "13px",
            background: "#f7fafc",
            borderRadius: "8px",
            border: "1px dashed #cbd5e0"
          }}>
            ⚠️ 最大件数（20件）に達しました
          </div>
        )}
      </div>

      {/* メルカリ 设置卡片 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#2d3748",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🛒 メルカリ（入口リンク）
        </h2>
        <p style={{ fontSize: "13px", color: "#718096", marginBottom: "16px" }}>
          メルカリは一度ログインすると永続的にログイン状態が保持されるため、入口リンクのみ設定できます。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mercariLinks.slice(0, visibleMercariCount).map((link, i) => (
            <div key={i} style={{
              background: link.name ? "#fff5f5" : "white",
              border: link.name ? "2px solid #fed7d7" : "2px dashed #cbd5e0",
              borderRadius: "10px",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "40px 1fr 2fr",
              gap: "12px",
              alignItems: "center"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: link.name ? "#e53e3e" : "#e2e8f0",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "600"
              }}>
                {i + 1}
              </div>
              <input
                type="text"
                value={link.name}
                onChange={(e) => updateMercariLink(i, "name", e.target.value)}
                placeholder="店舗名"
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateMercariLink(i, "url", e.target.value)}
                placeholder="https://mercari-shops.com/..."
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          ))}
        </div>

        {visibleMercariCount < 5 && (
          <button
            onClick={handleAddMercari}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "12px",
              background: "white",
              border: "2px dashed #cbd5e0",
              borderRadius: "8px",
              color: "#4a5568",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#e53e3e"
              e.currentTarget.style.color = "#e53e3e"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e0"
              e.currentTarget.style.color = "#4a5568"
            }}>
            ➕ メルカリ店舗を追加 ({5 - visibleMercariCount}件まで追加可能)
          </button>
        )}
      </div>

      {/* auPay Market 设置卡片 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#2d3748",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🟠 auPay Market（自動ログイン）
        </h2>
        <p style={{ fontSize: "13px", color: "#718096", marginBottom: "16px" }}>
          auPay Market は一組のログインID・パスワードで自動ログインします。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {aupayShops.slice(0, visibleAupayCount).map((shop, i) => (
            <div key={i} style={{
              background: shop.name ? "#fffaf0" : "white",
              border: shop.name ? "2px solid #fbd38d" : "2px dashed #cbd5e0",
              borderRadius: "10px",
              padding: "16px"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 1fr",
                gap: "12px",
                alignItems: "center"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: shop.name ? "#ed8936" : "#e2e8f0",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={shop.name}
                  onChange={(e) => updateAupayShop(i, "name", e.target.value)}
                  placeholder="店舗名"
                  style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <input
                  type="text"
                  value={shop.loginId}
                  onChange={(e) => updateAupayShop(i, "loginId", e.target.value)}
                  placeholder="ログインID（メールアドレス）"
                  style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={shop.password}
                  onChange={(e) => updateAupayShop(i, "password", e.target.value)}
                  placeholder="パスワード"
                  style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {visibleAupayCount < 5 && (
          <button
            onClick={handleAddAupay}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "12px",
              background: "white",
              border: "2px dashed #cbd5e0",
              borderRadius: "8px",
              color: "#4a5568",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#ed8936"
              e.currentTarget.style.color = "#ed8936"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e0"
              e.currentTarget.style.color = "#4a5568"
            }}>
            ➕ auPay店舗を追加 ({5 - visibleAupayCount}件まで追加可能)
          </button>
        )}
      </div>

      {/* TEMU 设置卡片 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#2d3748",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🟧 TEMU（自動ログイン）
        </h2>
        <p style={{ fontSize: "13px", color: "#718096", marginBottom: "16px" }}>
          TEMU は手机号・パスワードで自動ログインします。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {temuShops.slice(0, visibleTemuCount).map((shop, i) => (
            <div key={i} style={{
              background: shop.name ? "#fffbeb" : "white",
              border: shop.name ? "2px solid #f6ad55" : "2px dashed #cbd5e0",
              borderRadius: "10px",
              padding: "16px"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 1fr",
                gap: "12px",
                alignItems: "center"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: shop.name ? "#dd6b20" : "#e2e8f0",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={shop.name}
                  onChange={(e) => updateTemuShop(i, "name", e.target.value)}
                  placeholder="店舗名"
                  style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <input
                  type="text"
                  value={shop.phone}
                  onChange={(e) => updateTemuShop(i, "phone", e.target.value)}
                  placeholder="手机号"
                  style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={shop.password}
                  onChange={(e) => updateTemuShop(i, "password", e.target.value)}
                  placeholder="パスワード"
                  style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {visibleTemuCount < 5 && (
          <button
            onClick={handleAddTemu}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "12px",
              background: "white",
              border: "2px dashed #cbd5e0",
              borderRadius: "8px",
              color: "#4a5568",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#dd6b20"
              e.currentTarget.style.color = "#dd6b20"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e0"
              e.currentTarget.style.color = "#4a5568"
            }}>
            ➕ TEMU店舗を追加 ({5 - visibleTemuCount}件まで追加可能)
          </button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        style={{ display: "none" }}
      />

      {/* 底部提示 */}
      <div style={{
        marginTop: "24px",
        padding: "16px",
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#856404"
      }}>
        ⚠️ <strong>注意:</strong> データ削除ボタンはすべての設定を消去します。必要に応じて先にエクスポートしてください。
      </div>
    </div>
  )
}

export default OptionsPage
