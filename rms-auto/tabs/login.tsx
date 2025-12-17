import { useEffect, useState } from "react"

function LoginPage() {
  const [status, setStatus] = useState("認証中...")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shopNo = params.get("shopNo")

    if (shopNo) {
      // 跳转到 RMS 登录页面，带上 shopNo 参数
      const loginUrl = `https://glogin.rms.rakuten.co.jp/?sp_id=1&shopNo=${shopNo}`
      window.location.href = loginUrl
    } else {
      setStatus("エラー: 店舗番号が指定されていません")
    }
  }, [])

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "sans-serif",
        fontSize: "16px"
      }}>
      {status}
    </div>
  )
}

export default LoginPage
