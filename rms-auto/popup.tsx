import { useEffect, useState } from "react"

// 使用 Plasmo 的 data-base64 方式导入图片
import icon16 from "data-base64:~assets/icon16.png"
import icon48 from "data-base64:~assets/icon48.png"
import mercariLogo from "data-base64:~assets/mercari-logo.png"
import aupayLogo from "data-base64:~assets/aupay-logo.svg"
import temuLogo from "data-base64:~assets/temu-logo.svg"

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

function IndexPopup() {
  const [shops, setShops] = useState<Shop[]>([])
  const [mercariLinks, setMercariLinks] = useState<MercariLink[]>([])
  const [aupayShops, setAupayShops] = useState<AupayShop[]>([])
  const [temuShops, setTemuShops] = useState<TemuShop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.storage.local.get(["rms", "mercariLinks", "aupayShops", "temuShops"], (data) => {
      if (data.rms && Array.isArray(data.rms)) {
        setShops(data.rms)
      }
      if (data.mercariLinks && Array.isArray(data.mercariLinks)) {
        setMercariLinks(data.mercariLinks)
      }
      if (data.aupayShops && Array.isArray(data.aupayShops)) {
        setAupayShops(data.aupayShops)
      }
      if (data.temuShops && Array.isArray(data.temuShops)) {
        setTemuShops(data.temuShops)
      }
      setLoading(false)
    })
  }, [])

  const openLogin = (shopNo: number) => {
    chrome.tabs.create({ url: `https://glogin.rms.rakuten.co.jp/?sp_id=1&shopNo=${shopNo}` })
  }

  const openMercari = (url: string) => {
    chrome.tabs.create({ url })
  }

  const openAupay = (shopIndex: number) => {
    chrome.tabs.create({ url: `https://manager.wowma.jp/wmshopclient/authclient/login?aupayShopNo=${shopIndex}` })
  }

  const openTemu = (shopIndex: number) => {
    chrome.tabs.create({ url: `https://seller.kuajingmaihuo.com/login?temuShopNo=${shopIndex}` })
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  if (loading) {
    return (
      <div
        style={{
          width: "280px",
          height: "300px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "14px",
          color: "#718096",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
        }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "24px",
            height: "24px",
            border: "3px solid #e2e8f0",
            borderTopColor: "#007bff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          読み込み中...
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  const validShops = shops.filter((s) => s?.shopName)

  return (
    <div style={{ 
      width: "280px", 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#f8fafc",
      minHeight: "100px"
    }}>
      {/* 头部 */}
      <div style={{
        padding: "16px 20px",
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: "16px", 
          fontWeight: "700", 
          color: "#2d3748",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <img src={icon16} alt="RMS" style={{ width: "20px", height: "20px" }} />
          RMS 自動ログイン
        </h1>
        <button
          onClick={openOptions}
          title="設定を開く"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            padding: "4px",
            borderRadius: "4px",
            color: "#718096",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#edf2f7"
            e.currentTarget.style.color = "#4a5568"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "#718096"
          }}>
          ⚙️
        </button>
      </div>

      {/* RMS 店铺列表 */}
      {validShops.length > 0 && (
        <div style={{ padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#718096", padding: "0 4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <img src={icon16} alt="" style={{ width: "14px", height: "14px" }} />
            楽天 RMS
          </div>
          {validShops.map((shop, i) => (
            <div
              key={i}
              onClick={() => openLogin(i)}
              style={{
                padding: "12px 16px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)"
                e.currentTarget.style.borderColor = "#bee3f8"
                e.currentTarget.style.background = "#ebf8ff"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none"
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)"
                e.currentTarget.style.borderColor = "#e2e8f0"
                e.currentTarget.style.background = "white"
              }}>
              <span style={{ 
                fontWeight: "600", 
                color: "#2d3748", 
                fontSize: "14px"
              }}>
                {shop.shopName}
              </span>
              <span style={{ color: "#cbd5e0", fontSize: "12px" }}>➜</span>
            </div>
          ))}
        </div>
      )}

      {/* メルカリ 链接列表 */}
      {mercariLinks.filter(l => l.name && l.url).length > 0 && (
        <div style={{ padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#718096", padding: "0 4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <img src={mercariLogo} alt="" style={{ width: "14px", height: "14px" }} />
            メルカリ
          </div>
          {mercariLinks.filter(l => l.name && l.url).map((link, i) => (
            <div
              key={`mercari-${i}`}
              onClick={() => openMercari(link.url)}
              style={{
                padding: "12px 16px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)"
                e.currentTarget.style.borderColor = "#fed7d7"
                e.currentTarget.style.background = "#fff5f5"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none"
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)"
                e.currentTarget.style.borderColor = "#e2e8f0"
                e.currentTarget.style.background = "white"
              }}>
              <span style={{ 
                fontWeight: "600", 
                color: "#2d3748", 
                fontSize: "14px"
              }}>
                {link.name}
              </span>
              <span style={{ color: "#cbd5e0", fontSize: "12px" }}>➜</span>
            </div>
          ))}
        </div>
      )}

      {/* auPay Market 店铺列表 */}
      {aupayShops.filter(s => s.name && s.loginId).length > 0 && (
        <div style={{ padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#718096", padding: "0 4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <img src={aupayLogo} alt="" style={{ width: "14px", height: "14px" }} />
            auPay Market
          </div>
          {aupayShops.filter(s => s.name && s.loginId).map((shop, i) => (
            <div
              key={`aupay-${i}`}
              onClick={() => openAupay(i)}
              style={{
                padding: "12px 16px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)"
                e.currentTarget.style.borderColor = "#fbd38d"
                e.currentTarget.style.background = "#fffaf0"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none"
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)"
                e.currentTarget.style.borderColor = "#e2e8f0"
                e.currentTarget.style.background = "white"
              }}>
              <span style={{ 
                fontWeight: "600", 
                color: "#2d3748", 
                fontSize: "14px"
              }}>
                {shop.name}
              </span>
              <span style={{ color: "#cbd5e0", fontSize: "12px" }}>➜</span>
            </div>
          ))}
        </div>
      )}

      {/* TEMU 店铺列表 */}
      {temuShops.filter(s => s.name && s.phone).length > 0 && (
        <div style={{ padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#718096", padding: "0 4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <img src={temuLogo} alt="TEMU" style={{ width: "16px", height: "16px" }} /> TEMU
          </div>
          {temuShops.filter(s => s.name && s.phone).map((shop, i) => (
            <div
              key={`temu-${i}`}
              onClick={() => openTemu(i)}
              style={{
                padding: "12px 16px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)"
                e.currentTarget.style.borderColor = "#f6ad55"
                e.currentTarget.style.background = "#fffbeb"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none"
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)"
                e.currentTarget.style.borderColor = "#e2e8f0"
                e.currentTarget.style.background = "white"
              }}>
              <span style={{ 
                fontWeight: "600", 
                color: "#2d3748", 
                fontSize: "14px"
              }}>
                {shop.name}
              </span>
              <span style={{ color: "#cbd5e0", fontSize: "12px" }}>➜</span>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {validShops.length === 0 && mercariLinks.filter(l => l.name && l.url).length === 0 && aupayShops.filter(s => s.name && s.loginId).length === 0 && temuShops.filter(s => s.name && s.phone).length === 0 && (
        <div style={{ padding: "12px" }}>
          <div style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "#718096",
            fontSize: "14px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #cbd5e0"
          }}>
            <div style={{ marginBottom: "8px" }}>
              <img src={icon48} alt="Empty" style={{ width: "48px", height: "48px", opacity: 0.5 }} />
            </div>
            店舗が設定されていません
            <div style={{ marginTop: "12px" }}>
              <button
                onClick={openOptions}
                style={{
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}>
                設定画面へ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部信息 */}
      {(validShops.length > 0 || mercariLinks.filter(l => l.name && l.url).length > 0 || aupayShops.filter(s => s.name && s.loginId).length > 0 || temuShops.filter(s => s.name && s.phone).length > 0) && (
        <div style={{
          padding: "8px 16px 12px",
          textAlign: "center",
          color: "#a0aec0",
          fontSize: "11px",
          marginTop: "4px"
        }}>
          {[
            validShops.length > 0 && `RMS ${validShops.length}`,
            mercariLinks.filter(l => l.name && l.url).length > 0 && `メルカリ ${mercariLinks.filter(l => l.name && l.url).length}`,
            aupayShops.filter(s => s.name && s.loginId).length > 0 && `auPay ${aupayShops.filter(s => s.name && s.loginId).length}`,
            temuShops.filter(s => s.name && s.phone).length > 0 && `TEMU ${temuShops.filter(s => s.name && s.phone).length}`
          ].filter(Boolean).join(" / ")}
        </div>
      )}
    </div>
  )
}

export default IndexPopup
