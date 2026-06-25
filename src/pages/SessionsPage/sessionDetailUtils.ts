import {
  classifyNoteBucket,
  isCompleteSessionNote,
  overdueNoteDaysPastDeadline,
  pendingNoteDaysUntilDeadline,
  type StaffSessionRow,
} from "@/lib/notesStatus"
import { getCurrentPayPeriod } from "@/lib/payPeriod"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { PRACTICE_TIMEZONE } from "@/lib/sessions"
import type { SessionNoteRecord, SessionRecord } from "@/lib/supabase"
import { resolveRosterStaffRole, staffRoleHeaderLabel } from "@/lib/staffRole"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import {
  normalizeSessionType,
  sessionChipStatus,
  STATUS_CHIP,
  type SessionChipStatus,
} from "@/pages/SessionsPage/sessionsCalendarUtils"

export const PANEL_SURFACE = "#F5F1EA"

const PILL_CONFIG: Record<
  SessionChipStatus,
  { label: string; color: string; bg: string }
> = {
  complete: { label: "Complete", color: P.calComplete, bg: "#E4F0E7" },
  "note-overdue": { label: "Note due", color: P.calNoteDue, bg: P.amberBg },
  cancelled: { label: "Cancelled", color: P.calCancelled, bg: "#F5D5CE" },
  scheduled: { label: "Scheduled", color: P.calScheduled, bg: P.calScheduledTint },
}

const TYPE_LABEL: Record<ReturnType<typeof normalizeSessionType>, string> = {
  direct: "Direct",
  indirect: "Indirect",
  supervision: "Supervision",
}

export function formatSessionPanelDateTime(isoTime: string): string {
  const d = new Date(isoTime)
  if (Number.isNaN(d.getTime())) return "—"

  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: PRACTICE_TIMEZONE,
  })
  const monthDay = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: PRACTICE_TIMEZONE,
  })
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: PRACTICE_TIMEZONE,
  })

  return `${weekday}, ${monthDay} · ${time}`
}

export function sessionPanelPill(
  session: SessionRecord,
  todayISO: string,
  notesBySessionId: Map<string, SessionNoteRecord>,
) {
  const status = sessionChipStatus(session, todayISO, notesBySessionId)
  return { status, ...PILL_CONFIG[status] }
}

export function sessionPanelStatusRingColor(
  session: SessionRecord,
  todayISO: string,
  notesBySessionId: Map<string, SessionNoteRecord>,
): string {
  const status = sessionChipStatus(session, todayISO, notesBySessionId)
  return STATUS_CHIP[status].border
}

export function sessionClientPath(session: SessionRecord): string {
  return clientProfilePath(session.clientCode ?? session.clientId)
}

export function sessionStaffPath(session: SessionRecord): string {
  if (session.staffExternalCode) {
    return staffProfilePath(session.staffExternalCode)
  }
  return staffProfilePath(session.staffId)
}

export function sessionStaffLabel(session: SessionRecord): string {
  const role = staffRoleHeaderLabel(
    resolveRosterStaffRole(session.staffExternalCode, session.staffRole),
  )
  return `${session.staffName} · ${role}`
}

export function sessionTypeLabel(session: SessionRecord): string {
  return TYPE_LABEL[normalizeSessionType(session.sessionType)]
}

export interface SessionNoteFieldDisplay {
  text: string
  color: string
  clickable: boolean
  href?: string
}

export function sessionNoteFieldDisplay(
  session: SessionRecord,
  note: SessionNoteRecord | undefined,
  staffSessions: StaffSessionRow[],
  todayISO: string,
  now: Date = new Date(),
): SessionNoteFieldDisplay {
  const chipStatus = sessionChipStatus(
    session,
    todayISO,
    note ? new Map([[session.id, note]]) : new Map(),
  )
  const notePath = `/session/${session.id}`

  if (chipStatus === "cancelled") {
    return { text: "Not applicable", color: P.faint, clickable: false }
  }

  if (chipStatus === "scheduled") {
    return { text: "Not due yet", color: P.faint, clickable: false }
  }

  if (isCompleteSessionNote(note)) {
    return { text: "Complete", color: P.sageInk, clickable: true, href: notePath }
  }

  const payPeriod = getCurrentPayPeriod(now)
  const bucket = classifyNoteBucket(
    session.time,
    session.staffId,
    staffSessions,
    now,
    payPeriod.end,
  )

  if (bucket === "missing") {
    const days = pendingNoteDaysUntilDeadline(
      session.time,
      session.staffId,
      staffSessions,
      now,
    )
    const dayWord = days === 1 ? "day" : "days"
    return {
      text: `Pending · due in ${days} ${dayWord}`,
      color: P.amberInk,
      clickable: false,
    }
  }

  const days = overdueNoteDaysPastDeadline(
    session.time,
    session.staffId,
    staffSessions,
    now,
  )
  const dayWord = days === 1 ? "day" : "days"
  return {
    text: `Overdue · ${days} ${dayWord} past deadline`,
    color: P.cancel,
    clickable: true,
    href: notePath,
  }
}
