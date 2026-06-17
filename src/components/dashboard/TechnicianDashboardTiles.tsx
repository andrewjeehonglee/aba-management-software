import { useEffect, useState } from "react"
import { type BcbaTileState } from "@/lib/bcbaTileState"
import { filterSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { firstName } from "@/lib/ownerDashboardStatus"
import { getSupervisionForStaffIds } from "@/lib/supabase"
import { SUPERVISION_THRESHOLD } from "@/lib/supervision"
import type { AttentionBubbleTone } from "@/components/dashboard/AttentionBubble"
import {
  BcbaDashboardTile,
  BcbaDashboardTileError,
  BcbaDashboardTileSkeleton,
  type BcbaBubbleItem,
} from "@/components/dashboard/BcbaDashboardTile"

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

function formatHoursBreakdown(direct: number, indirect: number, total: number): string {
  return `${direct} · ${indirect} · ${total}`
}

export function TechnicianDashboardTiles({
  staffId,
  refreshKey,
}: {
  staffId: string
  refreshKey?: number
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
  const [staffName, setStaffName] = useState("")

  useEffect(() => {
    setLoading(true)
    setError(null)

    const notesScope = { staffIds: [staffId] }
    const hoursScope = { staffIds: [staffId] }

    const loadSupervision = async () => {
      const records = await getSupervisionForStaffIds([staffId])
      const filtered = filterSupervisionRecordsForTile(records)
      setSupervisionMonthLabel(filtered.displayMonthLabel)
      if (filtered.records[0]) {
        setStaffName(filtered.records[0].staffName)
      }
      return filtered.records
    }

    Promise.all([
      getNotesStatus(undefined, notesScope),
      getStaffHoursByMonth(undefined, hoursScope),
      loadSupervision(),
    ])
      .then(([notesData, hoursData, supervisionData]) => {
        setNotes(notesData)
        setHours(hoursData)
        setSupervision(supervisionData)
        const hoursRow = hoursData.byStaff.find((r) => r.staffId === staffId)
        if (hoursRow?.staffName) setStaffName(hoursRow.staffName)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false))
  }, [staffId, refreshKey, retryTick])

  if (loading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
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
  const hoursRow = hours?.byStaff.find((r) => r.staffId === staffId)
  const hoursFlagged = hoursRow?.flagged ?? false
  const hoursState: BcbaTileState = hoursFlagged ? "urgent" : "healthy"
  const hoursMetric = hoursFlagged ? 1 : 0
  const hoursUnit = hoursFlagged ? "below 50% direct" : "on track"
  const hoursPopover: BcbaBubbleItem[] =
    hoursRow && hoursRow.totalHours > 0
      ? [
          {
            id: staffId,
            name: firstName(hoursRow.staffName),
            value: formatHoursBreakdown(
              hoursRow.directHours,
              hoursRow.indirectHours,
              hoursRow.totalHours,
            ),
            tone: hoursFlagged ? "urgent" : "healthy",
          },
        ]
      : []

  const supervisionRow = supervision[0]
  const supervisionPct = supervisionRow?.supervisionPct ?? 0
  const supervisionBelow = supervisionPct < SUPERVISION_THRESHOLD
  const supervisionState: BcbaTileState = supervisionBelow ? "urgent" : "healthy"
  const supervisionMetric = supervisionBelow ? 1 : 0
  const supervisionUnit = supervisionBelow ? "below 5% supervision" : "compliant"
  const displayName = supervisionRow?.staffName ?? staffName
  const supervisionPopover: BcbaBubbleItem[] =
    supervisionRow
      ? [
          {
            id: staffId,
            name: firstName(displayName),
            value: `${supervisionPct.toFixed(1)}%`,
            tone: supervisionBelow ? "urgent" : "healthy",
          },
        ]
      : []

  return (
    <>
      <BcbaDashboardTile
        id="session-notes"
        title="Session notes"
        state={notesState}
        period={payPeriodBlock(notesPeriod)}
        metric={incompleteNotesTotal}
        unit="incomplete notes"
        popoverItems={notesPopover}
        popoverEmptyLabel="All notes complete"
      />
      <BcbaDashboardTile
        id="my-hours"
        title="My hours"
        state={hoursState}
        period={monthBlock(hoursMonth)}
        metric={hoursMetric}
        unit={hoursUnit}
        popoverItems={hoursPopover}
      />
      <BcbaDashboardTile
        id="supervision-compliance"
        title="Supervision compliance"
        state={supervisionState}
        period={monthBlock(supervisionMonthLabel)}
        metric={supervisionMetric}
        unit={supervisionUnit}
        popoverItems={supervisionPopover}
      />
    </>
  )
}
