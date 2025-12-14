import type { LLMProvider, ProviderType, ProviderConfig } from "~types"
import { OpenAIProvider } from "./openai"
import { GeminiProvider } from "./gemini"
import { StorageService } from "../storage"

/**
 * LLM Provider 工厂类
 * 根据配置创建对应的 Provider 实例
 */
export class ModelFactory {
  /**
   * 创建 Provider 实例
   */
  static async createProvider(
    provider: ProviderType,
    apiKey?: string
  ): Promise<LLMProvider> {
    // 如果没有传入 apiKey，从存储中获取
    const key = apiKey || (await StorageService.getApiKey(provider))

    if (!key) {
      throw new Error(`${provider.toUpperCase()} API Key 未配置`)
    }

    const config: ProviderConfig = {
      apiKey: key,
      temperature: 0.7, // 标准 temperature
      maxTokens: 2000, // 日语需要更多 tokens（100-500字需要约1000-2000 tokens）
    }

    switch (provider) {
      case "openai":
        return new OpenAIProvider(config)
      case "gemini":
        // 获取用户选择的 Gemini 模型
        const geminiModel = await StorageService.getGeminiModel()
        config.model = geminiModel
        return new GeminiProvider(config)
      default:
        throw new Error(`不支持的 Provider: ${provider}`)
    }
  }

  /**
   * 根据当前设置创建 Provider
   */
  static async createCurrentProvider(): Promise<LLMProvider> {
    const provider = await StorageService.getProvider()
    return this.createProvider(provider)
  }

  /**
   * 验证 Provider 配置
   */
  static async validateProvider(provider: ProviderType): Promise<boolean> {
    try {
      const instance = await this.createProvider(provider)
      // 简单验证：尝试创建实例
      return !!instance
    } catch {
      return false
    }
  }
}

