// 用户设置类型
export interface UserSettings {
  openaiKey?: string
  geminiKey?: string
  provider: "openai" | "gemini"
  reviewPrompt?: string
  inquiryPrompt?: string
  enabled: boolean
}

// AI Provider 类型
export type ProviderType = "openai" | "gemini"

// 评论上下文
export interface ReviewContext {
  reviewContent: string
  rating: string
  productName?: string
  buyerName?: string
}

// 咨询上下文
export interface InquiryContext {
  inquiryContent: string
  productName?: string
  conversationHistory?: string
}

// 生成请求类型
export interface GenerateRequest {
  type: "review" | "inquiry"
  context: ReviewContext | InquiryContext
}

// 生成响应类型
export interface GenerateResponse {
  success: boolean
  data?: string
  error?: string
}

// LLM Provider 接口
export interface LLMProvider {
  generateReply(prompt: string): Promise<string>
}

// Provider 配置
export interface ProviderConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
  thinkingLevel?: "low" | "high" // Gemini 3 thinking level
}

