import { useState, useEffect } from "react"
import "./style.css"
import type { UserSettings } from "~types"
import { StorageService, DEFAULT_REVIEW_PROMPT } from "~services"

function OptionsIndex() {
  const [activeTab, setActiveTab] = useState<"openai" | "gemini" | "prompts">("openai")
  const [settings, setSettings] = useState<UserSettings>({
    provider: "gemini",
    openaiKey: "",
    openaiModel: "",
    openaiBaseUrl: "https://api.openai.com/v1",
    openaiMaxOutputTokens: 2048,
    openaiReasoningEffort: "low",
    geminiKey: "",
    geminiModel: "",
    geminiBaseUrl: "https://generativelanguage.googleapis.com",
    geminiMaxOutputTokens: 2048,
    geminiThinkingBudget: 0,
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    enabled: true,
  })
  const [saveStatus, setSaveStatus] = useState("")
  const [openaiModels, setOpenaiModels] = useState<string[]>([])
  const [geminiModels, setGeminiModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState<"openai" | "gemini" | null>(null)
  const [testing, setTesting] = useState<"openai" | "gemini" | null>(null)
  const [testResult, setTestResult] = useState<{ provider: string; ok: boolean; msg: string } | null>(null)
  const [customModelInput, setCustomModelInput] = useState<{ openai: boolean; gemini: boolean }>({ openai: false, gemini: false })

  useEffect(() => {
    StorageService.getSettings().then((s) => setSettings(s))
    chrome.storage.local.get(["_openaiModelsList", "_geminiModelsList"], (r: Record<string, string[]>) => {
      if (r._openaiModelsList?.length) setOpenaiModels(r._openaiModelsList)
      if (r._geminiModelsList?.length) setGeminiModels(r._geminiModelsList)
    })
  }, [])

  const handleSave = async () => {
    try {
      await StorageService.saveSettings(settings)
      setSaveStatus("保存成功")
      setTimeout(() => setSaveStatus(""), 2000)
    } catch (error) {
      setSaveStatus("保存失败")
      console.error("Save error:", error)
    }
  }

  const fetchModelsFor = async (provider: "openai" | "gemini") => {
    const key = provider === "openai" ? settings.openaiKey : settings.geminiKey
    if (!key) {
      setSaveStatus(`请先填写 ${provider === "openai" ? "OpenAI" : "Gemini"} API Key`)
      setTimeout(() => setSaveStatus(""), 2000)
      return
    }
    setLoadingModels(provider)
    try {
      const resp: any = await chrome.runtime.sendMessage({ action: "fetch_models", provider })
      if (resp.success && resp.models) {
        if (provider === "openai") {
          setOpenaiModels(resp.models)
          chrome.storage.local.set({ _openaiModelsList: resp.models })
        } else {
          setGeminiModels(resp.models)
          chrome.storage.local.set({ _geminiModelsList: resp.models })
        }
        setCustomModelInput((prev) => ({ ...prev, [provider]: false }))
        setSaveStatus(`获取到 ${resp.models.length} 个模型`)
      } else {
        setSaveStatus(resp.error || "获取失败")
      }
      setTimeout(() => setSaveStatus(""), 3000)
    } catch {
      setSaveStatus("获取模型失败")
      setTimeout(() => setSaveStatus(""), 3000)
    } finally {
      setLoadingModels(null)
    }
  }

  const testModel = async (provider: "openai" | "gemini") => {
    const key = provider === "openai" ? settings.openaiKey : settings.geminiKey
    const model = provider === "openai" ? settings.openaiModel : settings.geminiModel
    if (!key) {
      setTestResult({ provider, ok: false, msg: "API Key 未填写" })
      setTimeout(() => setTestResult(null), 4000)
      return
    }
    if (!model) {
      setTestResult({ provider, ok: false, msg: "模型未选择" })
      setTimeout(() => setTestResult(null), 4000)
      return
    }
    setTesting(provider)
    setTestResult(null)
    try {
      await StorageService.saveSettings(settings)
      const resp: any = await chrome.runtime.sendMessage({ action: "test_model", provider })
      if (resp.success) {
        setTestResult({ provider, ok: true, msg: `连通成功: "${resp.reply}"` })
      } else {
        setTestResult({ provider, ok: false, msg: resp.error || "测试失败" })
      }
      setTimeout(() => setTestResult(null), 6000)
    } catch {
      setTestResult({ provider, ok: false, msg: "通信失败" })
      setTimeout(() => setTestResult(null), 4000)
    } finally {
      setTesting(null)
    }
  }

  const activeBtn = { backgroundColor: "#2478AE" }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <img src="https://pic.x-yue.top/i/2026/02/25/li6n6d.jpg" alt="UO Rakutentools" className="h-14 rounded-lg" />
            <p className="text-sm text-gray-400">ツール配置</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          <div className="w-64 space-y-2">
            {([
              { key: "openai", label: "OpenAI" },
              { key: "gemini", label: "Gemini" },
              { key: "prompts", label: "Prompt 编辑器" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === key ? "text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                style={activeTab === key ? activeBtn : {}}>
                {label}
                {key !== "prompts" && settings.provider === key && (
                  <span className="ml-2 text-xs opacity-75">(默认)</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            {activeTab === "openai" && renderProviderTab("openai")}
            {activeTab === "gemini" && renderProviderTab("gemini")}
            {activeTab === "prompts" && renderPromptsTab()}

            <div className="flex items-center gap-3 mt-6 pt-6 border-t">
              <button
                onClick={handleSave}
                className="px-6 py-3 text-white rounded-lg font-medium transition-colors"
                style={activeBtn}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1e6292" }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#2478AE" }}>
                保存设置
              </button>
              {saveStatus && <span className="text-sm text-green-600">{saveStatus}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  function renderProviderTab(provider: "openai" | "gemini") {
    const name = provider === "openai" ? "OpenAI" : "Gemini"
    const isDefault = settings.provider === provider
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{name} 配置</h2>
          {isDefault ? (
            <span className="px-3 py-1 text-xs rounded-full text-white" style={activeBtn}>当前默认</span>
          ) : (
            <button
              onClick={() => setSettings({ ...settings, provider })}
              className="px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors">
              设为默认
            </button>
          )}
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
          <strong>Token 预算说明:</strong> 「可见输出 Token」只控制回复长度，思考 token 由独立参数控制，互不挤占。
        </div>
        {provider === "openai" ? renderOpenAISection() : renderGeminiSection()}
      </div>
    )
  }

  function renderOpenAISection() {
    return (
      <div className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input type="password" value={settings.openaiKey || ""} onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })} placeholder="sk-..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <p className="mt-1 text-xs text-gray-500">从 <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">OpenAI Platform</a> 获取</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input type="text" value={settings.openaiBaseUrl || ""} onChange={(e) => setSettings({ ...settings, openaiBaseUrl: e.target.value })} placeholder="https://api.openai.com/v1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <p className="mt-1 text-xs text-gray-500">完整请求路径: <code className="bg-gray-100 px-1 rounded">{settings.openaiBaseUrl || "https://api.openai.com/v1"}/chat/completions</code></p>
        </div>

        {renderModelSelector("openai", openaiModels, settings.openaiModel || "", (v) => setSettings({ ...settings, openaiModel: v }))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">可见输出 Token: <span className="font-bold text-gray-900">{settings.openaiMaxOutputTokens ?? 2048}</span></label>
          <input type="range" min={512} max={8192} step={256} value={settings.openaiMaxOutputTokens ?? 2048} onChange={(e) => setSettings({ ...settings, openaiMaxOutputTokens: Number(e.target.value) })} className="w-full" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>512</span><span>8192</span></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">思考深度 (reasoning_effort)</label>
          <select value={settings.openaiReasoningEffort || "low"} onChange={(e) => setSettings({ ...settings, openaiReasoningEffort: e.target.value as "low" | "medium" | "high" })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="low">low (省 token)</option>
            <option value="medium">medium</option>
            <option value="high">high (深度思考)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">思考 tokens 不占用输出预算。仅 o 系列模型有效，其他模型自动忽略。</p>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => testModel("openai")}
            disabled={testing === "openai"}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${testing === "openai" ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
            {testing === "openai" ? "测试中..." : "测试连通性"}
          </button>
          {testResult?.provider === "openai" && (
            <span className={`ml-3 text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
              {testResult.msg}
            </span>
          )}
        </div>
      </div>
    )
  }

  function renderGeminiSection() {
    return (
      <div className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input type="password" value={settings.geminiKey || ""} onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })} placeholder="AIza..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <p className="mt-1 text-xs text-gray-500">从 <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a> 获取</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input type="text" value={settings.geminiBaseUrl || ""} onChange={(e) => setSettings({ ...settings, geminiBaseUrl: e.target.value })} placeholder="https://generativelanguage.googleapis.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <p className="mt-1 text-xs text-gray-500">完整请求路径: <code className="bg-gray-100 px-1 rounded">{settings.geminiBaseUrl || "https://generativelanguage.googleapis.com"}{"/v1beta/models/{model}:generateContent"}</code></p>
          <p className="mt-0.5 text-xs text-gray-400">SDK 自动追加 /v1beta 版本路径，此处只填域名即可</p>
        </div>

        {renderModelSelector("gemini", geminiModels, settings.geminiModel || "", (v) => setSettings({ ...settings, geminiModel: v }))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">可见输出 Token: <span className="font-bold text-gray-900">{settings.geminiMaxOutputTokens ?? 2048}</span></label>
          <input type="range" min={512} max={8192} step={256} value={settings.geminiMaxOutputTokens ?? 2048} onChange={(e) => setSettings({ ...settings, geminiMaxOutputTokens: Number(e.target.value) })} className="w-full" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>512</span><span>8192</span></div>
        </div>

        <div>
          {(() => {
            const isProModel = (settings.geminiModel || "").toLowerCase().includes("-pro")
            const budget = settings.geminiThinkingBudget ?? 0
            const effectiveBudget = isProModel ? Math.max(budget, 1024) : budget
            const visibleTokens = settings.geminiMaxOutputTokens ?? 2048
            const totalTokens = visibleTokens + effectiveBudget
            const label = isProModel
              ? (budget === 0 ? `最低 1024 (实际: ${effectiveBudget})` : String(effectiveBudget))
              : (budget === 0 ? "关闭" : String(budget))
            const minLabel = isProModel ? "0 → 最低 1024" : "0 (关闭)"
            return (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">思考预算 (thinkingBudget): <span className="font-bold text-gray-900">{label}</span></label>
                <input type="range" min={0} max={8192} step={512} value={budget} onChange={(e) => setSettings({ ...settings, geminiThinkingBudget: Number(e.target.value) })} className="w-full" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{minLabel}</span><span>8192</span></div>
                {isProModel ? (
                  <p className="mt-1 text-xs text-amber-600">Pro 模型强制开启思考且最低 1024。API 实际 maxOutputTokens = 可见({visibleTokens}) + 思考({effectiveBudget}) = {totalTokens}</p>
                ) : (
                  effectiveBudget > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">API 实际 maxOutputTokens = 可见({visibleTokens}) + 思考({effectiveBudget}) = {totalTokens}。Gemini 的 maxOutputTokens 包含思考 token。</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">思考已关闭，评价回复推荐此设置。开启后思考 token 会计入 maxOutputTokens 总预算。</p>
                  )
                )}
              </>
            )
          })()}
        </div>

        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => testModel("gemini")}
            disabled={testing === "gemini"}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${testing === "gemini" ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
            {testing === "gemini" ? "测试中..." : "测试连通性"}
          </button>
          {testResult?.provider === "gemini" && (
            <span className={`ml-3 text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
              {testResult.msg}
            </span>
          )}
        </div>
      </div>
    )
  }

  function renderModelSelector(
    provider: "openai" | "gemini",
    models: string[],
    value: string,
    onChange: (v: string) => void
  ) {
    const isCustom = customModelInput[provider]
    const hasModels = models.length > 0
    const currentInList = hasModels && models.includes(value)

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">模型</label>
          <button
            onClick={() => fetchModelsFor(provider)}
            disabled={loadingModels === provider || !(provider === "openai" ? settings.openaiKey : settings.geminiKey)}
            className="px-3 py-1 text-xs rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={activeBtn}>
            {loadingModels === provider ? "获取中..." : "获取模型列表"}
          </button>
        </div>

        {isCustom ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={provider === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash"}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <select
            value={currentInList ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            {!hasModels ? (
              <option value="">{value || "请先获取模型列表"}</option>
            ) : (
              <>
                <option value="">选择模型...</option>
                {!currentInList && value && <option value={value}>{value} (当前)</option>}
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </>
            )}
          </select>
        )}

        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isCustom}
            onChange={(e) => setCustomModelInput((prev) => ({ ...prev, [provider]: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">输入自定义模型名称</span>
        </label>
      </div>
    )
  }

  function renderPromptsTab() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Prompt 模板编辑</h2>
          <p className="text-sm text-gray-600 mb-6">自定义 AI 生成回复的提示词模板</p>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">评价回复 Prompt</label>
            <button onClick={() => setSettings({ ...settings, reviewPrompt: DEFAULT_REVIEW_PROMPT })} className="text-sm text-blue-600 hover:text-blue-700">恢复默认</button>
          </div>
          <textarea value={settings.reviewPrompt || ""} onChange={(e) => setSettings({ ...settings, reviewPrompt: e.target.value })} rows={15} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" />
          <p className="mt-2 text-xs text-gray-500">{"可用变量：{{review_content}}, {{rating}}, {{product_name}}"}</p>
        </div>
      </div>
    )
  }
}

export default OptionsIndex
