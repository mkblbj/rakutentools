import { useEffect, useRef, useState } from "react"

import {
  buildExportData,
  createEmptyAupayShop,
  createEmptyMercariLink,
  createEmptyShop,
  createEmptyTemuShop,
  normalizeExportData,
  readLocalConfig,
  readSyncSettings,
  writeSyncSettings,
  type AupayShop,
  type MercariLink,
  type Shop,
  type SyncSettings,
  type TemuShop
} from "~lib/config"
import { syncRemoteConfigToLocal } from "~lib/sync"

type StatusTone = "success" | "error" | "info"

const pageStyle = {
  padding: "24px",
  maxWidth: "1200px",
  margin: "0 auto",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif",
  background: "#f5f7fa",
  minHeight: "100vh"
} as const

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
} as const

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid #d2d6dc",
  borderRadius: "6px",
  outline: "none",
  boxSizing: "border-box" as const,
  background: "white"
}

const smallLabelStyle = {
  fontSize: "12px",
  color: "#4a5568",
  fontWeight: "600",
  marginBottom: "4px",
  display: "block"
} as const

const getFilledCount = <T,>(
  items: T[],
  isFilled: (item: T) => boolean
): number => {
  return items.reduce((acc, item, index) => {
    return isFilled(item) ? index + 1 : acc
  }, 0)
}

const hasAnyRmsField = (shop: Shop): boolean => {
  return Boolean(
    shop.shopName ||
      shop.loginId ||
      shop.loginPass ||
      shop.userId ||
      shop.userPass
  )
}

const hasAnyMercariField = (link: MercariLink): boolean => {
  return Boolean(link.name || link.url)
}

const hasAnyAupayField = (shop: AupayShop): boolean => {
  return Boolean(shop.name || shop.loginId || shop.password)
}

const hasAnyTemuField = (shop: TemuShop): boolean => {
  return Boolean(shop.name || shop.phone || shop.password)
}

const formatSyncTime = (value?: string): string => {
  if (!value) {
    return "未同步"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString("ja-JP")
}

function OptionsPage() {
  const [inputPin, setInputPin] = useState("")
  const [localPinCode, setLocalPinCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState("")
  const [statusTone, setStatusTone] = useState<StatusTone>("success")
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    enabled: false,
    endpointUrl: "",
    lastSyncStatus: "idle",
    lastSyncMessage: ""
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [localShops, setLocalShops] = useState<Shop[]>(() =>
    Array.from({ length: 20 }, () => createEmptyShop())
  )
  const [mercariLinks, setMercariLinks] = useState<MercariLink[]>(() =>
    Array.from({ length: 5 }, () => createEmptyMercariLink())
  )
  const [aupayShops, setAupayShops] = useState<AupayShop[]>(() =>
    Array.from({ length: 5 }, () => createEmptyAupayShop())
  )
  const [temuShops, setTemuShops] = useState<TemuShop[]>(() =>
    Array.from({ length: 5 }, () => createEmptyTemuShop())
  )

  const [visibleCount, setVisibleCount] = useState(1)
  const [visibleMercariCount, setVisibleMercariCount] = useState(1)
  const [visibleAupayCount, setVisibleAupayCount] = useState(1)
  const [visibleTemuCount, setVisibleTemuCount] = useState(1)

  const setFeedback = (message: string, tone: StatusTone = "success") => {
    setStatus(message)
    setStatusTone(tone)
  }

  const applyConfigState = (data: {
    shops: Shop[]
    mercariLinks: MercariLink[]
    aupayShops: AupayShop[]
    temuShops: TemuShop[]
  }) => {
    setLocalShops(data.shops)
    setMercariLinks(data.mercariLinks)
    setAupayShops(data.aupayShops)
    setTemuShops(data.temuShops)
    setVisibleCount(Math.max(getFilledCount(data.shops, hasAnyRmsField), 1))
    setVisibleMercariCount(
      Math.max(getFilledCount(data.mercariLinks, hasAnyMercariField), 1)
    )
    setVisibleAupayCount(
      Math.max(getFilledCount(data.aupayShops, hasAnyAupayField), 1)
    )
    setVisibleTemuCount(
      Math.max(getFilledCount(data.temuShops, hasAnyTemuField), 1)
    )
  }

  const refreshFromStorage = async () => {
    const [localData, currentSyncSettings] = await Promise.all([
      readLocalConfig(),
      readSyncSettings()
    ])

    setLocalPinCode(localData.rmsPinCode)
    setSyncSettings(currentSyncSettings)
    applyConfigState(localData)
  }

  const runSync = async (successMessage?: string) => {
    setIsSyncing(true)

    try {
      const result = await syncRemoteConfigToLocal({ timeoutMs: 5000 })
      await refreshFromStorage()

      if (result.ok) {
        setFeedback(successMessage ?? result.message, "success")
      } else {
        setFeedback(
          `遠端同期に失敗しました。ローカルキャッシュを使用します: ${result.message}`,
          "error"
        )
      }
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [localData, currentSyncSettings] = await Promise.all([
          readLocalConfig(),
          readSyncSettings()
        ])

        if (!active) {
          return
        }

        setLocalPinCode(localData.rmsPinCode)
        setSyncSettings(currentSyncSettings)
        applyConfigState(localData)

        if (currentSyncSettings.enabled && currentSyncSettings.endpointUrl) {
          setIsSyncing(true)
          const result = await syncRemoteConfigToLocal({ timeoutMs: 5000 })
          const [latestLocal, latestSyncSettings] = await Promise.all([
            readLocalConfig(),
            readSyncSettings()
          ])

          if (!active) {
            return
          }

          setSyncSettings(latestSyncSettings)
          applyConfigState(latestLocal)

          if (!result.ok) {
            setFeedback(
              `遠端同期に失敗しました。ローカルキャッシュを使用します: ${result.message}`,
              "error"
            )
          } else {
            setFeedback(result.message, "success")
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー"
        if (active) {
          setFeedback(`設定の読み込みに失敗しました: ${message}`, "error")
        }
      } finally {
        if (active) {
          setLoading(false)
          setIsSyncing(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const ensurePinAuthorized = (): string | null => {
    const trimmedPin = inputPin.trim()

    if (!trimmedPin) {
      alert("PIN コードを入力してください。")
      return null
    }

    if (localPinCode && trimmedPin !== localPinCode) {
      alert("PIN コードが間違っています。")
      return null
    }

    return trimmedPin
  }

  const persistLocalPin = async (pin: string) => {
    await chrome.storage.local.set({ rmsPinCode: pin })
    setLocalPinCode(pin)
  }

  const updateShop = (index: number, field: keyof Shop, value: string) => {
    setLocalShops((current) => {
      const next = [...current]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const updateMercariLink = (
    index: number,
    field: keyof MercariLink,
    value: string
  ) => {
    setMercariLinks((current) => {
      const next = [...current]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const updateAupayShop = (
    index: number,
    field: keyof AupayShop,
    value: string
  ) => {
    setAupayShops((current) => {
      const next = [...current]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const updateTemuShop = (
    index: number,
    field: keyof TemuShop,
    value: string
  ) => {
    setTemuShops((current) => {
      const next = [...current]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSave = async () => {
    if (syncSettings.enabled) {
      alert("只読同期モードではローカル設定を保存できません。")
      return
    }

    const pin = ensurePinAuthorized()
    if (!pin) {
      return
    }

    for (let index = 0; index < localShops.length; index += 1) {
      const shop = localShops[index]

      if (hasAnyRmsField(shop)) {
        if (
          !shop.shopName ||
          !shop.loginId ||
          !shop.loginPass ||
          !shop.userId ||
          !shop.userPass
        ) {
          alert(`No.${index + 1} に未入力の項目があるため保存できません。`)
          return
        }
      }
    }

    await chrome.storage.local.set({
      rms: localShops,
      rmsPinCode: pin,
      mercariLinks,
      aupayShops,
      temuShops
    })

    setLocalPinCode(pin)
    setFeedback("ローカル設定を保存しました", "success")
  }

  const createExportPayload = () => {
    return buildExportData({
      shops: localShops,
      mercariLinks,
      aupayShops,
      temuShops
    })
  }

  const handleExportFile = async () => {
    const pin = ensurePinAuthorized()
    if (!pin) {
      return
    }

    if (!localPinCode) {
      await persistLocalPin(pin)
    }

    const exportData = createExportPayload()
    const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")

    link.href = url
    link.download = `rms-login-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setFeedback("現在のキャッシュをファイルにエクスポートしました", "success")
  }

  const handleExportClipboard = async () => {
    const pin = ensurePinAuthorized()
    if (!pin) {
      return
    }

    if (!localPinCode) {
      await persistLocalPin(pin)
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(createExportPayload(), null, 2)
      )
      setFeedback("現在のキャッシュをクリップボードにコピーしました", "success")
    } catch (error) {
      alert("クリップボードへのコピーに失敗しました。")
    }
  }

  const applyImportedContent = async (content: string, sourceName: string) => {
    if (syncSettings.enabled) {
      alert("只読同期モードではインポートできません。")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    const pin = ensurePinAuthorized()
    if (!pin) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    try {
      const imported = normalizeExportData(JSON.parse(content))
      const confirmed = confirm(
        `${sourceName} からデータをインポートしますか？\n現在のデータは上書きされます。`
      )

      if (!confirmed) {
        return
      }

      await chrome.storage.local.set({
        rms: imported.shops,
        mercariLinks: imported.mercariLinks,
        aupayShops: imported.aupayShops,
        temuShops: imported.temuShops,
        rmsPinCode: localPinCode || pin
      })

      setLocalPinCode(localPinCode || pin)
      applyConfigState(imported)
      setFeedback("データをインポートしました", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー"
      alert(`データの読み込みに失敗しました: ${message}`)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = async (loadEvent) => {
      await applyImportedContent(
        (loadEvent.target?.result as string) || "",
        file.name
      )
    }
    reader.onerror = () => {
      alert("ファイルの読み込みに失敗しました。")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const handleImportFileClick = () => {
    if (syncSettings.enabled) {
      alert("只読同期モードではインポートできません。")
      return
    }

    if (!ensurePinAuthorized()) {
      return
    }

    fileInputRef.current?.click()
  }

  const handleImportClipboard = async () => {
    if (syncSettings.enabled) {
      alert("只読同期モードではインポートできません。")
      return
    }

    if (!ensurePinAuthorized()) {
      return
    }

    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        alert("クリップボードが空です。")
        return
      }

      await applyImportedContent(text, "クリップボード")
    } catch (error) {
      alert("クリップボードの読み取りに失敗しました。")
    }
  }

  const handleClearData = async () => {
    if (syncSettings.enabled) {
      alert("只読同期モードではデータ削除できません。")
      return
    }

    const pin = ensurePinAuthorized()
    if (!pin) {
      return
    }

    const confirmed = confirm(
      "すべてのデータを削除しますか？\nこの操作は取り消せません。"
    )

    if (!confirmed) {
      return
    }

    await chrome.storage.local.clear()
    alert("データを削除しました。ページを再読み込みします。")
    window.location.reload()
  }

  const handleDebug = async () => {
    const data = await chrome.storage.local.get(null)
    console.log("=== Storage Debug ===")
    console.log("All storage data:", data)
    console.log("rms type:", typeof data.rms)
    console.log("rms isArray:", Array.isArray(data.rms))
    console.log("rms length:", data.rms?.length)
    console.log("rmsPinCode:", data.rmsPinCode)
    console.log("rmsSyncSettings:", data.rmsSyncSettings)
    alert("デバッグ情報をコンソールに出力しました（F12 で確認）。")
  }

  const handleSaveSyncSettings = async () => {
    const pin = ensurePinAuthorized()
    if (!pin) {
      return
    }

    const endpointUrl = syncSettings.endpointUrl.trim()

    if (syncSettings.enabled && !endpointUrl) {
      alert("同期を有効にする場合は内網 JSON アドレスを入力してください。")
      return
    }

    await persistLocalPin(pin)

    const nextSettings = await writeSyncSettings({
      enabled: syncSettings.enabled,
      endpointUrl,
      lastSyncStatus: syncSettings.enabled
        ? syncSettings.lastSyncStatus
        : "idle",
      lastSyncMessage: syncSettings.enabled
        ? syncSettings.lastSyncMessage
        : "同期は無効です"
    })

    setSyncSettings(nextSettings)

    if (!nextSettings.enabled) {
      setFeedback(
        "遠端同期を無効にしました。ローカル設定を編集できます。",
        "success"
      )
      return
    }

    setFeedback("同期設定を保存しました。遠端データを取得しています...", "info")
    await runSync("遠端同期を有効化し、最新設定を取得しました")
  }

  const handleManualSync = async () => {
    const pin = ensurePinAuthorized()
    if (!pin) {
      return
    }

    const endpointUrl = syncSettings.endpointUrl.trim()

    if (!syncSettings.enabled || !endpointUrl) {
      alert("同期が有効ではないか、同期先アドレスが未設定です。")
      return
    }

    await persistLocalPin(pin)
    const nextSettings = await writeSyncSettings({
      ...syncSettings,
      enabled: true,
      endpointUrl
    })
    setSyncSettings(nextSettings)
    await runSync()
  }

  const visibleShops = localShops.slice(0, visibleCount)
  const visibleMercariLinks = mercariLinks.slice(0, visibleMercariCount)
  const visibleAupayShops = aupayShops.slice(0, visibleAupayCount)
  const visibleTemuShops = temuShops.slice(0, visibleTemuCount)
  const isReadOnlySync = syncSettings.enabled
  const statusColor =
    statusTone === "success"
      ? { color: "#276749", background: "#c6f6d5" }
      : statusTone === "error"
        ? { color: "#c53030", background: "#fed7d7" }
        : { color: "#2c5282", background: "#bee3f8" }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>読み込み中...</div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <h1
        style={{
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

      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <h2
          style={{
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}>
          <input
            type="password"
            value={inputPin}
            onChange={(event) => setInputPin(event.target.value)}
            placeholder={
              localPinCode ? "PIN コードを入力" : "この端末の PIN を設定"
            }
            style={{ ...inputStyle, width: "220px" }}
          />
          <span style={{ fontSize: "13px", color: "#718096" }}>
            設定変更、同期先変更、インポート、エクスポート時に使用します
          </span>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "16px"
          }}>
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#2d3748",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
              🌐 遠端只読同期
            </h2>
            <p
              style={{ margin: "8px 0 0", fontSize: "13px", color: "#718096" }}>
              設定ページとポップアップを開いた時に、内網 JSON
              を自動取得してローカルへ反映します。
            </p>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#2d3748"
            }}>
            <input
              type="checkbox"
              checked={syncSettings.enabled}
              onChange={(event) =>
                setSyncSettings((current) => ({
                  ...current,
                  enabled: event.target.checked
                }))
              }
            />
            遠端同期を有効にする
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: "12px"
          }}>
          <input
            type="url"
            value={syncSettings.endpointUrl}
            onChange={(event) =>
              setSyncSettings((current) => ({
                ...current,
                endpointUrl: event.target.value
              }))
            }
            placeholder="http://intranet.local/rms-auto/config.json"
            style={inputStyle}
          />
          <button
            onClick={handleSaveSyncSettings}
            disabled={isSyncing}
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isSyncing ? "not-allowed" : "pointer",
              background: "#0f766e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              opacity: isSyncing ? 0.6 : 1
            }}>
            保存同步设置
          </button>
          <button
            onClick={handleManualSync}
            disabled={
              isSyncing ||
              !syncSettings.enabled ||
              !syncSettings.endpointUrl.trim()
            }
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "600",
              cursor:
                isSyncing ||
                !syncSettings.enabled ||
                !syncSettings.endpointUrl.trim()
                  ? "not-allowed"
                  : "pointer",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              opacity:
                isSyncing ||
                !syncSettings.enabled ||
                !syncSettings.endpointUrl.trim()
                  ? 0.6
                  : 1
            }}>
            {isSyncing ? "同期中..." : "立即同步"}
          </button>
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "14px 16px",
            background:
              syncSettings.lastSyncStatus === "error" ? "#fff5f5" : "#f7fafc",
            border: `1px solid ${syncSettings.lastSyncStatus === "error" ? "#feb2b2" : "#e2e8f0"}`,
            borderRadius: "8px",
            fontSize: "13px",
            color: "#4a5568"
          }}>
          <div>
            状態:{" "}
            <strong>
              {syncSettings.enabled
                ? syncSettings.endpointUrl
                  ? syncSettings.lastSyncStatus === "error"
                    ? "同期エラー"
                    : syncSettings.lastSyncStatus === "success"
                      ? "同期済み"
                      : "待機中"
                  : "アドレス未設定"
                : "同期オフ"}
            </strong>
          </div>
          <div style={{ marginTop: "6px" }}>
            最終同期: {formatSyncTime(syncSettings.lastSyncAt)}
          </div>
          {syncSettings.lastSyncMessage ? (
            <div style={{ marginTop: "6px" }}>
              メッセージ: {syncSettings.lastSyncMessage}
            </div>
          ) : null}
          <div style={{ marginTop: "6px", color: "#718096" }}>
            同期オン時は、店舗設定・インポート・削除はロックされ、遠端 JSON
            が唯一の元データになります。
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center"
          }}>
          <button
            onClick={handleSave}
            disabled={isReadOnlySync}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isReadOnlySync ? "not-allowed" : "pointer",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              opacity: isReadOnlySync ? 0.6 : 1
            }}>
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
                borderRadius: "8px 0 0 8px"
              }}>
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
                borderRadius: "0 8px 8px 0"
              }}>
              📋
            </button>
          </div>

          <div style={{ display: "flex", gap: "2px" }}>
            <button
              onClick={handleImportFileClick}
              disabled={isReadOnlySync}
              style={{
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isReadOnlySync ? "not-allowed" : "pointer",
                background: "#ffc107",
                color: "#000",
                border: "none",
                borderRadius: "8px 0 0 8px",
                opacity: isReadOnlySync ? 0.6 : 1
              }}>
              📁 インポート
            </button>
            <button
              onClick={handleImportClipboard}
              disabled={isReadOnlySync}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                cursor: isReadOnlySync ? "not-allowed" : "pointer",
                background: "#ffc107",
                color: "#000",
                border: "none",
                borderRadius: "0 8px 8px 0",
                opacity: isReadOnlySync ? 0.6 : 1
              }}>
              📋
            </button>
          </div>

          <button
            onClick={handleClearData}
            disabled={isReadOnlySync}
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isReadOnlySync ? "not-allowed" : "pointer",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              opacity: isReadOnlySync ? 0.6 : 1
            }}>
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
              borderRadius: "8px"
            }}>
            🐛 デバッグ
          </button>

          {status ? (
            <span
              style={{
                padding: "8px 16px",
                fontWeight: "600",
                fontSize: "14px",
                borderRadius: "8px",
                ...statusColor
              }}>
              {status}
            </span>
          ) : null}
        </div>
      </div>

      <fieldset
        disabled={isReadOnlySync}
        style={{
          border: "none",
          margin: 0,
          padding: 0,
          minWidth: 0,
          opacity: isReadOnlySync ? 0.75 : 1
        }}>
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "16px",
              flexWrap: "wrap"
            }}>
            <div>
              <h2
                style={{
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
              {isReadOnlySync ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "13px",
                    color: "#c05621"
                  }}>
                  同期オンのため、このエリアは読み取り専用です。
                </p>
              ) : null}
            </div>
            <label
              style={{
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
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              パスワードを表示
            </label>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {visibleShops.map((shop, index) => (
              <div
                key={index}
                style={{
                  background: shop.shopName ? "#f8fafc" : "white",
                  border: shop.shopName
                    ? "2px solid #e2e8f0"
                    : "2px dashed #cbd5e0",
                  borderRadius: "10px",
                  padding: "16px"
                }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px minmax(0, 1fr)",
                    gap: "16px",
                    alignItems: "start"
                  }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: shop.shopName ? "#007bff" : "#e2e8f0",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}>
                    {index + 1}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      minWidth: 0
                    }}>
                    <div>
                      <label style={smallLabelStyle}>店舗名</label>
                      <input
                        type="text"
                        value={shop.shopName}
                        onChange={(event) =>
                          updateShop(index, "shopName", event.target.value)
                        }
                        placeholder="店舗名を入力"
                        style={{
                          ...inputStyle,
                          fontSize: "16px",
                          fontWeight: "500"
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1px 1fr",
                        background: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        overflow: "hidden"
                      }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          padding: "20px",
                          background: "rgba(235, 248, 255, 0.3)"
                        }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#2b6cb0"
                          }}>
                          🔵 R-Login (共通ID)
                        </div>
                        <div>
                          <label style={smallLabelStyle}>R-Login ID</label>
                          <input
                            type="text"
                            value={shop.loginId}
                            onChange={(event) =>
                              updateShop(index, "loginId", event.target.value)
                            }
                            placeholder="R-Login ID"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={smallLabelStyle}>
                            R-Login パスワード
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={shop.loginPass}
                            onChange={(event) =>
                              updateShop(index, "loginPass", event.target.value)
                            }
                            placeholder="パスワード"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ background: "#e2e8f0", width: "1px" }} />

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          padding: "20px",
                          background: "rgba(255, 245, 245, 0.3)"
                        }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#c53030"
                          }}>
                          🔴 楽天会員 (個人ID)
                        </div>
                        <div>
                          <label style={smallLabelStyle}>
                            楽天会員 ユーザID
                          </label>
                          <input
                            type="text"
                            value={shop.userId}
                            onChange={(event) =>
                              updateShop(index, "userId", event.target.value)
                            }
                            placeholder="楽天会員ID"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={smallLabelStyle}>
                            楽天会員 パスワード
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={shop.userPass}
                            onChange={(event) =>
                              updateShop(index, "userPass", event.target.value)
                            }
                            placeholder="パスワード"
                            style={inputStyle}
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
              onClick={() => setVisibleCount((current) => current + 1)}
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
                cursor: "pointer"
              }}>
              ➕ 店舗を追加 ({20 - visibleCount}件まで追加可能)
            </button>
          ) : (
            <div
              style={{
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

        <div style={{ ...cardStyle, marginTop: "24px" }}>
          <h2
            style={{
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
          <p
            style={{
              fontSize: "13px",
              color: "#718096",
              marginBottom: "16px"
            }}>
            メルカリは入口リンクのみ保存します。
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {visibleMercariLinks.map((link, index) => (
              <div
                key={index}
                style={{
                  background: link.name ? "#fff5f5" : "white",
                  border: link.name
                    ? "2px solid #fed7d7"
                    : "2px dashed #cbd5e0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 2fr",
                  gap: "12px",
                  alignItems: "center"
                }}>
                <div
                  style={{
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
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={link.name}
                  onChange={(event) =>
                    updateMercariLink(index, "name", event.target.value)
                  }
                  placeholder="店舗名"
                  style={inputStyle}
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(event) =>
                    updateMercariLink(index, "url", event.target.value)
                  }
                  placeholder="https://mercari-shops.com/..."
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          {visibleMercariCount < 5 ? (
            <button
              onClick={() => setVisibleMercariCount((current) => current + 1)}
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
                cursor: "pointer"
              }}>
              ➕ メルカリ店舗を追加 ({5 - visibleMercariCount}件まで追加可能)
            </button>
          ) : null}
        </div>

        <div style={{ ...cardStyle, marginTop: "24px" }}>
          <h2
            style={{
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
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {visibleAupayShops.map((shop, index) => (
              <div
                key={index}
                style={{
                  background: shop.name ? "#fffaf0" : "white",
                  border: shop.name
                    ? "2px solid #fbd38d"
                    : "2px dashed #cbd5e0",
                  borderRadius: "10px",
                  padding: "16px"
                }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 1fr 1fr",
                    gap: "12px",
                    alignItems: "center"
                  }}>
                  <div
                    style={{
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
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={shop.name}
                    onChange={(event) =>
                      updateAupayShop(index, "name", event.target.value)
                    }
                    placeholder="店舗名"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={shop.loginId}
                    onChange={(event) =>
                      updateAupayShop(index, "loginId", event.target.value)
                    }
                    placeholder="ログインID"
                    style={inputStyle}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={shop.password}
                    onChange={(event) =>
                      updateAupayShop(index, "password", event.target.value)
                    }
                    placeholder="パスワード"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>

          {visibleAupayCount < 5 ? (
            <button
              onClick={() => setVisibleAupayCount((current) => current + 1)}
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
                cursor: "pointer"
              }}>
              ➕ auPay店舗を追加 ({5 - visibleAupayCount}件まで追加可能)
            </button>
          ) : null}
        </div>

        <div style={{ ...cardStyle, marginTop: "24px" }}>
          <h2
            style={{
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
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {visibleTemuShops.map((shop, index) => (
              <div
                key={index}
                style={{
                  background: shop.name ? "#fffbeb" : "white",
                  border: shop.name
                    ? "2px solid #f6ad55"
                    : "2px dashed #cbd5e0",
                  borderRadius: "10px",
                  padding: "16px"
                }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 1fr 1fr",
                    gap: "12px",
                    alignItems: "center"
                  }}>
                  <div
                    style={{
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
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={shop.name}
                    onChange={(event) =>
                      updateTemuShop(index, "name", event.target.value)
                    }
                    placeholder="店舗名"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={shop.phone}
                    onChange={(event) =>
                      updateTemuShop(index, "phone", event.target.value)
                    }
                    placeholder="手机号"
                    style={inputStyle}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={shop.password}
                    onChange={(event) =>
                      updateTemuShop(index, "password", event.target.value)
                    }
                    placeholder="パスワード"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>

          {visibleTemuCount < 5 ? (
            <button
              onClick={() => setVisibleTemuCount((current) => current + 1)}
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
                cursor: "pointer"
              }}>
              ➕ TEMU店舗を追加 ({5 - visibleTemuCount}件まで追加可能)
            </button>
          ) : null}
        </div>
      </fieldset>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        style={{ display: "none" }}
      />

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          background: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#856404"
        }}>
        ⚠️ <strong>注意:</strong>{" "}
        遠端同期オン時は、この端末のデータはキャッシュ扱いです。共有設定を変える場合は、内網
        JSON の内容を更新してください。
      </div>
    </div>
  )
}

export default OptionsPage
