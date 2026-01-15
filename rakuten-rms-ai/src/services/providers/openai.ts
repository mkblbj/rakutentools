import type { LLMProvider, ProviderConfig } from "~types"

/**
 * OpenAI Provider - 调用 OpenAI API
 */
export class OpenAIProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || "gpt-4o-mini"
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens || 4000 // 增加到 4000
  }

  async generateReply(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OpenAI API Key 未配置")
    }

    console.log(`🤖 调用 OpenAI API - 模型: ${this.model}`)

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
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
          error.error?.message || `OpenAI API 错误: ${response.status}`
        )
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error("OpenAI 返回的内容为空")
      }

      console.log(`✅ OpenAI 回复成功 - 模型: ${this.model}, 长度: ${content.length} 字符`)

      return content.trim()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API 调用失败: ${error.message}`)
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

