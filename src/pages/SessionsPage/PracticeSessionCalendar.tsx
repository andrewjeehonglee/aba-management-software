import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import {
  chipColors,
  chipClientShortLabel,
  chipTimeLabel,
  chipTypeShortLabel,
  counterpartLabel,
  DOW_LABELS,
  formatMonthYear,
  legendEntries,
  localISO,
  monthGrid,
  type CalendarColorMode,
} from "@/pages/SessionsPage/sessionsCalendarUtils"
import { sessionPanelStatusRingColor } from "@/pages/SessionsPage/sessionDetailUtils"
import { CalendarDaySessionsPopup } from "@/pages/SessionsPage/CalendarDaySessionsPopup"

const BAR_HEIGHT = "h-2"
const VISIBLE_CHIP_CAP = 3
const DAY_CELL_H = "h-[98px]"
const DAY_CELL_MIN_H = "min-h-[98px]"
/** Uniform dashboard chip width — cell inner width minus equal side inset. */
const DASHBOARD_CHIP_BAR_CLASS = "w-[calc(100%-6px)] max-w-[calc(100%-6px)]"

function ChipSegmentDivider() {
  return (
    <span
      className="mx-1 inline-block h-[0.75em] w-px shrink-0 align-middle"
      style={{ backgroundColor: P.faint }}
      aria-hidden
    />
  )
}

interface PracticeSessionCalendarProps {
  sessions: SessionRecord[]
  sessionNotes: SessionNoteRecord[]
  viewKind: "client" | "staff"
  colorMode: CalendarColorMode
  onColorModeChange: (mode: CalendarColorMode) => void
  anchorDate: Date
  onAnchorDateChange: (date: Date) => void
  selectedSessionId?: string | null
  onSessionSelect?: (session: SessionRecord) => void
  loading?: boolean
  empty?: boolean
  showColorBy?: boolean
  /** Dashboard chips: time · client · type. Default shows counterpart by viewKind. */
  chipLabelMode?: "counterpart" | "client-type"
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
  chipLabelMode,
  todayISO,
  notesBySessionId,
  selected,
  onSelect,
}: {
  session: SessionRecord
  viewKind: "client" | "staff"
  colorMode: CalendarColorMode
  chipLabelMode: "counterpart" | "client-type"
  todayISO: string
  notesBySessionId: Map<string, SessionNoteRecord>
  selected: boolean
  onSelect?: (session: SessionRecord) => void
}) {
  const colors = chipColors(session, colorMode, todayISO, notesBySessionId)
  const time = chipTimeLabel(session)
  const ringColor = sessionPanelStatusRingColor(session, todayISO, notesBySessionId)
  const clientShort = chipClientShortLabel(session)
  const typeLabel = chipTypeShortLabel(session)
  const isDashboardChip = chipLabelMode === "client-type"
  const title = isDashboardChip
    ? `${time} | ${clientShort} | ${typeLabel}`
    : `${time} ${counterpartLabel(session, viewKind)}`

  return (
    <button
      type="button"
      onClick={() => onSelect?.(session)}
      className={cn(
        "block truncate rounded-md border-l-[3px] px-1 py-0.5 text-left text-[12px] leading-tight hover:opacity-90",
        isDashboardChip ? DASHBOARD_CHIP_BAR_CLASS : "inline-block max-w-full",
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.ink,
        borderLeftColor: colors.border,
        ...(selected ? { boxShadow: `0 0 0 2px ${ringColor}` } : {}),
      }}
      title={title}
      aria-pressed={selected}
    >
      {isDashboardChip ? (
        <span className="flex min-w-0 items-center truncate">
          <span className="shrink-0 font-bold tabular-nums">{time}</span>
          <ChipSegmentDivider />
          <span className="min-w-0 truncate">{clientShort}</span>
          <ChipSegmentDivider />
          <span className="shrink-0" style={{ color: P.faint }}>
            {typeLabel}
          </span>
        </span>
      ) : (
        <>
          <span className="font-bold tabular-nums">{time}</span>{" "}
          <span>{counterpartLabel(session, viewKind)}</span>
        </>
      )}
    </button>
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
  selectedSessionId = null,
  onSessionSelect,
  loading = false,
  empty = false,
  showColorBy = false,
  chipLabelMode = "counterpart",
}: PracticeSessionCalendarProps) {
  const todayISO = localISO(new Date())
  const [popupDayIso, setPopupDayIso] = useState<string | null>(null)
  const notesBySessionId = useMemo(
    () => new Map(sessionNotes.map((n) => [n.session_id, n])),
    [sessionNotes],
  )
  const grid = monthGrid(anchorDate)

  function navigate(delta: number) {
    setPopupDayIso(null)
    onAnchorDateChange(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + delta, 1))
  }

  function closeDayPopup() {
    setPopupDayIso(null)
  }

  function handlePopupSessionSelect(session: SessionRecord) {
    onSessionSelect?.(session)
    closeDayPopup()
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
    const hiddenCount = Math.max(0, daySessions.length - VISIBLE_CHIP_CAP)
    const displayedSessions = daySessions.slice(0, VISIBLE_CHIP_CAP)

    return (
      <div
        key={iso}
        className={cn(
          "flex flex-col overflow-hidden rounded-md p-1",
          DAY_CELL_H,
          DAY_CELL_MIN_H,
        )}
        style={{
          backgroundColor: hasScheduled ? P.calScheduledTint : undefined,
          boxShadow: isToday ? `inset 0 0 0 2px ${P.sage}` : undefined,
        }}
      >
        <span
          className="mb-0.5 w-full shrink-0 text-center text-[16px] font-semibold tabular-nums leading-none"
          style={{ color: isToday ? P.sageInk : daySessions.length ? P.ink : P.faint }}
        >
          {day.getDate()}
        </span>
        {daySessions.length > 0 && (
          <div
            className={cn(
              "flex min-h-0 w-full flex-1 flex-col gap-px overflow-hidden",
              chipLabelMode === "client-type" ? "items-center" : "items-start",
            )}
          >
            {displayedSessions.map((session) => (
              <SessionChip
                key={session.id}
                session={session}
                viewKind={viewKind}
                colorMode={colorMode}
                chipLabelMode={chipLabelMode}
                todayISO={todayISO}
                notesBySessionId={notesBySessionId}
                selected={session.id === selectedSessionId}
                onSelect={onSessionSelect}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setPopupDayIso(iso)}
                className={cn(
                  "shrink-0 truncate py-px text-[11px] font-semibold leading-tight hover:opacity-80",
                  chipLabelMode === "client-type"
                    ? cn(DASHBOARD_CHIP_BAR_CLASS, "text-center")
                    : "px-0.5 text-left",
                )}
                style={{ color: P.soft }}
                aria-haspopup="dialog"
              >
                +{hiddenCount} more
              </button>
            )}
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
                        className={cn(DAY_CELL_H, DAY_CELL_MIN_H)}
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

      {popupDayIso && (
        <CalendarDaySessionsPopup
          open
          dayIso={popupDayIso}
          sessions={sessionsOnDay(popupDayIso)}
          viewKind={viewKind}
          todayISO={todayISO}
          notesBySessionId={notesBySessionId}
          onClose={closeDayPopup}
          onSessionSelect={onSessionSelect ? handlePopupSessionSelect : undefined}
        />
      )}
    </section>
  )
}
