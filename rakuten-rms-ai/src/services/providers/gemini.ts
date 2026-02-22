import { GoogleGenAI } from "@google/genai"
import type { LLMProvider, ProviderConfig, StreamChunk } from "~types"

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenAI
  private model: string
  private maxOutputTokens: number
  private thinkingBudget: number
  private temperature: number

  constructor(config: ProviderConfig) {
    const baseUrl = config.baseURL || "https://generativelanguage.googleapis.com"
    this.genAI = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: { baseUrl },
    })
    this.model = config.model || ""
    this.maxOutputTokens = config.maxOutputTokens || 2048
    this.thinkingBudget = config.thinkingBudget ?? 0
    this.temperature = config.temperature ?? 0.7
  }

  private buildConfig() {
    const config: Record<string, any> = {
      maxOutputTokens: this.maxOutputTokens,
      temperature: this.temperature,
      thinkingConfig: { thinkingBudget: this.thinkingBudget },
    }

    return config
  }

  private ensureModel() {
    if (!this.model) throw new Error("Gemini 模型未设置，请在设置中选择模型")
  }

  async generateReply(prompt: string): Promise<string> {
    this.ensureModel()
    const response = await this.genAI.models.generateContent({
      model: this.model,
      contents: prompt,
      config: this.buildConfig(),
    })

    const text = response.text
    if (!text) {
      throw new Error("Gemini returned empty content")
    }

    return text.trim()
  }

  async *generateReplyStream(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    this.ensureModel()
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

    const response = await this.genAI.models.generateContentStream({
      model: this.model,
      contents,
      config: this.buildConfig(),
    })

    for await (const chunk of response) {
      if (signal?.aborted) break

      const parts = chunk.candidates?.[0]?.content?.parts
      if (!parts) continue

      for (const part of parts) {
        if (part.thought && part.text) {
          yield { type: "thinking", thinking: part.text }
        } else if (part.text) {
          yield { type: "chunk", content: part.text }
        }
      }
    }

    yield { type: "done" }
  }

  async fetchModels(): Promise<string[]> {
    const pager = await this.genAI.models.list({ config: { pageSize: 100 } })
    const models: string[] = []
    for await (const model of pager) {
      if (model.name) {
        models.push(model.name.replace(/^models\//, ""))
      }
    }
    return models.sort()
  }
}
