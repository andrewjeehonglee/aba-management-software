import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import {
  chipColors,
  chipTimeLabel,
  counterpartLabel,
  DOW_LABELS,
  formatMonthYear,
  legendEntries,
  localISO,
  MAX_VISIBLE_CHIPS,
  monthGrid,
  type CalendarColorMode,
} from "@/pages/SessionsPage/sessionsCalendarUtils"

interface PracticeSessionCalendarProps {
  sessions: SessionRecord[]
  sessionNotes: SessionNoteRecord[]
  viewKind: "client" | "staff"
  colorMode: CalendarColorMode
  anchorDate: Date
  onAnchorDateChange: (date: Date) => void
  loading?: boolean
  empty?: boolean
  selectedLabel?: string
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
      className="block truncate rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] leading-tight hover:opacity-90"
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
  anchorDate,
  onAnchorDateChange,
  loading = false,
  empty = false,
  selectedLabel,
}: PracticeSessionCalendarProps) {
  const todayISO = localISO(new Date())
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const notesBySessionId = useMemo(
    () => new Map(sessionNotes.map((n) => [n.session_id, n])),
    [sessionNotes],
  )
  const grid = monthGrid(anchorDate)

  function navigate(delta: number) {
    onAnchorDateChange(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + delta, 1))
    setExpandedDay(null)
  }

  function sessionsOnDay(iso: string) {
    return sessions
      .filter((s) => s.time.slice(0, 10) === iso)
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  const expandedSessions = expandedDay ? sessionsOnDay(expandedDay) : []
  const expandedLabel = expandedDay
    ? new Date(`${expandedDay}T12:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius, boxShadow: "0 1px 2px rgba(44,41,36,0.04)" }}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={TILE_TITLE} style={{ color: P.ink }}>
            Schedule
          </h2>
          {selectedLabel && (
            <p className="mt-1 text-[15px]" style={{ color: P.soft }}>
              {selectedLabel}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded p-1 transition-colors hover:opacity-70"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" style={{ color: P.soft }} />
          </button>
          <span className="min-w-[9rem] text-center text-[18px] font-semibold" style={{ color: P.ink }}>
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
      </div>

      {empty ? (
        <div
          className="mt-8 flex flex-1 flex-col items-center justify-center rounded-[14px] px-6 py-16 text-center"
          style={{ backgroundColor: P.inset }}
        >
          <p className="text-[18px] font-semibold" style={{ color: P.ink }}>
            Select a client or staff member to view their schedule.
          </p>
          <p className="mt-2 max-w-md text-[15px]" style={{ color: P.soft }}>
            Choose someone from the panel on the left to load their sessions for this month.
          </p>
        </div>
      ) : loading ? (
        <p className="mt-8 flex-1 animate-pulse text-[15px]" style={{ color: P.faint }}>
          Loading sessions…
        </p>
      ) : (
        <>
          <div className="mt-4 grid shrink-0 grid-cols-7">
            {DOW_LABELS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[13px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: P.faint }}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 min-h-0 flex-1 space-y-1.5 overflow-y-auto profile-scroll">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {week.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={di}
                        className="min-h-[7.5rem] rounded-lg"
                        style={{ backgroundColor: `${P.inset}88` }}
                        aria-hidden
                      />
                    )
                  }

                  const iso = localISO(day)
                  const daySessions = sessionsOnDay(iso)
                  const isToday = iso === todayISO
                  const isExpanded = expandedDay === iso
                  const visible = daySessions.slice(0, MAX_VISIBLE_CHIPS)
                  const overflow = daySessions.length - visible.length

                  return (
                    <div
                      key={iso}
                      className="flex min-h-[7.5rem] flex-col rounded-lg p-1.5"
                      style={{
                        backgroundColor: P.inset,
                        boxShadow: isToday ? `inset 0 0 0 2px ${P.sage}` : undefined,
                        outline: isExpanded ? `2px solid ${P.sage}` : undefined,
                      }}
                    >
                      <span
                        className="mb-1 text-[14px] font-semibold tabular-nums"
                        style={{ color: isToday ? P.sageInk : P.ink }}
                      >
                        {day.getDate()}
                      </span>
                      <div className="min-h-0 flex-1 space-y-0.5">
                        {visible.map((session) => (
                          <SessionChip
                            key={session.id}
                            session={session}
                            viewKind={viewKind}
                            colorMode={colorMode}
                            todayISO={todayISO}
                            notesBySessionId={notesBySessionId}
                          />
                        ))}
                        {overflow > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedDay(isExpanded ? null : iso)}
                            className="w-full rounded-md px-1 py-0.5 text-left text-[11px] font-medium hover:opacity-80"
                            style={{ color: P.soft }}
                          >
                            +{overflow} more
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {expandedDay && expandedSessions.length > 0 && (
            <div
              className="mt-4 shrink-0 rounded-[14px] border p-4"
              style={{ borderColor: P.rule, backgroundColor: P.inset }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold" style={{ color: P.ink }}>
                  {expandedLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedDay(null)}
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: P.soft }}
                >
                  Close
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {expandedSessions.map((session) => {
                  const colors = chipColors(session, colorMode, todayISO, notesBySessionId)
                  const counterpart = counterpartLabel(session, viewKind)
                  return (
                    <li key={session.id}>
                      <div
                        className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <Link
                          to={`/session/${session.id}`}
                          className="text-[15px] font-medium tabular-nums hover:underline"
                          style={{ color: colors.ink }}
                        >
                          {chipTimeLabel(session)} · {counterpart}
                        </Link>
                        {viewKind === "client" && session.staffExternalCode && (
                          <Link
                            to={staffProfilePath(session.staffExternalCode)}
                            className="text-[13px] hover:underline"
                            style={{ color: P.soft }}
                          >
                            {session.staffName}
                          </Link>
                        )}
                        {viewKind === "staff" && session.clientCode && (
                          <Link
                            to={clientProfilePath(session.clientCode)}
                            className="text-[13px] hover:underline"
                            style={{ color: P.soft }}
                          >
                            {session.clientCode}
                          </Link>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div
            className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-[14px]"
            style={{ borderColor: P.rule, color: P.soft }}
          >
            {legendEntries(colorMode).map(({ color, label }) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2 w-5 rounded-full"
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
