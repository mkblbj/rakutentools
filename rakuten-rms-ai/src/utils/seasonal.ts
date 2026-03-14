/**
 * 日本の祝日・季節・時候コンテキストモジュール
 * Asia/Tokyo 基準で当日の季節情報を生成する
 */

export interface SeasonalContext {
  currentDateJst: string
  seasonLabel: string
  holidayLabel: string
  dayTypeLabel: string
  seasonalGreeting: string
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

const SEASONAL_EVENTS: SeasonalEvent[] = [
  { startMonth: 12, startDay: 28, endMonth: 12, endDay: 31, name: "年末", greeting: "年の瀬も押し迫ってまいりましたが" },
  { startMonth: 1, startDay: 1, endMonth: 1, endDay: 3, name: "年始", greeting: "新年を迎え気持ちも新たな頃かと存じますが" },
  { startMonth: 4, startDay: 29, endMonth: 5, endDay: 5, name: "ゴールデンウィーク", greeting: "大型連休の季節となりましたが" },
  { startMonth: 8, startDay: 13, endMonth: 8, endDay: 16, name: "お盆", greeting: "お盆の時期、いかがお過ごしでしょうか" },
  { startMonth: 12, startDay: 24, endMonth: 12, endDay: 25, name: "クリスマス", greeting: "クリスマスの季節となりましたが" },
]

const SEASON_GREETINGS: Record<string, string[]> = {
  春: [
    "春らしい穏やかな陽気が続いておりますが",
    "春の訪れを感じる頃となりましたが",
    "花の便りが届く季節となりましたが",
  ],
  夏: [
    "暑い日が続いておりますが",
    "夏の日差しがまぶしい季節ですが",
    "蒸し暑い日々が続いておりますが",
  ],
  秋: [
    "秋の気配を感じる頃となりましたが",
    "秋風が心地よい季節ですが",
    "過ごしやすい季節となりましたが",
  ],
  冬: [
    "寒さが厳しくなってまいりましたが",
    "冬本番の寒さですが",
    "寒い日が続いておりますが",
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

function getSeasonalEvent(month: number, day: number): SeasonalEvent | null {
  const current = month * 100 + day
  for (const evt of SEASONAL_EVENTS) {
    const start = evt.startMonth * 100 + evt.startDay
    const end = evt.endMonth * 100 + evt.endDay
    if (start <= end) {
      if (current >= start && current <= end) return evt
    } else {
      if (current >= start || current <= end) return evt
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getSeasonalContext(): SeasonalContext {
  const { year, month, day, dayOfWeek } = getJstNow()

  const dayName = DAY_NAMES[dayOfWeek]
  const currentDateJst = `${year}年${month}月${day}日（${dayName}）`
  const seasonLabel = getSeasonLabel(month)

  const holidayName = getHolidayLabel(year, month, day, dayOfWeek)
  const seasonalEvent = getSeasonalEvent(month, day)

  let holidayLabel = ""
  let dayTypeLabel: string
  let seasonalGreeting: string

  if (holidayName) {
    holidayLabel = holidayName
    dayTypeLabel = "祝日"
    seasonalGreeting = seasonalEvent?.greeting ?? pickRandom(SEASON_GREETINGS[seasonLabel])
  } else if (seasonalEvent) {
    holidayLabel = seasonalEvent.name
    dayTypeLabel = dayOfWeek === 0 || dayOfWeek === 6 ? "週末" : "平日"
    seasonalGreeting = seasonalEvent.greeting
  } else {
    dayTypeLabel = dayOfWeek === 0 || dayOfWeek === 6 ? "週末" : "平日"
    seasonalGreeting = pickRandom(SEASON_GREETINGS[seasonLabel])
  }

  return { currentDateJst, seasonLabel, holidayLabel, dayTypeLabel, seasonalGreeting }
}
