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
import { getBcbaSummaries } from "@/lib/rosterTable"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { isSupervisionBelowRequirement } from "@/lib/supervision"

export type OwnerConcernId = "notes" | "auth" | "directHours" | "coverage"

export interface OwnerConcern {
  id: OwnerConcernId
  title: string
  state: BcbaTileState
  situation: string
  chipLine: string
  actionLabel: string
  actionHref: string
}

export interface OwnerDashboardData {
  concerns: OwnerConcern[]
  hoursGap: PayPeriodHoursGapSummary
  completenessLine: string | null
  loading?: boolean
}

function formatStaffNoteChip(staffName: string, count: number): string {
  return `${firstName(staffName)} ${count}`
}

function bcbaTeamLabel(fullName: string): string {
  const name = firstName(fullName)
  return `${name}'s team`
}

function buildCompletenessLine(parts: string[]): string | null {
  if (parts.length === 0) return null
  if (parts.length === 1) return `${parts[0]}.`
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}.`
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}.`
}

export async function getOwnerDashboardData(options: {
  practiceId: string
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

  const [notes, auth, directFlags, bcbaSummaries, hoursGap, supervision] = await Promise.all([
    getNotesStatus(undefined, scope),
    getAuthUtilizationByMonth(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getClientDirectEngagementFlags(undefined, scope.clientIds ? { clientIds: scope.clientIds } : undefined),
    getBcbaSummaries(options.practiceId),
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
    const topStaff = staffWithIssues[0]
    const chipLine = staffWithIssues
      .map((row) => {
        const count = row.overdueCount > 0 ? row.overdueCount : row.missingCount
        return formatStaffNoteChip(row.staffName, count)
      })
      .join(" · ")

    concerns.push({
      id: "notes",
      title: "Session notes are blocking payroll",
      state: notesState,
      situation:
        notes.totalOverdue > 0
          ? "Overdue notes block billing and are the first thing an audit pulls."
          : "Notes are still missing for completed sessions this pay period.",
      chipLine,
      actionLabel: "Review session notes",
      actionHref: topStaff?.staffExternalCode
        ? staffProfilePath(topStaff.staffExternalCode)
        : "/audit",
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
    const topClient = authFlagged[0]!
    const chipLine = authFlagged
      .map((row) => {
        if (row.usedHours > row.authorizedHours) {
          return `${shortClientLabel(row.clientName)} ${row.overHours} hrs over`
        }
        return `${shortClientLabel(row.clientName)} ${row.hoursRemaining} hrs`
      })
      .join(" · ")

    concerns.push({
      id: "auth",
      title: "Authorized hours are running low",
      state: authState,
      situation:
        "Reallocate staff to other clients or request more hours before the cap — not a last-minute scramble.",
      chipLine,
      actionLabel: "View authorization",
      actionHref: topClient.clientCode
        ? clientProfilePath(topClient.clientCode)
        : "/clients",
    })
  } else {
    healthyParts.push("authorizations look good")
  }

  if (directFlags.length > 0) {
    const topClient = directFlags[0]!
    const chipLine = directFlags
      .map((row) => `${row.clientLabel} ${row.directHours} hrs`)
      .join(" · ")

    concerns.push({
      id: "directHours",
      title: "Direct engagement is below 50% of authorized hours",
      state: "urgent",
      situation:
        "These clients aren't getting enough direct service relative to their authorized hours this month.",
      chipLine,
      actionLabel: "View client",
      actionHref: topClient.clientCode
        ? clientProfilePath(topClient.clientCode)
        : "/clients",
    })
  }

  const coverageTeams = bcbaSummaries.filter((row) => row.unassignedBtCount > 0)
  if (coverageTeams.length > 0) {
    const chipLine = coverageTeams
      .map((row) => `${bcbaTeamLabel(row.fullName)} ${row.unassignedBtCount}`)
      .join(" · ")

    concerns.push({
      id: "coverage",
      title: "Clients are waiting for technician assignment",
      state: "monitor",
      situation:
        "Unstaffed clients can't receive services until a technician is assigned.",
      chipLine,
      actionLabel: "Assign technicians",
      actionHref: "/clients",
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
