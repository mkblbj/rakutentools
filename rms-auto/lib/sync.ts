import {
  normalizeExportData,
  readSyncSettings,
  writeLocalConfig,
  writeSyncSettings,
  type SyncSettings
} from "~lib/config"

const DEFAULT_SYNC_TIMEOUT_MS = 5000

export interface SyncResult {
  ok: boolean
  message: string
  syncedAt?: string
}

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "同步超时，请检查内网地址是否可达"
  }

  if (error instanceof Error) {
    return error.message
  }

  return "同步失败"
}

const updateSyncStatus = async (
  settings: SyncSettings,
  status: "success" | "error",
  message: string,
  syncedAt?: string
) => {
  await writeSyncSettings({
    ...settings,
    lastSyncStatus: status,
    lastSyncAt: syncedAt ?? new Date().toISOString(),
    lastSyncMessage: message
  })
}

export const syncRemoteConfigToLocal = async (options?: {
  timeoutMs?: number
}): Promise<SyncResult> => {
  const settings = await readSyncSettings()

  if (!settings.enabled) {
    return {
      ok: false,
      message: "同步未启用"
    }
  }

  if (!settings.endpointUrl) {
    const message = "未配置同步地址"
    await updateSyncStatus(settings, "error", message)
    return {
      ok: false,
      message
    }
  }

  try {
    const response = await fetchWithTimeout(
      settings.endpointUrl,
      options?.timeoutMs ?? DEFAULT_SYNC_TIMEOUT_MS
    )

    if (!response.ok) {
      throw new Error(`同步请求失败（HTTP ${response.status}）`)
    }

    const payload = await response.json()
    const normalized = normalizeExportData(payload)

    await writeLocalConfig(normalized)

    const syncedAt = new Date().toISOString()
    const message = "已从远端同步最新配置"
    await updateSyncStatus(settings, "success", message, syncedAt)

    return {
      ok: true,
      message,
      syncedAt
    }
  } catch (error) {
    const message = formatErrorMessage(error)
    await updateSyncStatus(settings, "error", message)

    return {
      ok: false,
      message
    }
  }
}
