import type { LLMProvider, ProviderConfig } from "~types"

/**
 * Gemini Provider - 调用 Google Generative AI API
 * 
 * 支持的模型:
 * - gemini-2.5-flash: 快速且经济实惠的模型
 * - gemini-pro: 标准模型
 * 
 * @see https://ai.google.dev/gemini-api/docs
 */
export class GeminiProvider implements LLMProvider {
  private apiKey: string
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    // 默认使用 Gemini 2.5 Flash（经济实惠）
    this.model = config.model || "gemini-2.5-flash"
    // 标准 temperature
    this.temperature = config.temperature ?? 0.7
    // 日语需要更多 tokens（1 token ≈ 1-2 日语字符）
    this.maxTokens = config.maxTokens || 2000
  }

  /**
   * 生成回复
   */
  async generateReply(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API Key 未配置")
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error?.message || `Gemini API 错误: ${response.status}`
        )
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!content) {
        throw new Error("Gemini 返回的内容为空")
      }

      return content.trim()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini API 调用失败: ${error.message}`)
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

