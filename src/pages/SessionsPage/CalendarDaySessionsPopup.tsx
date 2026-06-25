import { useEffect } from "react"
import { X } from "lucide-react"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import {
  chipColors,
  chipTimeLabel,
  counterpartLabel,
  sessionChipStatus,
  STATUS_CHIP,
  type CalendarColorMode,
} from "@/pages/SessionsPage/sessionsCalendarUtils"
import { PANEL_SURFACE } from "@/pages/SessionsPage/sessionDetailUtils"

interface CalendarDaySessionsPopupProps {
  open: boolean
  dayIso: string
  sessions: SessionRecord[]
  viewKind: "client" | "staff"
  todayISO: string
  notesBySessionId: Map<string, SessionNoteRecord>
  onClose: () => void
  onSessionSelect?: (session: SessionRecord) => void
}

function formatPopupDayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export function CalendarDaySessionsPopup({
  open,
  dayIso,
  sessions,
  viewKind,
  todayISO,
  notesBySessionId,
  onClose,
  onSessionSelect,
}: CalendarDaySessionsPopupProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const countLabel = `${sessions.length} session${sessions.length === 1 ? "" : "s"}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(44,41,36,0.28)]"
        aria-label="Close day sessions"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={formatPopupDayLabel(dayIso)}
        className="relative z-10 flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-[14px] shadow-[0_8px_32px_rgba(44,41,36,0.16)]"
        style={{ backgroundColor: PANEL_SURFACE }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: P.rule }}
        >
          <div>
            <h2 className="text-[17px] font-bold leading-snug" style={{ color: P.ink }}>
              {formatPopupDayLabel(dayIso)}
            </h2>
            <p className="mt-0.5 text-[14px]" style={{ color: P.soft }}>
              {countLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-opacity hover:opacity-70"
            aria-label="Close"
          >
            <X className="size-5" style={{ color: P.soft }} />
          </button>
        </div>

        <div className="max-h-[min(24rem,60vh)] space-y-1.5 overflow-y-auto px-4 py-3">
          {sessions.map((session) => {
            const chipStatus = sessionChipStatus(session, todayISO, notesBySessionId)
            const colors = chipColors(session, "status" as CalendarColorMode, todayISO, notesBySessionId)
            const time = chipTimeLabel(session)
            const counterpart = counterpartLabel(session, viewKind)
            const statusLabel = STATUS_CHIP[chipStatus].label

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSessionSelect?.(session)}
                className="flex w-full min-w-0 items-center gap-2 rounded-md border-l-[3px] px-2.5 py-2 text-left transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: colors.bg,
                  borderLeftColor: colors.border,
                }}
              >
                <span
                  className="shrink-0 text-[13px] font-bold tabular-nums"
                  style={{ color: P.ink }}
                >
                  {time}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: P.ink }}>
                  {counterpart}
                </span>
                <span
                  className="shrink-0 text-[12px] font-semibold"
                  style={{ color: colors.border }}
                >
                  {statusLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
