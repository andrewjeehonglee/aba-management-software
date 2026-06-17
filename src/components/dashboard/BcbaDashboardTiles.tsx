import { useEffect, useState } from "react"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import {
  loadSupervisionRecordsForTile,
} from "@/lib/dashboardScope"
import {
  buildAuthorizationTileViewModel,
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
      popoverItems={view.popoverItems}
      popoverGroups={view.popoverGroups}
      popoverEmptyLabel={view.popoverEmptyLabel}
    />
  )
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
    Awaited<ReturnType<typeof loadSupervisionRecordsForTile>>["records"]
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

    Promise.all([
      getNotesStatus(undefined, notesScope),
      getStaffHoursByMonth(undefined, hoursScope),
      superviseeStaffIds.length
        ? loadSupervisionRecordsForTile(superviseeStaffIds)
        : Promise.resolve({ records: [], displayMonthLabel: "" }),
      getAuthUtilizationByMonth(undefined, clientIds.length ? { clientIds } : undefined),
    ])
      .then(([notesData, hoursData, supervisionData, authData]) => {
        setNotes(notesData)
        setHours(hoursData)
        setSupervision(supervisionData.records)
        setSupervisionMonthLabel(supervisionData.displayMonthLabel)
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

  if (!notes || !hours || !auth) return null

  const notesView = buildNotesTileViewModel(notes)
  const hoursView = buildDirectHoursTileViewModel(hours)
  const supervisionView = buildSupervisionTileViewModel(supervision)
  const authView = buildAuthorizationTileViewModel(auth.byClient)

  return (
    <>
      <MetricTile view={notesView} period={payPeriodBlock(notes.payPeriodLabel)} />
      <MetricTile view={hoursView} period={monthBlock(hours.monthLabel)} />
      <MetricTile view={supervisionView} period={monthBlock(supervisionMonthLabel)} />
      <MetricTile view={authView} period={monthBlock(auth.monthLabel)} />
    </>
  )
}
