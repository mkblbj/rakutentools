import OpenAI from "openai"
import type { LLMProvider, ProviderConfig, StreamChunk } from "~types"

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string
  private maxOutputTokens: number
  private reasoningEffort: "low" | "medium" | "high"
  private temperature: number
  private apiMode: "responses" | "chat"

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
    this.apiMode = config.apiMode || "responses"
  }

  private isReasoningModel(): boolean {
    const m = this.model.toLowerCase()
    return (
      m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") ||
      m.startsWith("gpt-5") ||
      m.includes("grok-3-mini")
    )
  }

  private getEffectiveEffort(): "low" | "medium" | "high" {
    if (this.model.toLowerCase().includes("grok-3-mini") && this.reasoningEffort === "medium") {
      return "high"
    }
    return this.reasoningEffort
  }

  private ensureModel() {
    if (!this.model) throw new Error("OpenAI 模型未设置，请在设置中选择模型")
  }

  async generateReply(prompt: string): Promise<string> {
    this.ensureModel()
    if (this.apiMode === "responses") {
      return this.generateReplyResponses(prompt)
    }
    return this.generateReplyChat(prompt)
  }

  async *generateReplyStream(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    this.ensureModel()
    if (this.apiMode === "responses") {
      yield* this.streamResponses(messages, signal)
    } else {
      yield* this.streamChat(messages, signal)
    }
  }

  // ─── Responses API ─────────────────────────────────────────

  private async generateReplyResponses(prompt: string): Promise<string> {
    const response = await (this.client as any).responses.create({
      model: this.model,
      input: [{ role: "user", content: prompt }],
      max_output_tokens: this.maxOutputTokens,
      reasoning: { effort: this.getEffectiveEffort() },
    })

    const text = response.output_text
    if (!text) {
      throw new Error("OpenAI Responses API returned empty content")
    }
    return OpenAIProvider.stripThinkTags(text).trim()
  }

  private async *streamResponses(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const systemMsg = messages.find((m) => m.role === "system")
    const inputMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

    const params: Record<string, any> = {
      model: this.model,
      input: inputMsgs,
      max_output_tokens: this.maxOutputTokens,
      stream: true,
      reasoning: { effort: this.getEffectiveEffort() },
    }
    if (systemMsg) {
      params.instructions = systemMsg.content
    }

    const stream = await (this.client as any).responses.create(params, {
      signal,
    })

    let insideThink = false
    let tagBuffer = ""

    for await (const event of stream) {
      if (signal?.aborted) break

      switch (event.type) {
        case "response.output_text.delta":
          if (event.delta) {
            const processed = this.processThinkTags(event.delta, insideThink, tagBuffer)
            insideThink = processed.insideThink
            tagBuffer = processed.tagBuffer
            for (const item of processed.output) {
              yield item
            }
          }
          break
        case "response.reasoning_summary_text.delta":
        case "response.reasoning_text.delta":
          if (event.delta) {
            yield { type: "thinking", thinking: event.delta }
          }
          break
      }
    }

    if (tagBuffer) {
      yield { type: insideThink ? "thinking" : "chunk", ...(insideThink ? { thinking: tagBuffer } : { content: tagBuffer }) }
    }

    yield { type: "done" }
  }

  // ─── Chat Completions (compat) ─────────────────────────────

  private async generateReplyChat(prompt: string): Promise<string> {
    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: this.maxOutputTokens,
    }

    if (this.isReasoningModel()) {
      ;(params as any).reasoning_effort = this.getEffectiveEffort()
    } else {
      params.temperature = this.temperature
    }

    const response = await this.client.chat.completions.create(params)
    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error("OpenAI returned empty content")
    }

    return OpenAIProvider.stripThinkTags(content).trim()
  }

  private async *streamChat(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const params: OpenAI.ChatCompletionCreateParamsStreaming = {
      model: this.model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      max_completion_tokens: this.maxOutputTokens,
      stream: true,
    }

    if (this.isReasoningModel()) {
      ;(params as any).reasoning_effort = this.getEffectiveEffort()
    } else {
      params.temperature = this.temperature
    }

    const stream = await this.client.chat.completions.create(params, {
      signal,
    })

    let insideThink = false
    let tagBuffer = ""

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue

      const reasoning = (delta as any).reasoning_content
      if (reasoning) {
        yield { type: "thinking", thinking: reasoning }
      }

      if (delta.content) {
        const processed = this.processThinkTags(delta.content, insideThink, tagBuffer)
        insideThink = processed.insideThink
        tagBuffer = processed.tagBuffer

        for (const item of processed.output) {
          yield item
        }
      }
    }

    if (tagBuffer) {
      yield { type: insideThink ? "thinking" : "chunk", ...(insideThink ? { thinking: tagBuffer } : { content: tagBuffer }) }
    }

    yield { type: "done" }
  }

  private static stripThinkTags(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, "")
  }

  private processThinkTags(
    content: string,
    insideThink: boolean,
    tagBuffer: string
  ): { output: StreamChunk[]; insideThink: boolean; tagBuffer: string } {
    const output: StreamChunk[] = []
    let buf = tagBuffer + content
    tagBuffer = ""

    while (buf.length > 0) {
      if (insideThink) {
        const closeIdx = buf.indexOf("</think>")
        if (closeIdx === -1) {
          output.push({ type: "thinking", thinking: buf })
          buf = ""
        } else {
          if (closeIdx > 0) {
            output.push({ type: "thinking", thinking: buf.slice(0, closeIdx) })
          }
          buf = buf.slice(closeIdx + 8)
          insideThink = false
        }
      } else {
        const openIdx = buf.indexOf("<think>")
        if (openIdx === -1) {
          let partialLen = 0
          for (let i = Math.min(6, buf.length); i >= 1; i--) {
            if ("<think>".startsWith(buf.slice(-i))) {
              partialLen = i
              break
            }
          }
          if (partialLen > 0) {
            const safe = buf.slice(0, -partialLen)
            if (safe) output.push({ type: "chunk", content: safe })
            tagBuffer = buf.slice(-partialLen)
            buf = ""
          } else {
            output.push({ type: "chunk", content: buf })
            buf = ""
          }
        } else {
          if (openIdx > 0) {
            output.push({ type: "chunk", content: buf.slice(0, openIdx) })
          }
          buf = buf.slice(openIdx + 7)
          insideThink = true
        }
      }
    }

    return { output, insideThink, tagBuffer }
  }

  // ─── Models ────────────────────────────────────────────────

  async fetchModels(): Promise<string[]> {
    const list = await this.client.models.list()
    const models: string[] = []
    for await (const model of list) {
      models.push(model.id)
    }
    return models.sort()
  }
}
