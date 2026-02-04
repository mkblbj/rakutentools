// 用户设置类型
export interface UserSettings {
  openaiKey?: string
  geminiKey?: string
  zenmuxKey?: string // ZenMux API Key
  manusKey?: string // Manus API Key
  provider: "openai" | "gemini" | "zenmux" | "manus"
  geminiModel?: "gemini-3-pro-preview" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.0-flash-lite" // Gemini 模型选择
  zenmuxModel?: string // ZenMux 模型，格式: "provider/model-name"
  manusModel?: string // Manus 模型
  reviewPrompt?: string
  inquiryPrompt?: string
  enabled: boolean
}

// AI Provider 类型
export type ProviderType = "custom" | "openai" | "gemini" | "zenmux" | "manus"

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
  customerName?: string
  category?: string
  orderNumber?: string
  inquiryNumber?: string
  receivedTime?: string
  productName?: string
  conversationHistory?: string
  userInstruction?: string // 用户主观输入的指示（如"明日发货"、"追踪号12345"）
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
  baseURL?: string // Custom Provider 的 base URL
}

// 聊天消息类型
export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  thinking?: string // AI 思考过程
  timestamp: number
  status?: "pending" | "streaming" | "done" | "error"
}

// 会话存储结构
export interface ChatSession {
  inquiryNumber: string
  messages: ChatMessage[]
  model: string
  createdAt: number
  updatedAt: number
}

// 流式聊天请求
export interface StartChatStreamRequest {
  action: "start_chat_stream"
  data: {
    messages: Array<{ role: string; content: string }>
    model?: string
  }
}

// 流式响应块（支持 thinking + content）
export interface StreamChunk {
  type: "chunk" | "thinking" | "done" | "error"
  content?: string
  thinking?: string
  error?: string
}

