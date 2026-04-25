# OpenAI Responses GPT Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 `rakuten-rms-ai` 的 OpenAI/GPT-5.5 Responses API 支持，让 reasoning、verbosity、token 上限和流式错误处理符合 OpenAI 当前语义，同时不增加自动二次生成。

**Architecture:** 保留现有 `LLMProvider` 共用接口和 review/batch 业务流程，只把 OpenAI 专属的参数构建、模型能力判断、Responses 流式事件处理集中到 OpenAI provider 及一个小型 helper 中。Gemini 逻辑不改，设置页按 provider 显示不同 token 预算说明。

**Tech Stack:** Plasmo, React 19, TypeScript, OpenAI Node SDK `openai@6.22.0`, Chrome Extension API, Vitest for focused provider helper tests.

---

## File Structure

- Modify: `rakuten-rms-ai/package.json`
  - Add a focused `test` script and Vitest dev dependency.
- Create: `rakuten-rms-ai/vitest.config.ts`
  - Keep unit tests in Node environment; no browser APIs needed for helper tests.
- Create: `rakuten-rms-ai/src/services/providers/openai-params.ts`
  - Own OpenAI model capability checks, Responses parameter construction, Chat parameter construction, and stream error extraction.
- Create: `rakuten-rms-ai/src/services/providers/openai-params.test.ts`
  - Verify GPT-5.5 reasoning/verbosity params, non-reasoning model behavior, and incomplete stream event handling.
- Modify: `rakuten-rms-ai/src/types/index.ts`
  - Add OpenAI verbosity setting and widen reasoning type to match the UI choices used by GPT-5.5.
- Modify: `rakuten-rms-ai/src/services/storage.ts`
  - Store `openaiVerbosity`, default OpenAI reasoning to `medium`, keep no automatic retry.
- Modify: `rakuten-rms-ai/src/services/providers/factory.ts`
  - Pass `openaiVerbosity` into `OpenAIProvider`.
- Modify: `rakuten-rms-ai/src/services/providers/openai.ts`
  - Replace inline parameter construction with helper usage, add Responses `text.verbosity`, avoid sending reasoning to non-reasoning models, and fail clearly on `response.incomplete`.
- Modify: `rakuten-rms-ai/src/options.tsx`
  - Add OpenAI verbosity control, change OpenAI token label to total output token cap, and show provider-specific budget notes.
- Modify: `rakuten-rms-ai/src/i18n/locales/zh.ts`
  - Update Chinese labels and notes.
- Modify: `rakuten-rms-ai/src/i18n/locales/ja.ts`
  - Update Japanese labels and notes.
- Modify: `rakuten-rms-ai/src/i18n/locales/en.ts`
  - Update English labels and notes.

---

### Task 1: Add Focused Test Harness

**Files:**
- Modify: `rakuten-rms-ai/package.json`
- Create: `rakuten-rms-ai/vitest.config.ts`

- [ ] **Step 1: Add Vitest dependency**

Run:

```bash
cd rakuten-rms-ai
pnpm add -D vitest
```

Expected: `package.json` and `pnpm-lock.yaml` include Vitest.

- [ ] **Step 2: Add test script**

Modify `rakuten-rms-ai/package.json` scripts to:

```json
"scripts": {
  "dev": "plasmo dev",
  "build": "plasmo build",
  "build:firefox": "plasmo build --target=firefox-mv2",
  "package": "plasmo package",
  "test": "vitest run"
}
```

- [ ] **Step 3: Add Vitest config**

Create `rakuten-rms-ai/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
})
```

- [ ] **Step 4: Run empty test suite**

Run:

```bash
cd rakuten-rms-ai
pnpm test
```

Expected: Vitest starts successfully and exits with code 0 even before test files exist.

- [ ] **Step 5: Commit**

```bash
git add rakuten-rms-ai/package.json rakuten-rms-ai/pnpm-lock.yaml rakuten-rms-ai/vitest.config.ts
git commit -m "test: add provider unit test harness"
```

---

### Task 2: Add OpenAI Parameter Helper With Failing Tests

**Files:**
- Create: `rakuten-rms-ai/src/services/providers/openai-params.test.ts`
- Create: `rakuten-rms-ai/src/services/providers/openai-params.ts`

- [ ] **Step 1: Write failing tests**

Create `rakuten-rms-ai/src/services/providers/openai-params.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/providers/openai-params.test.ts
```

Expected: FAIL because `openai-params.ts` does not exist yet.

- [ ] **Step 3: Implement helper**

Create `rakuten-rms-ai/src/services/providers/openai-params.ts`:

```ts
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

export function buildOpenAIResponsesParams(options: OpenAIResponsesParamOptions): Record<string, unknown> {
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
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/providers/openai-params.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rakuten-rms-ai/src/services/providers/openai-params.ts rakuten-rms-ai/src/services/providers/openai-params.test.ts
git commit -m "test: cover openai responses parameters"
```

---

### Task 3: Add OpenAI Verbosity Setting and Correct Defaults

**Files:**
- Modify: `rakuten-rms-ai/src/types/index.ts`
- Modify: `rakuten-rms-ai/src/services/storage.ts`
- Modify: `rakuten-rms-ai/src/services/providers/factory.ts`

- [ ] **Step 1: Extend settings types**

Modify the OpenAI section in `rakuten-rms-ai/src/types/index.ts`:

```ts
export type OpenAIReasoningEffort = "low" | "medium" | "high" | "xhigh"
export type OpenAIVerbosity = "low" | "medium" | "high"

export interface UserSettings {
  provider: ProviderType
  language: Language
  // OpenAI
  openaiKey?: string
  openaiModel?: string
  openaiBaseUrl?: string
  openaiMaxOutputTokens?: number
  openaiReasoningEffort?: OpenAIReasoningEffort
  openaiVerbosity?: OpenAIVerbosity
  openaiApiMode?: "responses" | "chat"
```

Modify `ProviderConfig` in the same file:

```ts
export interface ProviderConfig {
  apiKey: string
  model?: string
  maxOutputTokens?: number
  baseURL?: string
  reasoningEffort?: OpenAIReasoningEffort
  verbosity?: OpenAIVerbosity
  thinkingBudget?: number
  temperature?: number
  apiMode?: "responses" | "chat"
}
```

- [ ] **Step 2: Update storage defaults and keys**

In `rakuten-rms-ai/src/services/storage.ts`, update defaults:

```ts
openaiMaxOutputTokens: 2048,
openaiReasoningEffort: "medium",
openaiVerbosity: "medium",
openaiApiMode: "responses",
```

Add `"openaiVerbosity"` to `STORAGE_KEYS` directly after `"openaiReasoningEffort"`.

- [ ] **Step 3: Pass verbosity through factory**

In `rakuten-rms-ai/src/services/providers/factory.ts`, update the OpenAI config:

```ts
const config: ProviderConfig = {
  apiKey: key,
  model: settings.openaiModel || undefined,
  baseURL: settings.openaiBaseUrl,
  maxOutputTokens: settings.openaiMaxOutputTokens,
  reasoningEffort: settings.openaiReasoningEffort,
  verbosity: settings.openaiVerbosity,
  apiMode: settings.openaiApiMode || "responses",
  temperature: 0.7,
}
```

- [ ] **Step 4: Run type check**

Run:

```bash
cd rakuten-rms-ai
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rakuten-rms-ai/src/types/index.ts rakuten-rms-ai/src/services/storage.ts rakuten-rms-ai/src/services/providers/factory.ts
git commit -m "feat: add openai verbosity setting"
```

---

### Task 4: Integrate Responses Params and Incomplete Handling

**Files:**
- Modify: `rakuten-rms-ai/src/services/providers/openai.ts`

- [ ] **Step 1: Import helper types and functions**

At the top of `rakuten-rms-ai/src/services/providers/openai.ts`, add:

```ts
import {
  buildOpenAIResponsesParams,
  getEffectiveOpenAIReasoningEffort,
  getOpenAIStreamError,
  isOpenAIReasoningModel,
  type OpenAIReasoningEffort,
  type OpenAIVerbosity,
} from "./openai-params"
```

- [ ] **Step 2: Update private fields and constructor**

Replace the OpenAI-specific field types:

```ts
private reasoningEffort: OpenAIReasoningEffort
private verbosity: OpenAIVerbosity
```

Update constructor defaults:

```ts
this.reasoningEffort = config.reasoningEffort || "medium"
this.verbosity = config.verbosity || "medium"
```

- [ ] **Step 3: Replace local reasoning helpers**

Remove the current `isReasoningModel()` and `getEffectiveEffort()` methods from `OpenAIProvider`.

When Chat Completions still needs checks, use:

```ts
if (isOpenAIReasoningModel(this.model)) {
  ;(params as any).reasoning_effort = getEffectiveOpenAIReasoningEffort(this.model, this.reasoningEffort)
} else {
  params.temperature = this.temperature
}
```

- [ ] **Step 4: Build non-stream Responses params through helper**

Replace `generateReplyResponses` request construction with:

```ts
const response = await (this.client as any).responses.create(
  buildOpenAIResponsesParams({
    model: this.model,
    input: [{ role: "user", content: prompt }],
    maxOutputTokens: this.maxOutputTokens,
    reasoningEffort: this.reasoningEffort,
    verbosity: this.verbosity,
    stream: false,
  })
)

if (response.status === "incomplete") {
  const reason = response.incomplete_details?.reason || "unknown"
  throw new Error(`OpenAI response incomplete: ${reason}. 请调高 max_output_tokens 或降低 verbosity/reasoning。`)
}

if (response.status === "failed") {
  throw new Error(response.error?.message || "OpenAI Responses API failed")
}

if (response.usage?.output_tokens_details?.reasoning_tokens !== undefined) {
  console.debug("OpenAI usage", {
    outputTokens: response.usage.output_tokens,
    reasoningTokens: response.usage.output_tokens_details.reasoning_tokens,
  })
}

const text = response.output_text
```

- [ ] **Step 5: Build stream Responses params through helper**

Replace the `params` object in `streamResponses` with:

```ts
const params = buildOpenAIResponsesParams({
  model: this.model,
  input: inputMsgs,
  instructions: systemMsg?.content,
  maxOutputTokens: this.maxOutputTokens,
  reasoningEffort: this.reasoningEffort,
  verbosity: this.verbosity,
  stream: true,
})
```

- [ ] **Step 6: Throw on incomplete and failed stream events**

At the start of the `for await (const event of stream)` loop, add:

```ts
const streamError = getOpenAIStreamError(event)
if (streamError) throw streamError

if (event.type === "response.completed" && event.response?.usage?.output_tokens_details?.reasoning_tokens !== undefined) {
  console.debug("OpenAI usage", {
    outputTokens: event.response.usage.output_tokens,
    reasoningTokens: event.response.usage.output_tokens_details.reasoning_tokens,
  })
}
```

Keep the existing `response.output_text.delta`, `response.reasoning_summary_text.delta`, and `response.reasoning_text.delta` handling.

- [ ] **Step 7: Add Chat verbosity for GPT-5 family**

In both `generateReplyChat` and `streamChat`, add this after the reasoning/temperature block:

```ts
if (this.model.toLowerCase().startsWith("gpt-5")) {
  ;(params as any).verbosity = this.verbosity
}
```

- [ ] **Step 8: Run focused tests and type check**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/providers/openai-params.test.ts
pnpm exec tsc --noEmit
```

Expected: both PASS.

- [ ] **Step 9: Commit**

```bash
git add rakuten-rms-ai/src/services/providers/openai.ts
git commit -m "fix: align openai responses parameters with gpt semantics"
```

---

### Task 5: Update Options UI and Localized Copy

**Files:**
- Modify: `rakuten-rms-ai/src/options.tsx`
- Modify: `rakuten-rms-ai/src/i18n/locales/zh.ts`
- Modify: `rakuten-rms-ai/src/i18n/locales/ja.ts`
- Modify: `rakuten-rms-ai/src/i18n/locales/en.ts`

- [ ] **Step 1: Add OpenAI defaults in Options state**

In `rakuten-rms-ai/src/options.tsx`, add:

```ts
openaiReasoningEffort: "medium",
openaiVerbosity: "medium",
```

- [ ] **Step 2: Make provider budget note provider-specific**

Replace the note at `renderProviderTab` with:

```tsx
<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
  <strong>{t("options.tokenBudgetNoteLabel")}:</strong>{" "}
  {provider === "openai" ? t("options.openaiTokenBudgetNote") : t("options.geminiTokenBudgetNote")}
</div>
```

- [ ] **Step 3: Rename OpenAI token label and add verbosity selector**

In `renderOpenAISection`, replace the OpenAI token label with:

```tsx
<label className="block text-sm font-medium text-gray-700 mb-1">
  {t("options.openaiMaxOutputTokens")}: <span className="font-bold text-gray-900">{settings.openaiMaxOutputTokens ?? 2048}</span>
</label>
```

Add this block directly after the reasoning selector:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">{t("options.openaiVerbosity")}</label>
  <select
    value={settings.openaiVerbosity || "medium"}
    onChange={(e) => setSettings({ ...settings, openaiVerbosity: e.target.value as "low" | "medium" | "high" })}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
    <option value="low">{t("options.verbosityLow")}</option>
    <option value="medium">{t("options.verbosityMedium")}</option>
    <option value="high">{t("options.verbosityHigh")}</option>
  </select>
  <p className="mt-1 text-xs text-gray-500">{t("options.verbosityNote")}</p>
</div>
```

- [ ] **Step 4: Add xhigh reasoning option**

Update the OpenAI reasoning selector `onChange` cast:

```tsx
onChange={(e) => setSettings({ ...settings, openaiReasoningEffort: e.target.value as "low" | "medium" | "high" | "xhigh" })}
```

Add an `xhigh` option after `high`:

```tsx
<option value="xhigh">{t("options.reasoningXHigh")}</option>
```

The note must say `xhigh` can increase latency and cost.

- [ ] **Step 5: Update Chinese locale**

In `rakuten-rms-ai/src/i18n/locales/zh.ts`, replace and add keys:

```ts
"options.tokenBudgetNote":
  "不同 Provider 的 token 预算语义不同，请查看当前配置页说明。",
"options.openaiTokenBudgetNote":
  "OpenAI Responses 的 max_output_tokens 是总输出上限，包含可见回复和 reasoning tokens。字数主要由 Prompt 与 Verbosity 控制。",
"options.geminiTokenBudgetNote":
  "Gemini 的可见输出和 thinkingBudget 在本插件中分开设置，发送请求时会合并为 API 的 maxOutputTokens。",
"options.openaiMaxOutputTokens": "总输出 Token 上限 (max_output_tokens)",
"options.reasoningEffort": "思考强度 (reasoning.effort)",
"options.reasoningLow": "low（更快、省 token）",
"options.reasoningMedium": "medium（推荐）",
"options.reasoningHigh": "high（更深思考）",
"options.reasoningXHigh": "xhigh（最深思考）",
"options.reasoningNote":
  "仅 GPT-5 / o 系列等推理模型有效。GPT-5.5 默认 medium；更高强度会增加延迟和 token 消耗。",
"options.openaiVerbosity": "输出详略 (text.verbosity)",
"options.verbosityLow": "low（更简短）",
"options.verbosityMedium": "medium（推荐）",
"options.verbosityHigh": "high（更详细）",
"options.verbosityNote":
  "用于控制 GPT-5 系列最终回复的详略，不等同于字数保证。评价回复建议 medium，过长时改为 low。",
```

- [ ] **Step 6: Update Japanese locale**

In `rakuten-rms-ai/src/i18n/locales/ja.ts`, add equivalent keys:

```ts
"options.tokenBudgetNote":
  "Provider によってトークン予算の意味が異なります。現在の設定ページの説明を確認してください。",
"options.openaiTokenBudgetNote":
  "OpenAI Responses の max_output_tokens は総出力上限で、可視返信と reasoning tokens の両方を含みます。文字数は主に Prompt と Verbosity で制御します。",
"options.geminiTokenBudgetNote":
  "Gemini では本プラグイン上で可視出力と thinkingBudget を分けて設定し、API 送信時に maxOutputTokens として合算します。",
"options.openaiMaxOutputTokens": "総出力トークン上限 (max_output_tokens)",
"options.reasoningEffort": "思考強度 (reasoning.effort)",
"options.reasoningLow": "low（高速・省トークン）",
"options.reasoningMedium": "medium（推奨）",
"options.reasoningHigh": "high（深い思考）",
"options.reasoningXHigh": "xhigh（最深の思考）",
"options.reasoningNote":
  "GPT-5 / o シリーズなどの推理モデルでのみ有効です。GPT-5.5 のデフォルトは medium です。高い強度ほど遅延と token 消費が増えます。",
"options.openaiVerbosity": "出力の詳しさ (text.verbosity)",
"options.verbosityLow": "low（短め）",
"options.verbosityMedium": "medium（推奨）",
"options.verbosityHigh": "high（詳しめ）",
"options.verbosityNote":
  "GPT-5 系列の最終返信の詳しさを制御します。文字数保証ではありません。レビュー返信は medium 推奨、長すぎる場合は low にします。",
```

- [ ] **Step 7: Update English locale**

In `rakuten-rms-ai/src/i18n/locales/en.ts`, add equivalent keys:

```ts
"options.tokenBudgetNote":
  "Token budget semantics differ by provider. Check the note on the active provider page.",
"options.openaiTokenBudgetNote":
  "OpenAI Responses max_output_tokens is a total output cap, including visible reply tokens and reasoning tokens. Reply length is mainly controlled by Prompt and Verbosity.",
"options.geminiTokenBudgetNote":
  "For Gemini, this extension separates visible output and thinkingBudget, then combines them into API maxOutputTokens.",
"options.openaiMaxOutputTokens": "Total Output Token Cap (max_output_tokens)",
"options.reasoningEffort": "Reasoning Effort (reasoning.effort)",
"options.reasoningLow": "low (faster, fewer tokens)",
"options.reasoningMedium": "medium (recommended)",
"options.reasoningHigh": "high (deeper reasoning)",
"options.reasoningXHigh": "xhigh (deepest reasoning)",
"options.reasoningNote":
  "Only applies to reasoning models such as GPT-5 and o-series. GPT-5.5 defaults to medium; higher effort increases latency and token usage.",
"options.openaiVerbosity": "Output Verbosity (text.verbosity)",
"options.verbosityLow": "low (shorter)",
"options.verbosityMedium": "medium (recommended)",
"options.verbosityHigh": "high (more detailed)",
"options.verbosityNote":
  "Controls GPT-5 family final-answer verbosity, not a guaranteed character count. Use medium for review replies and low if replies are too long.",
```

- [ ] **Step 8: Run type check**

Run:

```bash
cd rakuten-rms-ai
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add rakuten-rms-ai/src/options.tsx rakuten-rms-ai/src/i18n/locales/zh.ts rakuten-rms-ai/src/i18n/locales/ja.ts rakuten-rms-ai/src/i18n/locales/en.ts
git commit -m "fix: clarify openai token and verbosity settings"
```

---

### Task 6: Full Build and Manual Review Workflow Verification

**Files:**
- No source files expected.

- [ ] **Step 1: Run unit tests**

Run:

```bash
cd rakuten-rms-ai
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
cd rakuten-rms-ai
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Run Plasmo build**

Run:

```bash
cd rakuten-rms-ai
pnpm build
```

Expected: PASS and a Chrome build artifact is produced.

- [ ] **Step 4: Manual settings verification**

Open the extension options page and confirm:

```text
OpenAI tab:
- API Mode defaults to Responses API.
- Reasoning Effort defaults to medium.
- Output Verbosity defaults to medium.
- Token label says total output token cap, not visible output token.
- Token budget note says OpenAI max_output_tokens includes reasoning tokens.

Gemini tab:
- Existing thinkingBudget controls remain visible.
- Gemini note still explains visible + thinking budget behavior.
```

- [ ] **Step 5: Manual GPT-5.5 review generation verification**

Use these settings:

```text
Provider: OpenAI
Model: gpt-5.5
API Mode: Responses
Reasoning Effort: medium
Output Verbosity: medium
Total Output Token Cap: 2048
```

Generate a reply for a positive review:

```text
評価: 5
商品名: テスト商品
レビュー内容: とても使いやすく、発送も早かったです。家族にも喜んでもらえました。
```

Expected:

```text
- Text streams into the Rakuten reply textarea.
- Final text has no reasoning text, JSON, memo, or character count suffix.
- Console debug may show OpenAI outputTokens and reasoningTokens when returned by the API.
- If the model exceeds max_output_tokens, the plugin shows a clear error instead of silently marking a truncated response as complete.
```

- [ ] **Step 6: Manual negative review verification**

Generate a reply for a negative review:

```text
評価: 1
商品名: テスト商品
レビュー内容: 到着が遅く、梱包も破れていました。楽しみにしていたので残念です。
```

Expected:

```text
- Reply follows apology mode.
- Reply does not include gratitude-focused phrasing.
- Reply remains a draft only and is not submitted automatically.
```

- [ ] **Step 7: Commit verification notes only if files changed**

If manual verification required source adjustments, commit those changes:

```bash
git status --short
git add rakuten-rms-ai
git commit -m "fix: polish openai review generation flow"
```

If no files changed, do not create an empty commit.

---

## Self-Review

**Spec coverage:**  
The plan covers all four identified issues: OpenAI token semantics, GPT-5.5 verbosity, Responses incomplete handling, and observability for reasoning token usage without adding automatic regeneration.

**Scope control:**  
The plan keeps the shared provider interface and current review/batch flow. It only adds OpenAI-specific helper logic and settings needed for GPT behavior.

**Test strategy:**  
Provider helper behavior is covered by Vitest. Full extension behavior is verified by `tsc`, `pnpm build`, and manual review generation in the actual extension context.

**User preference:**  
No automatic second API call is added when the reply is outside `400〜600` Japanese characters. The user can click generate again manually.
