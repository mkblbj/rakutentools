// 用户设置类型
export interface UserSettings {
  customApiKey?: string
  customBaseUrl?: string
  customModel?: string
  openaiKey?: string
  geminiKey?: string
  zenmuxKey?: string // ZenMux API Key
  manusKey?: string // Manus API Key
  provider: "custom" | "openai" | "gemini" | "zenmux" | "manus"
  geminiModel?: "gemini-3-pro-preview" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.0-flash-lite" // Gemini 模型选择
  zenmuxModel?: string // ZenMux 模型，格式: "provider/model-name"
  manusModel?: string // Manus 模型
  maxTokens?: number // 统一输出 token 上限（应用侧）
  reviewPrompt?: string
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

// 生成请求类型
export interface GenerateRequest {
  type: "review"
  context: ReviewContext
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

