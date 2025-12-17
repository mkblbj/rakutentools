import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useEffect } from "react"

interface Shop {
  shopName: string
  loginId: string
  loginPass: string
  userId: string
  userPass: string
}

function IndexPopup() {
  const [shops] = useStorage<Shop[]>({
    key: "rms",
    instance: new Storage({ area: "local" })
  })

  const openLogin = (shopNo: number) => {
    chrome.tabs.create({ url: `tabs/login.html?shopNo=${shopNo}` })
  }

  if (!shops || shops.filter((s) => s?.shopName).length === 0) {
    return (
      <div
        style={{
          minWidth: "200px",
          padding: "10px",
          textAlign: "center",
          fontSize: "12px"
        }}>
        店舗が設定されていません
      </div>
    )
  }

  return (
    <div style={{ minWidth: "200px", overflow: "hidden" }}>
      {shops.map(
        (shop, i) =>
          shop?.shopName && (
            <div
              key={i}
              onClick={() => openLogin(i)}
              style={{
                border: "1px solid #999999",
                padding: "3px",
                width: "200px",
                height: "16px",
                fontSize: "12px",
                textAlign: "center",
                cursor: "pointer",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffeedd"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
              }}>
              {shop.shopName}
            </div>
          )
      )}
    </div>
  )
}

export default IndexPopup
