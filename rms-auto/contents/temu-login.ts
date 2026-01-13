import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://seller.kuajingmaihuo.com/login*"],
  all_frames: true
}

interface TemuShop {
  name: string
  phone: string
  password: string
}

let hasExecuted = false

const getShopNo = (): string | null => {
  const url = new URL(window.location.href)
  const shopNo = url.searchParams.get("temuShopNo")
  if (!shopNo || !shopNo.match(/^[0-9]+$/)) {
    return null
  }
  return shopNo
}

const clickAccountLoginTab = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 查找"账号登录"按钮
    const tabs = document.querySelectorAll("div")
    for (const tab of tabs) {
      if (tab.textContent === "账号登录") {
        console.log("[TEMU Auto Login] Found '账号登录' tab, clicking...")
        tab.click()
        setTimeout(() => resolve(true), 500)
        return
      }
    }
    console.log("[TEMU Auto Login] '账号登录' tab not found")
    resolve(false)
  })
}

const autoFillLogin = async () => {
  // 防止重复执行
  if (hasExecuted) {
    console.log("[TEMU Auto Login] Already executed, skipping")
    return
  }
  hasExecuted = true
  
  console.log("[TEMU Auto Login] Script loaded, URL:", window.location.href)
  
  const shopNo = getShopNo()
  console.log("[TEMU Auto Login] ShopNo:", shopNo)
  
  // 如果没有 shopNo，不做任何事情
  if (!shopNo) {
    console.log("[TEMU Auto Login] No shopNo in URL, skipping auto-fill")
    return
  }

  try {
    const data = await chrome.storage.local.get("temuShops")
    const shops: TemuShop[] = data.temuShops || []
    console.log("[TEMU Auto Login] Loaded shops:", shops.length)
    
    const shop = shops[parseInt(shopNo)]

    if (!shop || !shop.name) {
      console.log("[TEMU Auto Login] Shop data not found for shopNo:", shopNo)
      return
    }
    
    console.log("[TEMU Auto Login] Found shop:", shop.name)

    // 先点击"账号登录"标签切换到账号密码登录界面
    await clickAccountLoginTab()
    
    // 等待界面切换后查找表单元素
    setTimeout(async () => {
      // 手机号输入框
      const phoneInput = document.querySelector<HTMLInputElement>("input#usernameId")
      
      // 密码输入框
      const passwordInput = document.querySelector<HTMLInputElement>("input#passwordId")
      
      // 登录按钮
      const submitBtn = document.querySelector<HTMLButtonElement>("button")
      
      // 协议复选框
      const checkbox = document.querySelector<HTMLInputElement>("input[type='checkbox']")

      if (phoneInput && passwordInput) {
        console.log("[TEMU Auto Login] Found login form elements")
        
        // 填充手机号
        phoneInput.value = shop.phone
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }))
        
        // 填充密码
        passwordInput.value = shop.password
        passwordInput.dispatchEvent(new Event("input", { bubbles: true }))
        
        console.log("[TEMU Auto Login] Filled credentials")
        
        // 勾选协议复选框
        if (checkbox && !checkbox.checked) {
          console.log("[TEMU Auto Login] Clicking checkbox")
          checkbox.click()
        }
        
        // 点击登录按钮
        if (submitBtn && submitBtn.textContent?.includes("登录")) {
          console.log("[TEMU Auto Login] Clicking submit button in 500ms")
          setTimeout(() => {
            console.log("[TEMU Auto Login] Clicking submit")
            submitBtn.click()
          }, 500)
        }
      } else {
        console.log("[TEMU Auto Login] Login form elements not found")
        console.log("[TEMU Auto Login] phoneInput:", phoneInput)
        console.log("[TEMU Auto Login] passwordInput:", passwordInput)
      }
    }, 800)
  } catch (error) {
    console.error("[TEMU Auto Login] Error:", error)
  }
}

// 等待 DOM 加载完成后执行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[TEMU Auto Login] DOMContentLoaded event")
    setTimeout(autoFillLogin, 500)
  })
} else {
  console.log("[TEMU Auto Login] DOM already loaded")
  setTimeout(autoFillLogin, 500)
}

// 页面完全加载后也尝试一次
window.addEventListener("load", () => {
  console.log("[TEMU Auto Login] Window load event")
  setTimeout(autoFillLogin, 800)
})
