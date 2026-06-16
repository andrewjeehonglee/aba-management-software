import { useEffect, useState } from "react"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { filterSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { firstName } from "@/lib/ownerDashboardStatus"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { getSupervisionForStaffIds, supabase } from "@/lib/supabase"
import { SUPERVISION_THRESHOLD } from "@/lib/supervision"
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
  const pctDocumented = notes?.totalCompleted ? (notes?.pctDocumented ?? 0) : null
  const notesFlagged = (notes?.byStaff ?? []).filter((s) => s.overdueCount > 0)
  const notesBubbles: BcbaBubbleItem[] = notesFlagged.map((row) => ({
    id: row.staffId,
    name: firstName(row.staffName),
    value: String(row.overdueCount),
    tone: "amber",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  const hoursMonth = hours?.monthLabel ?? ""
  const hoursFlagged = (hours?.byStaff ?? []).filter((r) => r.flagged)
  const hoursBubbles: BcbaBubbleItem[] = hoursFlagged.map((row) => ({
    id: row.staffId,
    name: firstName(row.staffName),
    value: `${Math.round(row.directPct * 100)}%`,
    tone: "limit",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  const supervisionFlagged = supervision.filter((r) => r.supervisionPct < SUPERVISION_THRESHOLD)
  const supervisionBubbles: BcbaBubbleItem[] = supervisionFlagged.map((row) => ({
    id: row.staffId,
    name: firstName(row.staffName),
    value: `${row.supervisionPct.toFixed(1)}%`,
    tone: "limit",
    href: row.staffExternalCode ? staffProfilePath(row.staffExternalCode) : undefined,
  }))

  const authMonth = auth?.monthLabel ?? ""
  const authOver = (auth?.byClient ?? []).filter((r) => r.overAuthorized)
  const authBubbles: BcbaBubbleItem[] = authOver.map((row) => ({
    id: row.authId,
    name: shortClientLabel(row.clientName),
    value: `${row.overHours} hrs over`,
    tone: "limit",
    href: row.clientCode ? clientProfilePath(row.clientCode) : undefined,
  }))

  return (
    <>
      <BcbaDashboardTile
        id="notes-overdue"
        title="Session notes"
        tag={overdueTotal > 0 ? `${overdueTotal} overdue` : "healthy"}
        tagSeverity={overdueTotal > 0 ? "warn" : "ok"}
        period={notesPeriod ? `Pay period · ${notesPeriod}` : "This pay period"}
        metric={pctDocumented === null ? "—" : `${pctDocumented}%`}
        unit="documented"
        metricSeverity={overdueTotal > 0 ? "warn" : "ok"}
        calmLine="All documented"
        bubbles={notesBubbles}
      />
      <BcbaDashboardTile
        id="hours-by-staff"
        title="Staff hours"
        tag={hoursFlagged.length > 0 ? `${hoursFlagged.length} below direct` : "healthy"}
        tagSeverity={hoursFlagged.length > 0 ? "flag" : "ok"}
        period={hoursMonth ? `Month · ${hoursMonth}` : "This month"}
        metric={hoursFlagged.length}
        unit="below 50% direct"
        metricSeverity={hoursFlagged.length > 0 ? "flag" : "ok"}
        calmLine="All caught up"
        bubbles={hoursBubbles}
      />
      <BcbaDashboardTile
        id="supervision-compliance"
        title="Supervision compliance"
        tag={
          supervisionFlagged.length > 0
            ? `${supervisionFlagged.length} below threshold`
            : "healthy"
        }
        tagSeverity={supervisionFlagged.length > 0 ? "flag" : "ok"}
        period={supervisionMonthLabel ? `Month · ${supervisionMonthLabel}` : "This month"}
        metric={supervisionFlagged.length}
        unit={`below ${SUPERVISION_THRESHOLD}% supervision`}
        metricSeverity={supervisionFlagged.length > 0 ? "flag" : "ok"}
        calmLine="All caught up"
        bubbles={supervisionBubbles}
      />
      <BcbaDashboardTile
        id="auth-utilization"
        title="Authorization utilization"
        tag={authOver.length > 0 ? `${authOver.length} over limit` : "healthy"}
        tagSeverity={authOver.length > 0 ? "flag" : "ok"}
        period={authMonth ? `Month · ${authMonth}` : "This month"}
        metric={authOver.length}
        unit="over authorized limit"
        metricSeverity={authOver.length > 0 ? "flag" : "ok"}
        calmLine="All caught up"
        bubbles={authBubbles}
      />
    </>
  )
}
