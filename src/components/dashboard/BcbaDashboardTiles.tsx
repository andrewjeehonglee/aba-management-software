import { useEffect, useState } from "react"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { BCBA_AUTH_MONITOR_THRESHOLD, type BcbaTileState } from "@/lib/bcbaTileState"
import { filterSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { firstName } from "@/lib/ownerDashboardStatus"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { getSupervisionForStaffIds, supabase } from "@/lib/supabase"
import { SUPERVISION_THRESHOLD } from "@/lib/supervision"
import type { AttentionBubbleTone } from "@/components/dashboard/AttentionBubble"
import {
  BcbaDashboardTile,
  BcbaDashboardTileError,
  BcbaDashboardTileSkeleton,
  type BcbaBubbleItem,
} from "@/components/dashboard/BcbaDashboardTile"

function shortClientLabel(name: string): string {
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

function payPeriodBlock(label: string) {
  if (!label) {
    return (
      <>
        <span className="block">Pay period</span>
        <span className="block">—</span>
      </>
    )
  }
  return (
    <>
      <span className="block">Pay period</span>
      <span className="block">{label}</span>
    </>
  )
}

function monthBlock(label: string) {
  return <span className="block">{label || "—"}</span>
}

export function BcbaDashboardTiles({
  refreshKey,
  notesStaffIds,
  hoursStaffIds,
  superviseeStaffIds,
  clientIds,
  includeZeroHourStaff,
  includeCaseloadStaff,
}: {
  refreshKey?: number
  notesStaffIds: string[]
  hoursStaffIds: string[]
  superviseeStaffIds: string[]
  clientIds: string[]
  includeZeroHourStaff?: boolean
  includeCaseloadStaff?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const [notes, setNotes] = useState<Awaited<ReturnType<typeof getNotesStatus>> | null>(null)
  const [hours, setHours] = useState<Awaited<ReturnType<typeof getStaffHoursByMonth>> | null>(null)
  const [supervision, setSupervision] = useState<
    Awaited<ReturnType<typeof filterSupervisionRecordsForTile>>["records"]
  >([])
  const [supervisionMonthLabel, setSupervisionMonthLabel] = useState("")
  const [auth, setAuth] = useState<Awaited<ReturnType<typeof getAuthUtilizationByMonth>> | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const notesScope =
      notesStaffIds.length || clientIds.length || includeCaseloadStaff
        ? {
            staffIds: notesStaffIds.length ? notesStaffIds : undefined,
            clientIds: clientIds.length ? clientIds : undefined,
            includeCaseloadStaff,
          }
        : undefined

    const hoursScope =
      hoursStaffIds.length || clientIds.length || includeZeroHourStaff
        ? {
            staffIds: hoursStaffIds.length ? hoursStaffIds : undefined,
            clientIds: clientIds.length ? clientIds : undefined,
            includeZeroHourStaff,
          }
        : undefined

    const loadSupervision = async () => {
      if (!superviseeStaffIds.length) return []
      let records = await getSupervisionForStaffIds(superviseeStaffIds)
      const present = new Set(records.map((r) => r.staffId))
      const missingIds = superviseeStaffIds.filter((id) => !present.has(id))
      if (missingIds.length > 0) {
        const { data: staffRows } = await supabase
          .from("staff")
          .select("id, full_name, external_code, team")
          .in("id", missingIds)
          .eq("status", "active")
        for (const s of (staffRows ?? []) as {
          id: string
          full_name: string
          external_code: string | null
          team: string | null
        }[]) {
          records.push({
            id: `placeholder-${s.id}`,
            staffId: s.id,
            staffName: s.full_name,
            staffExternalCode: s.external_code,
            staffTeam: s.team?.startsWith("Team") ? s.team : s.team ? `Team ${s.team}` : "",
            supervisionPct: 0,
            periodStart: "2026-06-01",
            periodEnd: "2026-06-30",
          })
        }
      }
      const filtered = filterSupervisionRecordsForTile(records)
      setSupervisionMonthLabel(filtered.displayMonthLabel)
      return filtered.records
    }

    Promise.all([
      getNotesStatus(undefined, notesScope),
      getStaffHoursByMonth(undefined, hoursScope),
      loadSupervision(),
      getAuthUtilizationByMonth(undefined, clientIds.length ? { clientIds } : undefined),
    ])
      .then(([notesData, hoursData, supervisionData, authData]) => {
        setNotes(notesData)
        setHours(hoursData)
        setSupervision(supervisionData)
        setAuth(authData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false))
  }, [
    refreshKey,
    notesStaffIds.join(","),
    hoursStaffIds.join(","),
    superviseeStaffIds.join(","),
    clientIds.join(","),
    includeZeroHourStaff,
    includeCaseloadStaff,
    retryTick,
  ])

  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <BcbaDashboardTileSkeleton key={i} />
        ))}
      </>
    )
  }

  if (error) {
    return (
      <BcbaDashboardTileError
        className="col-span-full"
        title="Dashboard tiles"
        message={error}
        onRetry={() => setRetryTick((k) => k + 1)}
      />
    )
  }

  const notesPeriod = notes?.payPeriodLabel ?? ""
  const overdueTotal = notes?.totalOverdue ?? 0
  const missingTotal = notes?.totalMissing ?? 0
  const incompleteNotesTotal = overdueTotal + missingTotal

  let notesState: BcbaTileState = "healthy"
  if (overdueTotal > 0) notesState = "urgent"
  else if (missingTotal > 0) notesState = "monitor"

  const notesPopover: BcbaBubbleItem[] = [
    ...(missingTotal > 0
      ? [{ id: "missing", name: "Missing notes", value: String(missingTotal), tone: "monitor" as AttentionBubbleTone }]
      : []),
    ...(overdueTotal > 0
      ? [{ id: "overdue", name: "Overdue notes", value: String(overdueTotal), tone: "urgent" as AttentionBubbleTone }]
      : []),
  ]

  const hoursMonth = hours?.monthLabel ?? ""
  const hoursFlagged = (hours?.byStaff ?? []).filter((r) => r.flagged)
  const hoursState: BcbaTileState = hoursFlagged.length > 0 ? "urgent" : "healthy"
  const hoursPopover: BcbaBubbleItem[] = hoursFlagged.map((row) => ({
    id: row.staffId,
    name: firstName(row.staffName),
    value: `${Math.round(row.directPct * 100)}%`,
    tone: "urgent",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  const supervisionFlagged = supervision.filter((r) => r.supervisionPct < SUPERVISION_THRESHOLD)
  const supervisionState: BcbaTileState =
    supervisionFlagged.length > 0 ? "urgent" : "healthy"
  const supervisionPopover: BcbaBubbleItem[] = supervisionFlagged.map((row) => ({
    id: row.staffId,
    name: firstName(row.staffName),
    value: `${row.supervisionPct.toFixed(1)}%`,
    tone: "urgent",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  const authMonth = auth?.monthLabel ?? ""
  const authAttention = (auth?.byClient ?? []).filter(
    (row) => row.utilizationPct >= BCBA_AUTH_MONITOR_THRESHOLD,
  )
  const authHasUrgent = authAttention.some((row) => row.utilizationPct > 100)
  const authHasMonitor = authAttention.some(
    (row) =>
      row.utilizationPct >= BCBA_AUTH_MONITOR_THRESHOLD && row.utilizationPct <= 100,
  )
  let authState: BcbaTileState = "healthy"
  if (authHasUrgent) authState = "urgent"
  else if (authHasMonitor) authState = "monitor"

  const authPopover: BcbaBubbleItem[] = authAttention.map((row) => ({
    id: row.authId,
    name: shortClientLabel(row.clientName),
    value: `${row.utilizationPct}%`,
    tone: row.utilizationPct > 100 ? "urgent" : "monitor",
    href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
  }))

  return (
    <>
      <BcbaDashboardTile
        id="notes-overdue"
        title="Session notes"
        state={notesState}
        period={payPeriodBlock(notesPeriod)}
        metric={incompleteNotesTotal}
        unit="incomplete notes"
        popoverItems={notesPopover}
        popoverEmptyLabel="All notes complete"
      />
      <BcbaDashboardTile
        id="hours-by-staff"
        title="Direct Care"
        state={hoursState}
        period={monthBlock(hoursMonth)}
        metric={hoursFlagged.length}
        unit="staff below 50% direct"
        popoverItems={hoursPopover}
      />
      <BcbaDashboardTile
        id="supervision-compliance"
        title="Supervision"
        state={supervisionState}
        period={monthBlock(supervisionMonthLabel)}
        metric={supervisionFlagged.length}
        unit="staff"
        popoverItems={supervisionPopover}
      />
      <BcbaDashboardTile
        id="auth-utilization"
        title="Authorization utilization"
        state={authState}
        period={monthBlock(authMonth)}
        metric={authAttention.length}
        unit="clients"
        popoverItems={authPopover}
      />
    </>
  )
}
