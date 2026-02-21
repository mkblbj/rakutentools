import { useState, useEffect } from "react"
import "./style.css"
import type { UserSettings } from "~types"
import { StorageService, DEFAULT_REVIEW_PROMPT } from "~services"

function OptionsIndex() {
  const [activeTab, setActiveTab] = useState<"api" | "prompts">("api")
  const [settings, setSettings] = useState<UserSettings>({
    customApiKey: "",
    customBaseUrl: "",
    customModel: "",
    openaiKey: "",
    geminiKey: "",
    zenmuxKey: "",
    manusKey: "",
    provider: "custom",
    geminiModel: "gemini-2.5-flash",
    zenmuxModel: "",
    manusModel: "manus-1.6",
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    enabled: true,
  })
  const [saveStatus, setSaveStatus] = useState<string>("")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    // 从 storage 加载设置
    StorageService.getSettings().then((loadedSettings) => {
      setSettings(loadedSettings)
    })
  }, [])

  const handleSave = async () => {
    try {
      await StorageService.saveSettings(settings)
      setSaveStatus("✅ 保存成功")
      setTimeout(() => setSaveStatus(""), 2000)
    } catch (error) {
      setSaveStatus("❌ 保存失败")
      console.error("Save settings error:", error)
    }
  }

  const resetPrompt = () => {
    setSettings({ ...settings, reviewPrompt: DEFAULT_REVIEW_PROMPT })
  }

  const fetchModels = async () => {
    if (!settings.customApiKey || !settings.customBaseUrl) {
      setSaveStatus("⚠️ 请先填写 API Key 和 Base URL")
      setTimeout(() => setSaveStatus(""), 2000)
      return
    }

    setLoadingModels(true)
    setSaveStatus("🔄 正在获取模型列表...")
    
    try {
      const { CustomProvider } = await import("~services/providers/custom")
      const models = await CustomProvider.fetchModels(
        settings.customBaseUrl,
        settings.customApiKey
      )
      setAvailableModels(models)
      setSaveStatus(`✅ 成功获取 ${models.length} 个模型`)
      setTimeout(() => setSaveStatus(""), 3000)
    } catch (error) {
      setSaveStatus(`❌ 获取模型失败: ${error.message}`)
      console.error("Fetch models error:", error)
      setTimeout(() => setSaveStatus(""), 3000)
    } finally {
      setLoadingModels(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: '#2478AE' }}>
              UO
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">UO Rakutentools 设置</h1>
              <p className="text-sm text-gray-500">AI ツール配置</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            <button
              onClick={() => setActiveTab("api")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "api"
                  ? "text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              style={activeTab === "api" ? { backgroundColor: '#2478AE' } : {}}>
              🔑 API 设置
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "prompts"
                  ? "text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              style={activeTab === "prompts" ? { backgroundColor: '#2478AE' } : {}}>
              📝 Prompt 编辑器
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            {activeTab === "api" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    API 配置
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    配置你的 AI 服务提供商 API Key
                  </p>
                </div>

                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    默认 AI 模型
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "custom" })
                      }
                      className={`px-5 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "custom"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "custom" ? { backgroundColor: '#2478AE' } : {}}>
                      🔧 Custom API
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "manus" })
                      }
                      className={`px-5 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "manus"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "manus" ? { backgroundColor: '#2478AE' } : {}}>
                      🤖 Manus
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "openai" })
                      }
                      className={`px-5 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "openai"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "openai" ? { backgroundColor: '#2478AE' } : {}}>
                      OpenAI
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "gemini" })
                      }
                      className={`px-5 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "gemini"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "gemini" ? { backgroundColor: '#2478AE' } : {}}>
                      Gemini
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "zenmux" })
                      }
                      className={`px-5 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "zenmux"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "zenmux" ? { backgroundColor: '#2478AE' } : {}}>
                      🌐 ZenMux
                    </button>
                  </div>
                </div>

                {/* Custom API 配置 - 只在选择 Custom 时显示 */}
                {settings.provider === "custom" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom API Key
                      </label>
                      <input
                        type="password"
                        value={settings.customApiKey}
                        onChange={(e) =>
                          setSettings({ ...settings, customApiKey: e.target.value })
                        }
                        placeholder="sk-..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        OpenAI 兼容 API 的 Key
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={settings.customBaseUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, customBaseUrl: e.target.value })
                        }
                        placeholder="https://api.example.com/v1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        API 的 Base URL（不包含 /chat/completions）
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          模型选择
                        </label>
                        <button
                          onClick={fetchModels}
                          disabled={loadingModels || !settings.customApiKey || !settings.customBaseUrl}
                          className="px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: '#2478AE', color: 'white' }}>
                          {loadingModels ? "🔄 获取中..." : "🔍 获取模型列表"}
                        </button>
                      </div>
                      
                      {availableModels.length > 0 ? (
                        <select
                          value={settings.customModel}
                          onChange={(e) =>
                            setSettings({ ...settings, customModel: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">选择模型...</option>
                          {availableModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={settings.customModel}
                          onChange={(e) =>
                            setSettings({ ...settings, customModel: e.target.value })
                          }
                          placeholder="gpt-4o-mini"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        点击"获取模型列表"自动加载可用模型，或手动输入模型名称
                      </p>
                    </div>
                  </>
                )}

                {/* OpenAI Key - 只在选择 OpenAI 时显示 */}
                {settings.provider === "openai" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        OpenAI API Key
                      </label>
                      <a
                        href="https://platform.openai.com/usage"
                        target="_blank"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        📊 查看用量
                      </a>
                    </div>
                    <input
                      type="password"
                      value={settings.openaiKey}
                      onChange={(e) =>
                        setSettings({ ...settings, openaiKey: e.target.value })
                      }
                      placeholder="sk-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      从{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        className="text-blue-600 hover:underline">
                        OpenAI Platform
                      </a>{" "}
                      获取
                    </p>
                  </div>
                )}

                {/* Gemini Key - 只在选择 Gemini 时显示 */}
                {settings.provider === "gemini" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Gemini API Key
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        📊 查看配额
                      </a>
                    </div>
                    <input
                      type="password"
                      value={settings.geminiKey}
                      onChange={(e) =>
                        setSettings({ ...settings, geminiKey: e.target.value })
                      }
                      placeholder="AIza..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      从{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        className="text-blue-600 hover:underline">
                        Google AI Studio
                      </a>{" "}
                      获取
                    </p>
                  </div>
                )}

                {/* Gemini Model Selection - 只在选择 Gemini 时显示 */}
                {settings.provider === "gemini" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gemini 模型选择
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() =>
                          setSettings({ ...settings, geminiModel: "gemini-3-pro-preview" })
                        }
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          settings.geminiModel === "gemini-3-pro-preview"
                            ? "text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        style={settings.geminiModel === "gemini-3-pro-preview" ? { backgroundColor: '#2478AE' } : {}}>
                        🚀 3-pro-preview
                      </button>
                      <button
                        onClick={() =>
                          setSettings({ ...settings, geminiModel: "gemini-2.5-flash" })
                        }
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          (!settings.geminiModel || settings.geminiModel === "gemini-2.5-flash")
                            ? "text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        style={(!settings.geminiModel || settings.geminiModel === "gemini-2.5-flash") ? { backgroundColor: '#2478AE' } : {}}>
                        2.5-flash
                      </button>
                      <button
                        onClick={() =>
                          setSettings({ ...settings, geminiModel: "gemini-2.5-flash-lite" })
                        }
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          settings.geminiModel === "gemini-2.5-flash-lite"
                            ? "text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        style={settings.geminiModel === "gemini-2.5-flash-lite" ? { backgroundColor: '#2478AE' } : {}}>
                        2.5-flash-lite
                      </button>
                      <button
                        onClick={() =>
                          setSettings({ ...settings, geminiModel: "gemini-2.0-flash-lite" })
                        }
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          settings.geminiModel === "gemini-2.0-flash-lite"
                            ? "text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        style={settings.geminiModel === "gemini-2.0-flash-lite" ? { backgroundColor: '#2478AE' } : {}}>
                        2.0-flash-lite
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      💡 3-pro-preview 是最强大的模型；当某个模型达到每日配额限制时，可切换到另一个模型继续使用
                    </p>
                  </div>
                )}

                {/* ZenMux Key - 只在选择 ZenMux 时显示 */}
                {settings.provider === "zenmux" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          ZenMux API Key
                        </label>
                        <a
                          href="https://zenmux.ai/console"
                          target="_blank"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          📊 查看用量
                        </a>
                      </div>
                      <input
                        type="password"
                        value={settings.zenmuxKey || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, zenmuxKey: e.target.value })
                        }
                        placeholder="zm-..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        从{" "}
                        <a
                          href="https://zenmux.ai/console"
                          target="_blank"
                          className="text-blue-600 hover:underline">
                          ZenMux Console
                        </a>{" "}
                        获取 API Key
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZenMux 模型选择
                      </label>
                      <input
                        type="text"
                        value={settings.zenmuxModel ?? ""}
                        onChange={(e) =>
                          setSettings({ ...settings, zenmuxModel: e.target.value })
                        }
                        placeholder="例如: xiaomi/mimo-v2-flash"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        💡 模型格式: <code className="bg-gray-100 px-1 rounded">provider/model-name</code>
                      </p>
                      
                      {/* 限免模型快速选择 */}
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">🎁 限免模型快速选择</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSettings({ ...settings, zenmuxModel: "xiaomi/mimo-v2-flash" })}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                              settings.zenmuxModel === "xiaomi/mimo-v2-flash"
                                ? "text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            style={settings.zenmuxModel === "xiaomi/mimo-v2-flash" ? { backgroundColor: '#2478AE' } : {}}>
                            mimo-v2-flash
                            <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">限免</span>
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, zenmuxModel: "kuaishou/kat-coder-pro-v1" })}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                              settings.zenmuxModel === "kuaishou/kat-coder-pro-v1"
                                ? "text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            style={settings.zenmuxModel === "kuaishou/kat-coder-pro-v1" ? { backgroundColor: '#2478AE' } : {}}>
                            kat-coder-pro
                            <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">限免</span>
                          </button>
                          <button
                            onClick={() => setSettings({ ...settings, zenmuxModel: "z-ai/glm-4.6v-flash" })}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                              settings.zenmuxModel === "z-ai/glm-4.6v-flash"
                                ? "text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            style={settings.zenmuxModel === "z-ai/glm-4.6v-flash" ? { backgroundColor: '#2478AE' } : {}}>
                            glm-4.6v-flash
                            <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px]">限免</span>
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        查看所有支持的模型:{" "}
                        <a
                          href="https://zenmux.ai/models"
                          target="_blank"
                          className="text-blue-600 hover:underline">
                          ZenMux Models
                        </a>
                      </p>
                    </div>
                  </>
                )}

                {/* Manus 配置 - 只在选择 Manus 时显示 */}
                {settings.provider === "manus" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Manus API Key
                        </label>
                        <a
                          href="https://open.manus.im/docs"
                          target="_blank"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          📖 API 文档
                        </a>
                      </div>
                      <input
                        type="password"
                        value={settings.manusKey || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, manusKey: e.target.value })
                        }
                        placeholder="your-manus-api-key"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        从{" "}
                        <a
                          href="https://open.manus.im"
                          target="_blank"
                          className="text-blue-600 hover:underline">
                          Manus Platform
                        </a>{" "}
                        获取 API Key
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manus 模型选择
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSettings({ ...settings, manusModel: "manus-1.6" })}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            settings.manusModel === "manus-1.6"
                              ? "text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          style={settings.manusModel === "manus-1.6" ? { backgroundColor: '#2478AE' } : {}}>
                          manus-1.6
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, manusModel: "manus-1.6-lite" })}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            settings.manusModel === "manus-1.6-lite"
                              ? "text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          style={settings.manusModel === "manus-1.6-lite" ? { backgroundColor: '#2478AE' } : {}}>
                          manus-1.6-lite
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, manusModel: "manus-1.6-max" })}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            settings.manusModel === "manus-1.6-max"
                              ? "text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          style={settings.manusModel === "manus-1.6-max" ? { backgroundColor: '#2478AE' } : {}}>
                          🚀 manus-1.6-max
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        💡 lite 适合简单任务，max 最强性能
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Prompt 模板编辑
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    自定义 AI 生成回复的提示词模板
                  </p>
                </div>

                {/* Prompt Editor */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      评价回复 Prompt
                    </label>
                    <button
                      onClick={() => resetPrompt()}
                      className="text-sm text-blue-600 hover:text-blue-700">
                      恢复默认
                    </button>
                  </div>
                  <textarea
                    value={settings.reviewPrompt}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reviewPrompt: e.target.value,
                      })
                    }
                    rows={15}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    可用变量：{{review_content}}, {{rating}}, {{product_name}}
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t">
              <button
                onClick={handleSave}
                className="px-6 py-3 text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#2478AE' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1e6292'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2478AE'
                }}>
                保存设置
              </button>
              {saveStatus && (
                <span className="text-sm text-green-600">{saveStatus}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OptionsIndex

