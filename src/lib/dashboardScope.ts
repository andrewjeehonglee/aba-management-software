import { getCurrentCalendarMonth, getCurrentCalendarMonthDateBounds } from "@/lib/payPeriod"
import { supabase, type SupervisionRecord } from "@/lib/supabase"

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

async function getSelfStaffRow(staffId: string): Promise<{ team: string; practice_id: string } | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("team, practice_id")
    .eq("id", staffId)
    .maybeSingle()

  if (error) throw error
  return data ? (data as { team: string; practice_id: string }) : null
}

async function getPracticeStaff(practiceId: string): Promise<StaffRow[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, team, role")
    .eq("practice_id", practiceId)

  if (error) throw error
  return (data ?? []) as StaffRow[]
}

/**
 * TEMP v1 caseload: same-team technicians + supervisors until assignment schema lands.
 * Normalizes mixed seed formats (`A` vs `Team A`, `technician` vs `Technician`).
 */
export async function getCaseloadStaffIdsForBcba(bcbaStaffId: string): Promise<string[]> {
  const self = await getSelfStaffRow(bcbaStaffId)
  if (!self) return [bcbaStaffId]

  const selfTeam = normalizeTeam(self.team)
  const practiceStaff = await getPracticeStaff(self.practice_id)

  const ids = practiceStaff
    .filter((s) => {
      if (normalizeTeam(s.team) !== selfTeam) return false
      if (s.id === bcbaStaffId) return true
      return isTechnicianRole(s.role) || isSupervisorRole(s.role)
    })
    .map((s) => s.id)

  return [...new Set(ids)]
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
  const self = await getSelfStaffRow(bcbaStaffId)
  if (!self) return []

  const selfTeam = normalizeTeam(self.team)
  const practiceStaff = await getPracticeStaff(self.practice_id)

  return practiceStaff
    .filter(
      (s) =>
        normalizeTeam(s.team) === selfTeam &&
        isTechnicianRole(s.role) &&
        s.id !== bcbaStaffId,
    )
    .map((s) => s.id)
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

/** Latest row per staff when multiple periods exist (fallback path). */
function pickLatestSupervisionPerStaff(records: SupervisionRecord[]): SupervisionRecord[] {
  const byStaff = new Map<string, SupervisionRecord>()
  for (const row of records) {
    const prev = byStaff.get(row.staffName)
    if (!prev || row.periodEnd.slice(0, 10) > prev.periodEnd.slice(0, 10)) {
      byStaff.set(row.staffName, row)
    }
  }
  return [...byStaff.values()]
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
  const current = records.filter((r) =>
    supervisionOverlapsCurrentMonth(r.periodStart, r.periodEnd),
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
