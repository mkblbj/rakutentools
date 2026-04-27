# Seasonal Context v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“季节问候（自动附加）”升级为更可控、更有人情味的时令上下文，让祝日/行事优先于普通季节句，并通过测试锁定日期判断、Prompt 注入和默认 Prompt 规则。

**Architecture:** 在 `seasonal.ts` 中保留现有日期/节日判断，但新增可测试的 `getSeasonalContextForDate()` 和明确的推荐字段：`mentionType`、`mentionLabel`、`recommendedMention`、`shouldUseInReply`。`review-prompt.ts` 把推荐时令一言作为独立输入数据传给模型，默认 Prompt 改为按推荐字段使用，而不是让模型在季节/祝日字段中自由猜测。

**Tech Stack:** TypeScript, Vitest, Plasmo background service worker, existing Chrome extension settings.

---

## File Structure

- Modify: `rakuten-rms-ai/src/utils/seasonal.ts`
  - Add `mentionType`, `mentionLabel`, `recommendedMention`, `shouldUseInReply` to `SeasonalContext`.
  - Add `getSeasonalContextForDate(date: Date)` for deterministic unit tests.
  - Add event/holiday priority and nearby event windows.
  - Replace random season greeting with deterministic date-indexed selection.
- Create: `rakuten-rms-ai/src/utils/seasonal.test.ts`
  - Test holiday priority, nearby Golden Week, normal season fallback, and deterministic greeting stability.
- Modify: `rakuten-rms-ai/src/services/review-prompt.ts`
  - Include `【推奨時令一言】`, `【時令タイプ】`, and `【時令使用可否】` in user content.
  - Replace seasonal placeholders with `recommendedMention` when appropriate.
- Modify: `rakuten-rms-ai/src/services/review-prompt.test.ts`
  - Test recommended mention is included and holiday/event information is not reduced to generic season wording.
- Modify: `rakuten-rms-ai/src/services/storage.ts`
  - Update default Prompt seasonal rules to prioritize recommended mention and avoid use in apology mode.
- Modify: `rakuten-rms-ai/src/services/storage.test.ts`
  - Test default Prompt contains seasonal priority rules.

---

### Task 1: Add Seasonal Context Unit Tests

**Files:**
- Create: `rakuten-rms-ai/src/utils/seasonal.test.ts`

- [ ] **Step 1: Write failing tests**

Create `rakuten-rms-ai/src/utils/seasonal.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/utils/seasonal.test.ts
```

Expected: FAIL because `getSeasonalContextForDate`, `mentionType`, `mentionLabel`, `recommendedMention`, and `shouldUseInReply` do not exist yet.

---

### Task 2: Implement Seasonal Context v2

**Files:**
- Modify: `rakuten-rms-ai/src/utils/seasonal.ts`
- Test: `rakuten-rms-ai/src/utils/seasonal.test.ts`

- [ ] **Step 1: Extend `SeasonalContext`**

In `rakuten-rms-ai/src/utils/seasonal.ts`, change:

```ts
export interface SeasonalContext {
  currentDateJst: string
  seasonLabel: string
  holidayLabel: string
  dayTypeLabel: string
  seasonalGreeting: string
}
```

to:

```ts
export type SeasonalMentionType = "holiday" | "event" | "season"

export interface SeasonalContext {
  currentDateJst: string
  seasonLabel: string
  holidayLabel: string
  dayTypeLabel: string
  seasonalGreeting: string
  mentionType: SeasonalMentionType
  mentionLabel: string
  recommendedMention: string
  shouldUseInReply: boolean
}
```

- [ ] **Step 2: Add event window type**

After `interface SeasonalEvent`, add:

```ts
interface SeasonalEventWindow extends SeasonalEvent {
  preDays: number
  postDays: number
  preLabel?: string
  postLabel?: string
}
```

- [ ] **Step 3: Replace `SEASONAL_EVENTS` with window-aware events**

Replace the current `SEASONAL_EVENTS` declaration with:

```ts
const SEASONAL_EVENTS: SeasonalEventWindow[] = [
  {
    startMonth: 12,
    startDay: 28,
    endMonth: 12,
    endDay: 31,
    name: "年末",
    greeting: "年末のお忙しい時期に、当店をご利用いただきありがとうございます",
    preDays: 3,
    postDays: 0,
  },
  {
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 3,
    name: "年始",
    greeting: "新しい年のはじまりに、当店をご利用いただきありがとうございます",
    preDays: 0,
    postDays: 4,
  },
  {
    startMonth: 4,
    startDay: 29,
    endMonth: 5,
    endDay: 5,
    name: "ゴールデンウィーク",
    greeting: "大型連休の時期に、当店をご利用いただきありがとうございます",
    preDays: 3,
    postDays: 1,
    preLabel: "ゴールデンウィーク前",
    postLabel: "ゴールデンウィーク明け",
  },
  {
    startMonth: 8,
    startDay: 13,
    endMonth: 8,
    endDay: 16,
    name: "お盆",
    greeting: "お盆の時期に、当店をご利用いただきありがとうございます",
    preDays: 2,
    postDays: 1,
  },
  {
    startMonth: 12,
    startDay: 24,
    endMonth: 12,
    endDay: 25,
    name: "クリスマス",
    greeting: "クリスマスの季節に、当店をご利用いただきありがとうございます",
    preDays: 5,
    postDays: 1,
  },
]
```

- [ ] **Step 4: Replace season greetings with warmer store language**

Replace `SEASON_GREETINGS` with:

```ts
const SEASON_GREETINGS: Record<string, string[]> = {
  春: [
    "春らしい穏やかな季節に、当店をご利用いただきありがとうございます",
    "日ごとに暖かさを感じる頃、レビューをお寄せいただきありがとうございます",
    "新しい季節のなか、当店をご利用いただきありがとうございます",
  ],
  夏: [
    "暑さが続くなか、当店をご利用いただきありがとうございます",
    "夏の陽気が感じられるなか、レビューをお寄せいただきありがとうございます",
    "蒸し暑い日が続くなか、当店をご利用いただきありがとうございます",
  ],
  秋: [
    "秋らしさを感じる季節に、当店をご利用いただきありがとうございます",
    "過ごしやすい季節のなか、レビューをお寄せいただきありがとうございます",
    "朝晩に秋の気配を感じる頃、当店をご利用いただきありがとうございます",
  ],
  冬: [
    "寒さが気になる季節に、当店をご利用いただきありがとうございます",
    "冬らしい冷え込みのなか、レビューをお寄せいただきありがとうございます",
    "年の瀬に向かう季節、当店をご利用いただきありがとうございます",
  ],
}
```

- [ ] **Step 5: Add deterministic picker**

Replace:

```ts
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
```

with:

```ts
function pickByDate<T>(arr: T[], month: number, day: number): T {
  return arr[(month * 31 + day) % arr.length]
}
```

- [ ] **Step 6: Add day arithmetic helpers**

After `getSeasonLabel`, add:

```ts
function toUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function dateToMonthDayNumber(date: Date): number {
  return (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
}

function isWithinMonthDayRange(current: number, start: number, end: number): boolean {
  if (start <= end) return current >= start && current <= end
  return current >= start || current <= end
}
```

- [ ] **Step 7: Replace seasonal event lookup**

Replace `getSeasonalEvent` with:

```ts
function getSeasonalEvent(year: number, month: number, day: number): { event: SeasonalEventWindow; label: string } | null {
  const currentDate = toUtcDate(year, month, day)
  const current = dateToMonthDayNumber(currentDate)

  for (const event of SEASONAL_EVENTS) {
    const startDate = toUtcDate(year, event.startMonth, event.startDay)
    const endDate = toUtcDate(year, event.endMonth, event.endDay)
    const start = event.startMonth * 100 + event.startDay
    const end = event.endMonth * 100 + event.endDay

    if (isWithinMonthDayRange(current, start, end)) {
      return { event, label: event.name }
    }

    for (let offset = 1; offset <= event.preDays; offset++) {
      if (dateToMonthDayNumber(addDays(startDate, -offset)) === current) {
        return { event, label: event.preLabel || `${event.name}前` }
      }
    }

    for (let offset = 1; offset <= event.postDays; offset++) {
      if (dateToMonthDayNumber(addDays(endDate, offset)) === current) {
        return { event, label: event.postLabel || `${event.name}明け` }
      }
    }
  }

  return null
}
```

- [ ] **Step 8: Add deterministic context function**

Replace `getSeasonalContext` with:

```ts
export function getSeasonalContextForDate(date: Date): SeasonalContext {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const dayOfWeek = date.getUTCDay()

  const dayName = DAY_NAMES[dayOfWeek]
  const currentDateJst = `${year}年${month}月${day}日（${dayName}）`
  const seasonLabel = getSeasonLabel(month)

  const holidayName = getHolidayLabel(year, month, day, dayOfWeek)
  const seasonalEvent = getSeasonalEvent(year, month, day)

  let holidayLabel = ""
  let dayTypeLabel = dayOfWeek === 0 || dayOfWeek === 6 ? "週末" : "平日"
  let seasonalGreeting = pickByDate(SEASON_GREETINGS[seasonLabel], month, day)
  let mentionType: SeasonalMentionType = "season"
  let mentionLabel = seasonLabel
  let recommendedMention = seasonalGreeting

  if (holidayName) {
    holidayLabel = holidayName
    dayTypeLabel = "祝日"
    mentionType = "holiday"
    mentionLabel = holidayName
    recommendedMention = `${holidayName}の時期に、当店をご利用いただきありがとうございます`
  } else if (seasonalEvent) {
    holidayLabel = seasonalEvent.label
    dayTypeLabel = dayOfWeek === 0 || dayOfWeek === 6 ? "週末" : "平日"
    seasonalGreeting = seasonalEvent.event.greeting
    mentionType = "event"
    mentionLabel = seasonalEvent.event.name
    recommendedMention = seasonalEvent.event.greeting
  }

  return {
    currentDateJst,
    seasonLabel,
    holidayLabel,
    dayTypeLabel,
    seasonalGreeting,
    mentionType,
    mentionLabel,
    recommendedMention,
    shouldUseInReply: true,
  }
}

export function getSeasonalContext(): SeasonalContext {
  const { year, month, day } = getJstNow()
  return getSeasonalContextForDate(toUtcDate(year, month, day))
}
```

- [ ] **Step 9: Run seasonal tests and verify pass**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/utils/seasonal.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit seasonal context v2**

Run:

```bash
git add rakuten-rms-ai/src/utils/seasonal.ts rakuten-rms-ai/src/utils/seasonal.test.ts
git commit -m "feat: add seasonal context v2"
```

---

### Task 3: Wire Recommended Mention Into Review Prompt Messages

**Files:**
- Modify: `rakuten-rms-ai/src/services/review-prompt.ts`
- Modify: `rakuten-rms-ai/src/services/review-prompt.test.ts`

- [ ] **Step 1: Update review prompt tests**

Append these tests to `rakuten-rms-ai/src/services/review-prompt.test.ts` inside `describe("buildReviewMessages", () => { ... })`:

```ts
  it("includes recommended seasonal mention as explicit input data", () => {
    const messages = buildReviewMessages({
      template: DEFAULT_REVIEW_PROMPT,
      context: {
        reviewContent: "発送が早く助かりました。",
        rating: "5",
        productName: "バッグ",
      },
      seasonal: {
        currentDateJst: "2026年4月29日（水）",
        seasonLabel: "春",
        holidayLabel: "昭和の日",
        dayTypeLabel: "祝日",
        seasonalGreeting: "春らしい穏やかな季節に、当店をご利用いただきありがとうございます",
        mentionType: "holiday",
        mentionLabel: "昭和の日",
        recommendedMention: "昭和の日の時期に、当店をご利用いただきありがとうございます",
        shouldUseInReply: true,
      },
    })

    expect(messages[1].content).toContain("【推奨時令一言】")
    expect(messages[1].content).toContain("昭和の日の時期")
    expect(messages[1].content).toContain("【時令タイプ】")
    expect(messages[1].content).toContain("holiday")
    expect(messages[1].content).toContain("【時令使用可否】")
    expect(messages[1].content).toContain("使用可")
  })
```

Update the top-level `seasonal` fixture in this file to include the new fields:

```ts
const seasonal = {
  currentDateJst: "2026年04月27日",
  seasonLabel: "春",
  holidayLabel: "なし",
  dayTypeLabel: "平日",
  seasonalGreeting: "春らしい穏やかな日が続いております",
  mentionType: "season" as const,
  mentionLabel: "春",
  recommendedMention: "春らしい穏やかな日が続いております",
  shouldUseInReply: true,
}
```

- [ ] **Step 2: Run review-prompt tests and verify failure**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/review-prompt.test.ts
```

Expected: FAIL because the message builder does not yet include recommended mention fields.

- [ ] **Step 3: Update user content builder**

In `rakuten-rms-ai/src/services/review-prompt.ts`, replace the end of `buildReviewUserContent`:

```ts
    "【季節の一言（参考）】",
    seasonal?.seasonalGreeting || "",
  ].join("\n")
}
```

with:

```ts
    "【季節の一言（参考）】",
    seasonal?.seasonalGreeting || "",
    "",
    "【時令タイプ】",
    seasonal?.mentionType || "",
    "",
    "【時令ラベル】",
    seasonal?.mentionLabel || "",
    "",
    "【推奨時令一言】",
    seasonal?.recommendedMention || "",
    "",
    "【時令使用可否】",
    seasonal ? (seasonal.shouldUseInReply ? "使用可" : "使用不可") : "",
  ].join("\n")
}
```

- [ ] **Step 4: Update placeholder replacement**

In `replaceInstructionPlaceholders`, add these replacements before the closing line:

```ts
    .replace(/\{\{mention_type\}\}/g, seasonal?.mentionType || "下記の【時令タイプ】")
    .replace(/\{\{mention_label\}\}/g, seasonal?.mentionLabel || "下記の【時令ラベル】")
    .replace(/\{\{recommended_mention\}\}/g, seasonal?.recommendedMention || "下記の【推奨時令一言】")
    .replace(/\{\{should_use_seasonal_mention\}\}/g, seasonal ? (seasonal.shouldUseInReply ? "使用可" : "使用不可") : "下記の【時令使用可否】")
```

- [ ] **Step 5: Run review-prompt tests and verify pass**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/review-prompt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit prompt wiring**

Run:

```bash
git add rakuten-rms-ai/src/services/review-prompt.ts rakuten-rms-ai/src/services/review-prompt.test.ts
git commit -m "feat: pass recommended seasonal mention to prompts"
```

---

### Task 4: Update Default Prompt Seasonal Rules

**Files:**
- Modify: `rakuten-rms-ai/src/services/storage.ts`
- Modify: `rakuten-rms-ai/src/services/storage.test.ts`

- [ ] **Step 1: Add prompt rule tests**

In `rakuten-rms-ai/src/services/storage.test.ts`, extend the `uses v3 guidance for stable review replies` test with:

```ts
    expect(DEFAULT_REVIEW_PROMPT).toContain("推奨時令一言")
    expect(DEFAULT_REVIEW_PROMPT).toContain("祝日・行事がある場合は、通常の季節表現よりも優先")
    expect(DEFAULT_REVIEW_PROMPT).toContain("謝罪モードでは原則として時令表現を入れません")
```

- [ ] **Step 2: Run storage tests and verify failure**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/storage.test.ts
```

Expected: FAIL because the default Prompt still says only generic seasonal expression.

- [ ] **Step 3: Replace seasonal rule block**

In `rakuten-rms-ai/src/services/storage.ts`, replace the current v3 block:

```md
## 【季節表現】
- 「季節の一言（参考）」が空でない場合、感謝モードまたは混合モードの冒頭か結びに、自然な季節表現を**1文だけ**添えてもよいです。
- 謝罪モードでは季節表現を入れず、お詫びと改善姿勢を優先します。
- 手紙調の堅い時候の挨拶は避け、会話として自然な表現にします。
```

with:

```md
## 【時令表現】
- 入力データの「推奨時令一言」が空でなく、「時令使用可否」が使用可の場合のみ、感謝モードまたは混合モードの冒頭か結びに**1文だけ**自然に添えてもよいです。
- 祝日・行事がある場合は、通常の季節表現よりも優先して「推奨時令一言」を参考にします。
- 祝日・行事がない場合のみ、季節の一言を参考にします。
- 謝罪モードでは原則として時令表現を入れません。お詫びと改善姿勢を優先します。
- 手紙調の堅い時候の挨拶は避け、店長が自然に気遣うような一言にします。
```

- [ ] **Step 4: Run storage tests and verify pass**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/services/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit prompt rule update**

Run:

```bash
git add rakuten-rms-ai/src/services/storage.ts rakuten-rms-ai/src/services/storage.test.ts
git commit -m "feat: prioritize recommended seasonal mention in prompt"
```

---

### Task 5: Final Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd rakuten-rms-ai
pnpm test src/utils/seasonal.test.ts src/services/review-prompt.test.ts src/services/storage.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run full tests**

Run:

```bash
cd rakuten-rms-ai
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 3: Run TypeScript check**

Run:

```bash
cd rakuten-rms-ai
pnpm exec tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 4: Build extension**

Run:

```bash
cd rakuten-rms-ai
pnpm build
```

Expected: Plasmo build finishes successfully for `chrome-mv3`.

- [ ] **Step 5: Manual spot checks**

Use the built extension or a temporary script to inspect contexts:

1. `2026-04-29`: expected `mentionType = holiday`, `mentionLabel = 昭和の日`, recommended mention includes 昭和の日.
2. `2026-04-27`: expected `mentionType = event`, `mentionLabel = ゴールデンウィーク`, recommended mention includes 大型連休.
3. `2026-06-10`: expected `mentionType = season`, recommended mention is summer-friendly store language.

- [ ] **Step 6: Check git status**

Run:

```bash
git status --short
```

Expected: clean working tree, unless `tsconfig.tsbuildinfo` changed. If it changed, commit it with:

```bash
git add rakuten-rms-ai/tsconfig.tsbuildinfo
git commit -m "chore: update tsbuildinfo after seasonal verification"
```

---

## Self-Review Checklist

- Tests cover exact holiday priority, nearby event window, normal seasonal fallback, and deterministic wording.
- Prompt builder passes recommended mention fields to the model as explicit input data.
- Default Prompt tells the model to prioritize holiday/event mention over generic season wording.
- Apology mode remains protected from inappropriate seasonal greetings.
- No automatic reply sending or character-count diagnostics are added.
