import { getCurrentCalendarMonth } from "@/lib/payPeriod"
import { isCompleteSessionNote } from "@/lib/notesStatus"
import { isStaffFlagged } from "@/lib/staff"
import { supabase } from "@/lib/supabase"

/** Swap when session duration column lands on `sessions`. */
export const DEFAULT_SESSION_HOURS = 1

function teamLabel(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.startsWith("Team") ? raw : `Team ${raw}`
}

interface PayPeriodSessionRow {
  id: string
  staff_id: string
  session_type: string
  status: string
  staff: { full_name: string; team: string } | null
}

interface SessionNoteRow {
  session_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
}

export type SessionHoursBucket = "direct" | "indirect" | "cancellation" | "exclude"

export interface ClassifySessionInput {
  status: string
  sessionType: string
  hasCompleteNote: boolean
}

/** Pure classification — unit-testable without Supabase. */
export function classifySessionHours(input: ClassifySessionInput): SessionHoursBucket {
  const { status, sessionType, hasCompleteNote } = input

  if (status === "cancelled" || status === "no-show") {
    return "cancellation"
  }

  if (status !== "completed") {
    return "exclude"
  }

  if (!hasCompleteNote) {
    return "exclude"
  }

  if (sessionType === "direct") {
    return "direct"
  }

  if (sessionType === "indirect" || sessionType === "supervision") {
    return "indirect"
  }

  // Unknown session types: log-safe fallback to indirect when payable.
  return "indirect"
}

export interface StaffHoursRow {
  staffId: string
  staffName: string
  staffTeam: string
  directHours: number
  indirectHours: number
  cancellationHours: number
  totalHours: number
  cancelledSessionCount: number
  directPct: number
  flagged: boolean
}

export interface StaffHoursSummary {
  monthLabel: string
  byStaff: StaffHoursRow[]
}

type MutableStaffHoursRow = Omit<StaffHoursRow, "totalHours" | "directPct" | "flagged">

function finalizeRow(row: MutableStaffHoursRow): StaffHoursRow {
  const billableHours = row.directHours + row.indirectHours
  const directPct = billableHours > 0 ? row.directHours / billableHours : 0
  return {
    ...row,
    totalHours: billableHours,
    directPct,
    flagged: isStaffFlagged({
      name: row.staffName,
      totalHours: billableHours,
      directHours: row.directHours,
      indirectHours: row.indirectHours,
      cancellationHours: 0,
      role: "Technician",
      hireDate: "",
      certification: "",
      team: row.staffTeam,
    }),
  }
}

export async function getStaffHoursByMonth(
  now: Date = new Date(),
  options?: { staffIds?: string[]; clientIds?: string[] },
): Promise<StaffHoursSummary> {
  const month = getCurrentCalendarMonth(now)

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, staff_id, session_type, status, staff(full_name, team)")
    .gte("scheduled_at", month.start.toISOString())
    .lte("scheduled_at", month.end.toISOString())

  if (options?.staffIds?.length) {
    sessionsQuery = sessionsQuery.in("staff_id", options.staffIds)
  }

  if (options?.clientIds?.length) {
    sessionsQuery = sessionsQuery.in("client_id", options.clientIds)
  }

  const { data: sessionsData, error: sessionsError } = await sessionsQuery

  if (sessionsError) throw sessionsError

  const sessions = (sessionsData ?? []) as unknown as PayPeriodSessionRow[]

  const completedSessionIds = sessions
    .filter((s) => s.status === "completed")
    .map((s) => s.id)

  let notesBySessionId = new Map<string, SessionNoteRow>()
  if (completedSessionIds.length > 0) {
    const { data: notesData, error: notesError } = await supabase
      .from("session_notes")
      .select("session_id, subjective, objective, assessment, plan")
      .in("session_id", completedSessionIds)

    if (notesError) throw notesError
    notesBySessionId = new Map(
      ((notesData ?? []) as SessionNoteRow[]).map((note) => [note.session_id, note]),
    )
  }

  const byStaffId = new Map<string, MutableStaffHoursRow>()

  for (const session of sessions) {
    if (!session.staff?.full_name) continue

    let row = byStaffId.get(session.staff_id)
    if (!row) {
      row = {
        staffId: session.staff_id,
        staffName: session.staff.full_name,
        staffTeam: teamLabel(session.staff.team),
        directHours: 0,
        indirectHours: 0,
        cancellationHours: 0,
        cancelledSessionCount: 0,
      }
      byStaffId.set(session.staff_id, row)
    }

    const hasCompleteNote = isCompleteSessionNote(notesBySessionId.get(session.id))
    const bucket = classifySessionHours({
      status: session.status,
      sessionType: session.session_type,
      hasCompleteNote,
    })

    if (bucket === "exclude") continue

    if (bucket === "cancellation") {
      row.cancellationHours += DEFAULT_SESSION_HOURS
      row.cancelledSessionCount += 1
      continue
    }

    if (bucket === "direct") {
      row.directHours += DEFAULT_SESSION_HOURS
      continue
    }

    row.indirectHours += DEFAULT_SESSION_HOURS
  }

  // Omit staff with zero billable hours (direct + indirect) to reduce list noise.
  const byStaff = [...byStaffId.values()]
    .map(finalizeRow)
    .filter((row) => row.directHours + row.indirectHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours || a.staffName.localeCompare(b.staffName))

  return {
    monthLabel: month.label,
    byStaff,
  }
}

/** @deprecated Use getStaffHoursByMonth — hours tile is monthly, not pay-period. */
export const getStaffHoursByPayPeriod = getStaffHoursByMonth
