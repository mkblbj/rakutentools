import { describe, expect, it } from "vitest"
import {
  DEFAULT_REVIEW_PROMPT,
  LEGACY_REVIEW_PROMPT_V1,
  resolveReviewPrompt,
} from "./storage"

describe("review prompt defaults", () => {
  it("uses v2 length guidance for normal and short reviews", () => {
    expect(DEFAULT_REVIEW_PROMPT).toContain("450〜550文字")
    expect(DEFAULT_REVIEW_PROMPT).toContain("320〜450文字")
    expect(DEFAULT_REVIEW_PROMPT).not.toContain("400〜600文字")
  })

  it("migrates the unmodified v1 default prompt to v2", () => {
    expect(resolveReviewPrompt(LEGACY_REVIEW_PROMPT_V1)).toBe(DEFAULT_REVIEW_PROMPT)
  })

  it("migrates v1 prompts saved with legacy markdown trailing spaces", () => {
    const storedLegacyPrompt = LEGACY_REVIEW_PROMPT_V1.replace(
      "**【人物設定】**",
      "**【人物設定】**  "
    )

    expect(resolveReviewPrompt(storedLegacyPrompt)).toBe(DEFAULT_REVIEW_PROMPT)
  })

  it("keeps customized prompts unchanged", () => {
    const customPrompt = "カスタム返信ルール"

    expect(resolveReviewPrompt(customPrompt)).toBe(customPrompt)
  })
})
