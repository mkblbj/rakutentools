import aupayLogo from "data-base64:~assets/aupay-logo.svg"
import icon16 from "data-base64:~assets/icon16.png"
import icon48 from "data-base64:~assets/icon48.png"
import mercariLogo from "data-base64:~assets/mercari-logo.png"
import temuLogo from "data-base64:~assets/temu-logo.svg"
import { useEffect, useState } from "react"

import {
  defaultSyncSettings,
  isCompleteEbayShop,
  isSyncConfigured,
  readLocalConfig,
  readSyncSettings,
  type AupayShop,
  type EbayShop,
  type MercariLink,
  type Shop,
  type SyncSettings,
  type TemuShop
} from "~lib/config"
import {
  createEbayLoginTask,
  createEbaySellerHubUrl,
  EBAY_LOGIN_TASK_KEY
} from "~lib/ebay-login"
import { syncRemoteConfigToLocal } from "~lib/sync"

function IndexPopup() {
  const [shops, setShops] = useState<Shop[]>([])
  const [mercariLinks, setMercariLinks] = useState<MercariLink[]>([])
  const [aupayShops, setAupayShops] = useState<AupayShop[]>([])
  const [temuShops, setTemuShops] = useState<TemuShop[]>([])
  const [ebayShops, setEbayShops] = useState<EbayShop[]>([])
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(
    defaultSyncSettings()
  )
  const [syncNotice, setSyncNotice] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const storedSyncSettings = await readSyncSettings()

        if (!active) {
          return
        }

        setSyncSettings(storedSyncSettings)

        if (isSyncConfigured(storedSyncSettings)) {
          const result = await syncRemoteConfigToLocal({ timeoutMs: 3500 })
          const latestSyncSettings = await readSyncSettings()

          if (!active) {
            return
          }

          setSyncSettings(latestSyncSettings)

          if (!result.ok) {
            setSyncNotice("同步失败，已回退到本地缓存")
          }
        }

        const localData = await readLocalConfig()

        if (!active) {
          return
        }

        setShops(localData.shops)
        setMercariLinks(localData.mercariLinks)
        setAupayShops(localData.aupayShops)
        setTemuShops(localData.temuShops)
        setEbayShops(localData.ebayShops)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const openLogin = async (shopNo: number) => {
    await chrome.storage.local.set({ rms_auto_current_shopno: String(shopNo) })
    chrome.tabs.create({
      url: `https://glogin.rms.rakuten.co.jp/?sp_id=1&shopNo=${shopNo}`
    })
  }

  const openMercari = (url: string) => {
    chrome.tabs.create({ url })
  }

  const openAupay = (shopIndex: number) => {
    chrome.tabs.create({
      url: `https://manager.wowma.jp/wmshopclient/authclient/login?aupayShopNo=${shopIndex}`
    })
  }

  const openTemu = (shopIndex: number) => {
    chrome.tabs.create({
      url: `https://seller.kuajingmaihuo.com/login?temuShopNo=${shopIndex}`
    })
  }

  const openEbay = async (shopIndex: number) => {
    const task = createEbayLoginTask(shopIndex)
    await chrome.storage.local.set({
      [EBAY_LOGIN_TASK_KEY]: task
    })
    chrome.tabs.create({ url: createEbaySellerHubUrl(task) })
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const validShops = shops
    .map((shop, index) => ({ shop, index }))
    .filter(({ shop }) => Boolean(shop?.shopName))
  const validMercariLinks = mercariLinks.filter((link) => link.name && link.url)
  const validAupayShops = aupayShops
    .map((shop, index) => ({ shop, index }))
    .filter(({ shop }) => Boolean(shop.name && shop.loginId))
  const validTemuShops = temuShops
    .map((shop, index) => ({ shop, index }))
    .filter(({ shop }) => Boolean(shop.name && shop.phone))
  const validEbayShops = ebayShops
    .map((shop, index) => ({ shop, index }))
    .filter(({ shop }) => isCompleteEbayShop(shop))

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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px"
          }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              border: "3px solid #e2e8f0",
              borderTopColor: "#007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          />
          読み込み中...
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        width: "280px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#f8fafc",
        minHeight: "100px"
      }}>
      <div
        style={{
          padding: "16px 20px",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "700",
              color: "#2d3748",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
            <img
              src={icon16}
              alt="RMS"
              style={{ width: "20px", height: "20px" }}
            />
            RMS 自動ログイン
          </h1>
          {syncSettings.enabled ? (
            <div
              style={{ marginTop: "4px", fontSize: "11px", color: "#718096" }}>
              遠端同期:{" "}
              {syncSettings.lastSyncStatus === "error" ? "エラー" : "有効"}
            </div>
          ) : null}
        </div>
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
            justifyContent: "center"
          }}>
          ⚙️
        </button>
      </div>

      {syncNotice ? (
        <div
          style={{
            margin: "12px 12px 0",
            padding: "10px 12px",
            background: "#fff5f5",
            border: "1px solid #feb2b2",
            borderRadius: "8px",
            color: "#c53030",
            fontSize: "12px"
          }}>
          {syncNotice}
        </div>
      ) : null}

      {validShops.length > 0 ? (
        <div
          style={{
            padding: "12px 12px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#718096",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
            <img
              src={icon16}
              alt=""
              style={{ width: "14px", height: "14px" }}
            />
            楽天 RMS
          </div>
          {validShops.map(({ shop, index }) => (
            <div
              key={index}
              onClick={() => openLogin(index)}
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
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-1px)"
                event.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(0,0,0,0.05)"
                event.currentTarget.style.borderColor = "#bee3f8"
                event.currentTarget.style.background = "#ebf8ff"
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "none"
                event.currentTarget.style.boxShadow =
                  "0 1px 2px rgba(0,0,0,0.02)"
                event.currentTarget.style.borderColor = "#e2e8f0"
                event.currentTarget.style.background = "white"
              }}>
              <span
                style={{
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
      ) : null}

      {validMercariLinks.length > 0 ? (
        <div
          style={{
            padding: "12px 12px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#718096",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
            <img
              src={mercariLogo}
              alt=""
              style={{ width: "14px", height: "14px" }}
            />
            メルカリ
          </div>
          {validMercariLinks.map((link, index) => (
            <div
              key={`mercari-${index}`}
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
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-1px)"
                event.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(0,0,0,0.05)"
                event.currentTarget.style.borderColor = "#fed7d7"
                event.currentTarget.style.background = "#fff5f5"
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "none"
                event.currentTarget.style.boxShadow =
                  "0 1px 2px rgba(0,0,0,0.02)"
                event.currentTarget.style.borderColor = "#e2e8f0"
                event.currentTarget.style.background = "white"
              }}>
              <span
                style={{
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
      ) : null}

      {validAupayShops.length > 0 ? (
        <div
          style={{
            padding: "12px 12px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#718096",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
            <img
              src={aupayLogo}
              alt=""
              style={{ width: "14px", height: "14px" }}
            />
            auPay Market
          </div>
          {validAupayShops.map(({ shop, index }) => (
            <div
              key={`aupay-${index}`}
              onClick={() => openAupay(index)}
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
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-1px)"
                event.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(0,0,0,0.05)"
                event.currentTarget.style.borderColor = "#fbd38d"
                event.currentTarget.style.background = "#fffaf0"
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "none"
                event.currentTarget.style.boxShadow =
                  "0 1px 2px rgba(0,0,0,0.02)"
                event.currentTarget.style.borderColor = "#e2e8f0"
                event.currentTarget.style.background = "white"
              }}>
              <span
                style={{
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
      ) : null}

      {validTemuShops.length > 0 ? (
        <div
          style={{
            padding: "12px 12px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#718096",
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
            <img
              src={temuLogo}
              alt="TEMU"
              style={{ width: "16px", height: "16px" }}
            />
            TEMU
          </div>
          {validTemuShops.map(({ shop, index }) => (
            <div
              key={`temu-${index}`}
              onClick={() => openTemu(index)}
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
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-1px)"
                event.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(0,0,0,0.05)"
                event.currentTarget.style.borderColor = "#f6ad55"
                event.currentTarget.style.background = "#fffbeb"
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "none"
                event.currentTarget.style.boxShadow =
                  "0 1px 2px rgba(0,0,0,0.02)"
                event.currentTarget.style.borderColor = "#e2e8f0"
                event.currentTarget.style.background = "white"
              }}>
              <span
                style={{
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
      ) : null}

      {validEbayShops.length > 0 ? (
        <div style={{ padding: "12px 12px 0" }}>
          <div
            style={{ fontSize: "11px", fontWeight: "600", color: "#718096" }}>
            eBay Seller Hub
          </div>
          {validEbayShops.map(({ shop, index }) => (
            <div
              key={`ebay-${index}`}
              onClick={() => void openEbay(index)}
              style={{
                marginTop: "8px",
                padding: "12px 16px",
                background: "white",
                border: "1px solid #a9bdf8",
                borderRadius: "8px",
                cursor: "pointer"
              }}>
              {shop.name}
            </div>
          ))}
        </div>
      ) : null}

      {validShops.length === 0 &&
      validMercariLinks.length === 0 &&
      validAupayShops.length === 0 &&
      validTemuShops.length === 0 &&
      validEbayShops.length === 0 ? (
        <div style={{ padding: "12px" }}>
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#718096",
              fontSize: "14px",
              background: "white",
              borderRadius: "8px",
              border: "1px dashed #cbd5e0"
            }}>
            <div style={{ marginBottom: "8px" }}>
              <img
                src={icon48}
                alt="Empty"
                style={{ width: "48px", height: "48px", opacity: 0.5 }}
              />
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
      ) : null}

      {validShops.length > 0 ||
      validMercariLinks.length > 0 ||
      validAupayShops.length > 0 ||
      validTemuShops.length > 0 ||
      validEbayShops.length > 0 ? (
        <div
          style={{
            padding: "8px 16px 12px",
            textAlign: "center",
            color: "#a0aec0",
            fontSize: "11px",
            marginTop: "4px"
          }}>
          {[
            validShops.length > 0 && `RMS ${validShops.length}`,
            validMercariLinks.length > 0 &&
              `メルカリ ${validMercariLinks.length}`,
            validAupayShops.length > 0 && `auPay ${validAupayShops.length}`,
            validTemuShops.length > 0 && `TEMU ${validTemuShops.length}`,
            validEbayShops.length > 0 && `eBay ${validEbayShops.length}`
          ]
            .filter(Boolean)
            .join(" / ")}
        </div>
      ) : null}
    </div>
  )
}

export default IndexPopup
