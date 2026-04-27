import { describe, expect, it } from "vitest"
import { getSeasonalContextForDate } from "./seasonal"

function jstDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}

describe("seasonal context v2", () => {
  it("prioritizes an exact public holiday over generic season wording", () => {
    const context = getSeasonalContextForDate(jstDate(2026, 4, 29))

    expect(context.holidayLabel).toBe("昭和の日")
    expect(context.dayTypeLabel).toBe("祝日")
    expect(context.mentionType).toBe("holiday")
    expect(context.mentionLabel).toBe("昭和の日")
    expect(context.recommendedMention).toContain("昭和の日")
    expect(context.shouldUseInReply).toBe(true)
  })

  it("uses nearby Golden Week context before the event starts", () => {
    const context = getSeasonalContextForDate(jstDate(2026, 4, 27))

    expect(context.holidayLabel).toBe("ゴールデンウィーク前")
    expect(context.mentionType).toBe("event")
    expect(context.mentionLabel).toBe("ゴールデンウィーク")
    expect(context.recommendedMention).toContain("大型連休")
    expect(context.recommendedMention).toContain("前")
    expect(context.recommendedMention).not.toContain("時期に")
    expect(context.shouldUseInReply).toBe(true)
  })

  it("falls back to normal seasonal warmth on ordinary days", () => {
    const context = getSeasonalContextForDate(jstDate(2026, 6, 10))

    expect(context.holidayLabel).toBe("")
    expect(context.mentionType).toBe("season")
    expect(context.mentionLabel).toBe("夏")
    expect(context.recommendedMention).toContain("暑さ")
    expect(context.shouldUseInReply).toBe(true)
  })

  it("keeps deterministic seasonal wording for the same date", () => {
    const first = getSeasonalContextForDate(jstDate(2026, 11, 10))
    const second = getSeasonalContextForDate(jstDate(2026, 11, 10))

    expect(first.recommendedMention).toBe(second.recommendedMention)
    expect(first.seasonalGreeting).toBe(second.seasonalGreeting)
  })
})
