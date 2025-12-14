import { useState, useEffect } from "react"
import "./style.css"
import { StorageService } from "~services"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [status, setStatus] = useState("就绪")

  useEffect(() => {
    // 从 storage 读取启用状态
    StorageService.isEnabled().then((enabled) => {
      setIsEnabled(enabled)
      setStatus(enabled ? "就绪" : "已暂停")
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

  return (
    <div className="w-80 p-6 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
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
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 text-gray-600 hover:bg-gray-400"
            }`}>
            {isEnabled ? "启用中" : "已暂停"}
          </button>
        </div>

        <button
          onClick={openSettings}
          className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          ⚙️ 打开设置
        </button>

        <div className="text-xs text-gray-400 text-center pt-2">
          v0.0.1
        </div>
      </div>
    </div>
  )
}

export default IndexPopup

