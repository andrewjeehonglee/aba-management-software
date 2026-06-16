import { useEffect, useState } from "react"
import { getStaffHoursByMonth, type StaffHoursRow } from "@/lib/staffHours"
import { filterSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getSupervisionForStaffIds, supabase, type SupervisionRecord } from "@/lib/supabase"
import { SUPERVISION_THRESHOLD } from "@/lib/supervision"
import { cn } from "@/lib/utils"
import {
  PulsePillarCard,
  PulseTileError,
  PulseTileSkeleton,
} from "@/components/dashboard/PulseTile"
import type { PulseSeverity } from "@/lib/pulseSeverity"

function mergeComplianceFlags(
  hoursRows: StaffHoursRow[],
  supervisionRows: SupervisionRecord[],
): {
  directFlagged: number
  supervisionFlagged: number
  totalFlagged: number
} {
  const directIds = new Set(hoursRows.filter((r) => r.flagged).map((r) => r.staffId))
  const supervisionIds = new Set(
    supervisionRows
      .filter((r) => r.supervisionPct < SUPERVISION_THRESHOLD)
      .map((r) => r.staffId),
  )
  const union = new Set([...directIds, ...supervisionIds])
  return {
    directFlagged: directIds.size,
    supervisionFlagged: supervisionIds.size,
    totalFlagged: union.size,
  }
}

function PulseStaffHoursComplianceTile({
  className,
  hoursSummary,
  supervisionRecords,
  monthLabel,
  supervisionMonthLabel,
  loading,
  error,
  onRetry,
  compact,
}: {
  className?: string
  hoursSummary: Awaited<ReturnType<typeof getStaffHoursByMonth>> | null
  supervisionRecords: SupervisionRecord[]
  monthLabel: string
  supervisionMonthLabel: string
  loading: boolean
  error: string | null
  onRetry: () => void
  compact?: boolean
}) {
  if (loading) return <PulseTileSkeleton className={className} />

  if (error) {
    return (
      <PulseTileError
        title="Staff hours & compliance"
        message="Couldn't load staff hours or supervision."
        onRetry={onRetry}
        className={className}
      />
    )
  }

  const hoursRows = hoursSummary?.byStaff ?? []
  const staffCount = hoursRows.length
  const { directFlagged, supervisionFlagged, totalFlagged } = mergeComplianceFlags(
    hoursRows,
    supervisionRecords,
  )

  if (staffCount === 0 && supervisionRecords.length === 0) {
    return (
      <PulsePillarCard
        id="staff-hours-compliance"
        className={className}
        status="ok"
        title="Staff hours & compliance"
        period={`This month · ${monthLabel}`}
        metric="0"
        unit="staff need attention"
        size={compact ? "compact" : "default"}
        support="No caseload staff to track yet — hours and supervision compliance appear as sessions are logged."
      />
    )
  }

  const status: PulseSeverity = totalFlagged > 0 ? "flag" : "ok"
  const metricSeverity: PulseSeverity = totalFlagged > 0 ? "flag" : "ok"

  const support =
    totalFlagged > 0 ? (
      <div className="space-y-1">
        <p>
          {directFlagged > 0 && (
            <>
              <span className="font-semibold text-limit">{directFlagged}</span>
              {directFlagged === 1 ? " staff" : " staff"} below{" "}
              <span className="font-medium text-ink">50% direct service</span>
            </>
          )}
          {directFlagged > 0 && supervisionFlagged > 0 && " · "}
          {supervisionFlagged > 0 && (
            <>
              <span className="font-semibold text-limit">{supervisionFlagged}</span>
              {supervisionFlagged === 1 ? " staff" : " staff"} below{" "}
              <span className="font-medium text-ink">{SUPERVISION_THRESHOLD}% supervision</span>
            </>
          )}
          .
        </p>
        <p className="text-subtle">
          Direct mix and supervision % for your caseload team · {supervisionMonthLabel}
        </p>
      </div>
    ) : (
      `All ${Math.max(staffCount, supervisionRecords.length)} staff meet direct-service and supervision requirements this month.`
    )

  return (
    <PulsePillarCard
      id="staff-hours-compliance"
      className={className}
      status={status}
      title="Staff hours & compliance"
      period={`This month · ${monthLabel}`}
      metric={totalFlagged}
      unit="staff need attention"
      metricSeverity={metricSeverity}
      size={compact ? "compact" : "default"}
      support={support}
    />
  )
}

export function StaffHoursComplianceTile({
  className,
  refreshKey,
  staffIds,
  superviseeStaffIds,
  clientIds,
  includeZeroHourStaff,
  compact,
}: {
  className?: string
  refreshKey?: number
  staffIds?: string[]
  superviseeStaffIds?: string[]
  clientIds?: string[]
  includeZeroHourStaff?: boolean
  compact?: boolean
}) {
  const [hoursSummary, setHoursSummary] = useState<Awaited<
    ReturnType<typeof getStaffHoursByMonth>
  > | null>(null)
  const [supervisionRecords, setSupervisionRecords] = useState<SupervisionRecord[]>([])
  const [supervisionMonthLabel, setSupervisionMonthLabel] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const supervisionIds = superviseeStaffIds?.length ? superviseeStaffIds : staffIds

  useEffect(() => {
    setLoading(true)
    setError(null)

    const scopeOptions =
      staffIds?.length || clientIds?.length || includeZeroHourStaff
        ? {
            staffIds: staffIds?.length ? staffIds : undefined,
            clientIds: clientIds?.length ? clientIds : undefined,
            includeZeroHourStaff,
          }
        : undefined

    const loadSupervision = async () => {
      if (!supervisionIds?.length) return []
      let records = await getSupervisionForStaffIds(supervisionIds)

      const present = new Set(records.map((r) => r.staffId))
      const missingIds = supervisionIds.filter((id) => !present.has(id))
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

      const { records: filtered, displayMonthLabel } = filterSupervisionRecordsForTile(records)
      setSupervisionMonthLabel(displayMonthLabel)
      return filtered
    }

    Promise.all([getStaffHoursByMonth(undefined, scopeOptions), loadSupervision()])
      .then(([hours, supervision]) => {
        setHoursSummary(hours)
        setSupervisionRecords(supervision)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load compliance data"))
      .finally(() => setLoading(false))
  }, [refreshKey, staffIds, clientIds, includeZeroHourStaff, supervisionIds, retryTick])

  return (
    <PulseStaffHoursComplianceTile
      className={cn(className)}
      hoursSummary={hoursSummary}
      supervisionRecords={supervisionRecords}
      monthLabel={hoursSummary?.monthLabel ?? ""}
      supervisionMonthLabel={supervisionMonthLabel}
      loading={loading}
      error={error}
      onRetry={() => setRetryTick((k) => k + 1)}
      compact={compact}
    />
  )
}
