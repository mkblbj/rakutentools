import { useState, useEffect } from "react"
import "./style.css"
import { StorageService } from "~services"
import type { ProviderType } from "~types"
import { I18nProvider, useI18n, LANGUAGES } from "~i18n"

function IndexPopup() {
  const { t, lang, setLang } = useI18n()
  const [isEnabled, setIsEnabled] = useState(true)
  const [statusKey, setStatusKey] = useState<"popup.ready" | "popup.pausedStatus" | "popup.enabledStatus">("popup.ready")
  const [provider, setProvider] = useState<ProviderType>("gemini")
  const [currentModel, setCurrentModel] = useState("")

  useEffect(() => {
    StorageService.getSettings().then((s) => {
      setIsEnabled(s.enabled !== false)
      setStatusKey(s.enabled !== false ? "popup.ready" : "popup.pausedStatus")
      setProvider(s.provider)
      setCurrentModel(
        s.provider === "openai"
          ? s.openaiModel || ""
          : s.geminiModel || ""
      )
    })
  }, [])

  const toggleEnabled = async () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    await StorageService.saveSettings({ enabled: newState })
    setStatusKey(newState ? "popup.enabledStatus" : "popup.pausedStatus")
  }

  const handleProviderChange = async (p: ProviderType) => {
    setProvider(p)
    await StorageService.saveSettings({ provider: p })
    const s = await StorageService.getSettings()
    setCurrentModel(
      p === "openai"
        ? s.openaiModel || ""
        : s.geminiModel || ""
    )
  }

  return (
    <div className="w-80 p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <img src="https://pic.x-yue.top/i/2026/02/25/kr8o0q.png" alt="UO" className="w-10 h-10 rounded-lg" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">UO Rakutentools</h1>
          <p className="text-sm text-gray-500">{t("popup.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">{t("popup.pluginStatus")}</p>
            <p className="text-xs text-gray-500">{t(statusKey)}</p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isEnabled ? "text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`}
            style={isEnabled ? { backgroundColor: "#2478AE" } : {}}>
            {isEnabled ? t("popup.enabled") : t("popup.paused")}
          </button>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">{t("popup.aiProvider")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleProviderChange("openai")}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${provider === "openai" ? "text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              style={provider === "openai" ? { backgroundColor: "#2478AE" } : {}}>
              OpenAI
            </button>
            <button
              onClick={() => handleProviderChange("gemini")}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${provider === "gemini" ? "text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              style={provider === "gemini" ? { backgroundColor: "#2478AE" } : {}}>
              Gemini
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {t("popup.currentModel")}: {currentModel || t("popup.notSet")}
          </p>
        </div>

        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          {t("popup.fullSettings")}
        </button>

        <div className="flex items-center justify-between pt-2">
          <div className="flex rounded-md overflow-hidden border border-gray-200">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-2.5 py-1 text-xs transition-colors ${lang === code ? "text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                style={lang === code ? { backgroundColor: "#2478AE" } : {}}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">v0.0.1</span>
        </div>
      </div>
    </div>
  )
}

function PopupPage() {
  return (
    <I18nProvider>
      <IndexPopup />
    </I18nProvider>
  )
}

export default PopupPage
