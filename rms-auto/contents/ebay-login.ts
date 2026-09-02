import type { PlasmoCSConfig } from "plasmo"

import { isCompleteEbayShop, readLocalConfig } from "~lib/config"
import {
  canSubmitIdentifier,
  canSubmitPassword,
  createEbayLoginWindowName,
  createEbaySellerHubUrl,
  EBAY_LOGIN_ACTIVE_MARKER_KEY,
  EBAY_LOGIN_TIMEOUT_MS,
  getEbayLoginTaskStorageKey,
  isEbayLoginCompletionPhase,
  isEbayLoginTaskActive,
  isEbayLoginTaskExpired,
  isEbayLoginTaskPage,
  isEbayLoginWindowNameForTask,
  hasEbayManualChallengeOnPage,
  isEbayElementVisible,
  isEbayNormalPasswordPageSignals,
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

const hasManualChallenge = (): boolean =>
  hasEbayManualChallengeOnPage(
    document,
    window.location.pathname,
    window.getComputedStyle
  )

const isVisible = (element: HTMLElement): boolean => {
  return isEbayElementVisible(element, window.getComputedStyle)
}

const hasNormalPasswordPage = (
  password: HTMLInputElement,
  signInButton: HTMLElement
): boolean => {
  const hasNormalHeading = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, [role='heading']")
  ).some(
    (heading) =>
      isVisible(heading) &&
      /^(sign in|welcome)\b/i.test(heading.textContent?.trim() ?? "")
  )

  return isEbayNormalPasswordPageSignals({
    passwordVisible: isVisible(password),
    signInVisible: isVisible(signInButton),
    hasNormalHeading,
    hasManualChallenge: hasManualChallenge()
  })
}

const isTaskActive = async (task: EbayLoginTask): Promise<boolean> => {
  const stored = await chrome.storage.local.get(EBAY_LOGIN_ACTIVE_MARKER_KEY)
  return isEbayLoginTaskActive(stored[EBAY_LOGIN_ACTIVE_MARKER_KEY], task)
}

const savePhase = async (
  task: EbayLoginTask,
  phase: EbayLoginPhase
): Promise<boolean> => {
  if (!(await isTaskActive(task))) return false
  await chrome.storage.local.set({
    [getEbayLoginTaskStorageKey(task)]: withEbayLoginPhase(task, phase)
  })
  return isTaskActive(task)
}

const clearTask = async (task: EbayLoginTask) => {
  if (expiryTimer !== null) {
    window.clearTimeout(expiryTimer)
    expiryTimer = null
  }
  await chrome.storage.local.remove(getEbayLoginTaskStorageKey(task))
  if (isEbayLoginWindowNameForTask(window.name, task)) {
    window.name = ""
  }
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

const readActiveTask = async (): Promise<EbayLoginTask | null> => {
  const active = await chrome.storage.local.get(EBAY_LOGIN_ACTIVE_MARKER_KEY)
  const marker = active[EBAY_LOGIN_ACTIVE_MARKER_KEY]
  if (typeof marker !== "number" || !Number.isFinite(marker)) return null

  const taskKey = getEbayLoginTaskStorageKey(marker)
  const stored = await chrome.storage.local.get(taskKey)
  const task = normalizeEbayLoginTask(stored[taskKey])
  if (!task || !isEbayLoginTaskActive(marker, task)) {
    await chrome.storage.local.remove(taskKey)
    return null
  }
  return task
}

const scheduleExpiryCleanup = (task: EbayLoginTask) => {
  cancelExpiryCleanup()
  const delay = Math.max(0, task.startedAt + EBAY_LOGIN_TIMEOUT_MS - Date.now())
  expiryTimer = window.setTimeout(() => {
    void (async () => {
      const taskKey = getEbayLoginTaskStorageKey(task)
      const stored = await chrome.storage.local.get(taskKey)
      const currentTask = normalizeEbayLoginTask(stored[taskKey])
      if (
        currentTask &&
        currentTask.startedAt === task.startedAt &&
        isEbayLoginTaskPage(
          window.location.href,
          document.referrer,
          window.name,
          currentTask
        ) &&
        isEbayLoginTaskExpired(currentTask)
      ) {
        await clearTask(currentTask)
        observer?.disconnect()
      }
    })()
  }, delay)
}

const processPage = async () => {
  if (processing) return
  processing = true

  try {
    const task = await readActiveTask()
    if (!task) {
      cancelExpiryCleanup()
      observer?.disconnect()
      return
    }
    if (
      !isEbayLoginTaskPage(
        window.location.href,
        document.referrer,
        window.name,
        task
      )
    ) {
      cancelExpiryCleanup()
      observer?.disconnect()
      return
    }
    if (!isEbayLoginWindowNameForTask(window.name, task)) {
      window.name = createEbayLoginWindowName(task)
    }
    if (isEbayLoginTaskExpired(task)) {
      await clearTask(task)
      observer?.disconnect()
      return
    }
    scheduleExpiryCleanup(task)

    const local = await readLocalConfig()
    const shop = local.ebayShops[task.shopIndex]
    if (!shop || !isCompleteEbayShop(shop)) {
      await clearTask(task)
      observer?.disconnect()
      return
    }

    const host = window.location.hostname
    const path = window.location.pathname

    if (host === "pages.ebay.com" && path.startsWith("/SignOutConfirm")) {
      if (await savePhase(task, "start")) {
        if (await isTaskActive(task)) {
          window.location.assign(createEbaySellerHubUrl(task))
        }
      }
      return
    }

    if (host === "www.ebay.com" && path.startsWith("/sh/")) {
      if (isEbayLoginCompletionPhase(task)) {
        await clearTask(task)
        observer?.disconnect()
        return
      }

      const signOut = queryFirst<HTMLElement>(["#gh-uo", "a[href*='SignOut']"])
      if (
        task.phase === "signingOut" &&
        signOut &&
        !signOutClicked &&
        (await isTaskActive(task))
      ) {
        signOutClicked = true
        signOut.click()
        return
      }

      if (task.phase === "start") {
        const accountMenu = queryFirst<HTMLElement>(["#gh-ug"])
        const menuText = accountMenu?.textContent ?? ""
        if (accountMenu && !/sign in/i.test(menuText)) {
          if (await savePhase(task, "signingOut")) {
            if (await isTaskActive(task)) {
              accountMenu.click()
            }
          }
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
      if (await savePhase(task, "identifierSubmitted")) {
        if (!(await isTaskActive(task))) return
        setInputValueAndNotify(identifier, shop.loginId)
        if (await isTaskActive(task)) {
          continueButton.click()
        }
      }
      return
    }

    const password = document.querySelector<HTMLInputElement>("#pass")
    const signInButton = document.querySelector<HTMLElement>("#sgnBt")
    const isNormalPasswordPage = Boolean(
      password && signInButton && hasNormalPasswordPage(password, signInButton)
    )
    if (
      password &&
      signInButton &&
      isNormalPasswordPage &&
      canSubmitPassword(task)
    ) {
      if (await savePhase(task, "passwordSubmitted")) {
        if (!(await isTaskActive(task))) return
        setInputValueAndNotify(password, shop.password)
        if (await isTaskActive(task)) {
          signInButton.click()
        }
      }
      return
    }

    if (
      password &&
      isNormalPasswordPage &&
      canSubmitIdentifier(task) &&
      !switchAccountClicked
    ) {
      const switchAccount = findExactAction([
        "Switch account",
        "Not you?",
        "Use another account"
      ])
      if (switchAccount) {
        if (await isTaskActive(task)) {
          switchAccountClicked = true
          switchAccount.click()
        }
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
