import {
  getClientIdsForStaffByRoles,
  getStaffIdsForClientsByRoles,
  type ClientAssignmentRole,
} from "@/lib/clientAssignments"
import { getCurrentCalendarMonth, getCurrentCalendarMonthDateBounds } from "@/lib/payPeriod"
import { supabase, type SupervisionRecord } from "@/lib/supabase"

export type DashboardScope =
  | { mode: "practice" }
  | { mode: "caseload"; staffId: string }
  | { mode: "self"; staffId: string }

type DashboardViewRole = "Technician" | "Supervisor" | "BCBA"

export type StaffRole = "bcba" | "supervisor" | "technician"

const ALL_CARE_TEAM_ROLES: ClientAssignmentRole[] = [
  "primary_bcba",
  "clinical_supervisor",
  "primary_bt",
  "secondary_bt",
]

const BT_ROLES: ClientAssignmentRole[] = ["primary_bt", "secondary_bt"]

const PREVIEW_PREFERRED_NAME: Record<DashboardViewRole, string> = {
  BCBA: "Jennifer",
  Supervisor: "Hilary",
  Technician: "Jazmine",
}

const PREVIEW_ROLE_FILTER: Record<DashboardViewRole, StaffRole> = {
  BCBA: "bcba",
  Supervisor: "supervisor",
  Technician: "technician",
}

export function normalizeTeam(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.replace(/^Team\s+/i, "").trim()
}

export function isTechnicianRole(role: string | null | undefined): boolean {
  return (role ?? "").toLowerCase() === "technician"
}

function isSupervisorRole(role: string | null | undefined): boolean {
  return (role ?? "").toLowerCase() === "supervisor"
}

type StaffRow = { id: string; team: string; role: string }

type SelfStaffRow = { team: string; practice_id: string }

async function getSelfStaffRow(staffId: string): Promise<SelfStaffRow | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("team, practice_id")
    .eq("id", staffId)
    .maybeSingle()

  if (error) throw error
  return data ? (data as SelfStaffRow) : null
}

async function getPracticeStaff(practiceId: string): Promise<StaffRow[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, team, role")
    .eq("practice_id", practiceId)

  if (error) throw error
  return (data ?? []) as StaffRow[]
}

async function practiceHasActiveAssignments(practiceId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("client_assignments")
    .select("*", { count: "exact", head: true })
    .eq("practice_id", practiceId)
    .eq("is_active", true)

  if (error) throw error
  return (count ?? 0) > 0
}

async function filterActiveClientIds(clientIds: string[]): Promise<string[]> {
  if (clientIds.length === 0) return []

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .in("id", clientIds)
    .eq("status", "active")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

export async function getStaffRole(staffId: string): Promise<StaffRole | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("role")
    .eq("id", staffId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const role = (data as { role: string }).role.toLowerCase()
  if (role === "bcba") return "bcba"
  if (role === "supervisor") return "supervisor"
  if (role === "technician") return "technician"
  return null
}

async function resolvePracticeIdForCurrentUser(): Promise<string | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) return null

  const { data, error } = await supabase
    .from("practice_members")
    .select("practice_id")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? (data as { practice_id: string }).practice_id : null
}

/** TEMP team fallback — used only when practice has zero active client_assignments. */
async function getCaseloadStaffIdsTeamFallback(
  staffId: string,
  self: SelfStaffRow,
): Promise<string[]> {
  const selfTeam = normalizeTeam(self.team)
  const practiceStaff = await getPracticeStaff(self.practice_id)

  return [
    ...new Set(
      practiceStaff
        .filter((s) => {
          if (normalizeTeam(s.team) !== selfTeam) return false
          if (s.id === staffId) return true
          return isTechnicianRole(s.role) || isSupervisorRole(s.role)
        })
        .map((s) => s.id),
    ),
  ]
}

/** TEMP team fallback — used only when practice has zero active client_assignments. */
async function getCaseloadClientIdsTeamFallback(
  staffId: string,
  self: SelfStaffRow,
): Promise<string[]> {
  const staffIds = await getCaseloadStaffIdsTeamFallback(staffId, self)
  if (staffIds.length === 0) return []

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .in("assigned_staff_id", staffIds)
    .eq("status", "active")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

/** TEMP team fallback — used only when practice has zero active client_assignments. */
async function getSuperviseeStaffIdsTeamFallback(
  staffId: string,
  self: SelfStaffRow,
): Promise<string[]> {
  const selfTeam = normalizeTeam(self.team)
  const practiceStaff = await getPracticeStaff(self.practice_id)

  return practiceStaff
    .filter(
      (s) =>
        normalizeTeam(s.team) === selfTeam &&
        isTechnicianRole(s.role) &&
        s.id !== staffId,
    )
    .map((s) => s.id)
}

export async function getCaseloadClientIdsForBcba(staffId: string): Promise<string[]> {
  const self = await getSelfStaffRow(staffId)
  if (!self) return []

  const role = await getStaffRole(staffId)
  if (role === "technician") return []

  const assignmentRoles: ClientAssignmentRole[] =
    role === "bcba"
      ? ["primary_bcba"]
      : role === "supervisor"
        ? ["clinical_supervisor"]
        : []

  if (assignmentRoles.length === 0) return []

  let clientIds = await getClientIdsForStaffByRoles(staffId, assignmentRoles)

  if (clientIds.length === 0) {
    const hasAssignments = await practiceHasActiveAssignments(self.practice_id)
    if (!hasAssignments) {
      console.warn("[dashboardScope] No client_assignments — using deprecated team fallback")
      return getCaseloadClientIdsTeamFallback(staffId, self)
    }
    return []
  }

  return filterActiveClientIds(clientIds)
}

export async function getCaseloadStaffIdsForBcba(staffId: string): Promise<string[]> {
  const self = await getSelfStaffRow(staffId)
  if (!self) return [staffId]

  const clientIds = await getCaseloadClientIdsForBcba(staffId)

  if (clientIds.length === 0) {
    const hasAssignments = await practiceHasActiveAssignments(self.practice_id)
    if (!hasAssignments) {
      return getCaseloadStaffIdsTeamFallback(staffId, self)
    }
    return [staffId]
  }

  const careTeamIds = await getStaffIdsForClientsByRoles(clientIds, ALL_CARE_TEAM_ROLES)
  return [...new Set([staffId, ...careTeamIds])]
}

/** Technicians on caseload clients only — for supervision tile and calendar overlay. */
export async function getSuperviseeStaffIdsForBcba(staffId: string): Promise<string[]> {
  const self = await getSelfStaffRow(staffId)
  const clientIds = await getCaseloadClientIdsForBcba(staffId)

  if (clientIds.length === 0) {
    if (self) {
      const hasAssignments = await practiceHasActiveAssignments(self.practice_id)
      if (!hasAssignments) {
        return getSuperviseeStaffIdsTeamFallback(staffId, self)
      }
    }
    return []
  }

  const btStaffIds = await getStaffIdsForClientsByRoles(clientIds, BT_ROLES)
  if (btStaffIds.length === 0) return []

  const { data, error } = await supabase
    .from("staff")
    .select("id, role")
    .in("id", btStaffIds)

  if (error) throw error

  return ((data ?? []) as { id: string; role: string }[])
    .filter((row) => isTechnicianRole(row.role) && row.id !== staffId)
    .map((row) => row.id)
}

export async function resolvePreviewStaffId(
  viewRole: DashboardViewRole,
  practiceId?: string,
): Promise<string | null> {
  const pid = practiceId ?? (await resolvePracticeIdForCurrentUser())
  if (!pid) return null

  const preferredName = PREVIEW_PREFERRED_NAME[viewRole]
  const { data: byName, error: nameError } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", pid)
    .eq("full_name", preferredName)
    .maybeSingle()

  if (nameError) throw nameError
  if (byName) return (byName as { id: string }).id

  const role = PREVIEW_ROLE_FILTER[viewRole]
  const { data: byRole, error: roleError } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", pid)
    .eq("role", role)
    .order("full_name", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (roleError) throw roleError
  return byRole ? (byRole as { id: string }).id : null
}

export async function resolveEffectiveStaffId(
  currentStaffId: string | null,
  viewRole: DashboardViewRole,
  isOwnerPreview: boolean,
  practiceId?: string,
): Promise<string | null> {
  if (isOwnerPreview) return resolvePreviewStaffId(viewRole, practiceId)
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

export function supervisionOverlapsCurrentMonth(
  periodStart: string,
  periodEnd: string,
  referenceDate?: Date,
): boolean {
  const { start: monthStart, end: monthEnd } = getCurrentCalendarMonthDateBounds(referenceDate)
  const start = periodStart.slice(0, 10)
  const end = periodEnd.slice(0, 10)
  return start <= monthEnd && end >= monthStart
}

function formatPeriodMonthLabel(periodStart: string): string {
  const [year, month] = periodStart.slice(0, 10).split("-").map(Number)
  const anchor = new Date(year, month - 1, 1)
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/** One row per staff — keeps latest period; tie-break prefers seed row (lower id). */
function dedupeSupervisionPerStaff(records: SupervisionRecord[]): SupervisionRecord[] {
  const byStaff = new Map<string, SupervisionRecord>()
  for (const row of records) {
    const key = row.staffId || row.staffName
    const prev = byStaff.get(key)
    if (!prev) {
      byStaff.set(key, row)
      continue
    }
    const rowEnd = row.periodEnd.slice(0, 10)
    const prevEnd = prev.periodEnd.slice(0, 10)
    if (rowEnd > prevEnd) {
      byStaff.set(key, row)
    } else if (rowEnd === prevEnd && row.id < prev.id) {
      byStaff.set(key, row)
    }
  }
  return [...byStaff.values()]
}

/** Latest row per staff when multiple periods exist (fallback path). */
function pickLatestSupervisionPerStaff(records: SupervisionRecord[]): SupervisionRecord[] {
  return dedupeSupervisionPerStaff(records)
}

/**
 * Prefer current calendar month. If no rows overlap (e.g. seed still on May),
 * show the latest period per staff so the tile is not falsely empty.
 */
export function filterSupervisionRecordsForTile(records: SupervisionRecord[]): {
  records: SupervisionRecord[]
  displayMonthLabel: string
  isFallbackPeriod: boolean
} {
  const currentMonth = getCurrentCalendarMonth()
  const current = dedupeSupervisionPerStaff(
    records.filter((r) =>
      supervisionOverlapsCurrentMonth(r.periodStart, r.periodEnd),
    ),
  )
  if (current.length > 0) {
    return {
      records: current,
      displayMonthLabel: currentMonth.label,
      isFallbackPeriod: false,
    }
  }

  const latest = pickLatestSupervisionPerStaff(records)
  if (latest.length === 0) {
    return {
      records: [],
      displayMonthLabel: currentMonth.label,
      isFallbackPeriod: false,
    }
  }

  return {
    records: latest,
    displayMonthLabel: formatPeriodMonthLabel(latest[0].periodStart),
    isFallbackPeriod: true,
  }
}
