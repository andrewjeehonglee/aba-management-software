import { useEffect, useState } from "react"
import { loadSupervisionRecordsForTile } from "@/lib/dashboardScope"
import {
  buildDirectHoursTileViewModel,
  buildNotesTileViewModel,
  buildSupervisionTileViewModel,
  formatDashboardMonthLabel,
  type DashboardTileViewModel,
} from "@/lib/dashboardTileMetrics"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import {
  BcbaDashboardTile,
  BcbaDashboardTileError,
  BcbaDashboardTileSkeleton,
} from "@/components/dashboard/BcbaDashboardTile"

function payPeriodBlock(label: string) {
  return <span className="block">{label || "—"}</span>
}

function monthBlock(label: string) {
  return <span className="block">{formatDashboardMonthLabel(label) || "—"}</span>
}

function MetricTile({
  view,
  period,
}: {
  view: DashboardTileViewModel
  period: React.ReactNode
}) {
  return (
    <BcbaDashboardTile
      id={view.id}
      title={view.title}
      requirement={view.requirement}
      state={view.state}
      period={period}
      metric={view.metric}
      descriptor={view.descriptor}
      summaryLines={view.summaryLines}
      hideMetric={view.hideMetric}
      popoverItems={view.popoverItems}
      popoverGroups={view.popoverGroups}
      popoverEmptyLabel={view.popoverEmptyLabel}
    />
  )
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
    Awaited<ReturnType<typeof loadSupervisionRecordsForTile>>["records"]
  >([])
  const [supervisionMonthLabel, setSupervisionMonthLabel] = useState("")

  useEffect(() => {
    setLoading(true)
    setError(null)

    const notesScope = { staffIds: [staffId] }
    const hoursScope = { staffIds: [staffId], includeZeroHourStaff: true }

    Promise.all([
      getNotesStatus(undefined, notesScope),
      getStaffHoursByMonth(undefined, hoursScope),
      loadSupervisionRecordsForTile([staffId]),
    ])
      .then(([notesData, hoursData, supervisionData]) => {
        setNotes(notesData)
        setHours(hoursData)
        setSupervision(supervisionData.records)
        setSupervisionMonthLabel(supervisionData.displayMonthLabel)
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

  if (!notes || !hours) return null

  const selfOptions = { selfMode: true, selfStaffId: staffId }
  const notesView = buildNotesTileViewModel(notes, selfOptions)
  const hoursView = buildDirectHoursTileViewModel(hours, selfOptions)
  const supervisionView = buildSupervisionTileViewModel(supervision, selfOptions)

  return (
    <>
      <MetricTile view={notesView} period={payPeriodBlock(notes.payPeriodLabel)} />
      <MetricTile view={hoursView} period={monthBlock(hours.monthLabel)} />
      <MetricTile view={supervisionView} period={monthBlock(supervisionMonthLabel)} />
    </>
  )
}
