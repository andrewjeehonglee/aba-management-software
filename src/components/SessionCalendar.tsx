import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTime } from "@/lib/sessions"
import { staffProfilePath } from "@/lib/rosterScope"
import { cn } from "@/lib/utils"
import type { Session, SessionStatus } from "@/types/session"

// ─────────────────────────────────────────────────────────────────────────
// Date utilities — no external library, pure JS Date math.
//
// Convention: all dates stored as local Date objects. "localISO" produces
// "YYYY-MM-DD" in local time (avoids the UTC-midnight-shift bug that bites
// West Coast users when using d.toISOString().slice(0, 10)).
// ─────────────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Monday of the week containing d. JS getDay(): 0=Sun, 1=Mon, …, 6=Sat.
function mondayOf(d: Date): Date {
  const dow = d.getDay()
  return addDays(d, dow === 0 ? -6 : 1 - dow)
}

function localISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-")
}

// "YYYY-MM-DD" from session's ISO datetime string (already local time in mock data).
function sessionDay(s: Session): string {
  return s.time.slice(0, 10)
}

function sessionsOnDay(sessions: Session[], dateISO: string): Session[] {
  return sessions
    .filter((s) => sessionDay(s) === dateISO)
    .sort((a, b) => a.time.localeCompare(b.time))
}

function isMuted(s: Session): boolean {
  return s.status === "cancelled" || s.status === "no-show"
}

function formatDuration(min?: number): string {
  if (!min) return ""
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const lo = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const hi = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${lo} – ${hi}`
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// Build a Monday-anchored calendar grid for the month containing anchorDate.
// Returns an array of 7-element rows; null = empty cell (leading/trailing day).
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

// ─────────────────────────────────────────────────────────────────────────
// Fixed "today" reference. Same pattern as CertificationsExpiringTile — keeps
// the demo stable regardless of when the page renders.
// ─────────────────────────────────────────────────────────────────────────
const TODAY = new Date()
const TODAY_ISO = localISO(TODAY)

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export type SessionCalendarDisplayMode = "staff" | "client"

interface SessionCalendarProps {
  sessions: Session[]
  defaultView?: "week" | "month"
  displayMode?: SessionCalendarDisplayMode
  showStaffLabel?: boolean
  embedded?: boolean
  monthOnly?: boolean
  inlineDayContent?: boolean
  /** BCBA v3 month grid: count + status + compact chips (no dots). */
  summaryMonthCells?: boolean
  className?: string
  onMonthChange?: (anchorDate: Date) => void
}

export function SessionCalendar({
  sessions,
  defaultView = "week",
  displayMode = "staff",
  showStaffLabel = false,
  embedded = false,
  monthOnly = false,
  inlineDayContent = false,
  summaryMonthCells = false,
  className,
  onMonthChange,
}: SessionCalendarProps) {
  const [view, setView] = useState<"week" | "month">(monthOnly ? "month" : defaultView)
  const [anchorDate, setAnchorDate] = useState<Date>(() =>
    defaultView === "month"
      ? new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
      : mondayOf(TODAY),
  )
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  function notifyMonthChange(date: Date) {
    if (onMonthChange) onMonthChange(date)
  }

  function switchView(next: "week" | "month") {
    if (next === "month") {
      const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
      setAnchorDate(monthStart)
      notifyMonthChange(monthStart)
    } else {
      setAnchorDate(mondayOf(anchorDate))
    }
    setExpandedDay(null)
    setView(next)
  }

  function navigate(delta: number) {
    if (view === "week") {
      setAnchorDate((d) => addDays(d, delta * 7))
    } else {
      setAnchorDate((d) => {
        const next = new Date(d.getFullYear(), d.getMonth() + delta, 1)
        notifyMonthChange(next)
        return next
      })
    }
    setExpandedDay(null)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(anchorDate, i))

  const compactSummaryHeader = embedded && monthOnly && summaryMonthCells

  const controls = (
    <>
      {!compactSummaryHeader && (
      <div className={`flex items-center justify-between gap-2 ${embedded ? "" : "mt-0"}`}>
        {!embedded && <CardTitle>Session Calendar</CardTitle>}
        {embedded && !monthOnly && (
          <span className={`font-medium ${inlineDayContent ? "text-base font-semibold" : "text-sm"}`}>
            {formatMonthYear(anchorDate)}
          </span>
        )}
        {!monthOnly && (
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-1 ml-auto">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      )}
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          compactSummaryHeader ? "mb-2" : "mt-1",
        )}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label={view === "week" ? "Previous week" : "Previous month"}
          className="inline-flex items-center justify-center rounded p-1 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span
          className={cn(
            "text-center font-semibold text-ink",
            compactSummaryHeader ? "text-base" : inlineDayContent ? "text-base" : "text-sm",
          )}
        >
          {view === "week" ? formatWeekRange(anchorDate) : formatMonthYear(anchorDate)}
        </span>
        <button
          onClick={() => navigate(1)}
          aria-label={view === "week" ? "Next week" : "Next month"}
          className="inline-flex items-center justify-center rounded p-1 hover:bg-muted transition-colors"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </>
  )

  const body = (
    <>
      {view === "week" ? (
        <WeekView
          sessions={sessions}
          days={weekDays}
          todayISO={TODAY_ISO}
          displayMode={displayMode}
          showStaffLabel={showStaffLabel}
        />
      ) : (
        <MonthView
          sessions={sessions}
          grid={monthGrid(anchorDate)}
          todayISO={TODAY_ISO}
          expandedDay={expandedDay}
          displayMode={displayMode}
          showStaffLabel={showStaffLabel}
          inlineDayContent={inlineDayContent}
          summaryMonthCells={summaryMonthCells}
          onDayClick={(iso) =>
            setExpandedDay((prev) => (prev === iso ? null : iso))
          }
        />
      )}
    </>
  )

  if (embedded) {
    return (
      <div className={cn(className, summaryMonthCells && "flex flex-col")}>
        {controls}
        <div className={cn(compactSummaryHeader ? "mt-0" : "mt-3")}>{body}</div>
      </div>
    )
  }

  return (
    <Card className={className ?? "w-full max-w-3xl"}>
      <CardHeader className="pb-3">
        {controls}
      </CardHeader>
      <CardContent className="pt-0">
        {body}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Week view — horizontal 7-column grid, Mon first
// ─────────────────────────────────────────────────────────────────────────

// Left-border color keyed by status (visually encodes meaning without text)
const CARD_BORDER: Record<SessionStatus, string> = {
  completed:      "border-l-emerald-500",
  scheduled:      "border-l-blue-500",
  "in-progress":  "border-l-blue-400",
  cancelled:      "border-l-amber-500",
  "no-show":      "border-l-red-500",
}

// Summary strip: "5 sessions · 3 completed · 2 scheduled"
function WeekSummary({ sessions, days }: { sessions: Session[]; days: Date[] }) {
  const weekISOs = new Set(days.map((d) => localISO(d)))
  const week = sessions.filter((s) => weekISOs.has(sessionDay(s)))
  if (week.length === 0) return null

  const counts: Partial<Record<SessionStatus, number>> = {}
  for (const s of week) counts[s.status] = (counts[s.status] ?? 0) + 1

  const ORDER: SessionStatus[] = ["completed", "in-progress", "scheduled", "cancelled", "no-show"]
  const STATUS_LABEL: Record<SessionStatus, string> = {
    completed: "completed",
    "in-progress": "in progress",
    scheduled: "scheduled",
    cancelled: "cancelled",
    "no-show": "no-show",
  }
  const total = week.length
  const parts = [`${total} session${total === 1 ? "" : "s"}`]
  for (const st of ORDER) {
    const n = counts[st]
    if (n) parts.push(`${n} ${STATUS_LABEL[st]}`)
  }

  return (
    <p className="mb-3 text-xs text-muted-foreground">
      {parts.join(" · ")}
    </p>
  )
}

function SessionPersonLine({
  session: s,
  displayMode,
  showStaffLabel,
  dim,
}: {
  session: Session
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
  dim: boolean
}) {
  if (displayMode === "client") {
    return (
      <>
        <div className={`mt-0.5 truncate font-medium ${dim ? "line-through text-muted-foreground" : ""}`}>
          {dim || !s.clientId ? (
            s.clientName
          ) : (
            <Link
              to={"/clients/" + s.clientId}
              className="hover:underline underline-offset-1"
            >
              {s.clientName}
            </Link>
          )}
        </div>
        {showStaffLabel && (
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {s.staffName}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="mt-0.5 truncate text-muted-foreground">
      {dim ? (
        s.staffName
      ) : (
        <Link
          to={s.staffExternalCode ? staffProfilePath(s.staffExternalCode) : "#"}
          className="hover:underline underline-offset-1"
        >
          {s.staffName}
        </Link>
      )}
    </div>
  )
}

// Compact session card for narrow week-grid columns
function HorizontalSessionCard({
  session: s,
  displayMode,
  showStaffLabel,
}: {
  session: Session
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
}) {
  const dim = isMuted(s)
  return (
    <div
      className={`rounded border border-border border-l-2 p-1.5 text-[10px] leading-snug ${CARD_BORDER[s.status]} ${
        dim ? "opacity-55" : ""
      }`}
    >
      <div className="font-mono tabular-nums text-muted-foreground">
        {formatTime(s.time)}
      </div>
      <div className={`mt-0.5 font-semibold leading-tight truncate ${dim ? "line-through" : ""}`}>
        {s.sessionType}
      </div>
      <SessionPersonLine
        session={s}
        displayMode={displayMode}
        showStaffLabel={showStaffLabel}
        dim={dim}
      />
      <div className="mt-1">
        <SessionStatusBadge status={s.status} />
      </div>
    </div>
  )
}

function WeekView({
  sessions,
  days,
  todayISO,
  displayMode,
  showStaffLabel,
}: {
  sessions: Session[]
  days: Date[]
  todayISO: string
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
}) {
  return (
    <div>
      <WeekSummary sessions={sessions} days={days} />
      <div className="grid grid-cols-7 gap-1.5 items-start">
        {days.map((day) => {
          const iso = localISO(day)
          const daySessions = sessionsOnDay(sessions, iso)
          const isToday = iso === todayISO

          return (
            <div key={iso} className="flex flex-col gap-1.5 min-w-0">
              {/* Column header */}
              <div
                className={`border-b pb-1.5 text-center ${
                  isToday ? "border-b-primary border-b-2" : "border-b-border"
                }`}
              >
                <div
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={`text-sm font-bold leading-tight ${
                    isToday ? "text-primary" : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </div>
                {isToday && (
                  <div className="text-[8px] font-medium text-primary uppercase tracking-wider">
                    Today
                  </div>
                )}
              </div>
              {/* Session cards or empty dash */}
              {daySessions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground/25 py-2" aria-hidden="true">
                  —
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {daySessions.map((s) => (
                    <HorizontalSessionCard
                      key={s.id}
                      session={s}
                      displayMode={displayMode}
                      showStaffLabel={showStaffLabel}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Month view — 7-column CSS grid, Mon-start
// Clicking a day with sessions toggles an expanded detail panel below the grid.
// ─────────────────────────────────────────────────────────────────────────

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function shortSessionChipLabel(s: Session, displayMode: SessionCalendarDisplayMode): string {
  if (displayMode === "client") {
    const name = s.clientName.trim()
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return parts
        .map((p) => p[0] ?? "")
        .join("")
        .slice(0, 4)
    }
    return name.length <= 5 ? name : name.slice(0, 4)
  }
  return s.staffName.split(/\s+/)[0] ?? s.staffName
}

function activeDaySessions(daySessions: Session[]): Session[] {
  return daySessions.filter((s) => !isMuted(s))
}

function daySummaryStatus(
  active: Session[],
  dateISO: string,
  todayISO: string,
): "none" | "ok" | "attention" {
  if (active.length === 0) return "none"
  if (active.every((s) => s.status === "completed")) return "ok"
  if (
    dateISO <= todayISO &&
    active.some((s) => s.status === "scheduled" || s.status === "in-progress")
  ) {
    return "attention"
  }
  return "ok"
}

function SummaryMonthDayCell({
  day,
  iso,
  todayISO,
  active,
  displayMode,
  showStaffLabel,
}: {
  day: Date
  iso: string
  todayISO: string
  active: Session[]
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const count = active.length
  const hasData = count > 0
  const isToday = iso === todayISO
  const summaryStatus = daySummaryStatus(active, iso, todayISO)
  const topSessions = active.slice(0, 2)
  const remaining = count - topSessions.length

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const dayLabel = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="relative min-h-[7rem]" ref={rootRef}>
      <button
        type="button"
        onClick={() => hasData && setOpen((prev) => !prev)}
        disabled={!hasData}
        aria-expanded={open}
        aria-label={`${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${count} session${count !== 1 ? "s" : ""}`}
        className={`
          flex min-h-[7rem] w-full flex-col rounded-lg border border-line/80 p-2 text-left transition-colors
          ${open ? "bg-surface-2 ring-1 ring-line" : ""}
          ${isToday ? "border-brand ring-1 ring-brand/25" : ""}
          ${hasData ? "cursor-pointer hover:bg-surface-2/90" : "cursor-default"}
        `}
      >
        <div className="relative inline-block self-start">
          <span
            className={`text-2xl font-bold tabular-nums leading-none ${
              isToday ? "text-brand" : "text-ink"
            }`}
          >
            {day.getDate()}
          </span>
          {open && (
            <div
              role="dialog"
              aria-label={dayLabel}
              onClick={(event) => event.stopPropagation()}
              className="absolute bottom-full right-0 z-50 mb-1.5 w-[min(20rem,calc(100vw-2rem))] max-h-[min(26rem,55vh)] overflow-y-auto rounded-[var(--radius)] border border-line bg-surface p-3 shadow-card"
            >
              <p className="mb-2 text-xs font-semibold text-muted">{dayLabel}</p>
              <div className="space-y-2">
                {active.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    displayMode={displayMode}
                    showStaffLabel={showStaffLabel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {hasData ? (
          <>
            <p
              className={`mt-1.5 text-xs font-semibold tabular-nums leading-tight ${
                summaryStatus === "attention" ? "text-[#C99A3B]" : "text-[#4F6B59]"
              }`}
            >
              {count} session{count !== 1 ? "s" : ""}
            </p>
            <div className="mt-1.5 flex flex-col gap-1">
              {topSessions.map((s) => (
                <span
                  key={s.id}
                  className="truncate rounded-md bg-surface-2 px-1.5 py-1 text-[13px] font-medium tabular-nums text-ink-soft"
                >
                  {shortSessionChipLabel(s, displayMode)} · {formatTime(s.time)}
                </span>
              ))}
              {remaining > 0 && (
                <span className="text-xs font-medium text-muted">+{remaining} more</span>
              )}
            </div>
          </>
        ) : null}
      </button>
    </div>
  )
}

function InlineDaySessionCard({
  session: s,
  displayMode,
  showStaffLabel,
}: {
  session: Session
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
}) {
  const dim = isMuted(s)
  const label =
    displayMode === "client"
      ? s.clientName
      : s.staffName

  return (
    <div
      className={`rounded border border-border border-l-2 px-1 py-0.5 text-xs leading-tight ${CARD_BORDER[s.status]} ${
        dim ? "opacity-55" : ""
      }`}
    >
      <div className="font-mono tabular-nums text-muted-foreground">
        {formatTime(s.time)}
      </div>
      <div className={`truncate font-medium ${dim ? "line-through text-muted-foreground" : ""}`}>
        {dim || displayMode !== "client" || !s.clientId ? (
          label
        ) : (
          <Link
            to={"/clients/" + s.clientId}
            className="hover:underline underline-offset-1"
          >
            {label}
          </Link>
        )}
      </div>
      {showStaffLabel && displayMode === "client" && (
        <div className="truncate text-[11px] text-muted-foreground">{s.staffName}</div>
      )}
    </div>
  )
}

function MonthView({
  sessions,
  grid,
  todayISO,
  expandedDay,
  displayMode,
  showStaffLabel,
  inlineDayContent,
  summaryMonthCells,
  onDayClick,
}: {
  sessions: Session[]
  grid: (Date | null)[][]
  todayISO: string
  expandedDay: string | null
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
  inlineDayContent?: boolean
  summaryMonthCells?: boolean
  onDayClick: (iso: string) => void
}) {
  // Sessions for the currently expanded day (if any).
  const expandedSessions = expandedDay
    ? sessionsOnDay(sessions, expandedDay)
    : []

  // Formatted label for the expanded day — parse as local noon to avoid
  // the UTC-midnight off-by-one that bites West Coast users.
  const expandedLabel = expandedDay
    ? new Date(`${expandedDay}T12:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <div>
      {/* Day-of-week header row */}
      <div className="mb-2 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className={`py-1 text-center font-medium text-muted-foreground ${
              inlineDayContent || summaryMonthCells ? "text-xs sm:text-sm" : "text-[10px]"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — natural height so all week-rows render (no flex clip) */}
      <div className={summaryMonthCells ? "space-y-1.5" : "space-y-0.5"}>
        {grid.map((week, wi) => (
          <div
            key={wi}
            className={summaryMonthCells ? "grid grid-cols-7 gap-1.5" : "grid grid-cols-7 gap-0.5"}
          >
            {week.map((day, di) => {
              if (!day) {
                return (
                  <div
                    key={di}
                    className={
                      summaryMonthCells
                        ? "min-h-[7rem]"
                        : inlineDayContent
                          ? "h-32"
                          : "h-9"
                    }
                    aria-hidden="true"
                  />
                )
              }

              const iso = localISO(day)
              const daySessions = sessionsOnDay(sessions, iso)
              const active = activeDaySessions(daySessions)
              const count = active.length
              const isToday = iso === todayISO
              const isExpanded = expandedDay === iso
              const hasData = count > 0

              if (summaryMonthCells) {
                return (
                  <SummaryMonthDayCell
                    key={iso}
                    day={day}
                    iso={iso}
                    todayISO={todayISO}
                    active={active}
                    displayMode={displayMode}
                    showStaffLabel={showStaffLabel}
                  />
                )
              }

              if (inlineDayContent) {
                return (
                  <div
                    key={iso}
                    className={`
                      flex h-32 flex-col rounded-md border p-1 text-xs
                      ${isToday ? "border-primary ring-1 ring-primary" : "border-border/60"}
                    `}
                  >
                    <span
                      className={`text-sm font-semibold leading-none ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {hasData ? (
                      <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                        {daySessions.map((s) => (
                          <InlineDaySessionCard
                            key={s.id}
                            session={s}
                            displayMode={displayMode}
                            showStaffLabel={showStaffLabel}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1" aria-hidden="true" />
                    )}
                  </div>
                )
              }

              return (
                <button
                  key={iso}
                  onClick={() => hasData && onDayClick(iso)}
                  disabled={!hasData}
                  aria-label={`${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${count} session${count !== 1 ? "s" : ""}`}
                  className={`
                    relative flex h-9 flex-col items-center justify-center gap-0.5 rounded-md p-1 text-xs
                    transition-colors
                    ${isExpanded ? "bg-muted ring-1 ring-border" : ""}
                    ${isToday ? "ring-1 ring-primary" : ""}
                    ${hasData ? "cursor-pointer hover:bg-muted/50" : "cursor-default"}
                  `}
                >
                  <span
                    className={`text-[11px] font-medium leading-none ${
                      isToday
                        ? "text-primary"
                        : hasData
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {hasData && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                        <div
                          key={i}
                          className="size-1.5 rounded-full bg-primary/50"
                        />
                      ))}
                      {count > 3 && (
                        <span className="text-[9px] text-muted-foreground leading-none">
                          +{count - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Expanded day panel — full detail on click (not used in BCBA summary grid) */}
      {!summaryMonthCells && !inlineDayContent && expandedDay && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">
            {expandedLabel}
          </p>
          {expandedSessions.length === 0 ? (
            <p className="pl-1 text-xs text-muted-foreground/50">
              No sessions scheduled
            </p>
          ) : (
            <div className="space-y-2">
              {expandedSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  displayMode={displayMode}
                  showStaffLabel={showStaffLabel}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Session card — shared by week view and expanded month day panel.
//
// Cancelled / no-show sessions are shown but visually de-emphasized:
//   - Card background shifts to muted
//   - Session type gets line-through to signal "didn't happen"
//   - Time + staff name are muted
//   - Status badge remains fully legible (it's the explanation for the muting)
//   - Staff link is disabled (pointer-events-none) since navigating to a
//     cancelled session's staff page is rarely the intent
// ─────────────────────────────────────────────────────────────────────────

function SessionCard({
  session: s,
  displayMode,
  showStaffLabel,
}: {
  session: Session
  displayMode: SessionCalendarDisplayMode
  showStaffLabel: boolean
}) {
  const dim = isMuted(s)
  const dur = formatDuration(s.durationMinutes)

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-xs ${
        dim ? "bg-muted/40" : "bg-background"
      }`}
    >
      <div className={`min-w-0 flex-1 ${dim ? "opacity-60" : ""}`}>
        <div className="flex items-baseline gap-1.5 font-mono tabular-nums text-[11px] text-muted-foreground">
          <span>{formatTime(s.time)}</span>
          {dur && (
            <span className="font-sans not-italic">· {dur}</span>
          )}
        </div>
        {displayMode === "client" ? (
          <>
            <div className={`mt-0.5 text-sm font-medium truncate ${dim ? "line-through text-muted-foreground" : ""}`}>
              {dim || !s.clientId ? (
                s.clientName
              ) : (
                <Link
                  to={"/clients/" + s.clientId}
                  className="hover:underline underline-offset-2"
                >
                  {s.clientName}
                </Link>
              )}
            </div>
            {showStaffLabel && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {s.staffName}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className={`mt-0.5 text-sm font-medium truncate ${
                dim ? "line-through text-muted-foreground" : ""
              }`}
            >
              {s.sessionType}
            </div>
            <div className="mt-0.5 truncate text-muted-foreground">
              {dim ? (
                s.staffName
              ) : (
                <Link
                  to={s.staffExternalCode ? staffProfilePath(s.staffExternalCode) : "#"}
                  className="hover:underline underline-offset-2"
                >
                  {s.staffName}
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0">
        <SessionStatusBadge status={s.status} />
      </div>
    </div>
  )
}
