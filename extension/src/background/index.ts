import type { GenerateRequest, GenerateResponse, ReviewContext, InquiryContext } from "~types"
import { StorageService } from "~services/storage"
import { ModelFactory } from "~services/providers"

// Background Service Worker
console.log("UO Rakutentools Background Service Worker started")

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason)

  // 初始化默认设置
  if (details.reason === "install") {
    StorageService.resetToDefaults().catch(console.error)
  }
})

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request)

  if (request.action === "generate_reply") {
    handleGenerateReply(request.data as GenerateRequest)
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        console.error("Error generating reply:", error)
        sendResponse({
          success: false,
          error: error.message || "生成回复失败",
        } as GenerateResponse)
      })

    // 返回 true 表示异步响应
    return true
  }

  return false
})

/**
 * 处理生成回复请求
 */
async function handleGenerateReply(
  request: GenerateRequest
): Promise<GenerateResponse> {
  try {
    // 1. 检查插件是否启用
    const isEnabled = await StorageService.isEnabled()
    if (!isEnabled) {
      throw new Error("插件已暂停")
    }

    // 2. 获取当前 Provider 和 API Key
    const provider = await StorageService.getProvider()
    console.log("🔍 当前选择的 Provider:", provider)
    
    const hasApiKey = await StorageService.validateApiKey(provider)
    
    if (!hasApiKey) {
      throw new Error(`请先配置 ${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : provider === "zenmux" ? "ZenMux" : "Custom"} API Key`)
    }

    // 3. 获取对应的 Prompt 模板
    const promptTemplate = await StorageService.getPrompt(request.type)

    // 4. 替换变量
    const prompt = buildPrompt(promptTemplate, request.type, request.context)

    // 5. 创建 Provider 并调用 AI
    const llmProvider = await ModelFactory.createCurrentProvider()
    console.log("🚀 开始调用 AI Provider:", provider)
    
    const reply = await llmProvider.generateReply(prompt)
    
    console.log("✅ AI 回复生成成功，Provider:", provider)

    return {
      success: true,
      data: reply,
    }
  } catch (error) {
    console.error("Generate reply error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    }
  }
}

/**
 * 构建 Prompt（替换变量）
 */
function buildPrompt(
  template: string,
  type: "review" | "inquiry",
  context: ReviewContext | InquiryContext
): string {
  let prompt = template

  if (type === "review") {
    const reviewContext = context as ReviewContext
    prompt = prompt
      .replace(/\{\{review_content\}\}/g, reviewContext.reviewContent || "")
      .replace(/\{\{rating\}\}/g, reviewContext.rating || "5")
      .replace(/\{\{product_name\}\}/g, reviewContext.productName || "")
      .replace(/\{\{buyer_name\}\}/g, reviewContext.buyerName || "")
  } else if (type === "inquiry") {
    const inquiryContext = context as InquiryContext
    prompt = prompt
      .replace(/\{\{inquiry_content\}\}/g, inquiryContext.inquiryContent || "")
      .replace(/\{\{customer_name\}\}/g, inquiryContext.customerName || "")
      .replace(/\{\{category\}\}/g, inquiryContext.category || "")
      .replace(/\{\{order_number\}\}/g, inquiryContext.orderNumber || "")
      .replace(/\{\{inquiry_number\}\}/g, inquiryContext.inquiryNumber || "")
      .replace(/\{\{received_time\}\}/g, inquiryContext.receivedTime || "")
      .replace(/\{\{product_name\}\}/g, inquiryContext.productName || "")
      .replace(/\{\{conversation_history\}\}/g, inquiryContext.conversationHistory || "")
      .replace(/\{\{user_instruction\}\}/g, inquiryContext.userInstruction || "（なし）")
  }

  return prompt
}

export {}
