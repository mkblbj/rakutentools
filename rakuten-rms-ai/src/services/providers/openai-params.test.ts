import { describe, expect, it } from "vitest"
import {
  buildOpenAIResponsesParams,
  getOpenAIStreamError,
  isOpenAIReasoningModel,
  supportsOpenAITextVerbosity,
} from "./openai-params"

describe("OpenAI Responses parameter construction", () => {
  it("adds reasoning effort and text verbosity for GPT-5.5 Responses requests", () => {
    const params = buildOpenAIResponsesParams({
      model: "gpt-5.5",
      input: [{ role: "user", content: "レビュー返信を作成してください" }],
      instructions: "返信文のみを出力してください",
      maxOutputTokens: 2048,
      reasoningEffort: "medium",
      verbosity: "medium",
      stream: true,
    })

    expect(params).toMatchObject({
      model: "gpt-5.5",
      max_output_tokens: 2048,
      stream: true,
      reasoning: { effort: "medium" },
      text: { verbosity: "medium" },
      instructions: "返信文のみを出力してください",
    })
  })

  it("does not send reasoning or verbosity controls to non GPT-5/o-series models", () => {
    const params = buildOpenAIResponsesParams({
      model: "gpt-4o-mini",
      input: [{ role: "user", content: "OK" }],
      maxOutputTokens: 512,
      reasoningEffort: "high",
      verbosity: "low",
      stream: false,
    })

    expect(params.reasoning).toBeUndefined()
    expect(params.text).toBeUndefined()
  })

  it("recognizes GPT-5.5 as reasoning and verbosity-capable", () => {
    expect(isOpenAIReasoningModel("gpt-5.5")).toBe(true)
    expect(supportsOpenAITextVerbosity("gpt-5.5")).toBe(true)
  })

  it("turns Responses incomplete events into actionable errors", () => {
    const error = getOpenAIStreamError({
      type: "response.incomplete",
      response: {
        incomplete_details: { reason: "max_output_tokens" },
      },
    })

    expect(error?.message).toContain("max_output_tokens")
  })
})
