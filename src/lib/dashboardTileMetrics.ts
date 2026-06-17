import type { AttentionBubbleTone } from "@/components/dashboard/AttentionBubble"
import type { MetricPopoverGroup, MetricPopoverItem } from "@/components/dashboard/MetricPopover"
import {
  AUTH_RUNWAY_MONITOR_HOURS,
  AUTH_RUNWAY_URGENT_HOURS,
} from "@/lib/authorization"
import type { ClientAuthUtilRow } from "@/lib/authUtilization"
import type { BcbaTileState } from "@/lib/bcbaTileState"
import { firstName } from "@/lib/ownerDashboardStatus"
import type { NotesStatusSummary } from "@/lib/notesStatus"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import type { StaffHoursSummary } from "@/lib/staffHours"
import { SUPERVISION_THRESHOLD } from "@/lib/supervision"
import type { SupervisionRecord } from "@/lib/supabase"

export const TILE_DEFINITIONS = {
  notes: {
    id: "session-notes",
    title: "Session notes",
    requirement: "Notes due this pay period",
  },
  directHours: {
    id: "direct-hours",
    title: "Direct hours",
    requirement: "50% of hours must be direct service",
  },
  supervision: {
    id: "supervision",
    title: "Supervision",
    requirement: "RBTs must receive 5% supervision",
  },
  authorization: {
    id: "authorization",
    title: "Authorization",
    requirement: "Hours left before a client hits their cap",
  },
} as const

export interface DashboardTileViewModel {
  id: string
  title: string
  requirement: string
  state: BcbaTileState
  metric: number
  descriptor: string
  popoverItems?: MetricPopoverItem[]
  popoverGroups?: MetricPopoverGroup[]
  popoverEmptyLabel: string
}

export function shortClientLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 4)
  }
  return trimmed.length <= 5 ? trimmed : trimmed.slice(0, 4)
}

export function staffDisplayLabel(
  staffName: string,
  options?: { selfMode?: boolean; selfStaffId?: string; staffId?: string },
): string {
  if (options?.selfMode && options.selfStaffId && options.staffId === options.selfStaffId) {
    return "You"
  }
  return firstName(staffName)
}

export function authRunwayState(row: ClientAuthUtilRow): BcbaTileState {
  if (row.usedHours > row.authorizedHours) return "urgent"
  if (row.hoursRemaining <= AUTH_RUNWAY_URGENT_HOURS) return "urgent"
  if (row.hoursRemaining <= AUTH_RUNWAY_MONITOR_HOURS) return "monitor"
  return "healthy"
}

export function authRunwayValue(row: ClientAuthUtilRow): string {
  if (row.usedHours > row.authorizedHours) {
    return `${row.overHours} hrs over`
  }
  return `${row.hoursRemaining} hrs left`
}

export function sortAuthRunwayRows(rows: ClientAuthUtilRow[]): ClientAuthUtilRow[] {
  return [...rows].sort((a, b) => {
    const aOver = a.usedHours > a.authorizedHours
    const bOver = b.usedHours > b.authorizedHours
    if (aOver && bOver) return b.overHours - a.overHours
    if (aOver) return -1
    if (bOver) return 1
    return a.hoursRemaining - b.hoursRemaining
  })
}

export function buildNotesTileViewModel(
  notes: NotesStatusSummary,
  options?: { selfMode?: boolean; selfStaffId?: string },
): DashboardTileViewModel {
  const overdueTotal = notes.totalOverdue
  const missingTotal = notes.totalMissing
  const incompleteTotal = overdueTotal + missingTotal

  let state: BcbaTileState = "healthy"
  if (overdueTotal > 0) state = "urgent"
  else if (missingTotal > 0) state = "monitor"

  const descriptor =
    incompleteTotal === 0
      ? "All notes complete"
      : [
          missingTotal > 0 ? `${missingTotal} missing` : null,
          overdueTotal > 0 ? `${overdueTotal} overdue` : null,
        ]
          .filter(Boolean)
          .join(" · ")

  const popoverGroups: MetricPopoverGroup[] = notes.byStaff
    .filter((row) => row.missingCount + row.overdueCount > 0)
    .map((row) => ({
      id: row.staffId,
      name: staffDisplayLabel(row.staffName, {
        selfMode: options?.selfMode,
        selfStaffId: options?.selfStaffId,
        staffId: row.staffId,
      }),
      href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
      children: row.items.map((item) => ({
        id: item.sessionId,
        name: shortClientLabel(item.clientName),
        value: item.bucket === "overdue" ? "Overdue" : "Missing",
        tone: (item.bucket === "overdue" ? "urgent" : "monitor") as AttentionBubbleTone,
        href: item.clientCode ? clientProfilePath(item.clientCode) : undefined,
      })),
    }))

  return {
    id: TILE_DEFINITIONS.notes.id,
    title: TILE_DEFINITIONS.notes.title,
    requirement: TILE_DEFINITIONS.notes.requirement,
    state,
    metric: incompleteTotal,
    descriptor,
    popoverGroups,
    popoverEmptyLabel: "All notes complete",
  }
}

export function buildDirectHoursTileViewModel(
  hours: StaffHoursSummary,
  options?: { selfMode?: boolean; selfStaffId?: string },
): DashboardTileViewModel {
  const flagged = hours.byStaff.filter((row) => row.flagged)
  const state: BcbaTileState = flagged.length > 0 ? "urgent" : "healthy"
  const metric = options?.selfMode ? (flagged.length > 0 ? 1 : 0) : flagged.length

  const descriptor =
    flagged.length === 0
      ? options?.selfMode
        ? "On track"
        : "All staff meet the direct requirement"
      : options?.selfMode
        ? "Below the 50% direct requirement"
        : `${flagged.length} staff below the 50% direct requirement`

  const popoverItems: MetricPopoverItem[] = flagged.map((row) => ({
    id: row.staffId,
    name: staffDisplayLabel(row.staffName, {
      selfMode: options?.selfMode,
      selfStaffId: options?.selfStaffId,
      staffId: row.staffId,
    }),
    value: `${Math.round(row.directPct * 100)}%`,
    tone: "urgent",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  return {
    id: TILE_DEFINITIONS.directHours.id,
    title: TILE_DEFINITIONS.directHours.title,
    requirement: TILE_DEFINITIONS.directHours.requirement,
    state,
    metric,
    descriptor,
    popoverItems,
    popoverEmptyLabel: options?.selfMode ? "No billable hours this month" : "All staff on track",
  }
}

export function buildSupervisionTileViewModel(
  records: SupervisionRecord[],
  options?: { selfMode?: boolean; selfStaffId?: string },
): DashboardTileViewModel {
  const flagged = records.filter((row) => row.supervisionPct < SUPERVISION_THRESHOLD)
  const state: BcbaTileState = flagged.length > 0 ? "urgent" : "healthy"
  const metric = options?.selfMode ? (flagged.length > 0 ? 1 : 0) : flagged.length

  const descriptor =
    flagged.length === 0
      ? options?.selfMode
        ? "Supervision received this month"
        : "All staff meet the supervision requirement"
      : options?.selfMode
        ? "Below the 5% supervision requirement"
        : `${flagged.length} staff below the 5% supervision requirement`

  const popoverItems: MetricPopoverItem[] = flagged.map((row) => ({
    id: row.staffId,
    name: staffDisplayLabel(row.staffName, {
      selfMode: options?.selfMode,
      selfStaffId: options?.selfStaffId,
      staffId: row.staffId,
    }),
    value: `${row.supervisionPct.toFixed(1)}%`,
    tone: "urgent",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  return {
    id: TILE_DEFINITIONS.supervision.id,
    title: TILE_DEFINITIONS.supervision.title,
    requirement: TILE_DEFINITIONS.supervision.requirement,
    state,
    metric,
    descriptor,
    popoverItems,
    popoverEmptyLabel: options?.selfMode ? "No supervision data this month" : "All staff compliant",
  }
}

export function buildAuthorizationTileViewModel(
  byClient: ClientAuthUtilRow[],
): DashboardTileViewModel {
  const flagged = sortAuthRunwayRows(
    byClient.filter((row) => authRunwayState(row) !== "healthy"),
  )

  let state: BcbaTileState = "healthy"
  if (flagged.some((row) => authRunwayState(row) === "urgent")) state = "urgent"
  else if (flagged.length > 0) state = "monitor"

  const descriptor =
    flagged.length === 0
      ? "All clients have runway on authorized hours"
      : `${flagged.length} client${flagged.length === 1 ? "" : "s"} running low on authorized hours`

  const popoverItems: MetricPopoverItem[] = flagged.map((row) => ({
    id: row.authId,
    name: shortClientLabel(row.clientName),
    value: authRunwayValue(row),
    tone: authRunwayState(row) === "urgent" ? "urgent" : "monitor",
    href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
  }))

  return {
    id: TILE_DEFINITIONS.authorization.id,
    title: TILE_DEFINITIONS.authorization.title,
    requirement: TILE_DEFINITIONS.authorization.requirement,
    state,
    metric: flagged.length,
    descriptor,
    popoverItems,
    popoverEmptyLabel: "All clients have runway",
  }
}
