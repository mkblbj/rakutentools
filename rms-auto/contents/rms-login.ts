import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://glogin.rms.rakuten.co.jp/*"],
  all_frames: true
}

interface Shop {
  shopName: string
  loginId: string
  loginPass: string
  userId: string
  userPass: string
}

const getShopNo = (): string | null => {
  const url = new URL(window.location.href)
  const shopNo = url.searchParams.get("shopNo")
  if (!shopNo || !shopNo.match(/^-?[0-9]+$/)) {
    return null
  }
  return shopNo
}

const waitForElement = (
  selector: string,
  timeout = 5000
): Promise<Element | null> => {
  return new Promise((resolve) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

const autoFillLogin = async () => {
  console.log("[RMS Auto Login] Script loaded, URL:", window.location.href)
  
  // 检查密码错误
  if (document.body.innerHTML.includes("R-Loginパスワードに誤りがある")) {
    alert("パスワードが変わっています。")
    return
  }

  const shopNo = getShopNo()
  console.log("[RMS Auto Login] ShopNo:", shopNo)
  
  // 保存 shopNo 到 chrome.storage.local，供乐天会员登录页面使用（跨域共享）
  if (shopNo) {
    try {
      await chrome.storage.local.set({ rms_auto_current_shopno: shopNo })
      console.log("[RMS Auto Login] Saved shopNo to chrome.storage:", shopNo)
    } catch (e) {
      console.error("[RMS Auto Login] Failed to save shopNo:", e)
    }
  }
  
  // 检查是否是登录页面（有输入框）
  const hasLoginInputs = document.querySelector("input#rlogin-username-ja") || 
                         document.querySelector("input#rlogin-username-2-ja")
  
  // 如果是登录页面但没有 shopNo，不做任何事情（让用户手动输入）
  if (hasLoginInputs && !shopNo) {
    console.log("[RMS Auto Login] Login page without shopNo, skipping auto-fill")
    return
  }
  
  // 如果不是登录页面（没有输入框），检查是否有"次へ"按钮需要点击
  if (!hasLoginInputs) {
    const submitBtn = document.querySelector<HTMLButtonElement>("button[name='submit']")
    if (submitBtn && submitBtn.textContent?.trim() === "次へ") {
      console.log("[RMS Auto Login] Confirmation page, clicking '次へ' in 300ms")
      setTimeout(() => submitBtn.click(), 300)
    }
    return
  }

  try {
    const data = await chrome.storage.local.get("rms")
    const shops: Shop[] = data.rms || []
    console.log("[RMS Auto Login] Loaded shops:", shops.length)
    
    const shop = shops[parseInt(shopNo)]

    if (!shop || !shop.shopName) {
      console.log("[RMS Auto Login] Shop data not found for shopNo:", shopNo)
      return
    }
    
    console.log("[RMS Auto Login] Found shop:", shop.shopName)

    // R-Login ID 认证
    const usernameInput = document.querySelector<HTMLInputElement>(
      "input#rlogin-username-ja"
    )
    if (usernameInput) {
      console.log("[RMS Auto Login] Found R-Login ID input")
      const passwordInput = document.querySelector<HTMLInputElement>(
        "input#rlogin-password-ja"
      )
      const form = document.querySelector<HTMLFormElement>("form")
      const submitBtn = document.querySelector<HTMLButtonElement>(
        "button[name='submit']"
      )

      if (passwordInput && submitBtn) {
        console.log("[RMS Auto Login] Filling R-Login credentials")
        // 修改 form action 以保留 shopNo 参数（像旧版一样直接追加）
        if (form && form.action) {
          const currentAction = form.getAttribute("action") || ""
          if (!currentAction.includes("shopNo=")) {
            form.setAttribute("action", currentAction + "?shopNo=" + shopNo)
            console.log("[RMS Auto Login] Updated form action:", form.getAttribute("action"))
          }
        }

        usernameInput.value = shop.loginId
        passwordInput.value = shop.loginPass
        console.log("[RMS Auto Login] Submitting form in 500ms")
        setTimeout(() => {
          console.log("[RMS Auto Login] Clicking submit button")
          submitBtn.click()
        }, 500)
      }
      return
    }

    // 楽天会员认证
    const username2Input = document.querySelector<HTMLInputElement>(
      "input#rlogin-username-2-ja"
    )
    if (username2Input) {
      console.log("[RMS Auto Login] Found Rakuten Member input")
      const password2Input = document.querySelector<HTMLInputElement>(
        "input#rlogin-password-2-ja"
      )
      const submitBtn = document.querySelector<HTMLButtonElement>(
        "button[name='submit']"
      )

      if (password2Input && submitBtn) {
        console.log("[RMS Auto Login] Filling Rakuten Member credentials")
        username2Input.value = shop.userId
        password2Input.value = shop.userPass
        setTimeout(() => {
          console.log("[RMS Auto Login] Submitting Rakuten form")
          submitBtn.click()
        }, 500)
      }
      return
    }

    // 自动点击"次へ"按钮
    const submitBtn = document.querySelector<HTMLButtonElement>(
      "button[name='submit']"
    )
    if (submitBtn && submitBtn.textContent?.trim() === "次へ") {
      console.log("[RMS Auto Login] Found '次へ' button, clicking in 500ms")
      setTimeout(() => {
        console.log("[RMS Auto Login] Clicking '次へ' button")
        submitBtn.click()
      }, 500)
    }
  } catch (error) {
    console.error("Error in autoFillLogin:", error)
  }
}

// 等待 DOM 加载完成后执行，并在页面完全加载后再次尝试
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[RMS Auto Login] DOMContentLoaded event")
    setTimeout(autoFillLogin, 100)
  })
} else {
  console.log("[RMS Auto Login] DOM already loaded")
  setTimeout(autoFillLogin, 100)
}

// 页面完全加载后也尝试一次
window.addEventListener("load", () => {
  console.log("[RMS Auto Login] Window load event")
  setTimeout(autoFillLogin, 200)
})
