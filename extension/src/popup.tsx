import { useState, useEffect } from "react"
import "./style.css"
import { StorageService } from "~services"
import type { ProviderType, UserSettings } from "~types"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [status, setStatus] = useState("就绪")
  const [provider, setProvider] = useState<ProviderType>("openai")
  const [geminiModel, setGeminiModel] = useState<"gemini-3-pro-preview" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.0-flash-lite">("gemini-2.5-flash")
  const [zenmuxModel, setZenmuxModel] = useState<string>("openai/gpt-4o-mini")
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    // 从 storage 读取所有设置
    StorageService.getSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
      setIsEnabled(loadedSettings.enabled !== false)
      setStatus(loadedSettings.enabled !== false ? "就绪" : "已暂停")
      setProvider(loadedSettings.provider)
      setGeminiModel(loadedSettings.geminiModel || "gemini-2.5-flash")
      setZenmuxModel(loadedSettings.zenmuxModel || "openai/gpt-4o-mini")
    })
  }, [])

  const toggleEnabled = async () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    await StorageService.saveSettings({ enabled: newState })
    setStatus(newState ? "已启用" : "已暂停")
  }

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  const handleProviderChange = async (newProvider: ProviderType) => {
    setProvider(newProvider)
    await StorageService.saveSettings({ provider: newProvider })
  }

  const handleGeminiModelChange = async (model: "gemini-3-pro-preview" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.0-flash-lite") => {
    setGeminiModel(model)
    await StorageService.saveSettings({ geminiModel: model })
  }

  const handleZenmuxModelChange = async (model: string) => {
    setZenmuxModel(model)
    await StorageService.saveSettings({ zenmuxModel: model })
  }

  return (
    <div className="w-80 p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#2478AE' }}>
          UO
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">UO Rakutentools</h1>
          <p className="text-sm text-gray-500">AI ツール</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">插件状态</p>
            <p className="text-xs text-gray-500">{status}</p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEnabled
                ? "text-white"
                : "bg-gray-300 text-gray-600 hover:bg-gray-400"
            }`}
            style={isEnabled ? { backgroundColor: '#2478AE' } : {}}
            onMouseEnter={(e) => {
              if (isEnabled) {
                e.currentTarget.style.backgroundColor = '#1e6292'
              }
            }}
            onMouseLeave={(e) => {
              if (isEnabled) {
                e.currentTarget.style.backgroundColor = '#2478AE'
              }
            }}>
            {isEnabled ? "启用中" : "已暂停"}
          </button>
        </div>

        {/* AI Provider 选择 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">AI 模型</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleProviderChange("openai")}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                provider === "openai"
                  ? "text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
              style={provider === "openai" ? { backgroundColor: '#2478AE' } : {}}>
              OpenAI
            </button>
            <button
              onClick={() => handleProviderChange("gemini")}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                provider === "gemini"
                  ? "text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
              style={provider === "gemini" ? { backgroundColor: '#2478AE' } : {}}>
              Gemini
            </button>
            <button
              onClick={() => handleProviderChange("zenmux")}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                provider === "zenmux"
                  ? "text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
              style={provider === "zenmux" ? { backgroundColor: '#2478AE' } : {}}>
              ZenMux
            </button>
          </div>
        </div>

        {/* Gemini 模型选择 - 只在选择 Gemini 时显示 */}
        {provider === "gemini" && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Gemini 版本</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleGeminiModelChange("gemini-3-pro-preview")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  geminiModel === "gemini-3-pro-preview"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={geminiModel === "gemini-3-pro-preview" ? { backgroundColor: '#2478AE' } : {}}>
                🚀 3-pro-preview
              </button>
              <button
                onClick={() => handleGeminiModelChange("gemini-2.5-flash")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  geminiModel === "gemini-2.5-flash"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={geminiModel === "gemini-2.5-flash" ? { backgroundColor: '#2478AE' } : {}}>
                2.5-flash
              </button>
              <button
                onClick={() => handleGeminiModelChange("gemini-2.5-flash-lite")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  geminiModel === "gemini-2.5-flash-lite"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={geminiModel === "gemini-2.5-flash-lite" ? { backgroundColor: '#2478AE' } : {}}>
                2.5-flash-lite
              </button>
              <button
                onClick={() => handleGeminiModelChange("gemini-2.0-flash-lite")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  geminiModel === "gemini-2.0-flash-lite"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={geminiModel === "gemini-2.0-flash-lite" ? { backgroundColor: '#2478AE' } : {}}>
                2.0-flash-lite
              </button>
            </div>
          </div>
        )}

        {/* ZenMux 模型选择 - 只在选择 ZenMux 时显示 */}
        {provider === "zenmux" && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">🎁 限免模型</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleZenmuxModelChange("xiaomi/mimo-v2-flash")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  zenmuxModel === "xiaomi/mimo-v2-flash"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={zenmuxModel === "xiaomi/mimo-v2-flash" ? { backgroundColor: '#2478AE' } : {}}>
                <span>mimo-v2-flash</span>
                <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">限免</span>
              </button>
              <button
                onClick={() => handleZenmuxModelChange("kuaishou/kat-coder-pro-v1")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  zenmuxModel === "kuaishou/kat-coder-pro-v1"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={zenmuxModel === "kuaishou/kat-coder-pro-v1" ? { backgroundColor: '#2478AE' } : {}}>
                <span>kat-coder-pro</span>
                <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">限免</span>
              </button>
              <button
                onClick={() => handleZenmuxModelChange("z-ai/glm-4.6v-flash")}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  zenmuxModel === "z-ai/glm-4.6v-flash"
                    ? "text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
                style={zenmuxModel === "z-ai/glm-4.6v-flash" ? { backgroundColor: '#2478AE' } : {}}>
                <span>glm-4.6v-flash</span>
                <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">限免</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={openSettings}
          className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          ⚙️ 完整设置
        </button>

        <div className="text-xs text-gray-400 text-center pt-2">
          v0.0.1
        </div>
      </div>
    </div>
  )
}

export default IndexPopup

