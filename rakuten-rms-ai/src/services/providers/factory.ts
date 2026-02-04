import type { LLMProvider, ProviderType, ProviderConfig } from "~types"
import { CustomProvider } from "./custom"
import { OpenAIProvider } from "./openai"
import { GeminiProvider } from "./gemini"
import { ZenMuxProvider } from "./zenmux"
import { ManusProvider } from "./manus"
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
      temperature: 0.7,
      maxTokens: 4000, // 增加到 4000，避免大模型输出被截断
    }

    switch (provider) {
      case "custom":
        // 获取 Custom API 配置
        const customBaseUrl = await StorageService.getCustomBaseUrl()
        const customModel = await StorageService.getCustomModel()
        config.baseURL = customBaseUrl
        config.model = customModel
        return new CustomProvider(config)
      case "openai":
        return new OpenAIProvider(config)
      case "gemini":
        // 获取用户选择的 Gemini 模型
        const geminiModel = await StorageService.getGeminiModel()
        config.model = geminiModel
        return new GeminiProvider(config)
      case "zenmux":
        // 获取用户选择的 ZenMux 模型
        const zenmuxModel = await StorageService.getZenMuxModel()
        config.model = zenmuxModel
        return new ZenMuxProvider(config)
      case "manus":
        // 获取用户选择的 Manus 模型
        const manusModel = await StorageService.getManusModel()
        config.model = manusModel
        return new ManusProvider(config)
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
   * 创建支持流式响应的 CustomProvider
   * 用于聊天面板的流式 AI 调用
   */
  static async createStreamProvider(model?: string): Promise<CustomProvider> {
    const provider = await StorageService.getProvider()
    const key = await StorageService.getApiKey(provider)

    if (!key) {
      throw new Error(`${provider.toUpperCase()} API Key 未配置`)
    }

    // 获取配置
    const customBaseUrl = await StorageService.getCustomBaseUrl()
    const customModel = model || (await StorageService.getCustomModel())

    const config: ProviderConfig = {
      apiKey: key,
      baseURL: customBaseUrl,
      model: customModel,
      temperature: 0.7,
      maxTokens: 4000,
    }

    return new CustomProvider(config)
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

