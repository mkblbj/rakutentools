import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://manager.wowma.jp/wmshopclient/authclient/login*"],
  all_frames: true
}

interface AupayShop {
  name: string
  loginId: string
  password: string
}

const getShopNo = (): string | null => {
  const url = new URL(window.location.href)
  const shopNo = url.searchParams.get("aupayShopNo")
  if (!shopNo || !shopNo.match(/^[0-9]+$/)) {
    return null
  }
  return shopNo
}

const autoFillLogin = async () => {
  console.log("[auPay Auto Login] Script loaded, URL:", window.location.href)
  
  const shopNo = getShopNo()
  console.log("[auPay Auto Login] ShopNo:", shopNo)
  
  // 如果没有 shopNo，不做任何事情
  if (!shopNo) {
    console.log("[auPay Auto Login] No shopNo in URL, skipping auto-fill")
    return
  }

  try {
    const data = await chrome.storage.local.get("aupayShops")
    const shops: AupayShop[] = data.aupayShops || []
    console.log("[auPay Auto Login] Loaded shops:", shops.length)
    
    const shop = shops[parseInt(shopNo)]

    if (!shop || !shop.name) {
      console.log("[auPay Auto Login] Shop data not found for shopNo:", shopNo)
      return
    }
    
    console.log("[auPay Auto Login] Found shop:", shop.name)

    // 查找登录表单元素（基于实际页面结构）
    // 登录 ID 输入框
    const loginIdInput = document.querySelector<HTMLInputElement>("input#loginId")
    
    // 密码输入框
    const passwordInput = document.querySelector<HTMLInputElement>("input#password")
    
    // 登录按钮
    const submitBtn = document.querySelector<HTMLInputElement>("input#btnLogin")

    if (loginIdInput && passwordInput) {
      console.log("[auPay Auto Login] Found login form elements")
      
      // 填充登录信息
      loginIdInput.value = shop.loginId
      loginIdInput.dispatchEvent(new Event("input", { bubbles: true }))
      
      passwordInput.value = shop.password
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }))
      
      console.log("[auPay Auto Login] Filled credentials")
      
      // 点击登录按钮
      if (submitBtn) {
        console.log("[auPay Auto Login] Clicking submit button in 500ms")
        setTimeout(() => {
          console.log("[auPay Auto Login] Clicking submit")
          submitBtn.click()
        }, 500)
      }
    } else {
      console.log("[auPay Auto Login] Login form elements not found")
      console.log("[auPay Auto Login] loginIdInput:", loginIdInput)
      console.log("[auPay Auto Login] passwordInput:", passwordInput)
    }
  } catch (error) {
    console.error("[auPay Auto Login] Error:", error)
  }
}

// 等待 DOM 加载完成后执行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[auPay Auto Login] DOMContentLoaded event")
    setTimeout(autoFillLogin, 300)
  })
} else {
  console.log("[auPay Auto Login] DOM already loaded")
  setTimeout(autoFillLogin, 300)
}

// 页面完全加载后也尝试一次
window.addEventListener("load", () => {
  console.log("[auPay Auto Login] Window load event")
  setTimeout(autoFillLogin, 500)
})
