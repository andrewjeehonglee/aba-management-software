import type { AttentionBubbleTone } from "@/components/dashboard/AttentionBubble"
import type { MetricPopoverGroup, MetricPopoverItem } from "@/components/dashboard/MetricPopover"
import {
  AUTH_RUNWAY_MONITOR_HOURS,
  AUTH_RUNWAY_URGENT_HOURS,
} from "@/lib/authorization"
import type { ClientAuthUtilRow } from "@/lib/authUtilization"
import type { BcbaTileState } from "@/lib/bcbaTileState"
import { firstName } from "@/lib/ownerDashboardStatus"
import { OWNER_OVER_CAP_INK } from "@/lib/ownerDashboardConcerns"
import type { NotesStatusSummary } from "@/lib/notesStatus"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import type { StaffHoursSummary } from "@/lib/staffHours"
import { isSupervisionBelowRequirement } from "@/lib/supervision"
import type { SupervisionRecord } from "@/lib/supabase"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export const TILE_DEFINITIONS = {
  notes: {
    id: "session-notes",
    title: "Session notes",
    selfTitle: "My session notes",
    requirement: "",
  },
  directHours: {
    id: "direct-hours",
    title: "Direct observation hours",
    selfTitle: "My direct observation hours",
    requirement: "",
  },
  supervision: {
    id: "supervision",
    title: "Supervision compliance",
    selfTitle: "My supervision compliance",
    requirement: "",
  },
  authorization: {
    id: "authorization",
    title: "Authorized hours",
    requirement: "",
  },
} as const

export type DashboardMetricTone = "urgent" | "monitor" | "neutral"

export interface DashboardDualMetricSide {
  value: number
  unit: string
  tone: DashboardMetricTone
}

export interface DashboardTileViewModel {
  id: string
  title: string
  requirement: string
  state: BcbaTileState
  metric: number
  descriptor: string
  dualMetric?: {
    left: DashboardDualMetricSide
    right: DashboardDualMetricSide
  }
  showViewAll?: boolean
  popoverItems?: MetricPopoverItem[]
  popoverGroups?: MetricPopoverGroup[]
  popoverEmptyLabel: string
}

export const BIG_METRIC_CLASS =
  "text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums"

export function formatDashboardMonthLabel(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  return trimmed.replace(/^Month of\s+/i, "")
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

function tileTitle(
  def: { title: string; selfTitle?: string },
  selfMode?: boolean,
): string {
  if (selfMode && def.selfTitle) return def.selfTitle
  return def.title
}

export function metricToneInk(tone: DashboardMetricTone): string {
  if (tone === "urgent") return OWNER_OVER_CAP_INK
  if (tone === "monitor") return P.amberInk
  return P.soft
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
  return `${row.hoursRemaining} hrs remaining`
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

  let state: BcbaTileState = "healthy"
  if (overdueTotal > 0) state = "urgent"
  else if (missingTotal > 0) state = "monitor"

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
        value: item.bucket === "overdue" ? "Overdue" : "Pending",
        tone: (item.bucket === "overdue" ? "urgent" : "monitor") as AttentionBubbleTone,
        href: item.clientCode ? clientProfilePath(item.clientCode) : undefined,
      })),
    }))

  return {
    id: TILE_DEFINITIONS.notes.id,
    title: tileTitle(TILE_DEFINITIONS.notes, options?.selfMode),
    requirement: TILE_DEFINITIONS.notes.requirement,
    state,
    metric: overdueTotal + missingTotal,
    descriptor: "",
    dualMetric: {
      left: {
        value: overdueTotal,
        unit: "notes overdue",
        tone: "urgent",
      },
      right: {
        value: missingTotal,
        unit: "notes pending",
        tone: "monitor",
      },
    },
    showViewAll: popoverGroups.length > 0,
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
        : "All staff meet the 50% requirement"
      : options?.selfMode
        ? "Below 50% requirement"
        : "staff below 50% requirement"

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
    title: tileTitle(TILE_DEFINITIONS.directHours, options?.selfMode),
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
  const flagged = records.filter((row) => isSupervisionBelowRequirement(row.supervisionPct))
  const state: BcbaTileState = flagged.length > 0 ? "urgent" : "healthy"
  const metric = options?.selfMode ? (flagged.length > 0 ? 1 : 0) : flagged.length

  const descriptor =
    flagged.length === 0
      ? options?.selfMode
        ? "Met the 5% requirement"
        : "All staff meet the 5% requirement"
      : options?.selfMode
        ? "Below 5% requirement"
        : "staff below 5% requirement"

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
    title: tileTitle(TILE_DEFINITIONS.supervision, options?.selfMode),
    requirement: TILE_DEFINITIONS.supervision.requirement,
    state,
    metric,
    descriptor,
    popoverItems,
    popoverEmptyLabel: options?.selfMode ? "Met the 5% requirement" : "All staff meet the 5% requirement",
  }
}

export function buildAuthorizationTileViewModel(
  byClient: ClientAuthUtilRow[],
): DashboardTileViewModel {
  const flagged = sortAuthRunwayRows(
    byClient.filter((row) => row.usedHours > row.authorizedHours),
  )

  const state: BcbaTileState = flagged.length > 0 ? "urgent" : "healthy"

  const descriptor =
    flagged.length === 0
      ? "No clients over authorized hours"
      : "clients over authorized hours"

  const popoverItems: MetricPopoverItem[] = flagged.map((row) => ({
    id: row.authId,
    name: shortClientLabel(row.clientName),
    value: authRunwayValue(row),
    tone: "urgent",
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
    popoverEmptyLabel: "No clients over authorized hours",
  }
}
