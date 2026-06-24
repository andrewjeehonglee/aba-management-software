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

export const OWNER_CHIP_CAP = 6

export type OwnerMonitorTileId = "notes" | "auth" | "directHours"
export type OwnerFocalSegmentId = "notes" | "payroll" | "auth" | "direct"

export interface OwnerPopoverLine {
  id: string
  text: string
  href?: string
}

export interface OwnerMonitorChip {
  id: string
  label: string
  popoverTitle: string
  popoverLines: OwnerPopoverLine[]
}

export interface OwnerMonitorTile {
  id: OwnerMonitorTileId
  title: string
  state: BcbaTileState
  /** Consequence-framed header line — the tile states the "so what" once. */
  headerLine: string
  emptyLabel: string
  chips: OwnerMonitorChip[]
  overflowCount: number
  overflowChips: OwnerMonitorChip[]
}

export interface OwnerFocalSegment {
  id: OwnerFocalSegmentId
  text: string
  severity: "neutral" | "monitor" | "urgent"
  scrollTargetId: string
}

export interface OwnerFocalSummary {
  segments: OwnerFocalSegment[]
  allClear: boolean
}

export interface OwnerDashboardData {
  monitorTiles: OwnerMonitorTile[]
  focalSummary: OwnerFocalSummary
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

function capChips(chips: OwnerMonitorChip[]): {
  chips: OwnerMonitorChip[]
  overflowCount: number
  overflowChips: OwnerMonitorChip[]
} {
  if (chips.length <= OWNER_CHIP_CAP) {
    return { chips, overflowCount: 0, overflowChips: [] }
  }
  return {
    chips: chips.slice(0, OWNER_CHIP_CAP),
    overflowCount: chips.length - OWNER_CHIP_CAP,
    overflowChips: chips.slice(OWNER_CHIP_CAP),
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

function buildFocalSummary(options: {
  notesOverdue: number
  notesMissing: number
  onHoldHours: number
  authNearCapCount: number
  authOverCapCount: number
  directFlagCount: number
}): OwnerFocalSummary {
  const segments: OwnerFocalSegment[] = []

  const incompleteNotes = options.notesOverdue + options.notesMissing
  if (incompleteNotes > 0) {
    const overduePart =
      options.notesOverdue > 0
        ? `${options.notesOverdue} note${options.notesOverdue === 1 ? "" : "s"} overdue`
        : `${options.notesMissing} note${options.notesMissing === 1 ? "" : "s"} missing`
    segments.push({
      id: "notes",
      text: overduePart,
      severity: options.notesOverdue > 0 ? "urgent" : "monitor",
      scrollTargetId: "owner-pillar-notes",
    })
  }

  if (options.onHoldHours > 0) {
    segments.push({
      id: "payroll",
      text: `${options.onHoldHours} hrs on hold this pay period`,
      severity: "monitor",
      scrollTargetId: "owner-pillar-payroll",
    })
  }

  if (options.authOverCapCount > 0) {
    segments.push({
      id: "auth",
      text: `${options.authOverCapCount} client${options.authOverCapCount === 1 ? "" : "s"} over auth cap`,
      severity: "urgent",
      scrollTargetId: "owner-pillar-auth",
    })
  } else if (options.authNearCapCount > 0) {
    segments.push({
      id: "auth",
      text: `${options.authNearCapCount} client${options.authNearCapCount === 1 ? "" : "s"} near auth cap`,
      severity: "monitor",
      scrollTargetId: "owner-pillar-auth",
    })
  }

  if (options.directFlagCount > 0) {
    segments.push({
      id: "direct",
      text: `${options.directFlagCount} client${options.directFlagCount === 1 ? "" : "s"} under 50% direct`,
      severity: "monitor",
      scrollTargetId: "owner-pillar-direct",
    })
  }

  if (segments.length === 0) {
    segments.push({
      id: "notes",
      text: "All clear this morning — notes in, payroll ready, auth on track",
      severity: "neutral",
      scrollTargetId: "owner-pillar-notes",
    })
  }

  return { segments, allClear: incompleteNotes === 0 && options.onHoldHours === 0 && options.authOverCapCount === 0 && options.authNearCapCount === 0 && options.directFlagCount === 0 }
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

  const notesStaffCount = staffWithNoteIssues.length
  const notesHeaderLine =
    notesState === "healthy"
      ? "All complete this pay period · billing and audit clear"
      : `${notes.totalOverdue > 0 ? `${notes.totalOverdue} overdue` : `${notes.totalMissing} missing`}${notesStaffCount > 0 ? ` across ${notesStaffCount} staff` : ""} · blocks billing, fails audit, holds pay`

  const notesChipCandidates: OwnerMonitorChip[] = staffWithNoteIssues.map((row) => {
    const count = row.overdueCount > 0 ? row.overdueCount : row.missingCount
    const bucket = row.overdueCount > 0 ? "overdue" : "missing"
    const notesHref = row.staffExternalCode
      ? `${staffProfilePath(row.staffExternalCode)}/notes`
      : undefined
    return {
      id: row.staffId,
      label: `${firstName(row.staffName)} · ${count} ${bucket}`,
      popoverTitle: firstName(row.staffName),
      popoverLines: [
        ...(notesHref
          ? [{ id: `${row.staffId}-notes`, text: "View all notes →", href: notesHref }]
          : []),
        ...row.items.map(noteItemToPopoverLine),
      ],
    }
  })
  const notesCapped = capChips(notesChipCandidates)

  const notesTile: OwnerMonitorTile = {
    id: "notes",
    title: "Session notes",
    state: notesState,
    headerLine: notesHeaderLine,
    emptyLabel: "All clear — every note is in for this pay period",
    chips: notesCapped.chips,
    overflowCount: notesCapped.overflowCount,
    overflowChips: notesCapped.overflowChips,
  }

  const authFlagged = sortAuthRunwayRows(
    auth.byClient.filter((row) => authRunwayState(row) !== "healthy"),
  )
  const authOverCap = authFlagged.filter((row) => row.usedHours > row.authorizedHours)
  const authNearCap = authFlagged.filter((row) => row.usedHours <= row.authorizedHours)

  let authState: BcbaTileState = "healthy"
  if (authOverCap.length > 0) authState = "urgent"
  else if (authNearCap.length > 0) authState = "monitor"

  const authHeaderLine =
    authState === "healthy"
      ? "All clients within cap · billing clear"
      : authOverCap.length > 0
        ? `${authOverCap.length} client${authOverCap.length === 1 ? "" : "s"} over cap · billing stopped`
        : `${authNearCap.length} client${authNearCap.length === 1 ? "" : "s"} near cap · billing-stop risk`

  const authChipCandidates: OwnerMonitorChip[] = authFlagged.map((row) => ({
    id: row.authId,
    label:
      row.usedHours > row.authorizedHours
        ? `${shortClientLabel(row.clientName)} · ${row.overHours} hrs over`
        : `${shortClientLabel(row.clientName)} · ${row.hoursRemaining} hrs left`,
    popoverTitle: shortClientLabel(row.clientName),
    popoverLines: [
      {
        id: row.authId,
        text: `${row.hoursRemaining} hrs left of ${row.authorizedHours} authorized`,
        href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
      },
      {
        id: `${row.authId}-used`,
        text: `${row.usedHours} hrs used this month`,
        href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
      },
    ],
  }))
  const authCapped = capChips(authChipCandidates)

  const authTile: OwnerMonitorTile = {
    id: "auth",
    title: "Authorized hours",
    state: authState,
    headerLine: authHeaderLine,
    emptyLabel: "All clear — every client within authorized hours",
    chips: authCapped.chips,
    overflowCount: authCapped.overflowCount,
    overflowChips: authCapped.overflowChips,
  }

  const directFlagging = shouldFlagClientDirectEngagement()
  const directState: BcbaTileState =
    directFlagging && directFlags.length > 0 ? "monitor" : "healthy"

  const directHeaderLine =
    directState === "healthy"
      ? "Direct engagement on track · monitor (month in progress)"
      : `${directFlags.length} client${directFlags.length === 1 ? "" : "s"} under 50% direct · monitor (month in progress)`

  const directChipCandidates: OwnerMonitorChip[] = directFlagging
    ? directFlags.map((row) => ({
        id: row.clientId,
        label: `${row.clientLabel} · ${Math.round(row.directRatio * 100)}%`,
        popoverTitle: row.clientLabel,
        popoverLines: [
          {
            id: row.clientId,
            text: `${row.directHours} direct hrs of ${row.authorizedHours} authorized`,
            href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
          },
          {
            id: `${row.clientId}-pct`,
            text: `${Math.round(row.directRatio * 100)}% direct engagement`,
            href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
          },
        ],
      }))
    : []

  const directCapped = capChips(directChipCandidates)

  const directTile: OwnerMonitorTile = {
    id: "directHours",
    title: "Direct hours",
    state: directState,
    headerLine: directHeaderLine,
    emptyLabel: "All clear — direct engagement on track this month",
    chips: directCapped.chips,
    overflowCount: directCapped.overflowCount,
    overflowChips: directCapped.overflowChips,
  }

  const focalSummary = buildFocalSummary({
    notesOverdue: notes.totalOverdue,
    notesMissing: notes.totalMissing,
    onHoldHours: payroll.totalOnHoldHours,
    authNearCapCount: authNearCap.length,
    authOverCapCount: authOverCap.length,
    directFlagCount: directFlagging ? directFlags.length : 0,
  })

  return {
    monitorTiles: [notesTile, authTile, directTile],
    focalSummary,
    payroll,
  }
}
