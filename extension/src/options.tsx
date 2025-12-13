import { useState, useEffect } from "react"
import "./style.css"

const DEFAULT_REVIEW_PROMPT = `你是一位专业的日本电商客服代表。请根据以下信息生成一条友好、专业的日语回复：

评论内容：{{review_content}}
评分：{{rating}}星
商品名称：{{product_name}}

要求：
1. 感谢客户的评价
2. 如果是好评，表达感激；如果有建议或负面评价，诚恳表示会改进
3. 保持专业、礼貌的语气
4. 使用标准的日语商务敬语
5. 字数控制在100字以内

请直接生成回复内容，不需要其他解释。`

const DEFAULT_INQUIRY_PROMPT = `你是一位专业的日本电商客服代表。请根据客户的咨询内容生成一条友好、专业的日语回复：

客户咨询：{{inquiry_content}}
商品信息：{{product_name}}

要求：
1. 礼貌地回应客户的问题
2. 提供清晰、准确的信息
3. 使用标准的日语商务敬语
4. 保持友好、专业的语气
5. 如果需要额外信息，礼貌地询问

请直接生成回复内容，不需要其他解释。`

interface Settings {
  openaiKey: string
  geminiKey: string
  provider: "openai" | "gemini"
  reviewPrompt: string
  inquiryPrompt: string
}

function OptionsIndex() {
  const [activeTab, setActiveTab] = useState<"api" | "prompts">("api")
  const [settings, setSettings] = useState<Settings>({
    openaiKey: "",
    geminiKey: "",
    provider: "openai",
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    inquiryPrompt: DEFAULT_INQUIRY_PROMPT,
  })
  const [saveStatus, setSaveStatus] = useState<string>("")
  const [promptTab, setPromptTab] = useState<"review" | "inquiry">("review")

  useEffect(() => {
    // 从 storage 加载设置
    chrome.storage.local.get(
      ["openaiKey", "geminiKey", "provider", "reviewPrompt", "inquiryPrompt"],
      (result) => {
        setSettings({
          openaiKey: result.openaiKey || "",
          geminiKey: result.geminiKey || "",
          provider: result.provider || "openai",
          reviewPrompt: result.reviewPrompt || DEFAULT_REVIEW_PROMPT,
          inquiryPrompt: result.inquiryPrompt || DEFAULT_INQUIRY_PROMPT,
        })
      }
    )
  }, [])

  const handleSave = () => {
    chrome.storage.local.set(settings, () => {
      setSaveStatus("✅ 保存成功")
      setTimeout(() => setSaveStatus(""), 2000)
    })
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
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
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
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}>
              🔑 API 设置
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "prompts"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}>
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
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}>
                      OpenAI (GPT-4o-mini)
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: "gemini" })
                      }
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        settings.provider === "gemini"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}>
                      Google Gemini
                    </button>
                  </div>
                </div>

                {/* OpenAI Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini API Key
                  </label>
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
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      className="text-blue-600 hover:underline">
                      Google AI Studio
                    </a>{" "}
                    获取
                  </p>
                </div>
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
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
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

