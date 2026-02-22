import OpenAI from "openai"
import type { LLMProvider, ProviderConfig, StreamChunk } from "~types"

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string
  private maxOutputTokens: number
  private reasoningEffort: "low" | "medium" | "high"
  private temperature: number

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.openai.com/v1",
      dangerouslyAllowBrowser: true,
    })
    this.model = config.model || ""
    this.maxOutputTokens = config.maxOutputTokens || 2048
    this.reasoningEffort = config.reasoningEffort || "low"
    this.temperature = config.temperature ?? 0.7
  }

  private isReasoningModel(): boolean {
    const m = this.model.toLowerCase()
    return m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")
  }

  private ensureModel() {
    if (!this.model) throw new Error("OpenAI 模型未设置，请在设置中选择模型")
  }

  async generateReply(prompt: string): Promise<string> {
    this.ensureModel()
    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: this.maxOutputTokens,
    }

    if (this.isReasoningModel()) {
      ;(params as any).reasoning_effort = this.reasoningEffort
    } else {
      params.temperature = this.temperature
    }

    const response = await this.client.chat.completions.create(params)
    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error("OpenAI returned empty content")
    }

    return content.trim()
  }

  async *generateReplyStream(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    this.ensureModel()
    const params: OpenAI.ChatCompletionCreateParamsStreaming = {
      model: this.model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      max_completion_tokens: this.maxOutputTokens,
      stream: true,
    }

    if (this.isReasoningModel()) {
      ;(params as any).reasoning_effort = this.reasoningEffort
    } else {
      params.temperature = this.temperature
    }

    const stream = await this.client.chat.completions.create(params, {
      signal,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue

      const reasoning = (delta as any).reasoning_content
      if (reasoning) {
        yield { type: "thinking", thinking: reasoning }
      }

      if (delta.content) {
        yield { type: "chunk", content: delta.content }
      }
    }

    yield { type: "done" }
  }

  async fetchModels(): Promise<string[]> {
    const list = await this.client.models.list()
    const models: string[] = []
    for await (const model of list) {
      models.push(model.id)
    }
    return models.sort()
  }
}
