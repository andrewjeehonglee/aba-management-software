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
import { PRACTICE_TIMEZONE } from "@/lib/sessions"
import { clientProfilePath } from "@/lib/rosterScope"

export type OwnerMonitorTileId = "notes" | "auth" | "directHours"

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
  situation: string
  chips: OwnerMonitorChip[]
}

export interface OwnerDashboardData {
  monitorTiles: OwnerMonitorTile[]
  payroll: PayPeriodHoursGapSummary
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

  const [notes, auth, directFlags, payroll] = await Promise.all([
    getNotesStatus(undefined, scope),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getClientDirectEngagementFlags(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getPayPeriodHoursGap(undefined, {
      staffIds: payrollRoster.map((s) => s.id),
      clientIds: scope.clientIds,
      rosterStaff: payrollRoster,
    }),
  ])

  const staffWithNoteIssues = notes.byStaff.filter(
    (row) => row.missingCount + row.overdueCount > 0,
  )
  const notesState: BcbaTileState =
    notes.totalOverdue > 0 ? "urgent" : staffWithNoteIssues.length > 0 ? "monitor" : "healthy"

  const notesTile: OwnerMonitorTile = {
    id: "notes",
    title: "Session notes",
    state: notesState,
    situation:
      notesState === "healthy"
        ? "All session notes are in for this pay period."
        : "Overdue notes block billing and an audit pulls them first.",
    chips: staffWithNoteIssues.map((row) => ({
      id: row.staffId,
      label: `${firstName(row.staffName)} ${row.overdueCount > 0 ? row.overdueCount : row.missingCount}`,
      popoverTitle: firstName(row.staffName),
      popoverLines: row.items.map(noteItemToPopoverLine),
    })),
  }

  const authPreventative = sortAuthRunwayRows(
    auth.byClient.filter(
      (row) =>
        row.usedHours <= row.authorizedHours && authRunwayState(row) !== "healthy",
    ),
  )
  let authState: BcbaTileState = "healthy"
  if (authPreventative.some((row) => authRunwayState(row) === "urgent")) {
    authState = "urgent"
  } else if (authPreventative.length > 0) {
    authState = "monitor"
  }

  const authTile: OwnerMonitorTile = {
    id: "auth",
    title: "Authorized hours",
    state: authState,
    situation:
      authState === "healthy"
        ? "No clients are approaching their authorized hour cap."
        : "Several clients are close to their authorized hour cap.",
    chips: authPreventative.map((row) => ({
      id: row.authId,
      label: `${shortClientLabel(row.clientName)} ${row.hoursRemaining} hrs left`,
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
    })),
  }

  const directFlagging = shouldFlagClientDirectEngagement()
  const directState: BcbaTileState =
    directFlagging && directFlags.length > 0
      ? directFlags.some((row) => row.directRatio < 0.4)
        ? "urgent"
        : "monitor"
      : "healthy"

  const directTile: OwnerMonitorTile = {
    id: "directHours",
    title: "Direct hours",
    state: directState,
    situation:
      directState === "healthy"
        ? "All clients meet the direct engagement minimum."
        : "Direct engagement is below half of each client's authorized hours this month.",
    chips: directFlagging
      ? directFlags.map((row) => ({
          id: row.clientId,
          label: `${row.clientLabel} ${Math.round(row.directRatio * 100)}%`,
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
      : [],
  }

  return {
    monitorTiles: [notesTile, authTile, directTile],
    payroll,
  }
}
