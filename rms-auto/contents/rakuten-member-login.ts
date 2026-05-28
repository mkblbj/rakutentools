import type { PlasmoCSConfig } from "plasmo"

import {
  RAKUTEN_MEMBER_RETRY_INTERVAL_MS,
  RAKUTEN_MEMBER_SUBMIT_DELAY_MS,
  setInputValueAndNotify
} from "../lib/login-dom"

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
  return (
    getShopNoFromState() ||
    getShopNoFromRedirect() ||
    (await getLastUsedShopNo())
  )
}

const findInputByText = (text: string): HTMLInputElement | null => {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      "input[type='text'], input[type='password'], input:not([type])"
    )
  )

  for (const input of inputs) {
    if (input.getAttribute("aria-label")?.includes(text)) return input
    if (input.placeholder?.includes(text)) return input

    const labelFor = input.id
      ? document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
      : null
    if (labelFor?.textContent?.includes(text)) return input

    const parentLabel = input.closest("label")
    if (parentLabel?.textContent?.includes(text)) return input

    const parent = input.parentElement
    if (parent) {
      const label = parent.querySelector("label, span")
      if (label?.textContent?.includes(text)) return input
    }
  }

  return null
}

const getElementText = (element: Element): string => {
  return element.textContent?.replace(/\s+/g, " ").trim() || ""
}

const findClickableByText = (text: string): HTMLElement | null => {
  const clickables = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role='button']")
  )
  const clickable = clickables.find((item) =>
    getElementText(item).includes(text)
  )
  if (clickable) {
    return clickable
  }

  const submitInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      "input[type='submit'], input[type='button']"
    )
  )

  return submitInputs.find((item) => item.value?.includes(text)) || null
}

const clickFirstMatchedButton = (texts: string[]): boolean => {
  for (const text of texts) {
    const button = findClickableByText(text)
    if (button) {
      console.log("[Rakuten Member Login] Clicking button:", text)
      button.click()
      return true
    }
  }

  return false
}

const findSwitchAccountButton = (): HTMLElement | null => {
  return findClickableByText("別の楽天IDでログイン")
}

const hasWelcomeHeading = (): boolean => {
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, [role='heading']")
  )

  return headings.some((heading) =>
    getElementText(heading).includes("ようこそ")
  )
}

const SWITCH_FLAG_KEY = "rms_auto_did_switch_account"

const getDidSwitchAccount = (): boolean => {
  try {
    return sessionStorage.getItem(SWITCH_FLAG_KEY) === "1"
  } catch {
    return false
  }
}

const setDidSwitchAccount = () => {
  try {
    sessionStorage.setItem(SWITCH_FLAG_KEY, "1")
  } catch {}
}

// 获取当前页面状态
const getCurrentPageState = ():
  | "sign_in"
  | "sign_in_password"
  | "remembered_password"
  | "unknown" => {
  const hash = window.location.hash
  const pathname = window.location.pathname
  const hasSwitchAccountLink = Boolean(findSwitchAccountButton())
  const isWelcomePage = hasWelcomeHeading()

  // 密码页面带有"ようこそ"和切换链接 → 可能是记住账户的页面
  if (hasSwitchAccountLink && isWelcomePage) {
    return "remembered_password"
  }

  if (hash.includes("sign_in/password")) {
    return "sign_in_password"
  }

  if (hash.includes("sign_in") && !hash.includes("password")) {
    return "sign_in"
  }

  // /session/upgrade 路径
  if (pathname.includes("/session/upgrade") && hasSwitchAccountLink) {
    return "remembered_password"
  }

  return "unknown"
}

// 模拟输入（兼容 React/Elm 这类受控输入）
const simulateInput = (input: HTMLInputElement, value: string) => {
  setInputValueAndNotify(input, value)
  input.dispatchEvent(new FocusEvent("blur", { bubbles: false }))
  input.blur()
}

// 处理 session_upgrade 页面：强制切换到完整登录流程
const handleSessionUpgrade = async (): Promise<boolean> => {
  console.log(
    "[Rakuten Member Login] Session upgrade detected, switching to full login..."
  )

  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const switchBtn = findSwitchAccountButton()
    console.log(
      `[Rakuten Member Login] Attempt ${attempt}: Looking for switch button...`,
      switchBtn ? "Found!" : "Not found"
    )

    if (switchBtn) {
      console.log("[Rakuten Member Login] Found switch button, clicking...")
      switchBtn.click()
      return true
    }
  }

  console.log(
    "[Rakuten Member Login] Switch button not found after all attempts"
  )
  return false
}

// 防重复执行锁
let lastHandledKey = ""

const submitClosestForm = (input?: HTMLInputElement | null): boolean => {
  const form = input?.form || input?.closest("form")
  if (!(form instanceof HTMLFormElement)) {
    return false
  }

  console.log("[Rakuten Member Login] Submitting closest form directly")

  try {
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit()
    } else {
      form.submit()
    }
    return true
  } catch (error) {
    console.error("[Rakuten Member Login] Direct form submit failed:", error)
    return false
  }
}

const clickSubmitWithRetry = (
  input?: HTMLInputElement | null,
  maxAttempts = 6,
  interval = RAKUTEN_MEMBER_RETRY_INTERVAL_MS
) => {
  let attempt = 0
  const tryClick = () => {
    attempt++

    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      })
    )

    if (clickFirstMatchedButton(["次へ", "ログイン"])) {
      return
    }

    if (submitClosestForm(input)) {
      return
    }

    if (attempt < maxAttempts) {
      setTimeout(tryClick, interval)
    } else {
      console.log("[Rakuten Member Login] Submit action failed after retries")
    }
  }
  tryClick()
}

const fillInputAndSubmit = (input: HTMLInputElement, value: string) => {
  simulateInput(input, value)

  setTimeout(() => {
    clickSubmitWithRetry(input)
  }, RAKUTEN_MEMBER_SUBMIT_DELAY_MS)
}

// 主要的自动填充逻辑
const autoFillLogin = async () => {
  const pageState = getCurrentPageState()
  const pageKey = pageState + "|" + window.location.hash

  // 防重复处理
  if (pageKey === lastHandledKey) {
    console.log(
      "[Rakuten Member Login] Already handled this page state, skipping"
    )
    return
  }

  console.log(
    "[Rakuten Member Login] Page state:",
    pageState,
    "URL:",
    window.location.href
  )

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
    console.log(
      "[Rakuten Member Login] Shop data not found for shopNo:",
      shopNo
    )
    return
  }

  console.log(
    "[Rakuten Member Login] Found shop:",
    shop.shopName,
    "userId:",
    shop.userId
  )

  await new Promise((resolve) => setTimeout(resolve, 500))

  lastHandledKey = pageKey

  if (pageState === "remembered_password") {
    if (!getDidSwitchAccount()) {
      console.log(
        "[Rakuten Member Login] Remembered account detected, switching to full login..."
      )
      lastHandledKey = ""
      setDidSwitchAccount()
      await handleSessionUpgrade()
      return
    }
    console.log(
      "[Rakuten Member Login] Already switched account, filling password..."
    )
    const passwordInput = findInputByText("パスワード")
    if (passwordInput && shop.userPass) {
      fillInputAndSubmit(passwordInput, shop.userPass)
    }
    return
  }

  if (pageState === "sign_in") {
    console.log("[Rakuten Member Login] Filling user ID...")

    const userIdInput =
      findInputByText("ユーザID") || findInputByText("メールアドレス")

    if (userIdInput && shop.userId) {
      console.log("[Rakuten Member Login] Found user ID input, filling...")
      fillInputAndSubmit(userIdInput, shop.userId)
    } else {
      console.log(
        "[Rakuten Member Login] User ID input not found or no userId configured"
      )
    }
    return
  }

  if (pageState === "sign_in_password") {
    console.log("[Rakuten Member Login] Filling password...")

    const passwordInput = findInputByText("パスワード")

    if (passwordInput && shop.userPass) {
      fillInputAndSubmit(passwordInput, shop.userPass)
    } else {
      console.log(
        "[Rakuten Member Login] Password input not found or no userPass configured"
      )
    }
    return
  }
}

// 监听 hash 变化（SPA 路由）
let lastHash = window.location.hash
const checkHashChange = () => {
  if (window.location.hash !== lastHash) {
    console.log(
      "[Rakuten Member Login] Hash changed:",
      lastHash,
      "->",
      window.location.hash
    )
    lastHash = window.location.hash
    setTimeout(autoFillLogin, 300)
  }
}

// 启动脚本
const init = () => {
  console.log(
    "[Rakuten Member Login] Script loaded, URL:",
    window.location.href
  )

  setTimeout(autoFillLogin, 300)

  // 监听 hash 变化（SPA 路由切换时重新处理）
  window.addEventListener("hashchange", () => {
    console.log("[Rakuten Member Login] Hash change event")
    lastHandledKey = "" // hash 变了，允许重新处理
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
