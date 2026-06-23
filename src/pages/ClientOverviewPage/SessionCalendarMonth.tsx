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

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

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
  const [view, setView] = useState<"week" | "month">("month")
  const [anchorDate, setAnchorDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const notesBySessionId = new Map(sessionNotes.map((n) => [n.session_id, n]))

  function navigate(delta: number) {
    if (view === "month") {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
    } else {
      setAnchorDate((d) => addDays(d, delta * 7))
    }
  }

  const weekStart =
    view === "week"
      ? (() => {
          const dow = anchorDate.getDay()
          return addDays(anchorDate, dow === 0 ? -6 : 1 - dow)
        })()
      : null

  const grid = view === "month" ? monthGrid(anchorDate) : null
  const weekDays =
    view === "week" && weekStart
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      : []

  const headerLabel =
    view === "month"
      ? formatMonthYear(anchorDate)
      : weekStart
        ? `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : ""

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
        className="relative flex h-10 flex-col items-center justify-center rounded-md"
        style={{
          backgroundColor: scheduledBg ? P.scheduledTint : undefined,
          boxShadow: isToday ? `inset 0 0 0 2px ${P.sage}` : undefined,
        }}
      >
        <span
          className="text-[13px] font-medium tabular-nums leading-none"
          style={{ color: isToday ? P.sageInk : bar ? P.ink : P.faint }}
        >
          {day.getDate()}
        </span>
        {bar && (
          <span
            className="absolute bottom-1 left-1.5 right-1.5 h-[3px] rounded-full"
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold" style={{ color: P.ink }}>
          Session calendar
        </h2>
        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ border: `1px solid ${P.rule}` }}
        >
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                if (v === "month") {
                  setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
                }
              }}
              className="rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors"
              style={{
                backgroundColor: view === v ? P.ink : "transparent",
                color: view === v ? P.card : P.soft,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded p-1 transition-colors hover:opacity-70"
          aria-label={view === "week" ? "Previous week" : "Previous month"}
        >
          <ChevronLeft className="size-4" style={{ color: P.soft }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: P.ink }}>
          {headerLabel}
        </span>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="rounded p-1 transition-colors hover:opacity-70"
          aria-label={view === "week" ? "Next week" : "Next month"}
        >
          <ChevronRight className="size-4" style={{ color: P.soft }} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: P.faint }}
          >
            {d}
          </div>
        ))}
      </div>

      {view === "month" && grid ? (
        <div className="mt-1 space-y-1">
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) =>
                day ? renderDayCell(day) : <div key={di} className="h-10" aria-hidden="true" />,
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-7 gap-1">
          {weekDays.map((day) => renderDayCell(day))}
        </div>
      )}

      <div
        className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs"
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
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-[3px] w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
