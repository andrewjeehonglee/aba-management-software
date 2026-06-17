import type { BcbaTileState } from "@/lib/bcbaTileState"
import {
  authRunwayState,
  shortClientLabel,
  sortAuthRunwayRows,
} from "@/lib/dashboardTileMetrics"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { getClientDirectEngagementFlags } from "@/lib/clientDirectEngagement"
import { loadSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getNotesStatus } from "@/lib/notesStatus"
import { firstName } from "@/lib/ownerDashboardStatus"
import {
  getPayPeriodHoursGap,
  type PayPeriodHoursGapSummary,
} from "@/lib/payPeriodHoursGap"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { isSupervisionBelowRequirement } from "@/lib/supervision"

export type OwnerConcernId = "notes" | "auth" | "directHours"

export interface OwnerConcernItem {
  label: string
  value: string
  href: string
}

export interface OwnerConcern {
  id: OwnerConcernId
  title: string
  state: BcbaTileState
  situation: string
  items: OwnerConcernItem[]
}

export interface OwnerDashboardData {
  concerns: OwnerConcern[]
  hoursGap: PayPeriodHoursGapSummary
  completenessLine: string | null
  loading?: boolean
}

function buildCompletenessLine(parts: string[]): string | null {
  if (parts.length === 0) return null
  if (parts.length === 1) return `${parts[0]}.`
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}.`
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}.`
}

export async function getOwnerDashboardData(options: {
  staffIds: string[]
  clientIds: string[]
  allStaffIds: string[]
  includeCaseloadStaff?: boolean
}): Promise<Omit<OwnerDashboardData, "loading">> {
  const scope = {
    staffIds: options.staffIds.length ? options.staffIds : undefined,
    clientIds: options.clientIds.length ? options.clientIds : undefined,
    includeCaseloadStaff: options.includeCaseloadStaff,
  }

  const [notes, auth, directFlags, hoursGap, supervision] = await Promise.all([
    getNotesStatus(undefined, scope),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getClientDirectEngagementFlags(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getPayPeriodHoursGap(undefined, {
      staffIds: options.allStaffIds.length ? options.allStaffIds : undefined,
      clientIds: scope.clientIds,
    }),
    options.staffIds.length
      ? loadSupervisionRecordsForTile(options.staffIds)
      : Promise.resolve({ records: [], displayMonthLabel: "" }),
  ])

  const concerns: OwnerConcern[] = []
  const healthyParts: string[] = []

  const incompleteTotal = notes.totalMissing + notes.totalOverdue
  if (incompleteTotal > 0) {
    const staffWithIssues = notes.byStaff.filter(
      (row) => row.missingCount + row.overdueCount > 0,
    )
    const notesState: BcbaTileState =
      notes.totalOverdue > 0 ? "urgent" : "monitor"

    concerns.push({
      id: "notes",
      title: "Session notes are overdue",
      state: notesState,
      situation: "Overdue notes block billing and an audit pulls them first.",
      items: staffWithIssues.map((row) => ({
        label: firstName(row.staffName),
        value: String(row.overdueCount > 0 ? row.overdueCount : row.missingCount),
        href: row.staffExternalCode
          ? staffProfilePath(row.staffExternalCode)
          : "/audit",
      })),
    })
  } else {
    healthyParts.push("the rest of the team's notes are in")
  }

  const authFlagged = sortAuthRunwayRows(
    auth.byClient.filter((row) => authRunwayState(row) !== "healthy"),
  )
  if (authFlagged.length > 0) {
    let authState: BcbaTileState = "monitor"
    if (authFlagged.some((row) => authRunwayState(row) === "urgent")) {
      authState = "urgent"
    }

    concerns.push({
      id: "auth",
      title: "Authorized hours running low",
      state: authState,
      situation: "Several clients are close to their authorized hour cap.",
      items: authFlagged.map((row) => ({
        label: shortClientLabel(row.clientName),
        value:
          row.usedHours > row.authorizedHours
            ? `${row.overHours} hrs over`
            : `${row.hoursRemaining} hrs`,
        href: row.clientCode ? clientProfilePath(row.clientCode) : "/clients",
      })),
    })
  } else {
    healthyParts.push("authorizations look good")
  }

  if (directFlags.length > 0) {
    concerns.push({
      id: "directHours",
      title: "Clients under direct-hours minimum",
      state: "monitor",
      situation: "Direct engagement is below half of each client's authorized hours this month.",
      items: directFlags.map((row) => ({
        label: row.clientLabel,
        value: `${row.directHours} hrs`,
        href: row.clientCode ? clientProfilePath(row.clientCode) : "/clients",
      })),
    })
  }

  const supervisionFlagged = supervision.records.some((row) =>
    isSupervisionBelowRequirement(row.supervisionPct),
  )
  if (!supervisionFlagged) {
    healthyParts.unshift("Supervision is compliant")
  }

  const completenessLine =
    concerns.length === 0
      ? "Everything looks on track for your practice today."
      : buildCompletenessLine(healthyParts)

  return {
    concerns,
    hoursGap,
    completenessLine,
  }
}
