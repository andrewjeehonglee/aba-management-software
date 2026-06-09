import { getCurrentCalendarMonth } from "@/lib/payPeriod"
import { supabase } from "@/lib/supabase"

export type DashboardScope =
  | { mode: "practice" }
  | { mode: "caseload"; staffId: string }
  | { mode: "self"; staffId: string }

type DashboardViewRole = "Technician" | "Supervisor" | "BCBA"

/** Demo / owner role-preview anchors — not team-based. */
const PREVIEW_STAFF_NAME: Record<DashboardViewRole, string> = {
  BCBA: "Sarah Chen",
  Supervisor: "David Kim",
  Technician: "Mike Torres",
}

/**
 * TEMP v1 caseload: same-team technicians + supervisors until assignment schema lands.
 * Includes the BCBA/supervisor themselves for calendar; tiles filter supervisees separately.
 */
export async function getCaseloadStaffIdsForBcba(bcbaStaffId: string): Promise<string[]> {
  const { data: self, error: selfError } = await supabase
    .from("staff")
    .select("team")
    .eq("id", bcbaStaffId)
    .maybeSingle()

  if (selfError) throw selfError
  if (!self) return [bcbaStaffId]

  const team = (self as { team: string }).team

  const { data: teamStaff, error: teamError } = await supabase
    .from("staff")
    .select("id")
    .eq("team", team)
    .in("role", ["technician", "supervisor"])

  if (teamError) throw teamError

  return [...new Set([bcbaStaffId, ...((teamStaff ?? []) as { id: string }[]).map((r) => r.id)])]
}

/** TEMP v1: clients whose assigned primary RBT is on the caseload staff set. */
export async function getCaseloadClientIdsForBcba(bcbaStaffId: string): Promise<string[]> {
  const staffIds = await getCaseloadStaffIdsForBcba(bcbaStaffId)
  if (staffIds.length === 0) return []

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .in("assigned_staff_id", staffIds)
    .eq("status", "active")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

/** Technicians only — for supervision tile on BCBA/supervisor dashboards. */
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

export async function resolvePreviewStaffId(viewRole: DashboardViewRole): Promise<string | null> {
  const name = PREVIEW_STAFF_NAME[viewRole]
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("full_name", name)
    .maybeSingle()

  if (error) throw error
  return data ? (data as { id: string }).id : null
}

export async function resolveEffectiveStaffId(
  currentStaffId: string | null,
  viewRole: DashboardViewRole,
  isOwnerPreview: boolean,
): Promise<string | null> {
  if (isOwnerPreview) return resolvePreviewStaffId(viewRole)
  return currentStaffId
}

export async function getStaffFullName(staffId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("full_name")
    .eq("id", staffId)
    .maybeSingle()

  if (error) throw error
  return data ? (data as { full_name: string }).full_name : null
}

export async function resolveCaseloadFilters(scope: DashboardScope): Promise<{
  staffIds: string[]
  clientIds: string[]
  superviseeStaffIds: string[]
}> {
  if (scope.mode === "practice") {
    return { staffIds: [], clientIds: [], superviseeStaffIds: [] }
  }

  if (scope.mode === "self") {
    return {
      staffIds: [scope.staffId],
      clientIds: [],
      superviseeStaffIds: [],
    }
  }

  const [staffIds, clientIds, superviseeStaffIds] = await Promise.all([
    getCaseloadStaffIdsForBcba(scope.staffId),
    getCaseloadClientIdsForBcba(scope.staffId),
    getSuperviseeStaffIdsForBcba(scope.staffId),
  ])

  return { staffIds, clientIds, superviseeStaffIds }
}

export function supervisionOverlapsCurrentMonth(periodStart: string, periodEnd: string): boolean {
  const month = getCurrentCalendarMonth()
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  return start <= month.end && end >= month.start
}
