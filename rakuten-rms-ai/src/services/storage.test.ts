import { describe, expect, it } from "vitest"
import {
  DEFAULT_REVIEW_PROMPT,
  LEGACY_REVIEW_PROMPT_V1,
  LEGACY_REVIEW_PROMPT_V2,
  resolveReviewPrompt,
} from "./storage"

describe("review prompt defaults", () => {
  it("uses v3 guidance for stable review replies", () => {
    expect(DEFAULT_REVIEW_PROMPT).toContain("500-600文字")
    expect(DEFAULT_REVIEW_PROMPT).toContain("最低でも400文字以上")
    expect(DEFAULT_REVIEW_PROMPT).toContain("混合モード")
    expect(DEFAULT_REVIEW_PROMPT).toContain("レビューにある表現を受け止める場合は使用できる")
    expect(DEFAULT_REVIEW_PROMPT).toContain("推奨時令一言")
    expect(DEFAULT_REVIEW_PROMPT).toContain("祝日・行事がある場合は、通常の季節表現よりも優先")
    expect(DEFAULT_REVIEW_PROMPT).toContain("謝罪モードでは原則として時令表現を入れません")
    expect(DEFAULT_REVIEW_PROMPT).not.toContain("320〜450文字")
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

  it("migrates the unmodified v2 default prompt to v3", () => {
    expect(LEGACY_REVIEW_PROMPT_V2).toContain("320〜450文字")
    expect(resolveReviewPrompt(LEGACY_REVIEW_PROMPT_V2)).toBe(DEFAULT_REVIEW_PROMPT)
  })

  it("keeps customized prompts unchanged", () => {
    const customPrompt = "カスタム返信ルール"

    expect(resolveReviewPrompt(customPrompt)).toBe(customPrompt)
  })
})
