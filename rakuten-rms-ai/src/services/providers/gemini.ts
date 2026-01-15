import type { LLMProvider, ProviderConfig } from "~types"

/**
 * Gemini Provider - 调用 Google Generative AI API
 * 
 * 支持的模型:
 * - gemini-3-pro-preview: 最强大的 Gemini 3 Pro 预览版（推荐）
 * - gemini-2.5-flash: 2.5 标准快速模型（默认）
 * - gemini-2.5-flash-lite: 2.5 轻量级快速模型（配额独立）
 * - gemini-2.0-flash-lite: 2.0 轻量级快速模型（配额独立）
 * 
 * @see https://ai.google.dev/gemini-api/docs/models
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
    this.maxTokens = config.maxTokens || 4000
  }

  async generateReply(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API Key 未配置")
    }

    console.log(`🤖 调用 Gemini API - 模型: ${this.model}`)

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

      console.log(`✅ Gemini 回复成功 - 模型: ${this.model}, 长度: ${content.length} 字符`)

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

