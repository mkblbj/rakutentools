import type { PlasmoCSConfig } from "plasmo"

import { isCompleteEbayShop, readLocalConfig } from "~lib/config"
import {
  canSubmitIdentifier,
  canSubmitPassword,
  EBAY_LOGIN_TASK_KEY,
  EBAY_SELLER_HUB_URL,
  isEbayLoginCompletionPhase,
  isEbayLoginTaskExpired,
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
  if (
    document.querySelector(
      "input[autocomplete='one-time-code'], iframe[src*='captcha' i], [id*='captcha' i]"
    )
  ) {
    return true
  }
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, [role='heading']")
  )
    .map((element) => element.textContent ?? "")
    .join(" ")
  return /(passkey|authenticator|security code|verify it's you)/i.test(heading)
}

const savePhase = async (task: EbayLoginTask, phase: EbayLoginPhase) => {
  await chrome.storage.local.set({
    [EBAY_LOGIN_TASK_KEY]: withEbayLoginPhase(task, phase)
  })
}

const clearTask = async () => {
  await chrome.storage.local.remove(EBAY_LOGIN_TASK_KEY)
}

let processing = false
let signOutClicked = false
let switchAccountClicked = false
let observer: MutationObserver | null = null

const processPage = async () => {
  if (processing) return
  processing = true

  try {
    const stored = await chrome.storage.local.get(EBAY_LOGIN_TASK_KEY)
    const task = normalizeEbayLoginTask(stored[EBAY_LOGIN_TASK_KEY])
    if (!task) {
      observer?.disconnect()
      return
    }
    if (isEbayLoginTaskExpired(task)) {
      await clearTask()
      observer?.disconnect()
      return
    }

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
      window.location.assign(EBAY_SELLER_HUB_URL)
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

    if (host !== "signin.ebay.com" || task.phase === "manual") return

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

    const password = queryFirst<HTMLInputElement>([
      "#pass",
      "input[name='pass']",
      "input[autocomplete='current-password']"
    ])
    const signInButton = queryFirst<HTMLElement>(["#sgnBt"])
    if (password && signInButton && canSubmitPassword(task)) {
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
