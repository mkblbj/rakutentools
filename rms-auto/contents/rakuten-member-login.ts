import type { PlasmoCSConfig } from "plasmo"

/**
 * 乐天会员二次登录适配脚本（新版 login.account.rakuten.com）
 * 
 * 策略：始终强制完整登录流程，避免多店铺时登录到错误的账户
 * 
 * 1. /session/upgrade - 检测到时立即点击「別の楽天IDでログイン」切换到完整流程
 * 2. /sso/authorize#/sign_in - 输入用户ID
 * 3. /sso/authorize#/sign_in/password - 输入密码
 */

export const config: PlasmoCSConfig = {
  matches: ["https://login.account.rakuten.com/*"],
  all_frames: true
}

interface Shop {
  shopName: string
  loginId: string
  loginPass: string
  userId: string
  userPass: string
}

// 从 URL 获取 shopNo（如果有的话，通过 state 参数传递）
const getShopNoFromState = (): string | null => {
  const url = new URL(window.location.href)
  const state = url.searchParams.get("state")
  
  // 尝试从 state 解析 shopNo（格式可能是 "shopNo=0" 或 JSON）
  if (state) {
    // 检查是否是纯数字（直接作为 shopNo）
    if (/^-?\d+$/.test(state)) {
      return state
    }
    // 尝试解析 "shopNo_X" 格式
    const match = state.match(/shopNo[_=]?(\d+)/)
    if (match) {
      return match[1]
    }
  }
  return null
}

// 从 redirect_uri 获取 shopNo
const getShopNoFromRedirect = (): string | null => {
  const url = new URL(window.location.href)
  const redirectUri = url.searchParams.get("redirect_uri")
  
  if (redirectUri) {
    try {
      const redirectUrl = new URL(redirectUri)
      const shopNo = redirectUrl.searchParams.get("shopNo")
      if (shopNo && /^-?\d+$/.test(shopNo)) {
        return shopNo
      }
    } catch {}
  }
  return null
}

// 从 chrome.storage 获取最后使用的 shopNo（跨域共享）
const getLastUsedShopNo = async (): Promise<string | null> => {
  try {
    const data = await chrome.storage.local.get("rms_auto_current_shopno")
    const saved = data.rms_auto_current_shopno
    if (saved && /^-?\d+$/.test(saved)) {
      return saved
    }
  } catch {}
  return null
}

// 获取 shopNo 的综合方法
const getShopNo = async (): Promise<string | null> => {
  return getShopNoFromState() || getShopNoFromRedirect() || await getLastUsedShopNo()
}

// 等待元素出现
const waitForElement = (
  selector: string | (() => Element | null),
  timeout = 5000
): Promise<Element | null> => {
  return new Promise((resolve) => {
    const getElement = typeof selector === "function" 
      ? selector 
      : () => document.querySelector(selector)
    
    const element = getElement()
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const el = getElement()
      if (el) {
        observer.disconnect()
        resolve(el)
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

// 按 name 属性查找输入框
const findInputByName = (name: string): HTMLInputElement | null => {
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]`) ||
         document.querySelector<HTMLInputElement>(`[name="${name}"] input`) ||
         Array.from(document.querySelectorAll<HTMLInputElement>("input")).find(
           input => input.getAttribute("aria-label")?.includes(name) ||
                    input.placeholder?.includes(name)
         ) || null
}

// 按 accessible name 查找 textbox
const findTextboxByAccessibleName = (name: string): HTMLInputElement | null => {
  // 先尝试直接 querySelector
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[type='text'], input[type='password'], input:not([type])"))
  
  for (const input of inputs) {
    // 检查 aria-label
    if (input.getAttribute("aria-label")?.includes(name)) return input
    
    // 检查 placeholder
    if (input.placeholder?.includes(name)) return input
    
    // 检查关联的 label
    const labelFor = input.id ? document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`) : null
    if (labelFor?.textContent?.includes(name)) return input
    
    // 检查父元素的 label
    const parentLabel = input.closest("label")
    if (parentLabel?.textContent?.includes(name)) return input
    
    // 检查相邻的 label 或 span
    const parent = input.parentElement
    if (parent) {
      const label = parent.querySelector("label, span")
      if (label?.textContent?.includes(name)) return input
    }
  }
  
  return null
}

// 查找提交按钮（语言无关方案）
const findSubmitButton = (): HTMLElement | null => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
  
  // 多语言文本匹配
  const submitTexts = ["次へ", "Next", "下一步", "下一個"]
  for (const text of submitTexts) {
    const btn = buttons.find(btn => btn.textContent?.includes(text))
    if (btn) {
      console.log("[Rakuten Member Login] Found submit button via text:", text)
      return btn
    }
  }
  
  // 按 DOM 位置：提交按钮始终是第一个 button
  if (buttons.length >= 1) {
    console.log("[Rakuten Member Login] Found submit button via DOM position (1st button):", buttons[0].textContent?.trim())
    return buttons[0]
  }
  
  // type=submit 备选
  const submitBtn = document.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]')
  if (submitBtn) {
    console.log("[Rakuten Member Login] Found submit button via type=submit")
    return submitBtn
  }
  
  console.log("[Rakuten Member Login] Submit button not found")
  return null
}

// 查找切换账户按钮（语言无关方案）
const findSwitchAccountButton = (): HTMLElement | null => {
  const allButtons = Array.from(document.querySelectorAll("button"))
  console.log("[Rakuten Member Login] DEBUG - Found", allButtons.length, "button elements")
  allButtons.forEach((btn, i) => {
    console.log(`  [${i}] text="${btn.textContent?.substring(0, 50)?.trim()}"`)
  })
  
  // 多语言文本匹配
  const switchTexts = [
    "別の楽天ID",        // 日语
    "different Rakuten",  // 英语
    "其他乐天ID",        // 简体中文
    "其他樂天ID",        // 繁体中文
    "별도의 라쿠텐",      // 韩语
  ]
  
  // 方法1: 按文本匹配
  for (const text of switchTexts) {
    const btn = allButtons.find(btn => btn.textContent?.includes(text))
    if (btn) {
      console.log("[Rakuten Member Login] Found switch button via text match:", text)
      return btn
    }
  }
  
  // 方法2: 按 DOM 位置找（语言完全无关）
  // session_upgrade 密码页面的结构固定：
  //   button[0] = 次へ（提交）
  //   button[1] = パスワードをお忘れの方（忘记密码）
  //   button[2] = 別の楽天IDでログイン（切换账户）<-- 我们要的
  // 切换账户按钮始终是第3个按钮（索引2），且是提交按钮之后的第2个
  if (allButtons.length >= 3) {
    // 找到提交按钮（第一个按钮）之后的区域里的最后一个按钮
    // 提交按钮的特征：它的兄弟节点包含另外两个按钮
    const submitBtn = allButtons[0]
    const candidateBtn = allButtons[2]
    
    if (submitBtn && candidateBtn && submitBtn !== candidateBtn) {
      console.log("[Rakuten Member Login] Found switch button via DOM position (3rd button):", candidateBtn.textContent?.trim())
      return candidateBtn
    }
  }
  
  console.log("[Rakuten Member Login] Switch button not found by any method")
  return null
}

// 从页面欢迎语提取当前记住的用户名（例如 "ようこそ uo3911" -> "uo3911"）
const getWelcomeUsername = (): string | null => {
  const headings = Array.from(document.querySelectorAll("h1, h2, [role='heading']"))
  for (const h of headings) {
    const text = h.textContent?.trim() || ""
    // 多语言: "ようこそ xxx" / "Welcome xxx" / "欢迎 xxx"
    const match = text.match(/(?:ようこそ|Welcome|欢迎|歡迎)\s+(.+)/i)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

// 获取当前页面状态
const getCurrentPageState = (): "sign_in" | "sign_in_password" | "session_upgrade_password" | "unknown" => {
  const hash = window.location.hash
  const pathname = window.location.pathname
  const isSessionUpgrade = pathname.includes("/session/upgrade")
  
  // session/upgrade + 密码 hash：记住账号的密码页面，需要判断账号是否正确
  if (isSessionUpgrade && hash.includes("sign_in/password")) {
    return "session_upgrade_password"
  }
  
  // 普通完整登录流程的密码页面
  if (hash.includes("sign_in/password")) {
    return "sign_in_password"
  }
  
  // 输入用户ID页面
  if (hash.includes("sign_in") && !hash.includes("password")) {
    return "sign_in"
  }
  
  // session_upgrade 但 hash 还没定型（初始加载）
  if (isSessionUpgrade) {
    return "session_upgrade_password"
  }
  
  return "unknown"
}

// 模拟输入（触发 React 等框架的事件）
const simulateInput = (input: HTMLInputElement, value: string) => {
  // 设置值
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set
  
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value)
  } else {
    input.value = value
  }
  
  // 触发事件
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }))
}

// 处理 session_upgrade 页面：强制切换到完整登录流程
const handleSessionUpgrade = async (): Promise<boolean> => {
  console.log("[Rakuten Member Login] Session upgrade detected, switching to full login...")
  
  // 重试多次，等待 SPA 内容加载
  for (let attempt = 1; attempt <= 10; attempt++) {
    // 等待页面内容加载
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const switchBtn = findSwitchAccountButton()
    console.log(`[Rakuten Member Login] Attempt ${attempt}: Looking for switch button...`, switchBtn ? "Found!" : "Not found")
    
    if (switchBtn) {
      console.log("[Rakuten Member Login] Found switch button, clicking...")
      switchBtn.click()
      return true
    }
  }
  
  console.log("[Rakuten Member Login] Switch button not found after all attempts")
  return false
}

// 防重复执行锁
let lastHandledKey = ""

// 填写密码并提交
const fillPasswordAndSubmit = (passwordInput: HTMLInputElement, password: string) => {
  console.log("[Rakuten Member Login] Found password input, filling...")
  simulateInput(passwordInput, password)
  
  console.log("[Rakuten Member Login] Will submit with Enter key in 1500ms")
  setTimeout(() => {
    console.log("[Rakuten Member Login] Pressing Enter to submit")
    passwordInput.focus()
    
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true
    })
    passwordInput.dispatchEvent(enterEvent)
    passwordInput.dispatchEvent(new KeyboardEvent("keypress", {
      key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
    }))
    passwordInput.dispatchEvent(new KeyboardEvent("keyup", {
      key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
    }))
    
    setTimeout(() => {
      const form = passwordInput.closest("form")
      if (form) {
        console.log("[Rakuten Member Login] Fallback: submitting form directly")
        if (form.requestSubmit) { form.requestSubmit() } else { form.submit() }
      }
    }, 500)
  }, 1500)
}

// 主要的自动填充逻辑
const autoFillLogin = async () => {
  const pageState = getCurrentPageState()
  const pageKey = pageState + "|" + window.location.hash
  
  // 防重复处理
  if (pageKey === lastHandledKey) {
    console.log("[Rakuten Member Login] Already handled this page state, skipping")
    return
  }
  
  console.log("[Rakuten Member Login] Page state:", pageState, "URL:", window.location.href)
  
  if (pageState === "unknown") {
    console.log("[Rakuten Member Login] Unknown page state, skipping")
    return
  }
  
  const shopNo = await getShopNo()
  console.log("[Rakuten Member Login] ShopNo:", shopNo)
  
  if (!shopNo) {
    console.log("[Rakuten Member Login] No shopNo found, skipping auto-fill")
    return
  }
  
  let shops: Shop[] = []
  let shop: Shop | undefined
  try {
    const data = await chrome.storage.local.get("rms")
    shops = data.rms || []
    shop = shops[parseInt(shopNo)]
  } catch (error) {
    console.error("[Rakuten Member Login] Error loading shops:", error)
    return
  }
  
  if (!shop || !shop.shopName) {
    console.log("[Rakuten Member Login] Shop data not found for shopNo:", shopNo)
    return
  }
  
  console.log("[Rakuten Member Login] Found shop:", shop.shopName, "userId:", shop.userId)
  
  // 等待页面内容加载
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 标记已处理
  lastHandledKey = pageKey
  
  // === session_upgrade 密码页面：比对用户名决定是否需要切换 ===
  if (pageState === "session_upgrade_password") {
    const welcomeUser = getWelcomeUsername()
    console.log("[Rakuten Member Login] Welcome username on page:", welcomeUser, "| Target userId:", shop.userId)
    
    if (welcomeUser && shop.userId) {
      // 不区分大小写比较
      const pageUser = welcomeUser.toLowerCase()
      const targetUser = shop.userId.toLowerCase()
      
      if (pageUser === targetUser || pageUser.startsWith(targetUser) || targetUser.startsWith(pageUser)) {
        // 用户名匹配 -> 直接填密码
        console.log("[Rakuten Member Login] Username matches! Filling password directly.")
        
        const passwordInput = findTextboxByAccessibleName("パスワード") ||
                              document.querySelector<HTMLInputElement>("input[type='password']")
        
        if (passwordInput && shop.userPass) {
          fillPasswordAndSubmit(passwordInput, shop.userPass)
        }
        return
      }
    }
    
    // 用户名不匹配或无法获取 -> 切换账号
    console.log("[Rakuten Member Login] Username mismatch or unknown, switching account...")
    lastHandledKey = ""  // 允许后续重新处理
    await handleSessionUpgrade()
    return
  }
  
  // === 完整登录流程 Step 1: 输入用户ID ===
  if (pageState === "sign_in") {
    console.log("[Rakuten Member Login] Filling user ID...")
    
    const userIdInput = findTextboxByAccessibleName("ユーザID") ||
                        findTextboxByAccessibleName("メールアドレス") ||
                        findTextboxByAccessibleName("User ID") ||
                        findTextboxByAccessibleName("email") ||
                        document.querySelector<HTMLInputElement>("input[type='text']") ||
                        document.querySelector<HTMLInputElement>("input:not([type='password']):not([type='hidden'])")
    
    if (userIdInput && shop.userId) {
      console.log("[Rakuten Member Login] Found user ID input, filling...")
      simulateInput(userIdInput, shop.userId)
      
      console.log("[Rakuten Member Login] Will submit user ID with Enter in 1000ms")
      setTimeout(() => {
        console.log("[Rakuten Member Login] Pressing Enter to submit user ID")
        userIdInput.focus()
        
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true
        })
        userIdInput.dispatchEvent(enterEvent)
        userIdInput.dispatchEvent(new KeyboardEvent("keypress", {
          key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
        }))
        userIdInput.dispatchEvent(new KeyboardEvent("keyup", {
          key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
        }))
        
        setTimeout(() => {
          const form = userIdInput.closest("form")
          if (form) {
            console.log("[Rakuten Member Login] Fallback: submitting form")
            if (form.requestSubmit) { form.requestSubmit() } else { form.submit() }
          }
        }, 500)
      }, 1000)
    } else {
      console.log("[Rakuten Member Login] User ID input not found or no userId configured")
    }
    return
  }
  
  // === 完整登录流程 Step 2: 输入密码 ===
  if (pageState === "sign_in_password") {
    console.log("[Rakuten Member Login] Filling password...")
    
    const passwordInput = findTextboxByAccessibleName("パスワード") ||
                          document.querySelector<HTMLInputElement>("input[type='password']")
    
    if (passwordInput && shop.userPass) {
      fillPasswordAndSubmit(passwordInput, shop.userPass)
    } else {
      console.log("[Rakuten Member Login] Password input not found or no userPass configured")
    }
    return
  }
}

// 监听 hash 变化（SPA 路由）
let lastHash = window.location.hash
const checkHashChange = () => {
  if (window.location.hash !== lastHash) {
    console.log("[Rakuten Member Login] Hash changed:", lastHash, "->", window.location.hash)
    lastHash = window.location.hash
    setTimeout(autoFillLogin, 300)
  }
}

// 启动脚本
const init = () => {
  console.log("[Rakuten Member Login] Script loaded, URL:", window.location.href)
  
  setTimeout(autoFillLogin, 300)
  
  // 监听 hash 变化（SPA 路由切换时重新处理）
  window.addEventListener("hashchange", () => {
    console.log("[Rakuten Member Login] Hash change event")
    lastHandledKey = ""  // hash 变了，允许重新处理
    setTimeout(autoFillLogin, 300)
  })
  
  // 额外的 hash 变化检测
  setInterval(checkHashChange, 500)
}

// 等待 DOM 加载
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}

// 页面完全加载后也尝试一次
window.addEventListener("load", () => {
  console.log("[Rakuten Member Login] Window load event")
  setTimeout(autoFillLogin, 500)
})
