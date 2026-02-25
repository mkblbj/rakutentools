export type ProviderType = "openai" | "gemini"

export type Language = "ja" | "zh" | "en"

export interface UserSettings {
  provider: ProviderType
  language: Language
  // OpenAI
  openaiKey?: string
  openaiModel?: string
  openaiBaseUrl?: string
  openaiMaxOutputTokens?: number
  openaiReasoningEffort?: "low" | "medium" | "high"
  // Gemini
  geminiKey?: string
  geminiModel?: string
  geminiBaseUrl?: string
  geminiMaxOutputTokens?: number
  geminiThinkingBudget?: number
  // Common
  reviewPrompt?: string
  enabled: boolean
}

export interface ReviewContext {
  reviewContent: string
  rating: string
  productName?: string
  buyerName?: string
}

export interface GenerateRequest {
  type: "review"
  context: ReviewContext
}

export interface GenerateResponse {
  success: boolean
  data?: string
  error?: string
}

export interface StreamChunk {
  type: "thinking" | "chunk" | "done" | "error"
  content?: string
  thinking?: string
  error?: string
}

export interface ProviderConfig {
  apiKey: string
  model?: string
  maxOutputTokens?: number
  baseURL?: string
  reasoningEffort?: "low" | "medium" | "high"
  thinkingBudget?: number
  temperature?: number
}

export interface LLMProvider {
  generateReply(prompt: string): Promise<string>
  generateReplyStream(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk>
  fetchModels(): Promise<string[]>
}

export interface StartChatStreamRequest {
  action: "start_chat_stream"
  data: {
    messages: Array<{ role: string; content: string }>
    model?: string
  }
}
