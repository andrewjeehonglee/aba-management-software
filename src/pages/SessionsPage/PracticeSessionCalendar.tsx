import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import {
  chipColors,
  chipTimeLabel,
  counterpartLabel,
  DOW_LABELS,
  formatMonthYear,
  legendEntries,
  localISO,
  monthGrid,
  type CalendarColorMode,
} from "@/pages/SessionsPage/sessionsCalendarUtils"

const BAR_HEIGHT = "h-2"

interface PracticeSessionCalendarProps {
  sessions: SessionRecord[]
  sessionNotes: SessionNoteRecord[]
  viewKind: "client" | "staff"
  colorMode: CalendarColorMode
  onColorModeChange: (mode: CalendarColorMode) => void
  anchorDate: Date
  onAnchorDateChange: (date: Date) => void
  loading?: boolean
  empty?: boolean
  showColorBy?: boolean
}

function ColorByToggle({
  colorMode,
  onChange,
}: {
  colorMode: CalendarColorMode
  onChange: (mode: CalendarColorMode) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[12px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: P.faint }}
      >
        Color by
      </span>
      <div
        className="inline-flex items-center gap-0.5 rounded-full p-1"
        style={{ backgroundColor: P.inset }}
      >
        {(
          [
            { id: "status" as const, label: "Status" },
            { id: "type" as const, label: "Type" },
          ] as const
        ).map(({ id, label }) => {
          const active = colorMode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                active ? "shadow-sm" : "hover:opacity-80",
              )}
              style={{
                backgroundColor: active ? P.card : "transparent",
                color: active ? P.sageInk : P.soft,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SessionChip({
  session,
  viewKind,
  colorMode,
  todayISO,
  notesBySessionId,
}: {
  session: SessionRecord
  viewKind: "client" | "staff"
  colorMode: CalendarColorMode
  todayISO: string
  notesBySessionId: Map<string, SessionNoteRecord>
}) {
  const colors = chipColors(session, colorMode, todayISO, notesBySessionId)
  const time = chipTimeLabel(session)
  const counterpart = counterpartLabel(session, viewKind)

  return (
    <Link
      to={`/session/${session.id}`}
      className="block w-full truncate rounded-md border-l-[3px] px-1.5 py-1 text-[13px] leading-snug hover:opacity-90"
      style={{
        backgroundColor: colors.bg,
        color: colors.ink,
        borderLeftColor: colors.border,
      }}
      title={`${time} ${counterpart}`}
    >
      <span className="tabular-nums">{time}</span> {counterpart}
    </Link>
  )
}

export function PracticeSessionCalendar({
  sessions,
  sessionNotes,
  viewKind,
  colorMode,
  onColorModeChange,
  anchorDate,
  onAnchorDateChange,
  loading = false,
  empty = false,
  showColorBy = false,
}: PracticeSessionCalendarProps) {
  const todayISO = localISO(new Date())
  const notesBySessionId = useMemo(
    () => new Map(sessionNotes.map((n) => [n.session_id, n])),
    [sessionNotes],
  )
  const grid = monthGrid(anchorDate)

  function navigate(delta: number) {
    onAnchorDateChange(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + delta, 1))
  }

  function sessionsOnDay(iso: string) {
    return sessions
      .filter((s) => s.time.slice(0, 10) === iso)
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  function renderDayCell(day: Date) {
    const iso = localISO(day)
    const daySessions = sessionsOnDay(iso)
    const isToday = iso === todayISO
    const hasScheduled = daySessions.some(
      (s) => s.status === "scheduled" || s.status === "in-progress",
    )

    return (
      <div
        key={iso}
        className="relative flex h-full min-h-[52px] items-center justify-center rounded-md"
        style={{
          backgroundColor: hasScheduled ? P.calScheduledTint : undefined,
          boxShadow: isToday ? `inset 0 0 0 2px ${P.sage}` : undefined,
        }}
      >
        <span
          className="text-[18px] font-semibold tabular-nums leading-none"
          style={{ color: isToday ? P.sageInk : daySessions.length ? P.ink : P.faint }}
        >
          {day.getDate()}
        </span>
        {daySessions.length > 0 && (
          <div className="absolute inset-x-1 bottom-1 space-y-0.5">
            {daySessions.map((session) => (
              <SessionChip
                key={session.id}
                session={session}
                viewKind={viewKind}
                colorMode={colorMode}
                todayISO={todayISO}
                notesBySessionId={notesBySessionId}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius, boxShadow: "0 1px 2px rgba(44,41,36,0.04)" }}
    >
      {showColorBy && (
        <div className="flex shrink-0 justify-end">
          <ColorByToggle colorMode={colorMode} onChange={onColorModeChange} />
        </div>
      )}

      {empty ? (
        <div
          className="mt-6 flex flex-1 flex-col items-center justify-center rounded-[14px] px-6 py-16 text-center"
          style={{ backgroundColor: P.inset }}
        >
          <p className="text-[18px] font-semibold" style={{ color: P.ink }}>
            Select a client or staff member to view their schedule.
          </p>
        </div>
      ) : loading ? (
        <p className="mt-8 flex-1 animate-pulse text-[15px]" style={{ color: P.faint }}>
          Loading sessions…
        </p>
      ) : (
        <>
          <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded p-1 transition-colors hover:opacity-70"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" style={{ color: P.soft }} />
            </button>
            <span className="text-[18px] font-semibold" style={{ color: P.ink }}>
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

          <div className="mt-3 grid shrink-0 grid-cols-7">
            {DOW_LABELS.map((d) => (
              <div
                key={d}
                className="py-1.5 text-center text-[15px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: P.faint }}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 flex min-h-0 flex-1 flex-col space-y-1 overflow-hidden">
            {grid.map((week, wi) => (
              <div key={wi} className="grid min-h-0 flex-1 grid-cols-7 gap-1">
                {week.map((day, di) =>
                  day
                    ? renderDayCell(day)
                    : (
                      <div
                        key={di}
                        className="min-h-[52px] h-full"
                        aria-hidden="true"
                      />
                    ),
                )}
              </div>
            ))}
          </div>

          <div
            className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-[14px]"
            style={{ borderColor: P.rule, color: P.soft }}
          >
            {legendEntries(colorMode).map(({ color, label }) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span
                  className={`inline-block ${BAR_HEIGHT} w-5 rounded-full`}
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
