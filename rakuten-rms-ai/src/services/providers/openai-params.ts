export type OpenAIReasoningEffort = "low" | "medium" | "high" | "xhigh"
export type OpenAIVerbosity = "low" | "medium" | "high"

type OpenAIInputMessage = {
  role: "user" | "assistant"
  content: string
}

export interface OpenAIResponsesParamOptions {
  model: string
  input: OpenAIInputMessage[]
  instructions?: string
  maxOutputTokens: number
  reasoningEffort: OpenAIReasoningEffort
  verbosity: OpenAIVerbosity
  stream: boolean
}

export function isOpenAIReasoningModel(model: string): boolean {
  const normalized = model.toLowerCase()
  return (
    normalized.startsWith("gpt-5") ||
    /^o[134](?:-|$)/.test(normalized) ||
    normalized.includes("grok-3-mini")
  )
}

export function supportsOpenAITextVerbosity(model: string): boolean {
  return model.toLowerCase().startsWith("gpt-5")
}

export function getEffectiveOpenAIReasoningEffort(
  model: string,
  effort: OpenAIReasoningEffort
): OpenAIReasoningEffort {
  const normalized = model.toLowerCase()
  if (normalized.startsWith("gpt-5-pro")) return "high"
  if (normalized.includes("grok-3-mini") && effort === "medium") return "high"
  return effort
}

export function buildOpenAIResponsesParams(
  options: OpenAIResponsesParamOptions
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    model: options.model,
    input: options.input,
    max_output_tokens: options.maxOutputTokens,
    stream: options.stream,
  }

  if (options.instructions) {
    params.instructions = options.instructions
  }

  if (isOpenAIReasoningModel(options.model)) {
    params.reasoning = {
      effort: getEffectiveOpenAIReasoningEffort(options.model, options.reasoningEffort),
    }
  }

  if (supportsOpenAITextVerbosity(options.model)) {
    params.text = {
      verbosity: options.verbosity,
    }
  }

  return params
}

export function getOpenAIStreamError(event: any): Error | null {
  if (event?.type === "response.incomplete") {
    const reason = event.response?.incomplete_details?.reason || "unknown"
    return new Error(`OpenAI response incomplete: ${reason}. 请调高 max_output_tokens 或降低 verbosity/reasoning。`)
  }

  if (event?.type === "response.failed") {
    const message = event.response?.error?.message || "OpenAI response failed"
    return new Error(message)
  }

  if (event?.type === "error" || event?.type === "response.error") {
    const message = event.error?.message || event.message || "OpenAI stream error"
    return new Error(message)
  }

  return null
}
