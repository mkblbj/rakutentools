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

// 查找提交按钮
const findSubmitButton = (): HTMLElement | null => {
  // 方法1: 查找 button 元素
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
  const btn1 = buttons.find(btn => btn.textContent?.includes("次へ"))
  if (btn1) {
    console.log("[Rakuten Member Login] Found submit button via button selector")
    return btn1
  }
  
  // 方法2: XPath 查找
  const xpath = "//*[contains(text(), '次へ')]"
  const xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
  if (xpathResult.singleNodeValue) {
    console.log("[Rakuten Member Login] Found submit button via XPath")
    return xpathResult.singleNodeValue as HTMLElement
  }
  
  // 方法3: 查找 type=submit 的按钮
  const submitBtn = document.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]')
  if (submitBtn) {
    console.log("[Rakuten Member Login] Found submit button via type=submit")
    return submitBtn
  }
  
  console.log("[Rakuten Member Login] Submit button not found. Buttons on page:")
  buttons.forEach((btn, i) => {
    console.log(`  [${i}] "${btn.textContent?.substring(0, 30)}"`)
  })
  
  return null
}

// 查找切换账户按钮
const findSwitchAccountButton = (): HTMLElement | null => {
  // 调试：打印页面上所有按钮
  const allButtons = Array.from(document.querySelectorAll("button"))
  console.log("[Rakuten Member Login] DEBUG - Found", allButtons.length, "button elements")
  allButtons.forEach((btn, i) => {
    console.log(`  [${i}] tag=${btn.tagName} text="${btn.textContent?.substring(0, 50)}"`)
  })
  
  // 方法1: 直接用 XPath 查找包含文本的元素
  const xpath = "//*[contains(text(), '別の楽天ID')]"
  const xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
  if (xpathResult.singleNodeValue) {
    console.log("[Rakuten Member Login] Found via XPath:", xpathResult.singleNodeValue)
    return xpathResult.singleNodeValue as HTMLElement
  }
  
  // 方法2: 查找 button 元素
  const btn1 = allButtons.find(btn => btn.textContent?.includes("別の楽天ID"))
  if (btn1) {
    console.log("[Rakuten Member Login] Found via button selector")
    return btn1
  }
  
  // 方法3: 遍历所有元素查找
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement
    if (el.textContent?.includes("別の楽天ID") && !el.textContent?.includes("別の楽天IDでログイン別の楽天ID")) {
      // 找到最内层的包含该文本的元素
      if (el.children.length === 0 || el.innerText?.trim() === "別の楽天IDでログイン") {
        console.log("[Rakuten Member Login] Found via TreeWalker:", el.tagName, el.className)
        return el
      }
    }
  }
  
  console.log("[Rakuten Member Login] Button not found by any method")
  return null
}

// 获取当前页面状态
const getCurrentPageState = (): "sign_in" | "sign_in_password" | "session_upgrade" | "unknown" => {
  const hash = window.location.hash
  const pathname = window.location.pathname
  
  // 优先检查 hash（SPA 路由状态）
  // 如果 hash 是密码页面，不管 pathname 是什么，都应该填密码
  if (hash.includes("sign_in/password")) {
    return "sign_in_password"
  }
  
  // 如果 hash 是登录页面（输入用户ID）
  if (hash.includes("sign_in") && !hash.includes("password")) {
    return "sign_in"
  }
  
  // 如果是 session_upgrade 但 hash 不是具体的登录步骤
  // 说明页面还在初始加载，需要点击切换按钮
  if (pathname.includes("/session/upgrade")) {
    return "session_upgrade"
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

// 主要的自动填充逻辑
const autoFillLogin = async () => {
  const pageState = getCurrentPageState()
  console.log("[Rakuten Member Login] Page state:", pageState, "URL:", window.location.href)
  
  if (pageState === "unknown") {
    console.log("[Rakuten Member Login] Unknown page state, skipping")
    return
  }
  
  // 🔥 关键：session_upgrade 页面强制切换到完整登录流程
  // 避免多店铺时登录到错误的账户
  if (pageState === "session_upgrade") {
    await handleSessionUpgrade()
    return  // 切换后页面会跳转，不需要继续处理
  }
  
  const shopNo = await getShopNo()
  console.log("[Rakuten Member Login] ShopNo:", shopNo)
  
  if (!shopNo) {
    console.log("[Rakuten Member Login] No shopNo found, skipping auto-fill")
    return
  }
  
  try {
    const data = await chrome.storage.local.get("rms")
    const shops: Shop[] = data.rms || []
    console.log("[Rakuten Member Login] Loaded shops:", shops.length)
    
    const shop = shops[parseInt(shopNo)]
    
    if (!shop || !shop.shopName) {
      console.log("[Rakuten Member Login] Shop data not found for shopNo:", shopNo)
      return
    }
    
    console.log("[Rakuten Member Login] Found shop:", shop.shopName)
    
    // 等待页面内容加载
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (pageState === "sign_in") {
      // Step 1: 输入用户ID
      console.log("[Rakuten Member Login] Filling user ID...")
      
      const userIdInput = findTextboxByAccessibleName("ユーザID") ||
                          findTextboxByAccessibleName("メールアドレス") ||
                          document.querySelector<HTMLInputElement>("input[type='text']") ||
                          document.querySelector<HTMLInputElement>("input:not([type='password']):not([type='hidden'])")
      
      if (userIdInput && shop.userId) {
        console.log("[Rakuten Member Login] Found user ID input, filling...")
        simulateInput(userIdInput, shop.userId)
        
        // 用 Enter 键提交
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
          
          // 备用：提交表单
          setTimeout(() => {
            const form = userIdInput.closest("form")
            if (form) {
              console.log("[Rakuten Member Login] Fallback: submitting form")
              form.requestSubmit?.() || form.submit()
            }
          }, 500)
        }, 1000)
      } else {
        console.log("[Rakuten Member Login] User ID input not found or no userId configured")
      }
      return
    }
    
    if (pageState === "sign_in_password") {
      // Step 2: 输入密码（只在完整登录流程中，不是 session_upgrade）
      console.log("[Rakuten Member Login] Filling password...")
      
      const passwordInput = findTextboxByAccessibleName("パスワード") ||
                            document.querySelector<HTMLInputElement>("input[type='password']")
      
      if (passwordInput && shop.userPass) {
        console.log("[Rakuten Member Login] Found password input, filling...")
        simulateInput(passwordInput, shop.userPass)
        
        // 等待表单验证完成后，用 Enter 键提交（更接近真实用户行为）
        console.log("[Rakuten Member Login] Will submit with Enter key in 1500ms")
        setTimeout(() => {
          console.log("[Rakuten Member Login] Pressing Enter to submit")
          passwordInput.focus()
          
          // 创建并触发 Enter 键事件
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          })
          passwordInput.dispatchEvent(enterEvent)
          
          // 也触发 keyup 和 keypress
          passwordInput.dispatchEvent(new KeyboardEvent("keypress", {
            key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
          }))
          passwordInput.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
          }))
          
          // 备用方案：如果 Enter 键不行，尝试提交表单
          setTimeout(() => {
            const form = passwordInput.closest("form")
            if (form) {
              console.log("[Rakuten Member Login] Fallback: submitting form directly")
              form.requestSubmit?.() || form.submit()
            }
          }, 500)
        }, 1500)
      } else {
        console.log("[Rakuten Member Login] Password input not found or no userPass configured")
      }
      return
    }
  } catch (error) {
    console.error("[Rakuten Member Login] Error:", error)
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
  
  const pageState = getCurrentPageState()
  
  // session_upgrade 页面需要尽快处理（切换账户）
  if (pageState === "session_upgrade") {
    console.log("[Rakuten Member Login] Quick handling session_upgrade...")
    setTimeout(autoFillLogin, 100)  // 更快响应
  } else {
    // 其他页面正常延迟
    setTimeout(autoFillLogin, 500)
  }
  
  // 监听 hash 变化
  window.addEventListener("hashchange", () => {
    console.log("[Rakuten Member Login] Hash change event")
    setTimeout(autoFillLogin, 300)
  })
  
  // 额外的 hash 变化检测（某些 SPA 框架可能不触发 hashchange）
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
