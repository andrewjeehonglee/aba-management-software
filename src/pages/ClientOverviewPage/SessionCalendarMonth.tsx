import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { P } from "./profileTokens"

type DayBarStatus = "complete" | "note-due" | "cancelled" | "scheduled"

const BAR_COLOR: Record<DayBarStatus, string> = {
  complete: P.sage,
  "note-due": P.amber,
  cancelled: P.cancel,
  scheduled: P.scheduled,
}

const STATUS_PRIORITY: Record<DayBarStatus, number> = {
  cancelled: 4,
  "note-due": 3,
  scheduled: 2,
  complete: 1,
}

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function localISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-")
}

function monthGrid(anchorDate: Date): (Date | null)[][] {
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells: (Date | null)[] = Array<null>(startOffset).fill(null)
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function sessionBarStatus(
  session: SessionRecord,
  todayISO: string,
  notesBySessionId: Map<string, SessionNoteRecord>,
): DayBarStatus | null {
  if (session.status === "cancelled" || session.status === "no-show") return "cancelled"
  if (session.status === "completed") {
    return isCompleteSessionNote(notesBySessionId.get(session.id))
      ? "complete"
      : "note-due"
  }
  const day = session.time.slice(0, 10)
  if ((session.status === "scheduled" || session.status === "in-progress") && day >= todayISO) {
    return "scheduled"
  }
  return null
}

function dayBarStatus(
  daySessions: SessionRecord[],
  todayISO: string,
  notesBySessionId: Map<string, SessionNoteRecord>,
): DayBarStatus | null {
  let best: DayBarStatus | null = null
  let bestPriority = 0
  for (const session of daySessions) {
    const status = sessionBarStatus(session, todayISO, notesBySessionId)
    if (!status) continue
    const priority = STATUS_PRIORITY[status]
    if (priority > bestPriority) {
      best = status
      bestPriority = priority
    }
  }
  return best
}

interface SessionCalendarMonthProps {
  sessions: SessionRecord[]
  sessionNotes: SessionNoteRecord[]
}

export function SessionCalendarMonth({ sessions, sessionNotes }: SessionCalendarMonthProps) {
  const today = new Date()
  const todayISO = localISO(today)
  const [anchorDate, setAnchorDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const notesBySessionId = new Map(sessionNotes.map((n) => [n.session_id, n]))
  const grid = monthGrid(anchorDate)

  function navigate(delta: number) {
    setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  function sessionsOnDay(iso: string) {
    return sessions.filter((s) => s.time.slice(0, 10) === iso)
  }

  function renderDayCell(day: Date) {
    const iso = localISO(day)
    const daySessions = sessionsOnDay(iso)
    const bar = dayBarStatus(daySessions, todayISO, notesBySessionId)
    const isToday = iso === todayISO
    const scheduledBg = bar === "scheduled"

    return (
      <div
        key={iso}
        className="relative flex min-h-[52px] flex-col items-center justify-center rounded-md py-1.5"
        style={{
          backgroundColor: scheduledBg ? P.scheduledTint : undefined,
          boxShadow: isToday ? `inset 0 0 0 2px ${P.sage}` : undefined,
        }}
      >
        <span
          className="text-[16px] font-medium tabular-nums leading-none"
          style={{ color: isToday ? P.sageInk : bar ? P.ink : P.faint }}
        >
          {day.getDate()}
        </span>
        {bar && (
          <span
            className="absolute bottom-1.5 left-2 right-2 h-1 rounded-full"
            style={{ backgroundColor: BAR_COLOR[bar] }}
            aria-hidden="true"
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius, boxShadow: "0 1px 2px rgba(44,41,36,0.04)" }}
    >
      <h2 className="text-[18px] font-semibold" style={{ color: P.ink }}>
        Session calendar
      </h2>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded p-1 transition-colors hover:opacity-70"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" style={{ color: P.soft }} />
        </button>
        <span className="text-[15px] font-semibold" style={{ color: P.ink }}>
          {formatMonthYear(anchorDate)}
        </span>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="rounded p-1 transition-colors hover:opacity-70"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" style={{ color: P.soft }} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-[12px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: P.faint }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 space-y-1">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) =>
              day ? renderDayCell(day) : <div key={di} className="min-h-[52px]" aria-hidden="true" />,
            )}
          </div>
        ))}
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3.5 text-[14px]"
        style={{ borderColor: P.rule, color: P.soft }}
      >
        <LegendItem color={P.sage} label="Complete" />
        <LegendItem color={P.amber} label="Note due" />
        <LegendItem color={P.cancel} label="Cancelled" />
        <LegendItem color={P.scheduled} label="Scheduled" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-1 w-5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
