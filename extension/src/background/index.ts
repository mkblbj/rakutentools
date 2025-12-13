// Background Service Worker
console.log("UO Rakutentools Background Service Worker started")

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason)
  
  // 初始化默认设置
  chrome.storage.local.get(["enabled", "provider"], (result) => {
    if (result.enabled === undefined) {
      chrome.storage.local.set({ enabled: true })
    }
    if (!result.provider) {
      chrome.storage.local.set({ provider: "openai" })
    }
  })
})

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request)
  
  if (request.action === "generate_reply") {
    handleGenerateReply(request.data)
      .then((response) => {
        sendResponse({ success: true, data: response })
      })
      .catch((error) => {
        console.error("Error generating reply:", error)
        sendResponse({ success: false, error: error.message })
      })
    
    // 返回 true 表示异步响应
    return true
  }
  
  return false
})

async function handleGenerateReply(data: {
  type: "review" | "inquiry"
  context: any
}) {
  // 获取用户设置
  const settings = await chrome.storage.local.get([
    "provider",
    "openaiKey",
    "geminiKey",
    "reviewPrompt",
    "inquiryPrompt",
    "enabled",
  ])

  if (!settings.enabled) {
    throw new Error("插件已暂停")
  }

  const provider = settings.provider || "openai"
  const apiKey =
    provider === "openai" ? settings.openaiKey : settings.geminiKey

  if (!apiKey) {
    throw new Error(`请先配置 ${provider === "openai" ? "OpenAI" : "Gemini"} API Key`)
  }

  // 根据类型选择 prompt
  const promptTemplate =
    data.type === "review" ? settings.reviewPrompt : settings.inquiryPrompt

  if (!promptTemplate) {
    throw new Error("未找到对应的 Prompt 模板")
  }

  // 替换变量
  let prompt = promptTemplate
  if (data.type === "review") {
    prompt = prompt
      .replace(/\{\{review_content\}\}/g, data.context.reviewContent || "")
      .replace(/\{\{rating\}\}/g, data.context.rating || "5")
      .replace(/\{\{product_name\}\}/g, data.context.productName || "")
  } else {
    prompt = prompt
      .replace(/\{\{inquiry_content\}\}/g, data.context.inquiryContent || "")
      .replace(/\{\{product_name\}\}/g, data.context.productName || "")
  }

  // 调用对应的 AI 服务
  if (provider === "openai") {
    return await callOpenAI(apiKey, prompt)
  } else {
    return await callGemini(apiKey, prompt)
  }
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "OpenAI API 调用失败")
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Gemini API 调用失败")
  }

  const data = await response.json()
  return data.candidates[0]?.content?.parts[0]?.text || ""
}

export {}

