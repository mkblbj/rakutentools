import { useState, useEffect } from "react"
import "./style.css"
import type { UserSettings } from "~types"
import { StorageService, DEFAULT_REVIEW_PROMPT, DEFAULT_INQUIRY_PROMPT } from "~services"

function OptionsIndex() {
  const [activeTab, setActiveTab] = useState<"api" | "prompts">("api")
  const [settings, setSettings] = useState<UserSettings>({
    openaiKey: "",
    geminiKey: "",
    provider: "openai",
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    inquiryPrompt: DEFAULT_INQUIRY_PROMPT,
    enabled: true,
  })
  const [saveStatus, setSaveStatus] = useState<string>("")
  const [promptTab, setPromptTab] = useState<"review" | "inquiry">("review")

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

  const resetPrompt = (type: "review" | "inquiry") => {
    if (type === "review") {
      setSettings({ ...settings, reviewPrompt: DEFAULT_REVIEW_PROMPT })
    } else {
      setSettings({ ...settings, inquiryPrompt: DEFAULT_INQUIRY_PROMPT })
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
                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "openai" })
                      }
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "openai"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "openai" ? { backgroundColor: '#2478AE' } : {}}>
                      OpenAI (GPT-4o-mini)
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "gemini" })
                      }
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "gemini"
                          ? "text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      style={settings.provider === "gemini" ? { backgroundColor: '#2478AE' } : {}}>
                      Google Gemini
                    </button>
                  </div>
                </div>

                {/* OpenAI Key */}
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

                {/* Gemini Key */}
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

                {/* Gemini Model Selection - 只在选择 Gemini 时显示 */}
                {settings.provider === "gemini" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gemini 模型选择
                    </label>
                    <div className="flex flex-wrap gap-3">
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
                      💡 当某个模型达到每日配额限制时，可切换到另一个模型继续使用（配额独立）
                    </p>
                  </div>
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

                {/* Prompt Tabs */}
                <div className="flex gap-2 border-b">
                  <button
                    onClick={() => setPromptTab("review")}
                    className={`px-4 py-2 font-medium transition-colors ${
                      promptTab === "review"
                        ? "text-red-600 border-b-2 border-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}>
                    商品评价回复
                  </button>
                  <button
                    onClick={() => setPromptTab("inquiry")}
                    className={`px-4 py-2 font-medium transition-colors ${
                      promptTab === "inquiry"
                        ? "text-red-600 border-b-2 border-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}>
                    咨询消息回复
                  </button>
                </div>

                {/* Prompt Editor */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {promptTab === "review"
                        ? "评价回复 Prompt"
                        : "咨询回复 Prompt"}
                    </label>
                    <button
                      onClick={() => resetPrompt(promptTab)}
                      className="text-sm text-blue-600 hover:text-blue-700">
                      恢复默认
                    </button>
                  </div>
                  <textarea
                    value={
                      promptTab === "review"
                        ? settings.reviewPrompt
                        : settings.inquiryPrompt
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [promptTab === "review"
                          ? "reviewPrompt"
                          : "inquiryPrompt"]: e.target.value,
                      })
                    }
                    rows={15}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    可用变量：
                    {promptTab === "review"
                      ? " {{review_content}}, {{rating}}, {{product_name}}"
                      : " {{inquiry_content}}, {{product_name}}"}
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

