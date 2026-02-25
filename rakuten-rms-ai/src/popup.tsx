import { useState, useEffect } from "react"
import "./style.css"
import { StorageService } from "~services"
import type { ProviderType } from "~types"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [status, setStatus] = useState("就绪")
  const [provider, setProvider] = useState<ProviderType>("gemini")
  const [currentModel, setCurrentModel] = useState("")

  useEffect(() => {
    StorageService.getSettings().then((s) => {
      setIsEnabled(s.enabled !== false)
      setStatus(s.enabled !== false ? "就绪" : "已暂停")
      setProvider(s.provider)
      setCurrentModel(
        s.provider === "openai"
          ? s.openaiModel || "(未设置)"
          : s.geminiModel || "(未设置)"
      )
    })
  }, [])

  const toggleEnabled = async () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    await StorageService.saveSettings({ enabled: newState })
    setStatus(newState ? "已启用" : "已暂停")
  }

  const handleProviderChange = async (p: ProviderType) => {
    setProvider(p)
    await StorageService.saveSettings({ provider: p })
    const s = await StorageService.getSettings()
    setCurrentModel(
      p === "openai"
        ? s.openaiModel || "(未设置)"
        : s.geminiModel || "(未设置)"
    )
  }

  return (
    <div className="w-80 p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <img src="https://pic.x-yue.top/i/2026/02/25/kr8o0q.png" alt="UO" className="w-10 h-10 rounded-lg" />
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isEnabled ? "text-white" : "bg-gray-300 text-gray-600 hover:bg-gray-400"}`}
            style={isEnabled ? { backgroundColor: "#2478AE" } : {}}>
            {isEnabled ? "启用中" : "已暂停"}
          </button>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">AI Provider</p>
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
            当前模型: {currentModel}
          </p>
        </div>

        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          完整设置
        </button>

        <div className="text-xs text-gray-400 text-center pt-2">v0.0.1</div>
      </div>
    </div>
  )
}

export default IndexPopup
