import type { BcbaTileState } from "@/lib/bcbaTileState"
import {
  authRunwayState,
  shortClientLabel,
  sortAuthRunwayRows,
} from "@/lib/dashboardTileMetrics"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import {
  getClientDirectEngagementFlags,
  shouldFlagClientDirectEngagement,
} from "@/lib/clientDirectEngagement"
import { getNotesStatus, type NotesStatusItem } from "@/lib/notesStatus"
import { firstName } from "@/lib/ownerDashboardStatus"
import {
  getPayPeriodHoursGap,
  type PayPeriodHoursGapSummary,
  type PayPeriodRoleTier,
  type RosterStaffForPayroll,
} from "@/lib/payPeriodHoursGap"
import { daysUntilPeriodEnd } from "@/lib/payPeriod"
import { PRACTICE_TIMEZONE } from "@/lib/sessions"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

export const OWNER_ROW_CAP = 5

export type OwnerMonitorTileId = "notes" | "auth" | "directHours"

export interface OwnerPopoverLine {
  id: string
  text: string
  href?: string
}

export type OwnerRankedRowSeverity = "overdue" | "pending" | "over-cap" | "near-cap" | "monitor"

export interface OwnerRankedRow {
  id: string
  label: string
  severity: OwnerRankedRowSeverity
  magnitude: number
  usedHours?: number
  authorizedHours?: number
  href?: string
  popoverTitle?: string
  popoverLines?: OwnerPopoverLine[]
}

export interface OwnerMonitorTile {
  id: OwnerMonitorTileId
  title: string
  state: BcbaTileState
  /** Tight count line only — no editorial consequence copy. */
  headerLine: string
  emptyLabel: string
  rows: OwnerRankedRow[]
  totalRowCount: number
  viewAllHref?: string
  /** When true, show header + view-all only (direct hours monitor). */
  summaryOnly?: boolean
}

export interface OwnerDashboardData {
  monitorTiles: OwnerMonitorTile[]
  payroll: PayPeriodHoursGapSummary & {
    daysUntilClose: number
    totalOnHoldHours: number
  }
  loading?: boolean
}

function formatSessionDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    month: "short",
    day: "numeric",
  })
}

function noteItemToPopoverLine(item: NotesStatusItem): OwnerPopoverLine {
  const clientLabel = shortClientLabel(item.clientName)
  const dateLabel = formatSessionDateLabel(item.scheduledAt)
  return {
    id: item.sessionId,
    text: `${clientLabel}, ${dateLabel}`,
    href: item.clientCode ? clientProfilePath(item.clientCode) : undefined,
  }
}

function capRows(rows: OwnerRankedRow[]): { rows: OwnerRankedRow[]; totalRowCount: number } {
  return {
    rows: rows.slice(0, OWNER_ROW_CAP),
    totalRowCount: rows.length,
  }
}

function mapRosterToPayroll(
  manifest: Array<{ id: string; fullName: string; externalCode: string; role: string }>,
): RosterStaffForPayroll[] {
  return manifest
    .map((staff) => {
      const role = staff.role.toLowerCase()
      if (role !== "technician" && role !== "supervisor" && role !== "bcba") return null
      return {
        id: staff.id,
        fullName: staff.fullName,
        externalCode: staff.externalCode,
        role: role as PayPeriodRoleTier,
      }
    })
    .filter((row): row is RosterStaffForPayroll => row != null)
}

function totalOnHoldHours(payroll: PayPeriodHoursGapSummary): number {
  return payroll.byRole
    .flatMap((tier) => tier.staff)
    .reduce((sum, row) => sum + row.onHoldHours, 0)
}

function notesHeaderLine(overdue: number, pending: number): string {
  const parts: string[] = []
  if (overdue > 0) parts.push(`${overdue} overdue`)
  if (pending > 0) parts.push(`${pending} pending`)
  return parts.join(" · ")
}

export async function getOwnerDashboardData(options: {
  staffIds: string[]
  clientIds: string[]
  rosterManifest: Array<{ id: string; fullName: string; externalCode: string; role: string }>
  includeCaseloadStaff?: boolean
}): Promise<Omit<OwnerDashboardData, "loading">> {
  const scope = {
    staffIds: options.staffIds.length ? options.staffIds : undefined,
    clientIds: options.clientIds.length ? options.clientIds : undefined,
    includeCaseloadStaff: options.includeCaseloadStaff,
  }

  const payrollRoster = mapRosterToPayroll(options.rosterManifest)

  const [notes, auth, directFlags, payrollBase] = await Promise.all([
    getNotesStatus(undefined, scope),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getClientDirectEngagementFlags(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getPayPeriodHoursGap(undefined, {
      staffIds: payrollRoster.map((s) => s.id),
      clientIds: scope.clientIds,
      rosterStaff: payrollRoster,
    }),
  ])

  const payroll = {
    ...payrollBase,
    daysUntilClose: daysUntilPeriodEnd(),
    totalOnHoldHours: totalOnHoldHours(payrollBase),
  }

  const staffWithNoteIssues = [...notes.byStaff]
    .filter((row) => row.missingCount + row.overdueCount > 0)
    .sort(
      (a, b) =>
        b.overdueCount - a.overdueCount ||
        b.missingCount - a.missingCount ||
        a.staffName.localeCompare(b.staffName),
    )

  const notesState: BcbaTileState =
    notes.totalOverdue > 0 ? "urgent" : staffWithNoteIssues.length > 0 ? "monitor" : "healthy"

  const noteRowCandidates: OwnerRankedRow[] = staffWithNoteIssues.flatMap((row) => {
    const rows: OwnerRankedRow[] = []
    const name = firstName(row.staffName)
    const notesHref = row.staffExternalCode
      ? `${staffProfilePath(row.staffExternalCode)}/notes`
      : undefined
    const popoverLines: OwnerPopoverLine[] = [
      ...(notesHref ? [{ id: `${row.staffId}-notes`, text: "View all notes →", href: notesHref }] : []),
      ...row.items.map(noteItemToPopoverLine),
    ]

    if (row.overdueCount > 0) {
      rows.push({
        id: `${row.staffId}-overdue`,
        label: `${name} — ${row.overdueCount} overdue`,
        severity: "overdue",
        magnitude: row.overdueCount,
        href: notesHref,
        popoverTitle: name,
        popoverLines,
      })
    }
    if (row.missingCount > 0) {
      rows.push({
        id: `${row.staffId}-pending`,
        label: `${name} — ${row.missingCount} pending`,
        severity: "pending",
        magnitude: row.missingCount,
        href: notesHref,
        popoverTitle: name,
        popoverLines,
      })
    }
    return rows
  })

  noteRowCandidates.sort(
    (a, b) =>
      (a.severity === "overdue" ? 0 : 1) - (b.severity === "overdue" ? 0 : 1) ||
      b.magnitude - a.magnitude,
  )

  const notesCapped = capRows(noteRowCandidates)

  const notesTile: OwnerMonitorTile = {
    id: "notes",
    title: "Session notes",
    state: notesState,
    headerLine:
      notesState === "healthy"
        ? "0 overdue · 0 pending"
        : notesHeaderLine(notes.totalOverdue, notes.totalMissing),
    emptyLabel: "All clear — every note is in for this pay period",
    rows: notesCapped.rows,
    totalRowCount: notesCapped.totalRowCount,
    viewAllHref: "/audit",
  }

  const authFlagged = sortAuthRunwayRows(
    auth.byClient.filter((row) => authRunwayState(row) !== "healthy"),
  )
  const authOverCap = authFlagged.filter((row) => row.usedHours > row.authorizedHours)
  const authNearCap = authFlagged.filter((row) => row.usedHours <= row.authorizedHours)

  let authState: BcbaTileState = "healthy"
  if (authOverCap.length > 0) authState = "urgent"
  else if (authNearCap.length > 0) authState = "monitor"

  const authRowCandidates: OwnerRankedRow[] = [
    ...authOverCap.map((row) => ({
      id: row.authId,
      label: `${shortClientLabel(row.clientName)} — ${row.overHours} hrs over`,
      severity: "over-cap" as const,
      magnitude: row.overHours,
      usedHours: row.usedHours,
      authorizedHours: row.authorizedHours,
      href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
      popoverTitle: shortClientLabel(row.clientName),
      popoverLines: [
        {
          id: row.authId,
          text: `${row.usedHours} hrs used of ${row.authorizedHours} authorized`,
          href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
        },
      ],
    })),
    ...authNearCap.map((row) => ({
      id: row.authId,
      label: `${shortClientLabel(row.clientName)} — ${row.hoursRemaining} hrs left`,
      severity: "near-cap" as const,
      magnitude: row.hoursRemaining,
      usedHours: row.usedHours,
      authorizedHours: row.authorizedHours,
      href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
      popoverTitle: shortClientLabel(row.clientName),
      popoverLines: [
        {
          id: row.authId,
          text: `${row.hoursRemaining} hrs left of ${row.authorizedHours} authorized`,
          href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
        },
      ],
    })),
  ]

  authRowCandidates.sort((a, b) => {
    if (a.severity === "over-cap" && b.severity !== "over-cap") return -1
    if (b.severity === "over-cap" && a.severity !== "over-cap") return 1
    return b.magnitude - a.magnitude
  })

  const authCapped = capRows(authRowCandidates)

  const authTile: OwnerMonitorTile = {
    id: "auth",
    title: "Authorized hours",
    state: authState,
    headerLine:
      authState === "healthy"
        ? "0 clients over cap"
        : authOverCap.length > 0
          ? `${authOverCap.length} client${authOverCap.length === 1 ? "" : "s"} over cap`
          : `${authNearCap.length} client${authNearCap.length === 1 ? "" : "s"} near cap`,
    emptyLabel: "All clear — every client within authorized hours",
    rows: authCapped.rows,
    totalRowCount: authCapped.totalRowCount,
    viewAllHref: "/clients",
  }

  const directFlagging = shouldFlagClientDirectEngagement()
  const directState: BcbaTileState =
    directFlagging && directFlags.length > 0 ? "monitor" : "healthy"

  const directTile: OwnerMonitorTile = {
    id: "directHours",
    title: "Direct hours",
    state: directState,
    headerLine:
      directState === "healthy"
        ? "Direct engagement on track · monitor (month in progress)"
        : `${directFlags.length} client${directFlags.length === 1 ? "" : "s"} under 50% · monitor (month in progress)`,
    emptyLabel: "All clear — direct engagement on track this month",
    rows: [],
    totalRowCount: directFlagging ? directFlags.length : 0,
    viewAllHref: "/clients",
    summaryOnly: true,
  }

  return {
    monitorTiles: [notesTile, authTile, directTile],
    payroll,
  }
}
