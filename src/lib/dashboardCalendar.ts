import { getCurrentCalendarMonth, type PayPeriod } from "@/lib/payPeriod"
import { supabase, type SessionRecord } from "@/lib/supabase"
import { ROLE_DEFAULT_TEAM } from "@/types/team"
import type { Session, SessionStatus } from "@/types/session"

type DashboardViewRole = "Technician" | "Supervisor" | "BCBA"

const ROLE_DB: Record<DashboardViewRole, string> = {
  Technician: "technician",
  Supervisor: "supervisor",
  BCBA: "bcba",
}

export function sessionRecordToSession(record: SessionRecord): Session {
  return {
    id: record.id,
    time: record.time,
    clientId: record.clientId,
    clientName: record.clientName,
    staffName: record.staffName,
    sessionType: record.sessionType,
    status: record.status as SessionStatus,
  }
}

export async function getStaffSessionsForMonth(
  staffIds: string[],
  monthWindow: PayPeriod,
): Promise<SessionRecord[]> {
  if (staffIds.length === 0) return []

  const { data, error } = await supabase
    .from("sessions")
    .select("id, scheduled_at, session_type, status, client_id, clients(first_name, last_name), staff(full_name, team)")
    .in("staff_id", staffIds)
    .gte("scheduled_at", monthWindow.start.toISOString())
    .lte("scheduled_at", monthWindow.end.toISOString())
    .order("scheduled_at", { ascending: true })

  if (error) throw error

  type Row = {
    id: string
    scheduled_at: string
    session_type: string
    status: string
    client_id: string
    clients: { first_name: string; last_name: string }
    staff: { full_name: string; team: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    time: row.scheduled_at,
    clientId: row.client_id,
    clientName: `${row.clients.first_name} ${row.clients.last_name}`,
    staffName: row.staff?.full_name ?? "Unknown",
    staffTeam: row.staff?.team ? (row.staff.team.startsWith("Team") ? row.staff.team : `Team ${row.staff.team}`) : "",
    sessionType: row.session_type,
    status: row.status,
  }))
}

/**
 * V1 supervisee approximation — no `staff.supervisor_id` yet.
 * Returns all technicians on the same team as the BCBA/supervisor (excluding self).
 * Replace with real supervisee graph in the multi-BCBA spike.
 */
export async function getSuperviseeStaffIdsForBcba(bcbaStaffId: string): Promise<string[]> {
  const { data: self, error: selfError } = await supabase
    .from("staff")
    .select("team")
    .eq("id", bcbaStaffId)
    .maybeSingle()

  if (selfError) throw selfError
  if (!self) return []

  const { data: techs, error: techError } = await supabase
    .from("staff")
    .select("id")
    .eq("team", (self as { team: string }).team)
    .eq("role", "technician")
    .neq("id", bcbaStaffId)

  if (techError) throw techError
  return ((techs ?? []) as { id: string }[]).map((row) => row.id)
}

/** Owner role-preview: map to a seeded staff row on the preview role's default team. */
export async function resolvePreviewStaffId(viewRole: DashboardViewRole): Promise<string | null> {
  const teamFilter = ROLE_DEFAULT_TEAM[viewRole]
  const teamLetter = teamFilter.replace(/^Team /, "")

  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("team", teamLetter)
    .eq("role", ROLE_DB[viewRole])
    .order("full_name", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? (data as { id: string }).id : null
}

export async function resolveEffectiveStaffId(
  currentStaffId: string | null,
  viewRole: DashboardViewRole,
  isOwnerPreview: boolean,
): Promise<string | null> {
  if (isOwnerPreview) {
    return resolvePreviewStaffId(viewRole)
  }
  return currentStaffId
}

export function monthWindowForDate(date: Date): PayPeriod {
  return getCurrentCalendarMonth(date)
}

export async function loadDashboardCalendarSessions(params: {
  staffId: string | null
  viewRole: DashboardViewRole
  isOwnerPreview: boolean
  includeSupervisees: boolean
  monthDate: Date
}): Promise<{ monthLabel: string; sessions: Session[] }> {
  const effectiveStaffId = await resolveEffectiveStaffId(
    params.staffId,
    params.viewRole,
    params.isOwnerPreview,
  )

  if (!effectiveStaffId) {
    const month = monthWindowForDate(params.monthDate)
    return { monthLabel: month.label, sessions: [] }
  }

  let staffIds = [effectiveStaffId]

  if (
    params.includeSupervisees &&
    (params.viewRole === "BCBA" || params.viewRole === "Supervisor")
  ) {
    const superviseeIds = await getSuperviseeStaffIdsForBcba(effectiveStaffId)
    staffIds = [...new Set([effectiveStaffId, ...superviseeIds])]
  }

  const month = monthWindowForDate(params.monthDate)
  const records = await getStaffSessionsForMonth(staffIds, month)

  return {
    monthLabel: month.label,
    sessions: records.map(sessionRecordToSession),
  }
}
