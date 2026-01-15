import type { LLMProvider, ProviderConfig } from "~types"

/**
 * Custom OpenAI-compatible API Provider
 * 支持任何兼容 OpenAI API 的服务
 */
export class CustomProvider implements LLMProvider {
  private apiKey: string
  private baseURL: string
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL || "https://api.openai.com/v1"
    this.model = config.model || "gpt-4o-mini"
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens || 2000
  }

  async generateReply(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Custom API Key 未配置")
    }

    if (!this.baseURL) {
      throw new Error("Custom Base URL 未配置")
    }

    console.log(`🤖 调用 Custom API - 模型: ${this.model}, Base URL: ${this.baseURL}`)

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error?.message || `Custom API 错误: ${response.status}`
        )
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error("Custom API 返回的内容为空")
      }

      console.log(`✅ Custom API 回复成功 - 模型: ${this.model}, 长度: ${content.length} 字符`)

      return content.trim()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Custom API 调用失败: ${error.message}`)
      }
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateReply("测试连接")
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取可用模型列表
   */
  static async fetchModels(
    baseURL: string,
    apiKey: string
  ): Promise<string[]> {
    try {
      const response = await fetch(`${baseURL}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("返回的模型数据格式不正确")
      }

      return data.data
        .map((model: any) => model.id)
        .filter((id: string) => id && typeof id === "string")
        .sort()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`获取模型列表失败: ${error.message}`)
      }
      throw error
    }
  }
}

