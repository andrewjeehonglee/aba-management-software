import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import {
  getOwnerDashboardData,
  type OwnerDashboardData,
} from "@/lib/ownerDashboardConcerns"
import { getRosterStaffManifest } from "@/lib/rosterScope"
import { OwnerFocalSummaryStrip } from "@/components/dashboard/OwnerFocalSummaryStrip"
import { OwnerMonitorTiles } from "@/components/dashboard/OwnerMonitorTiles"
import { PayrollPanel } from "@/components/dashboard/PayrollPanel"
import { PAY_PERIOD_TIER_ORDER } from "@/lib/payPeriodHoursGap"

const EMPTY_PAYROLL: OwnerDashboardData["payroll"] = {
  payPeriodLabel: "",
  payPeriodTableLabel: "",
  daysUntilClose: 0,
  totalOnHoldHours: 0,
  byRole: PAY_PERIOD_TIER_ORDER.map((tier) => ({
    tier,
    label: tier === "technician" ? "Technicians" : tier === "supervisor" ? "Supervisors" : "BCBAs",
    staff: [],
  })),
}

const EMPTY_TILES: OwnerDashboardData["monitorTiles"] = [
  {
    id: "notes",
    title: "Session notes",
    state: "healthy",
    headerLine: "All complete this pay period · billing and audit clear",
    emptyLabel: "All clear — every note is in for this pay period",
    chips: [],
    overflowCount: 0,
    overflowChips: [],
  },
  {
    id: "auth",
    title: "Authorized hours",
    state: "healthy",
    headerLine: "All clients within cap · billing clear",
    emptyLabel: "All clear — every client within authorized hours",
    chips: [],
    overflowCount: 0,
    overflowChips: [],
  },
  {
    id: "directHours",
    title: "Direct hours",
    state: "healthy",
    headerLine: "Direct engagement on track · monitor (month in progress)",
    emptyLabel: "All clear — direct engagement on track this month",
    chips: [],
    overflowCount: 0,
    overflowChips: [],
  },
]

const EMPTY_FOCAL: OwnerDashboardData["focalSummary"] = {
  allClear: true,
  segments: [
    {
      id: "notes",
      text: "All clear this morning — notes in, payroll ready, auth on track",
      severity: "neutral",
      scrollTargetId: "owner-pillar-notes",
    },
  ],
}

export function OwnerDashboard({
  practiceId,
  userName,
  staffIds,
  clientIds,
  includeCaseloadStaff,
  refreshKey,
  rosterReady,
  className,
}: {
  practiceId: string
  userName?: string | null
  staffIds: string[]
  clientIds: string[]
  includeCaseloadStaff?: boolean
  refreshKey?: number
  rosterReady: boolean
  className?: string
}) {
  const [data, setData] = useState<OwnerDashboardData>({
    monitorTiles: EMPTY_TILES,
    focalSummary: EMPTY_FOCAL,
    payroll: EMPTY_PAYROLL,
    loading: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!rosterReady) return

    let cancelled = false
    setData((prev) => ({ ...prev, loading: true }))
    setError(null)

    getRosterStaffManifest(practiceId)
      .then((manifest) =>
        getOwnerDashboardData({
          staffIds,
          clientIds,
          rosterManifest: manifest,
          includeCaseloadStaff,
        }),
      )
      .then((result) => {
        if (cancelled) return
        setData({ ...result, loading: false })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
        setData((prev) => ({ ...prev, loading: false }))
      })

    return () => {
      cancelled = true
    }
  }, [
    practiceId,
    staffIds.join(","),
    clientIds.join(","),
    includeCaseloadStaff,
    refreshKey,
    retryTick,
    rosterReady,
  ])

  const greeting = timeGreeting()
  const name = firstName(userName)
  const showPlaceholder = !rosterReady || data.loading

  if (error) {
    return (
      <div className={cn("rounded-[var(--radius)] bg-surface p-6 shadow-card", className)}>
        <p className="text-[14px] text-muted">{error}</p>
        <button
          type="button"
          onClick={() => setRetryTick((k) => k + 1)}
          className="mt-2 text-[14px] font-semibold text-brand hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "owner-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 animate-fade-rise animate-fade-rise-delay-1",
        className,
      )}
    >
      <header className="shrink-0">
        {showPlaceholder ? (
          <div className="h-7 w-56 animate-pulse rounded-[12px] bg-line-soft" aria-hidden />
        ) : (
          <p className="text-[22px] font-normal leading-snug text-ink-soft">
            {greeting}, {name}.
          </p>
        )}
      </header>

      <OwnerFocalSummaryStrip
        summary={showPlaceholder ? null : data.focalSummary}
        loading={showPlaceholder}
      />

      <OwnerMonitorTiles tiles={data.monitorTiles} loading={showPlaceholder} />

      <PayrollPanel
        payroll={showPlaceholder ? null : data.payroll}
        loading={showPlaceholder}
      />
    </div>
  )
}
