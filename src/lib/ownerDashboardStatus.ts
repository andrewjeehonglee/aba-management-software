import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { getNotesStatus } from "@/lib/notesStatus"
import { daysUntilPeriodEnd, formatPayPeriodCloseDate } from "@/lib/payPeriod"
import type { PulseSeverity } from "@/lib/pulseSeverity"
import { PAYROLL_ESCALATION_DAYS, worstSeverity } from "@/lib/pulseSeverity"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

export type OwnerAttentionSeverity = "warn" | "crit"

export interface OwnerAttentionItem {
  id: "notes" | "hours" | "auth"
  scrollTargetId: string
  label: string
  detail: string
  displayValue: string
  severity: OwnerAttentionSeverity
}

export interface OwnerWorklistItem {
  id: string
  group: "notes" | "auth" | "hours"
  groupLabel: string
  name: string
  displayValue: string
  severity: OwnerAttentionSeverity
  href?: string
}

export interface OwnerAttentionSummary {
  attentionCount: number
  worstSeverity: PulseSeverity
  items: OwnerAttentionItem[]
  worklist: OwnerWorklistItem[]
  loading: boolean
  resolved: boolean
}

function sessionLabel(count: number): string {
  return count === 1 ? "1 session" : `${count} sessions`
}

export async function getOwnerAttentionSummary(options?: {
  staffIds?: string[]
  clientIds?: string[]
}): Promise<Omit<OwnerAttentionSummary, "loading" | "resolved">> {
  const scope = {
    staffIds: options?.staffIds?.length ? options.staffIds : undefined,
    clientIds: options?.clientIds?.length ? options.clientIds : undefined,
  }

  const [notes, hours, auth] = await Promise.all([
    getNotesStatus(undefined, scope.staffIds || scope.clientIds ? scope : undefined),
    getStaffHoursByMonth(undefined, {
      ...scope,
      includeZeroHourStaff: true,
    }),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
  ])

  const items: OwnerAttentionItem[] = []
  const worklist: OwnerWorklistItem[] = []
  let worstSeverityLevel: PulseSeverity = "ok"

  const unpayableCount = notes.totalMissing + notes.totalOverdue
  if (unpayableCount > 0) {
    items.push({
      id: "notes",
      scrollTargetId: "notes-overdue",
      label: "Session notes",
      detail: `${unpayableCount} ${unpayableCount === 1 ? "session" : "sessions"} unpayable`,
      displayValue: `${unpayableCount} unpayable`,
      severity: "warn",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "warn")

    for (const row of notes.byStaff) {
      const sessionCount = row.missingCount + row.overdueCount
      if (sessionCount === 0) continue
      worklist.push({
        id: `notes-${row.staffId}`,
        group: "notes",
        groupLabel: "Notes to wrap up",
        name: row.staffName,
        displayValue: sessionLabel(sessionCount),
        severity: "warn",
        href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
      })
    }
  }

  const flaggedStaff = hours.byStaff.filter((row) => row.flagged)
  const daysUntilClose = daysUntilPeriodEnd()
  const payrollEscalates =
    daysUntilClose <= PAYROLL_ESCALATION_DAYS && notes.payableHoursPending > 0

  if (flaggedStaff.length > 0) {
    items.push({
      id: "hours",
      scrollTargetId: "hours-by-staff",
      label: "Hours by staff",
      detail: `${flaggedStaff.length} below 50% direct`,
      displayValue: `${flaggedStaff.length} below mix`,
      severity: "warn",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "warn")

    for (const row of flaggedStaff) {
      worklist.push({
        id: `hours-${row.staffId}`,
        group: "hours",
        groupLabel: "Hours — below direct mix",
        name: row.staffName,
        displayValue: `${Math.round(row.directPct * 100)}% direct`,
        severity: "warn",
        href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
      })
    }
  } else if (payrollEscalates) {
    items.push({
      id: "hours",
      scrollTargetId: "hours-by-staff",
      label: "Payroll",
      detail: `${notes.payableHoursPending} hours on hold`,
      displayValue: `${notes.payableHoursPending} hrs blocked`,
      severity: "warn",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "warn")
  }

  if (auth.overCount > 0) {
    items.push({
      id: "auth",
      scrollTargetId: "auth-utilization",
      label: "Authorizations",
      detail: `${auth.overCount} ${auth.overCount === 1 ? "client" : "clients"} over limit`,
      displayValue: `${auth.overCount} over limit`,
      severity: "crit",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "crit")
  } else if (auth.approachingCount > 0) {
    items.push({
      id: "auth",
      scrollTargetId: "auth-utilization",
      label: "Authorizations",
      detail: `${auth.approachingCount} approaching limit`,
      displayValue: `${auth.approachingCount} approaching`,
      severity: "warn",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "warn")
  }

  const authOver = auth.byClient.filter((row) => row.overAuthorized)
  const authApproaching = auth.byClient.filter((row) => row.approaching)

  for (const row of authOver) {
    worklist.push({
      id: `auth-over-${row.authId}`,
      group: "auth",
      groupLabel: "Authorization — over limit",
      name: row.clientName,
      displayValue: `${row.overHours} hrs over`,
      severity: "crit",
      href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
    })
  }

  for (const row of authApproaching) {
    worklist.push({
      id: `auth-approaching-${row.authId}`,
      group: "auth",
      groupLabel: "Authorization — over limit",
      name: row.clientName,
      displayValue: `${row.hoursRemaining} hrs left`,
      severity: "warn",
      href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
    })
  }

  return {
    attentionCount: items.length,
    worstSeverity: worstSeverityLevel,
    items,
    worklist,
  }
}

export const OWNER_PERSONA_NAME = "Jenny Lee"

export function resolveOwnerDisplayName(
  role: string | undefined,
  linkedStaffName: string | null | undefined,
): string {
  if (role?.toLowerCase() === "owner") return OWNER_PERSONA_NAME
  return linkedStaffName?.trim() || OWNER_PERSONA_NAME
}

export function timeGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "there"
  return fullName.trim().split(/\s+/)[0] ?? "there"
}

export function ownerInitials(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "??"
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? "??").toUpperCase()
}

export function formatPayPeriodCloseCopy(referenceDate: Date = new Date()): string {
  return formatPayPeriodCloseDate(referenceDate)
}

export { PAYROLL_ESCALATION_DAYS, daysUntilPeriodEnd }
