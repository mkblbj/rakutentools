import type { LLMProvider, ProviderConfig } from "~types"

/**
 * ZenMux Provider - 调用 ZenMux API（兼容 OpenAI 格式）
 * 
 * ZenMux 是一个 AI 模型聚合平台，可以调用多种大模型
 * 模型格式: "provider/model-name"，例如：
 * - openai/gpt-4o
 * - anthropic/claude-sonnet-4
 * - google/gemini-2.5-flash
 * - deepseek/deepseek-chat
 * 
 * @see https://docs.zenmux.ai/guide/quickstart.html
 */
export class ZenMuxProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private temperature: number
  private maxTokens: number
  private baseUrl = "https://zenmux.ai/api/v1"

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || "xiaomi/mimo-v2-flash"
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens || 4000 // 增加到 4000
  }

  async generateReply(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("ZenMux API Key 未配置")
    }

    console.log(`🤖 调用 ZenMux API - 模型: ${this.model}`)

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error?.message || `ZenMux API 错误: ${response.status}`
        )
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error("ZenMux 返回的内容为空")
      }

      console.log(`✅ ZenMux 回复成功 - 模型: ${this.model}, 长度: ${content.length} 字符`)

      return content.trim()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ZenMux API 调用失败: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * 测试 API Key 是否有效
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateReply("测试连接")
      return true
    } catch {
      return false
    }
  }
}

