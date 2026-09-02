import type { PlasmoCSConfig } from "plasmo"

import { isCompleteEbayShop, readLocalConfig } from "~lib/config"
import {
  canSubmitIdentifier,
  canSubmitPassword,
  createEbaySellerHubUrl,
  EBAY_LOGIN_TASK_KEY,
  EBAY_LOGIN_TIMEOUT_MS,
  isEbayLoginCompletionPhase,
  isEbayLoginTaskExpired,
  isEbayLoginTaskPage,
  normalizeEbayLoginTask,
  withEbayLoginPhase,
  type EbayLoginPhase,
  type EbayLoginTask
} from "~lib/ebay-login"
import { setInputValueAndNotify } from "~lib/login-dom"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.ebay.com/sh/*",
    "https://signin.ebay.com/*",
    "https://pages.ebay.com/SignOutConfirm*"
  ],
  all_frames: false,
  run_at: "document_idle"
}

const queryFirst = <T extends Element>(selectors: string[]): T | null => {
  for (const selector of selectors) {
    const element = document.querySelector<T>(selector)
    if (element) return element
  }
  return null
}

const findExactAction = (labels: string[]): HTMLElement | null => {
  const expected = new Set(labels.map((label) => label.toLowerCase()))
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>("button, a, [role='button']")
    ).find((element) =>
      expected.has(element.textContent?.trim().toLowerCase() ?? "")
    ) ?? null
  )
}

const hasManualChallenge = (): boolean => {
  if (/(captcha|challenge|verify|2fa)/i.test(window.location.pathname)) {
    return true
  }

  if (
    document.querySelector(
      [
        "input[autocomplete='one-time-code']",
        "input[name*='otp' i]",
        "input[id*='otp' i]",
        "input[name*='code' i]",
        "input[id*='code' i]",
        "input[name*='2fa' i]",
        "input[id*='2fa' i]",
        "iframe[src*='captcha' i]",
        "iframe[src*='challenge' i]",
        "[id*='captcha' i]",
        "[class*='captcha' i]",
        "[id*='challenge' i]",
        "[class*='challenge' i]",
        "[id*='verify' i]",
        "[class*='verify' i]",
        "[id*='2fa' i]",
        "[class*='2fa' i]"
      ].join(", ")
    )
  ) {
    return true
  }

  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, [role='heading']")
  )
    .map((element) => element.textContent ?? "")
    .join(" ")
  return /(sms|authenticator|passkey|verification|security check|security code|verify it's you)/i.test(
    heading
  )
}

const isVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.getClientRects().length > 0
  )
}

const savePhase = async (task: EbayLoginTask, phase: EbayLoginPhase) => {
  await chrome.storage.local.set({
    [EBAY_LOGIN_TASK_KEY]: withEbayLoginPhase(task, phase)
  })
}

const clearTask = async () => {
  if (expiryTimer !== null) {
    window.clearTimeout(expiryTimer)
    expiryTimer = null
  }
  await chrome.storage.local.remove(EBAY_LOGIN_TASK_KEY)
}

let processing = false
let signOutClicked = false
let switchAccountClicked = false
let observer: MutationObserver | null = null
let expiryTimer: number | null = null

const cancelExpiryCleanup = () => {
  if (expiryTimer !== null) {
    window.clearTimeout(expiryTimer)
    expiryTimer = null
  }
}

const scheduleExpiryCleanup = (task: EbayLoginTask) => {
  cancelExpiryCleanup()
  const delay = Math.max(0, task.startedAt + EBAY_LOGIN_TIMEOUT_MS - Date.now())
  expiryTimer = window.setTimeout(() => {
    void (async () => {
      const stored = await chrome.storage.local.get(EBAY_LOGIN_TASK_KEY)
      const currentTask = normalizeEbayLoginTask(stored[EBAY_LOGIN_TASK_KEY])
      if (
        currentTask &&
        currentTask.startedAt === task.startedAt &&
        isEbayLoginTaskPage(
          window.location.href,
          document.referrer,
          currentTask
        ) &&
        isEbayLoginTaskExpired(currentTask)
      ) {
        await clearTask()
        observer?.disconnect()
      }
    })()
  }, delay)
}

const processPage = async () => {
  if (processing) return
  processing = true

  try {
    const stored = await chrome.storage.local.get(EBAY_LOGIN_TASK_KEY)
    const task = normalizeEbayLoginTask(stored[EBAY_LOGIN_TASK_KEY])
    if (!task) {
      if (stored[EBAY_LOGIN_TASK_KEY] !== undefined) {
        await clearTask()
      }
      cancelExpiryCleanup()
      observer?.disconnect()
      return
    }
    if (!isEbayLoginTaskPage(window.location.href, document.referrer, task)) {
      cancelExpiryCleanup()
      observer?.disconnect()
      return
    }
    if (isEbayLoginTaskExpired(task)) {
      await clearTask()
      observer?.disconnect()
      return
    }
    scheduleExpiryCleanup(task)

    const local = await readLocalConfig()
    const shop = local.ebayShops[task.shopIndex]
    if (!shop || !isCompleteEbayShop(shop)) {
      await clearTask()
      observer?.disconnect()
      return
    }

    const host = window.location.hostname
    const path = window.location.pathname

    if (host === "pages.ebay.com" && path.startsWith("/SignOutConfirm")) {
      await savePhase(task, "start")
      window.location.assign(createEbaySellerHubUrl(task))
      return
    }

    if (host === "www.ebay.com" && path.startsWith("/sh/")) {
      if (isEbayLoginCompletionPhase(task)) {
        await clearTask()
        observer?.disconnect()
        return
      }

      const signOut = queryFirst<HTMLElement>(["#gh-uo", "a[href*='SignOut']"])
      if (task.phase === "signingOut" && signOut && !signOutClicked) {
        signOutClicked = true
        signOut.click()
        return
      }

      if (task.phase === "start") {
        const accountMenu = queryFirst<HTMLElement>(["#gh-ug"])
        const menuText = accountMenu?.textContent ?? ""
        if (accountMenu && !/sign in/i.test(menuText)) {
          await savePhase(task, "signingOut")
          accountMenu.click()
        }
      }
      return
    }

    if (host !== "signin.ebay.com") return

    if (task.phase === "manual") {
      observer?.disconnect()
      return
    }

    if (hasManualChallenge()) {
      await savePhase(task, "manual")
      observer?.disconnect()
      return
    }

    const identifier = queryFirst<HTMLInputElement>([
      "#userid",
      "input[name='userid']",
      "input[autocomplete='username']"
    ])
    const continueButton = queryFirst<HTMLElement>(["#signin-continue-btn"])
    if (identifier && continueButton && canSubmitIdentifier(task)) {
      await savePhase(task, "identifierSubmitted")
      setInputValueAndNotify(identifier, shop.loginId)
      continueButton.click()
      return
    }

    const password = document.querySelector<HTMLInputElement>("#pass")
    const signInButton = document.querySelector<HTMLElement>("#sgnBt")
    if (
      password &&
      signInButton &&
      isVisible(password) &&
      isVisible(signInButton) &&
      !hasManualChallenge() &&
      canSubmitPassword(task)
    ) {
      await savePhase(task, "passwordSubmitted")
      setInputValueAndNotify(password, shop.password)
      signInButton.click()
      return
    }

    if (password && canSubmitIdentifier(task) && !switchAccountClicked) {
      const switchAccount = findExactAction([
        "Switch account",
        "Not you?",
        "Use another account"
      ])
      if (switchAccount) {
        switchAccountClicked = true
        switchAccount.click()
      }
    }
  } finally {
    processing = false
  }
}

observer = new MutationObserver(() => void processPage())
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
})
void processPage()
