import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import {
  authRunwayState,
  authRunwayValue,
  buildAuthorizationTileViewModel,
  buildDirectHoursTileViewModel,
  buildNotesTileViewModel,
  buildSupervisionTileViewModel,
  shortClientLabel,
  sortAuthRunwayRows,
  TILE_DEFINITIONS,
} from "@/lib/dashboardTileMetrics"
import { loadSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getNotesStatus } from "@/lib/notesStatus"
import { daysUntilPeriodEnd, formatPayPeriodCloseDate } from "@/lib/payPeriod"
import type { PulseSeverity } from "@/lib/pulseSeverity"
import { PAYROLL_ESCALATION_DAYS, worstSeverity } from "@/lib/pulseSeverity"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { isSupervisionBelowRequirement } from "@/lib/supervision"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

export type OwnerAttentionSeverity = "warn" | "crit"

export interface OwnerAttentionItem {
  id: "notes" | "hours" | "supervision" | "auth"
  scrollTargetId: string
  label: string
  detail: string
  displayValue: string
  severity: OwnerAttentionSeverity
}

export interface OwnerWorklistItem {
  id: string
  group: "notes" | "auth" | "hours" | "supervision"
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

  const [notes, hours, auth, supervisionLoad] = await Promise.all([
    getNotesStatus(undefined, scope.staffIds || scope.clientIds ? scope : undefined),
    getStaffHoursByMonth(undefined, {
      ...scope,
      includeZeroHourStaff: true,
    }),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    scope.staffIds?.length
      ? loadSupervisionRecordsForTile(scope.staffIds)
      : Promise.resolve({ records: [], displayMonthLabel: "" }),
  ])

  const items: OwnerAttentionItem[] = []
  const worklist: OwnerWorklistItem[] = []
  let worstSeverityLevel: PulseSeverity = "ok"

  const notesView = buildNotesTileViewModel(notes)
  if (notesView.metric > 0) {
    const notesSeverity: OwnerAttentionSeverity =
      notesView.state === "urgent" ? "crit" : "warn"
    items.push({
      id: "notes",
      scrollTargetId: TILE_DEFINITIONS.notes.id,
      label: notesView.title,
      detail: notesView.descriptor,
      displayValue: String(notesView.metric),
      severity: notesSeverity,
    })
    worstSeverityLevel = worstSeverity(
      worstSeverityLevel,
      notesSeverity === "crit" ? "crit" : "warn",
    )

    for (const row of notes.byStaff) {
      const sessionCount = row.missingCount + row.overdueCount
      if (sessionCount === 0) continue
      const rowSeverity: OwnerAttentionSeverity =
        row.overdueCount > 0 ? "crit" : "warn"
      worklist.push({
        id: `notes-${row.staffId}`,
        group: "notes",
        groupLabel: "Incomplete notes",
        name: row.staffName,
        displayValue: sessionLabel(sessionCount),
        severity: rowSeverity,
        href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
      })
    }
  }

  const hoursView = buildDirectHoursTileViewModel(hours)
  if (hoursView.metric > 0) {
    items.push({
      id: "hours",
      scrollTargetId: TILE_DEFINITIONS.directHours.id,
      label: hoursView.title,
      detail: hoursView.descriptor,
      displayValue: String(hoursView.metric),
      severity: "warn",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "warn")

    for (const row of hours.byStaff.filter((r) => r.flagged)) {
      worklist.push({
        id: `hours-${row.staffId}`,
        group: "hours",
        groupLabel: "Below 50% direct engagement",
        name: row.staffName,
        displayValue: `${Math.round(row.directPct * 100)}%`,
        severity: "warn",
        href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
      })
    }
  }

  const supervisionView = buildSupervisionTileViewModel(supervisionLoad.records)
  if (supervisionView.metric > 0) {
    items.push({
      id: "supervision",
      scrollTargetId: TILE_DEFINITIONS.supervision.id,
      label: supervisionView.title,
      detail: supervisionView.descriptor,
      displayValue: String(supervisionView.metric),
      severity: "warn",
    })
    worstSeverityLevel = worstSeverity(worstSeverityLevel, "warn")

    for (const row of supervisionLoad.records.filter((r) =>
      isSupervisionBelowRequirement(r.supervisionPct),
    )) {
      worklist.push({
        id: `supervision-${row.staffId}`,
        group: "supervision",
        groupLabel: "Below 5% supervision",
        name: row.staffName,
        displayValue: `${row.supervisionPct.toFixed(1)}%`,
        severity: "warn",
        href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
      })
    }
  }

  const authView = buildAuthorizationTileViewModel(auth.byClient)
  if (authView.metric > 0) {
    const authSeverity: OwnerAttentionSeverity =
      authView.state === "urgent" ? "crit" : "warn"
    items.push({
      id: "auth",
      scrollTargetId: TILE_DEFINITIONS.authorization.id,
      label: authView.title,
      detail: authView.descriptor,
      displayValue: String(authView.metric),
      severity: authSeverity,
    })
    worstSeverityLevel = worstSeverity(
      worstSeverityLevel,
      authSeverity === "crit" ? "crit" : "warn",
    )
  }

  const authFlagged = sortAuthRunwayRows(
    auth.byClient.filter((row) => authRunwayState(row) !== "healthy"),
  )

  for (const row of authFlagged) {
    const runwayState = authRunwayState(row)
    worklist.push({
      id: `auth-${row.authId}`,
      group: "auth",
      groupLabel: "Limited hours remaining",
      name: shortClientLabel(row.clientName),
      displayValue: authRunwayValue(row),
      severity: runwayState === "urgent" ? "crit" : "warn",
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
