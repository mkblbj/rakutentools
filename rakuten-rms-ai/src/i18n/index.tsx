import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import ja, { type TranslationKey, type TranslationDict } from "./locales/ja"
import zh from "./locales/zh"
import en from "./locales/en"

export type Language = "ja" | "zh" | "en"
export type { TranslationKey } from "./locales/ja"

const STORAGE_KEY = "language"

const dictionaries: Record<Language, TranslationDict> = { ja, zh, en }

function translate(
  dict: TranslationDict,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  let text: string = dict[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
    }
  }
  return text
}

interface I18nContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [lang, setLangState] = useState<Language>("ja")

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (r: Record<string, string>) => {
      const val = r[STORAGE_KEY]
      if (val && ["ja", "zh", "en"].includes(val)) {
        setLangState(val as Language)
      }
    })
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEY]?.newValue) {
        setLangState(changes[STORAGE_KEY].newValue as Language)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    chrome.storage.local.set({ [STORAGE_KEY]: newLang })
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(dictionaries[lang], key, params)
    },
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}

/**
 * Standalone hook for content scripts running in shadow DOM.
 * Reads language preference directly from chrome.storage without needing a Provider.
 */
export function useContentI18n() {
  const [lang, setLang] = useState<Language>("ja")

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (r: Record<string, string>) => {
      const val = r[STORAGE_KEY]
      if (val && ["ja", "zh", "en"].includes(val)) {
        setLang(val as Language)
      }
    })
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEY]?.newValue) {
        setLang(changes[STORAGE_KEY].newValue as Language)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(dictionaries[lang], key, params)
    },
    [lang]
  )

  return { t, lang }
}

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "en", label: "EN" },
]
