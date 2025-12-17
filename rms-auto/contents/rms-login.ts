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
  
  if (!shopNo) {
    console.log("[RMS Auto Login] No shopNo in URL")
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
        // 修改 form action 以保留 shopNo 参数
        if (form) {
          const currentAction = form.action
          if (!currentAction.includes("shopNo=")) {
            form.action = `${currentAction}${currentAction.includes("?") ? "&" : "?"}shopNo=${shopNo}`
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
    if (submitBtn && submitBtn.textContent === "次へ") {
      setTimeout(() => submitBtn.click(), 100)
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
