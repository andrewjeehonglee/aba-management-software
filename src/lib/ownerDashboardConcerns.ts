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
import { getNotesStatus } from "@/lib/notesStatus"
import { firstName } from "@/lib/ownerDashboardStatus"
import {
  getPayPeriodHoursGap,
  type PayPeriodHoursGapSummary,
  type PayPeriodRoleTier,
  type RosterStaffForPayroll,
} from "@/lib/payPeriodHoursGap"
import { daysUntilPeriodEnd, getCurrentCalendarMonth } from "@/lib/payPeriod"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

export const OWNER_ROW_CAP = 5

export type OwnerMonitorTileId = "notes" | "auth" | "directHours"

export interface OwnerPopoverLine {
  id: string
  text: string
  href?: string
}

export type OwnerRankedRowSeverity =
  | "overdue"
  | "pending"
  | "over-cap"
  | "near-cap"
  | "monitor"
  | "neutral"

/** Severity ink for ranked row consequences (owner dashboard). */
export const OWNER_OVER_CAP_INK = "#B5362A"
export const OWNER_NEAR_CAP_INK = "#B8860B"
export const OWNER_ON_HOLD_INK = "#B8860B"

export interface OwnerSummaryLine {
  text: string
  /** Optional parenthetical definition in a lighter muted tone. */
  hint?: string
}

export interface OwnerRankedRow {
  id: string
  /** Full label fallback for accessibility. */
  label: string
  nameLabel: string
  consequenceLabel: string
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
  /** Plain-English summary under the title (fallback when summaryLines omitted). */
  headerLine: string
  summaryLines?: OwnerSummaryLine[]
  /** Muted note directly under the summary (e.g. direct observation hours). */
  subNote?: string
  emptyLabel: string
  rows: OwnerRankedRow[]
  /** Full ranked list for the view-all popup. */
  viewAllRows: OwnerRankedRow[]
  totalRowCount: number
  popupMetaLine?: string
  /** Muted filler when the month is too early to flag direct ratios. */
  calmNote?: string
}

export interface OwnerDashboardData {
  monitorTiles: OwnerMonitorTile[]
  payroll: PayPeriodHoursGapSummary & {
    daysUntilClose: number
    totalOnHoldHours: number
  }
  loading?: boolean
}

function formatMonthTableLabel(label: string): string {
  return label
    .replace(/,\s*\d{4}$/, "")
    .replace(/\u2013/g, " to ")
    .replace(/–/g, " to ")
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

function notesSummaryLines(overdue: number, pending: number): OwnerSummaryLine[] {
  if (overdue === 0 && pending === 0) {
    return [{ text: "Every note is in for this pay period." }]
  }
  const lines: OwnerSummaryLine[] = []
  if (overdue > 0) {
    lines.push({
      text: `${overdue} note${overdue === 1 ? "" : "s"} overdue`,
      hint: "past the submission deadline",
    })
  }
  if (pending > 0) {
    lines.push({
      text: `${pending} note${pending === 1 ? "" : "s"} pending`,
      hint: "not yet due, still within the window",
    })
  }
  return lines
}

function authSummaryLines(overCap: number, nearCap: number, state: BcbaTileState): OwnerSummaryLine[] {
  if (state === "healthy") {
    return [{ text: "Every client is within authorized hours." }]
  }
  if (overCap > 0) {
    return [
      {
        text: `${overCap} client${overCap === 1 ? "" : "s"} ${overCap === 1 ? "has" : "have"} gone over their authorized hours.`,
      },
    ]
  }
  return [
    {
      text: `${nearCap} client${nearCap === 1 ? "" : "s"} ${nearCap === 1 ? "is" : "are"} nearing their authorized hour cap.`,
    },
  ]
}

function directSummaryLines(flagCount: number, flagging: boolean): OwnerSummaryLine[] {
  if (!flagging || flagCount === 0) {
    return [{ text: "Direct engagement is on track this month." }]
  }
  return [
    {
      text: `${flagCount} client${flagCount === 1 ? "" : "s"} ${flagCount === 1 ? "is" : "are"} below 50% direct.`,
    },
  ]
}

const DIRECT_HOURS_SUB_NOTE = "Month still in progress — a monitor, not a miss."

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

  const calendarMonthLabel = formatMonthTableLabel(getCurrentCalendarMonth().label)

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
    const staffHref = row.staffExternalCode
      ? staffProfilePath(row.staffExternalCode)
      : `/staff/${row.staffId}`

    if (row.overdueCount > 0) {
      const consequence = `${row.overdueCount} overdue`
      rows.push({
        id: `${row.staffId}-overdue`,
        label: `${name} — ${consequence}`,
        nameLabel: name,
        consequenceLabel: consequence,
        severity: "overdue",
        magnitude: row.overdueCount,
        href: staffHref,
      })
    }
    if (row.missingCount > 0) {
      const consequence = `${row.missingCount} pending`
      rows.push({
        id: `${row.staffId}-pending`,
        label: `${name} — ${consequence}`,
        nameLabel: name,
        consequenceLabel: consequence,
        severity: "pending",
        magnitude: row.missingCount,
        href: staffHref,
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
    headerLine: notesSummaryLines(notes.totalOverdue, notes.totalMissing)
      .map((line) => line.text)
      .join(" "),
    summaryLines: notesSummaryLines(notes.totalOverdue, notes.totalMissing),
    emptyLabel: "All clear — every note is in for this pay period",
    rows: notesCapped.rows,
    viewAllRows: noteRowCandidates,
    totalRowCount: notesCapped.totalRowCount,
    popupMetaLine: `${notesCapped.totalRowCount} staff · ${payroll.payPeriodTableLabel}`,
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
    ...authOverCap.map((row) => {
      const name = shortClientLabel(row.clientName)
      const consequence = `${row.overHours} hrs over`
      return {
        id: row.authId,
        label: `${name} — ${consequence}`,
        nameLabel: name,
        consequenceLabel: consequence,
        severity: "over-cap" as const,
        magnitude: row.overHours,
        usedHours: row.usedHours,
        authorizedHours: row.authorizedHours,
        href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
      }
    }),
    ...authNearCap.map((row) => {
      const name = shortClientLabel(row.clientName)
      const consequence = `${row.hoursRemaining} hrs left`
      return {
        id: row.authId,
        label: `${name} — ${consequence}`,
        nameLabel: name,
        consequenceLabel: consequence,
        severity: "near-cap" as const,
        magnitude: row.hoursRemaining,
        usedHours: row.usedHours,
        authorizedHours: row.authorizedHours,
        href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
      }
    }),
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
    headerLine: authSummaryLines(authOverCap.length, authNearCap.length, authState)
      .map((line) => line.text)
      .join(" "),
    summaryLines: authSummaryLines(authOverCap.length, authNearCap.length, authState),
    emptyLabel: "All clear — every client within authorized hours",
    rows: authCapped.rows,
    viewAllRows: authRowCandidates,
    totalRowCount: authCapped.totalRowCount,
    popupMetaLine: `${authCapped.totalRowCount} clients · ${calendarMonthLabel}`,
  }

  const directFlagging = shouldFlagClientDirectEngagement()
  const directState: BcbaTileState =
    directFlagging && directFlags.length > 0 ? "monitor" : "healthy"

  const directRowCandidates: OwnerRankedRow[] = directFlags.map((row) => {
    const pct = Math.round(row.directRatio * 100)
    const consequence = `${pct}% direct`
    return {
      id: row.clientId,
      label: `${row.clientLabel} — ${consequence}`,
      nameLabel: row.clientLabel,
      consequenceLabel: consequence,
      severity: "neutral",
      magnitude: 1 - row.directRatio,
      href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
    }
  })

  const directCapped = capRows(directRowCandidates)

  const directTile: OwnerMonitorTile = {
    id: "directHours",
    title: "Direct observation hours",
    state: directState,
    headerLine: directSummaryLines(directFlagging ? directFlags.length : 0, directFlagging)
      .map((line) => line.text)
      .join(" "),
    summaryLines: directSummaryLines(directFlagging ? directFlags.length : 0, directFlagging),
    subNote:
      directFlagging && directFlags.length > 0 ? DIRECT_HOURS_SUB_NOTE : undefined,
    emptyLabel: "All clear — direct engagement on track this month",
    rows: directCapped.rows,
    viewAllRows: directRowCandidates,
    totalRowCount: directCapped.totalRowCount,
    popupMetaLine: `${directRowCandidates.length} clients · ${calendarMonthLabel}`,
    calmNote: directFlagging
      ? undefined
      : "Direct ratios are monitored after the 21st of each month.",
  }

  return {
    monitorTiles: [notesTile, authTile, directTile],
    payroll,
  }
}
