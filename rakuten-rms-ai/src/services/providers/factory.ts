import type { LLMProvider, ProviderType, ProviderConfig } from "~types"
import { OpenAIProvider } from "./openai"
import { GeminiProvider } from "./gemini"
import { StorageService } from "../storage"

export class ModelFactory {
  static async createProvider(
    provider: ProviderType,
    apiKey?: string
  ): Promise<LLMProvider> {
    const key = apiKey || (await StorageService.getApiKey(provider))

    if (!key) {
      throw new Error(`${provider.toUpperCase()} API Key 未配置`)
    }

    const settings = await StorageService.getSettings()

    switch (provider) {
      case "openai": {
        const config: ProviderConfig = {
          apiKey: key,
          model: settings.openaiModel || undefined,
          baseURL: settings.openaiBaseUrl,
          maxOutputTokens: settings.openaiMaxOutputTokens,
          reasoningEffort: settings.openaiReasoningEffort,
          temperature: 0.7,
        }
        return new OpenAIProvider(config)
      }
      case "gemini": {
        const config: ProviderConfig = {
          apiKey: key,
          model: settings.geminiModel || undefined,
          baseURL: settings.geminiBaseUrl,
          maxOutputTokens: settings.geminiMaxOutputTokens,
          thinkingBudget: settings.geminiThinkingBudget,
          temperature: 0.7,
        }
        return new GeminiProvider(config)
      }
      default:
        throw new Error(`不支持的 Provider: ${provider}`)
    }
  }

  static async createCurrentProvider(): Promise<LLMProvider> {
    const provider = await StorageService.getProvider()
    return this.createProvider(provider)
  }

  static async validateProvider(provider: ProviderType): Promise<boolean> {
    try {
      const instance = await this.createProvider(provider)
      return !!instance
    } catch {
      return false
    }
  }
}
