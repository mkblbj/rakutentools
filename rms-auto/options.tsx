import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useRef, useState } from "react"

interface Shop {
  shopName: string
  loginId: string
  loginPass: string
  userId: string
  userPass: string
}

interface ExportData {
  version: string
  exportDate: string
  shops: Shop[]
}

function OptionsPage() {
  const [shops, setShops] = useStorage<Shop[]>({
    key: "rms",
    instance: new Storage({ area: "local" })
  })

  const [pinCode, setPinCode] = useStorage<string>({
    key: "rmsPinCode",
    instance: new Storage({ area: "local" })
  })

  const [inputPin, setInputPin] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 初始化空数据
  const normalizedShops = shops || Array.from({ length: 20 }, () => ({
    shopName: "",
    loginId: "",
    loginPass: "",
    userId: "",
    userPass: ""
  }))

  const normalizedPinCode = pinCode || ""

  const handleSave = () => {
    if (inputPin.length === 0) {
      alert("PINコードが入力されていません。")
      return
    }

    if (normalizedPinCode !== "" && inputPin !== normalizedPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    // 验证输入
    for (let i = 0; i < normalizedShops.length; i++) {
      const shop = normalizedShops[i]
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

    setShops(normalizedShops)
    setPinCode(inputPin)
    setStatus("設定を保存しました")
    setTimeout(() => setStatus(""), 5000)
  }

  const updateShop = (index: number, field: keyof Shop, value: string) => {
    const newShops = [...normalizedShops]
    newShops[index] = { ...newShops[index], [field]: value }
    setShops(newShops)
  }

  const handleExport = () => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      return
    }

    if (normalizedPinCode !== "" && inputPin !== normalizedPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    const exportData: ExportData = {
      version: "0.1.1",
      exportDate: new Date().toISOString(),
      shops: normalizedShops
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

    setStatus("データをエクスポートしました")
    setTimeout(() => setStatus(""), 3000)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    if (normalizedPinCode !== "" && inputPin !== normalizedPinCode) {
      alert("PINコードが間違っています。")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
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
          `${file.name} からデータをインポートしますか？\n現在のデータは上書きされます。`
        )

        if (confirmed) {
          setShops(newShops)
          setStatus("データをインポートしました")
          setTimeout(() => setStatus(""), 3000)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー"
        alert("ファイルの読み込みに失敗しました: " + message)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    reader.onerror = () => {
      alert("ファイルの読み込みに失敗しました")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }

    reader.readAsText(file)
  }

  const handleImportClick = () => {
    if (inputPin.length === 0) {
      alert("PINコードを入力してください。")
      return
    }

    if (normalizedPinCode !== "" && inputPin !== normalizedPinCode) {
      alert("PINコードが間違っています。")
      return
    }

    fileInputRef.current?.click()
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>RMS自動ログイン設定</h1>

      <table
        style={{
          borderCollapse: "collapse",
          marginBottom: "20px",
          width: "100%"
        }}>
        <tbody>
          <tr>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5",
                width: "150px"
              }}>
              PINコード
            </th>
            <td style={{ border: "1px solid #ccc", padding: "8px" }}>
              <input
                type="password"
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                size={15}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5"
              }}>
              No.
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5"
              }}>
              店舗
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5"
              }}>
              R-Login ID
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5"
              }}>
              R-Login パスワード
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                表示
              </label>
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5"
              }}>
              楽天会員ユーザID
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5"
              }}>
              楽天会員パスワード
            </th>
          </tr>
        </thead>
        <tbody>
          {normalizedShops.map((shop, i) => (
            <tr key={i}>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  background: "#f9f9f9"
                }}>
                {i + 1}
              </th>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <input
                  type="text"
                  value={shop.shopName}
                  onChange={(e) => updateShop(i, "shopName", e.target.value)}
                  size={20}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <input
                  type="text"
                  value={shop.loginId}
                  onChange={(e) => updateShop(i, "loginId", e.target.value)}
                  size={20}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={shop.loginPass}
                  onChange={(e) => updateShop(i, "loginPass", e.target.value)}
                  size={15}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <input
                  type="text"
                  value={shop.userId}
                  onChange={(e) => updateShop(i, "userId", e.target.value)}
                  size={20}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <input
                  type="password"
                  value={shop.userPass}
                  onChange={(e) => updateShop(i, "userPass", e.target.value)}
                  size={15}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            cursor: "pointer",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}>
          保存
        </button>
        
        <button
          onClick={handleExport}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            cursor: "pointer",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}>
          エクスポート
        </button>

        <button
          onClick={handleImportClick}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            cursor: "pointer",
            background: "#ffc107",
            color: "#000",
            border: "none",
            borderRadius: "4px"
          }}>
          インポート
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: "none" }}
        />

        {status && (
          <span style={{ marginLeft: "10px", color: "green", fontWeight: "bold" }}>
            {status}
          </span>
        )}
      </div>
    </div>
  )
}

export default OptionsPage
