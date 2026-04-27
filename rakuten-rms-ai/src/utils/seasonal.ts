/**
 * 日本の祝日・季節・時候コンテキストモジュール
 * Asia/Tokyo 基準で当日の季節情報を生成する
 */

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

interface FixedHoliday {
  month: number
  day: number
  name: string
}

interface HappyMondayHoliday {
  month: number
  weekOfMonth: number
  name: string
}

interface SeasonalEvent {
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  name: string
  greeting: string
}

interface SeasonalEventWindow extends SeasonalEvent {
  preDays: number
  postDays: number
  preLabel?: string
  postLabel?: string
}

const FIXED_HOLIDAYS: FixedHoliday[] = [
  { month: 1, day: 1, name: "元日" },
  { month: 2, day: 11, name: "建国記念の日" },
  { month: 2, day: 23, name: "天皇誕生日" },
  { month: 4, day: 29, name: "昭和の日" },
  { month: 5, day: 3, name: "憲法記念日" },
  { month: 5, day: 4, name: "みどりの日" },
  { month: 5, day: 5, name: "こどもの日" },
  { month: 8, day: 11, name: "山の日" },
  { month: 11, day: 3, name: "文化の日" },
  { month: 11, day: 23, name: "勤労感謝の日" },
]

const HAPPY_MONDAY_HOLIDAYS: HappyMondayHoliday[] = [
  { month: 1, weekOfMonth: 2, name: "成人の日" },
  { month: 7, weekOfMonth: 3, name: "海の日" },
  { month: 9, weekOfMonth: 3, name: "敬老の日" },
  { month: 10, weekOfMonth: 2, name: "スポーツの日" },
]

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

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"]

function getJstNow(): { year: number; month: number; day: number; dayOfWeek: number } {
  const jstMs = Date.now() + 9 * 3600_000
  const d = new Date(jstMs)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    dayOfWeek: d.getUTCDay(),
  }
}

function getVernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4)
}

function getAutumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4)
}

function getNthMondayOfMonth(year: number, month: number, n: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const firstDayOfWeek = firstDay.getUTCDay()
  const daysUntilFirstMonday = (1 - firstDayOfWeek + 7) % 7
  return 1 + daysUntilFirstMonday + (n - 1) * 7
}

function isPublicHoliday(year: number, month: number, day: number): boolean {
  for (const h of FIXED_HOLIDAYS) {
    if (h.month === month && h.day === day) return true
  }
  if (month === 3 && day === getVernalEquinoxDay(year)) return true
  if (month === 9 && day === getAutumnalEquinoxDay(year)) return true
  for (const h of HAPPY_MONDAY_HOLIDAYS) {
    if (h.month === month && day === getNthMondayOfMonth(year, month, h.weekOfMonth)) return true
  }
  return false
}

function getHolidayLabel(year: number, month: number, day: number, dayOfWeek: number): string | null {
  for (const h of FIXED_HOLIDAYS) {
    if (h.month === month && h.day === day) return h.name
  }
  if (month === 3 && day === getVernalEquinoxDay(year)) return "春分の日"
  if (month === 9 && day === getAutumnalEquinoxDay(year)) return "秋分の日"
  for (const h of HAPPY_MONDAY_HOLIDAYS) {
    if (h.month === month && day === getNthMondayOfMonth(year, month, h.weekOfMonth)) return h.name
  }
  if (dayOfWeek === 1) {
    const prevDate = new Date(Date.UTC(year, month - 1, day - 1))
    if (prevDate.getUTCDay() === 0 && isPublicHoliday(prevDate.getUTCFullYear(), prevDate.getUTCMonth() + 1, prevDate.getUTCDate())) {
      return "振替休日"
    }
  }
  return null
}

function getSeasonLabel(month: number): string {
  if (month >= 3 && month <= 5) return "春"
  if (month >= 6 && month <= 8) return "夏"
  if (month >= 9 && month <= 11) return "秋"
  return "冬"
}

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

function pickByDate<T>(arr: T[], month: number, day: number): T {
  return arr[(month * day) % arr.length]
}

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
