import { useEffect } from "react"
import { Link } from "react-router-dom"
import { X } from "lucide-react"
import type { StaffSessionRow } from "@/lib/notesStatus"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import {
  formatSessionPanelDateTime,
  PANEL_SURFACE,
  sessionClientPath,
  sessionNoteFieldDisplay,
  sessionPanelPill,
  sessionStaffLabel,
  sessionStaffPath,
  sessionTypeLabel,
} from "@/pages/SessionsPage/sessionDetailUtils"
import { localISO } from "@/pages/SessionsPage/sessionsCalendarUtils"

const FIELD_LABEL =
  "text-[11px] font-bold uppercase tracking-[0.08em]"

interface SessionDetailPanelProps {
  session: SessionRecord
  note: SessionNoteRecord | undefined
  staffSessions: StaffSessionRow[]
  onClose: () => void
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className={FIELD_LABEL} style={{ color: P.faint }}>
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export function SessionDetailPanel({
  session,
  note,
  staffSessions,
  onClose,
}: SessionDetailPanelProps) {
  const todayISO = localISO(new Date())
  const pill = sessionPanelPill(session, todayISO, note ? new Map([[session.id, note]]) : new Map())
  const noteField = sessionNoteFieldDisplay(session, note, staffSessions, todayISO)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <aside
      role="dialog"
      aria-label="Session details"
      className="absolute inset-y-0 right-0 z-20 flex w-[396px] flex-col border-l shadow-[-4px_0_24px_rgba(44,41,36,0.08)]"
      style={{
        backgroundColor: PANEL_SURFACE,
        borderColor: P.rule,
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{
            backgroundColor: pill.bg,
            color: pill.color,
          }}
        >
          {pill.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 transition-opacity hover:opacity-70"
          aria-label="Close session details"
        >
          <X className="size-5" style={{ color: P.soft }} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
        <div>
          <Link
            to={sessionClientPath(session)}
            className="text-[22px] font-bold leading-snug hover:underline underline-offset-2"
            style={{ color: P.ink }}
          >
            {session.clientName}
          </Link>
          <p className="mt-2 text-[15px]" style={{ color: P.soft }}>
            {formatSessionPanelDateTime(session.time)}
          </p>
        </div>

        <hr style={{ borderColor: P.rule }} />

        <DetailField label="Staff">
          <Link
            to={sessionStaffPath(session)}
            className="text-[15px] font-medium hover:underline underline-offset-2"
            style={{ color: P.ink }}
          >
            {sessionStaffLabel(session)}
          </Link>
        </DetailField>

        <DetailField label="Type">
          <p className="text-[15px] font-medium" style={{ color: P.ink }}>
            {sessionTypeLabel(session)}
          </p>
        </DetailField>

        <DetailField label="Note">
          {noteField.clickable && noteField.href ? (
            <Link
              to={noteField.href}
              className="text-[15px] font-medium hover:underline underline-offset-2"
              style={{ color: noteField.color }}
            >
              {noteField.text}
            </Link>
          ) : (
            <p className="text-[15px] font-medium" style={{ color: noteField.color }}>
              {noteField.text}
            </p>
          )}
        </DetailField>
      </div>
    </aside>
  )
}
