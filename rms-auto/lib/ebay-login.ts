export const EBAY_LOGIN_TASK_KEY = "ebayAutoLoginTask"
export const EBAY_LOGIN_TIMEOUT_MS = 10 * 60 * 1000
export const EBAY_SELLER_HUB_URL = "https://www.ebay.com/sh/ovw"

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
    typeof startedAt !== "number"
  ) {
    return null
  }
  return { shopIndex, phase: phase as EbayLoginPhase, startedAt }
}

export const withEbayLoginPhase = (
  task: EbayLoginTask,
  phase: EbayLoginPhase
): EbayLoginTask => ({ ...task, phase })

export const canSubmitIdentifier = (task: EbayLoginTask): boolean => {
  return task.phase === "start" || task.phase === "signingOut"
}

export const canSubmitPassword = (task: EbayLoginTask): boolean => {
  return task.phase === "identifierSubmitted"
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
