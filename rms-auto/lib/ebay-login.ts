export const EBAY_LOGIN_TASK_KEY = "ebayAutoLoginTask"
export const EBAY_LOGIN_TIMEOUT_MS = 10 * 60 * 1000
export const EBAY_SELLER_HUB_URL = "https://www.ebay.com/sh/ovw"
export const EBAY_LOGIN_FLOW_MARKER_PARAM = "ebayAutoLoginStartedAt"
export const EBAY_LOGIN_WINDOW_NAME_PREFIX = "__rms_auto_ebay_login__:"
export const EBAY_LOGIN_ACTIVE_MARKER_KEY = "ebayAutoLoginActiveMarker"

export type EbayLoginPhase =
  | "start"
  | "signingOut"
  | "identifierSubmitted"
  | "passwordSubmitted"
  | "manual"

export interface EbayLoginTask {
  shopIndex: number
  phase: EbayLoginPhase
  startedAt: number
}

const phases: EbayLoginPhase[] = [
  "start",
  "signingOut",
  "identifierSubmitted",
  "passwordSubmitted",
  "manual"
]

export const createEbayLoginTask = (
  shopIndex: number,
  now = Date.now()
): EbayLoginTask => ({
  shopIndex,
  phase: "start",
  startedAt: now
})

export const normalizeEbayLoginTask = (
  value: unknown
): EbayLoginTask | null => {
  if (!value || typeof value !== "object") return null
  const source = value as Partial<EbayLoginTask>
  const shopIndex = source.shopIndex
  const phase = source.phase
  const startedAt = source.startedAt
  if (
    typeof shopIndex !== "number" ||
    !Number.isInteger(shopIndex) ||
    shopIndex < 0 ||
    shopIndex >= 4 ||
    !phases.includes(phase as EbayLoginPhase) ||
    typeof startedAt !== "number" ||
    !Number.isFinite(startedAt)
  ) {
    return null
  }
  return { shopIndex, phase: phase as EbayLoginPhase, startedAt }
}

export const withEbayLoginPhase = (
  task: EbayLoginTask,
  phase: EbayLoginPhase
): EbayLoginTask => ({ ...task, phase })

export const createEbaySellerHubUrl = (task: EbayLoginTask): string => {
  const url = new URL(EBAY_SELLER_HUB_URL)
  url.searchParams.set(EBAY_LOGIN_FLOW_MARKER_PARAM, String(task.startedAt))
  return url.toString()
}

export const createEbayLoginWindowName = (task: EbayLoginTask): string => {
  return `${EBAY_LOGIN_WINDOW_NAME_PREFIX}${task.startedAt}`
}

export const getEbayLoginTaskStorageKey = (
  task: EbayLoginTask | number
): string => {
  const marker = typeof task === "number" ? task : task.startedAt
  return `${EBAY_LOGIN_TASK_KEY}:${marker}`
}

export const isEbayLoginTaskActive = (
  marker: unknown,
  task: EbayLoginTask
): boolean => marker === task.startedAt

export const isEbayLoginWindowNameForTask = (
  value: string,
  task: EbayLoginTask
): boolean => value === createEbayLoginWindowName(task)

const isEbaySellerHubUrlForTask = (
  value: string,
  task: EbayLoginTask
): boolean => {
  try {
    const url = new URL(value)
    return (
      url.hostname === "www.ebay.com" &&
      url.pathname.startsWith("/sh/") &&
      url.searchParams.get(EBAY_LOGIN_FLOW_MARKER_PARAM) ===
        String(task.startedAt)
    )
  } catch {
    return false
  }
}

const hasEbaySellerHubReturnUrlForTask = (
  value: string,
  task: EbayLoginTask,
  depth = 0
): boolean => {
  if (isEbaySellerHubUrlForTask(value, task)) return true
  if (depth >= 3) return false

  try {
    const url = new URL(value)
    const returnUrl = url.searchParams.get("ru")
    return (
      url.hostname === "signin.ebay.com" &&
      Boolean(returnUrl) &&
      hasEbaySellerHubReturnUrlForTask(returnUrl, task, depth + 1)
    )
  } catch {
    return false
  }
}

export const isEbayLoginTaskPage = (
  currentUrl: string,
  referrer: string,
  windowName: string,
  task: EbayLoginTask
): boolean => {
  try {
    const url = new URL(currentUrl)
    if (url.hostname === "www.ebay.com" && url.pathname.startsWith("/sh/")) {
      return (
        isEbaySellerHubUrlForTask(currentUrl, task) ||
        isEbayLoginWindowNameForTask(windowName, task)
      )
    }
    if (url.hostname === "signin.ebay.com") {
      return (
        hasEbaySellerHubReturnUrlForTask(currentUrl, task) ||
        isEbayLoginWindowNameForTask(windowName, task)
      )
    }
    return (
      url.hostname === "pages.ebay.com" &&
      url.pathname.startsWith("/SignOutConfirm") &&
      (isEbaySellerHubUrlForTask(referrer, task) ||
        isEbayLoginWindowNameForTask(windowName, task))
    )
  } catch {
    return false
  }
}

export const canSubmitIdentifier = (task: EbayLoginTask): boolean => {
  return task.phase === "start" || task.phase === "signingOut"
}

export const canSubmitPassword = (task: EbayLoginTask): boolean => {
  return task.phase === "identifierSubmitted"
}

export interface EbayNormalPasswordPageSignals {
  passwordVisible: boolean
  signInVisible: boolean
  hasNormalHeading: boolean
  hasManualChallenge: boolean
}

export const isEbayNormalPasswordPageSignals = ({
  passwordVisible,
  signInVisible,
  hasNormalHeading,
  hasManualChallenge
}: EbayNormalPasswordPageSignals): boolean => {
  return (
    passwordVisible &&
    signInVisible &&
    hasNormalHeading &&
    !hasManualChallenge
  )
}

export interface EbayManualChallengeSignal {
  visible: boolean
  text?: string
  id?: string
  className?: string
  name?: string
  src?: string
  ariaLabel?: string
  title?: string
  autocomplete?: string
}

export const isEbayManualChallengeSignal = ({
  visible,
  text = "",
  id = "",
  className = "",
  name = "",
  src = "",
  ariaLabel = "",
  title = "",
  autocomplete = ""
}: EbayManualChallengeSignal): boolean => {
  if (!visible) return false

  return /\b(?:captcha|challenge|verify|verification|2fa|otp|sms|one[- ]?time[- ]?code|passkey|authenticator|security[ -]check|security[ -]code)\b/i.test(
    [text, id, className, name, src, ariaLabel, title, autocomplete].join(
      " "
    )
  )
}

type EbayComputedStyle = Pick<
  CSSStyleDeclaration,
  "display" | "visibility" | "opacity"
>

type EbayGetComputedStyle = (element: Element) => EbayComputedStyle

export const isEbayElementVisible = (
  element: Element,
  getComputedStyle: EbayGetComputedStyle
): boolean => {
  const style = getComputedStyle(element)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.getClientRects().length > 0
  )
}

const ebayManualChallengeSelector = [
  "input",
  "button",
  "a[href]",
  "iframe",
  "h1",
  "h2",
  "[role='heading']",
  "[role='button']",
  "[id*='captcha' i]",
  "[class*='captcha' i]",
  "[id*='challenge' i]",
  "[class*='challenge' i]",
  "[id*='verify' i]",
  "[class*='verify' i]",
  "[id*='2fa' i]",
  "[class*='2fa' i]"
].join(", ")

export const hasEbayManualChallengeOnPage = (
  root: ParentNode,
  pathname: string,
  getComputedStyle: EbayGetComputedStyle
): boolean => {
  if (/(captcha|challenge|verify|2fa)/i.test(pathname)) return true

  return Array.from(root.querySelectorAll<HTMLElement>(ebayManualChallengeSelector)).some(
    (element) =>
      isEbayManualChallengeSignal({
        visible: isEbayElementVisible(element, getComputedStyle),
        text: element.textContent ?? "",
        id: element.id,
        className: element.getAttribute("class") ?? "",
        name: element.getAttribute("name") ?? "",
        src: element.getAttribute("src") ?? "",
        ariaLabel: element.getAttribute("aria-label") ?? "",
        title: element.getAttribute("title") ?? "",
        autocomplete: element.getAttribute("autocomplete") ?? ""
      })
  )
}

export const isEbayLoginCompletionPhase = (task: EbayLoginTask): boolean => {
  return ["identifierSubmitted", "passwordSubmitted", "manual"].includes(
    task.phase
  )
}

export const isEbayLoginTaskExpired = (
  task: EbayLoginTask,
  now = Date.now()
): boolean => now - task.startedAt >= EBAY_LOGIN_TIMEOUT_MS
