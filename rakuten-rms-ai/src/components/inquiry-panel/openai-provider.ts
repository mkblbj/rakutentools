import { OpenAIChatProvider, XRequest } from "@ant-design/x-sdk"
import { StorageService } from "~services/storage"
import type { InquiryData } from "~utils/dom-selectors"

/**
 * OpenAI 兼容的消息类型
 */
export interface OpenAIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

/**
 * OpenAI 请求参数类型
 */
export interface OpenAIRequestParams {
  messages: OpenAIMessage[]
  model?: string
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

/**
 * 创建 OpenAI 兼容的 ChatProvider
 */
export async function createOpenAIChatProvider(inquiryData: InquiryData | null) {
  // 获取存储的配置
  const provider = await StorageService.getProvider()
  const apiKey = await StorageService.getApiKey(provider)
  const baseUrl = await StorageService.getCustomBaseUrl()
  const model = await StorageService.getCustomModel()

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()} API Key 未配置`)
  }

  // 构建系统提示词
  const systemPrompt = buildSystemPrompt(inquiryData)

  // 创建 XRequest 实例
  const request = XRequest<OpenAIRequestParams>(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    // 默认请求参数
    params: {
      model: model || "gpt-4o-mini",
      stream: true,
      temperature: 0.7,
      max_tokens: 4000,
      messages: [{ role: "system", content: systemPrompt }],
    },
  })

  // 创建 OpenAIChatProvider
  const chatProvider = new OpenAIChatProvider<OpenAIMessage, OpenAIRequestParams>({
    request,
  })

  return chatProvider
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(inquiryData: InquiryData | null): string {
  if (!inquiryData) {
    return `你是一个专业的日本电商客服助手。请用礼貌、专业的日语回复客户问询。`
  }

  return `你是一个专业的日本电商客服助手。

当前问询信息：
- 问询番号: ${inquiryData.inquiryNumber || "未知"}
- 客户姓名: ${inquiryData.customerName || "未知"}
- 问询类别: ${inquiryData.category || "未知"}
- 问询内容: ${inquiryData.inquiryContent || "未知"}
- 订单号: ${inquiryData.orderNumber || "未知"}
- 受付时间: ${inquiryData.receivedTime || "未知"}

请根据以上信息，用专业、礼貌的日语回复客户。回复应该简洁明了，解决客户的问题。`
}

export { buildSystemPrompt }
