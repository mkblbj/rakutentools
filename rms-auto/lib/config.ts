export const CONFIG_VERSION = "0.1.4"
export const RMS_SHOP_COUNT = 20
export const MERCARI_LINK_COUNT = 5
export const AUPAY_SHOP_COUNT = 5
export const TEMU_SHOP_COUNT = 5
export const SYNC_SETTINGS_KEY = "rmsSyncSettings"

export interface Shop {
  shopName: string
  loginId: string
  loginPass: string
  userId: string
  userPass: string
}

export interface MercariLink {
  name: string
  url: string
}

export interface AupayShop {
  name: string
  loginId: string
  password: string
}

export interface TemuShop {
  name: string
  phone: string
  password: string
}

export interface ExportData {
  version: string
  exportDate: string
  shops: Shop[]
  mercariLinks?: MercariLink[]
  aupayShops?: AupayShop[]
  temuShops?: TemuShop[]
}

export type SyncStatus = "idle" | "success" | "error"

export interface SyncSettings {
  enabled: boolean
  endpointUrl: string
  lastSyncAt?: string
  lastSyncStatus: SyncStatus
  lastSyncMessage?: string
}

export interface LocalConfigData {
  shops: Shop[]
  rmsPinCode: string
  mercariLinks: MercariLink[]
  aupayShops: AupayShop[]
  temuShops: TemuShop[]
}

const toString = (value: unknown): string => {
  return typeof value === "string" ? value : ""
}

export const createEmptyShop = (): Shop => ({
  shopName: "",
  loginId: "",
  loginPass: "",
  userId: "",
  userPass: ""
})

export const createEmptyMercariLink = (): MercariLink => ({
  name: "",
  url: ""
})

export const createEmptyAupayShop = (): AupayShop => ({
  name: "",
  loginId: "",
  password: ""
})

export const createEmptyTemuShop = (): TemuShop => ({
  name: "",
  phone: "",
  password: ""
})

const normalizeShop = (value: unknown): Shop => {
  if (!value || typeof value !== "object") {
    return createEmptyShop()
  }

  const source = value as Partial<Shop>
  return {
    shopName: toString(source.shopName),
    loginId: toString(source.loginId),
    loginPass: toString(source.loginPass),
    userId: toString(source.userId),
    userPass: toString(source.userPass)
  }
}

const normalizeMercariLink = (value: unknown): MercariLink => {
  if (!value || typeof value !== "object") {
    return createEmptyMercariLink()
  }

  const source = value as Partial<MercariLink>
  return {
    name: toString(source.name),
    url: toString(source.url)
  }
}

const normalizeAupayShop = (value: unknown): AupayShop => {
  if (!value || typeof value !== "object") {
    return createEmptyAupayShop()
  }

  const source = value as Partial<AupayShop>
  return {
    name: toString(source.name),
    loginId: toString(source.loginId),
    password: toString(source.password)
  }
}

const normalizeTemuShop = (value: unknown): TemuShop => {
  if (!value || typeof value !== "object") {
    return createEmptyTemuShop()
  }

  const source = value as Partial<TemuShop>
  return {
    name: toString(source.name),
    phone: toString(source.phone),
    password: toString(source.password)
  }
}

const normalizeFixedLengthArray = <T>(
  value: unknown,
  length: number,
  normalizeItem: (item: unknown) => T,
  createEmptyItem: () => T
): T[] => {
  const source = Array.isArray(value) ? value : []

  return Array.from({ length }, (_, index) => {
    return index < source.length
      ? normalizeItem(source[index])
      : createEmptyItem()
  })
}

export const normalizeExportData = (
  value: unknown
): Omit<LocalConfigData, "rmsPinCode"> => {
  if (!value || typeof value !== "object") {
    throw new Error("同步数据不是有效的 JSON 对象")
  }

  const source = value as Partial<ExportData>

  if (!Array.isArray(source.shops)) {
    throw new Error("同步数据缺少 shops 数组")
  }

  return {
    shops: normalizeFixedLengthArray(
      source.shops,
      RMS_SHOP_COUNT,
      normalizeShop,
      createEmptyShop
    ),
    mercariLinks: normalizeFixedLengthArray(
      source.mercariLinks,
      MERCARI_LINK_COUNT,
      normalizeMercariLink,
      createEmptyMercariLink
    ),
    aupayShops: normalizeFixedLengthArray(
      source.aupayShops,
      AUPAY_SHOP_COUNT,
      normalizeAupayShop,
      createEmptyAupayShop
    ),
    temuShops: normalizeFixedLengthArray(
      source.temuShops,
      TEMU_SHOP_COUNT,
      normalizeTemuShop,
      createEmptyTemuShop
    )
  }
}

export const buildExportData = (
  data: Omit<LocalConfigData, "rmsPinCode">
): ExportData => {
  return {
    version: CONFIG_VERSION,
    exportDate: new Date().toISOString(),
    shops: data.shops,
    mercariLinks: data.mercariLinks,
    aupayShops: data.aupayShops,
    temuShops: data.temuShops
  }
}

export const defaultSyncSettings = (): SyncSettings => ({
  enabled: false,
  endpointUrl: "",
  lastSyncStatus: "idle",
  lastSyncMessage: ""
})

export const normalizeSyncSettings = (value: unknown): SyncSettings => {
  if (!value || typeof value !== "object") {
    return defaultSyncSettings()
  }

  const source = value as Partial<SyncSettings>
  const status = source.lastSyncStatus

  return {
    enabled: Boolean(source.enabled),
    endpointUrl: toString(source.endpointUrl).trim(),
    lastSyncAt: toString(source.lastSyncAt) || undefined,
    lastSyncStatus:
      status === "success" || status === "error" || status === "idle"
        ? status
        : "idle",
    lastSyncMessage: toString(source.lastSyncMessage)
  }
}

export const readLocalConfig = async (): Promise<LocalConfigData> => {
  const data = await chrome.storage.local.get([
    "rms",
    "rmsPinCode",
    "mercariLinks",
    "aupayShops",
    "temuShops"
  ])

  return {
    shops: normalizeFixedLengthArray(
      data.rms,
      RMS_SHOP_COUNT,
      normalizeShop,
      createEmptyShop
    ),
    rmsPinCode: toString(data.rmsPinCode),
    mercariLinks: normalizeFixedLengthArray(
      data.mercariLinks,
      MERCARI_LINK_COUNT,
      normalizeMercariLink,
      createEmptyMercariLink
    ),
    aupayShops: normalizeFixedLengthArray(
      data.aupayShops,
      AUPAY_SHOP_COUNT,
      normalizeAupayShop,
      createEmptyAupayShop
    ),
    temuShops: normalizeFixedLengthArray(
      data.temuShops,
      TEMU_SHOP_COUNT,
      normalizeTemuShop,
      createEmptyTemuShop
    )
  }
}

export const writeLocalConfig = async (
  data: Omit<LocalConfigData, "rmsPinCode">
): Promise<void> => {
  await chrome.storage.local.set({
    rms: data.shops,
    mercariLinks: data.mercariLinks,
    aupayShops: data.aupayShops,
    temuShops: data.temuShops
  })
}

export const readSyncSettings = async (): Promise<SyncSettings> => {
  const data = await chrome.storage.local.get(SYNC_SETTINGS_KEY)
  return normalizeSyncSettings(data[SYNC_SETTINGS_KEY])
}

export const writeSyncSettings = async (
  updates: Partial<SyncSettings>
): Promise<SyncSettings> => {
  const current = await readSyncSettings()
  const next = normalizeSyncSettings({
    ...current,
    ...updates
  })

  await chrome.storage.local.set({
    [SYNC_SETTINGS_KEY]: next
  })

  return next
}

export const isSyncConfigured = (settings: SyncSettings): boolean => {
  return settings.enabled && settings.endpointUrl.trim().length > 0
}
