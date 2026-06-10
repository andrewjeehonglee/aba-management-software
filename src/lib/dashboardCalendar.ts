import { getCurrentCalendarMonth, type PayPeriod } from "@/lib/payPeriod"
import {
  getCaseloadClientIdsForBcba,
  getSuperviseeStaffIdsForBcba,
  resolveEffectiveStaffId,
  resolvePreviewStaffId,
} from "@/lib/dashboardScope"
import { supabase, type SessionRecord } from "@/lib/supabase"
import type { Session, SessionStatus } from "@/types/session"

export { getSuperviseeStaffIdsForBcba, resolveEffectiveStaffId, resolvePreviewStaffId }

type DashboardViewRole = "Technician" | "Supervisor" | "BCBA"

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
  clientIds?: string[],
): Promise<SessionRecord[]> {
  if (staffIds.length === 0) return []

  let query = supabase
    .from("sessions")
    .select("id, scheduled_at, session_type, status, client_id, clients(first_name, last_name, external_code), staff(full_name, team)")
    .in("staff_id", staffIds)
    .gte("scheduled_at", monthWindow.start.toISOString())
    .lte("scheduled_at", monthWindow.end.toISOString())
    .order("scheduled_at", { ascending: true })

  if (clientIds?.length) {
    query = query.in("client_id", clientIds)
  }

  const { data, error } = await query

  if (error) throw error

  type Row = {
    id: string
    scheduled_at: string
    session_type: string
    status: string
    client_id: string
    clients: { first_name: string; last_name: string; external_code: string | null }
    staff: { full_name: string; team: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    time: row.scheduled_at,
    clientId: row.client_id,
    clientName: `${row.clients.first_name} ${row.clients.last_name}`.trim() || (row.clients.external_code ?? "Unknown"),
    clientCode: row.clients.external_code ?? null,
    staffName: row.staff?.full_name ?? "Unknown",
    staffTeam: row.staff?.team ? (row.staff.team.startsWith("Team") ? row.staff.team : `Team ${row.staff.team}`) : "",
    sessionType: row.session_type,
    status: row.status,
  }))
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
  practiceId?: string
  previewStaffId?: string | null
}): Promise<{ monthLabel: string; sessions: Session[] }> {
  const effectiveStaffId = params.previewStaffId
    ?? await resolveEffectiveStaffId(
      params.staffId,
      params.viewRole,
      params.isOwnerPreview,
      params.practiceId,
    )

  if (!effectiveStaffId) {
    const month = monthWindowForDate(params.monthDate)
    return { monthLabel: month.label, sessions: [] }
  }

  const isLeadRole = params.viewRole === "BCBA" || params.viewRole === "Supervisor"
  let staffIds = [effectiveStaffId]
  let clientIds: string[] | undefined

  if (params.includeSupervisees && isLeadRole) {
    const [superviseeIds, caseloadClientIds] = await Promise.all([
      getSuperviseeStaffIdsForBcba(effectiveStaffId),
      getCaseloadClientIdsForBcba(effectiveStaffId),
    ])
    staffIds = superviseeIds.length > 0 ? superviseeIds : [effectiveStaffId]
    clientIds = caseloadClientIds.length > 0 ? caseloadClientIds : undefined
  }

  const month = monthWindowForDate(params.monthDate)
  const records = await getStaffSessionsForMonth(staffIds, month, clientIds)

  return {
    monthLabel: month.label,
    sessions: records.map(sessionRecordToSession),
  }
}
