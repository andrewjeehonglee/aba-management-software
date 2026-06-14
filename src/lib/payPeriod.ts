import { PRACTICE_TIMEZONE } from "@/lib/sessions"

export interface PayPeriod {
  start: Date
  end: Date
  label: string
}

function calendarPartsInPracticeTz(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date)

  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  }
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Convert a practice-calendar date/time to a UTC instant. */
function practiceZonedInstant(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms))
  const utcAsLocal = new Date(utcGuess.toLocaleString("en-US", { timeZone: "UTC" }))
  const practiceAsLocal = new Date(utcGuess.toLocaleString("en-US", { timeZone: PRACTICE_TIMEZONE }))
  const offsetMs = utcAsLocal.getTime() - practiceAsLocal.getTime()
  return new Date(utcGuess.getTime() + offsetMs)
}

function formatPayPeriodLabel(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
): string {
  const anchor = new Date(year, month - 1, startDay)
  const monthFmt = anchor.toLocaleDateString("en-US", { month: "short" })
  return `${monthFmt} ${startDay}–${endDay}, ${year}`
}

/**
 * Fixed semi-monthly pay windows (v1): days 1–15 and 16–end of month in practice TZ.
 * Swap this helper when Jenny confirms exact payroll dates.
 */
export function getCurrentPayPeriod(referenceDate: Date = new Date()): PayPeriod {
  const { year, month, day } = calendarPartsInPracticeTz(referenceDate)
  const monthEnd = lastDayOfMonth(year, month)

  const startDay = day <= 15 ? 1 : 16
  const endDay = day <= 15 ? 15 : monthEnd

  const start = practiceZonedInstant(year, month, startDay, 0, 0, 0, 0)
  const end = practiceZonedInstant(year, month, endDay, 23, 59, 59, 999)

  return {
    start,
    end,
    label: formatPayPeriodLabel(year, month, startDay, endDay),
  }
}

/** Prior semi-monthly window — used for period-over-period baselines. */
export function getPreviousPayPeriod(referenceDate: Date = new Date()): PayPeriod {
  const current = getCurrentPayPeriod(referenceDate)
  const anchor = new Date(current.start.getTime() - 24 * 60 * 60 * 1000)
  return getCurrentPayPeriod(anchor)
}

function formatCalendarMonthLabel(year: number, month: number): string {
  const anchor = new Date(year, month - 1, 1)
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/** Inclusive YYYY-MM-DD bounds for the current calendar month in practice TZ. */
export function getCurrentCalendarMonthDateBounds(referenceDate: Date = new Date()): {
  start: string
  end: string
} {
  const { year, month } = calendarPartsInPracticeTz(referenceDate)
  const monthEnd = lastDayOfMonth(year, month)
  const mm = String(month).padStart(2, "0")
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(monthEnd).padStart(2, "0")}`,
  }
}

/** Calendar month in practice TZ (resets 1st of each month). Used by Hours by Staff + Auth utilization. */
export function getCurrentCalendarMonth(referenceDate: Date = new Date()): PayPeriod {
  const { year, month } = calendarPartsInPracticeTz(referenceDate)
  const monthEnd = lastDayOfMonth(year, month)

  const start = practiceZonedInstant(year, month, 1, 0, 0, 0, 0)
  const end = practiceZonedInstant(year, month, monthEnd, 23, 59, 59, 999)

  return {
    start,
    end,
    label: formatCalendarMonthLabel(year, month),
  }
}

/** Prior calendar month — used for period-over-period baselines on dashboard tiles. */
export function getPreviousCalendarMonth(referenceDate: Date = new Date()): PayPeriod {
  const current = getCurrentCalendarMonth(referenceDate)
  const anchor = new Date(current.start.getTime() - 24 * 60 * 60 * 1000)
  return getCurrentCalendarMonth(anchor)
}
