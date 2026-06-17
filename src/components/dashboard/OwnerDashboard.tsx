import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import {
  getOwnerDashboardData,
  type OwnerDashboardData,
} from "@/lib/ownerDashboardConcerns"
import { getRosterStaffManifest } from "@/lib/rosterScope"
import { OwnerMonitorTiles } from "@/components/dashboard/OwnerMonitorTiles"
import { PayrollPanel } from "@/components/dashboard/PayrollPanel"
import { PAY_PERIOD_TIER_ORDER } from "@/lib/payPeriodHoursGap"

const EMPTY_PAYROLL: OwnerDashboardData["payroll"] = {
  payPeriodLabel: "",
  payPeriodTableLabel: "",
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
    situation: "All session notes are in for this pay period.",
    chips: [],
  },
  {
    id: "auth",
    title: "Authorized hours",
    state: "healthy",
    situation: "No clients are approaching their authorized hour cap.",
    chips: [],
  },
  {
    id: "directHours",
    title: "Direct hours",
    state: "healthy",
    situation: "All clients meet the direct engagement minimum.",
    chips: [],
  },
]

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
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4 animate-fade-rise animate-fade-rise-delay-1", className)}>
      <header className="shrink-0 space-y-1">
        {showPlaceholder ? (
          <>
            <div className="h-7 w-56 animate-pulse rounded-[12px] bg-line-soft" aria-hidden />
            <div className="h-5 w-40 animate-pulse rounded bg-line-soft" aria-hidden />
          </>
        ) : (
          <>
            <p className="text-[22px] font-normal leading-snug text-ink-soft">
              {greeting}, {name}.
            </p>
            <p className="text-[16px] font-semibold text-ink">Needs your attention.</p>
          </>
        )}
      </header>

      <OwnerMonitorTiles tiles={data.monitorTiles} loading={showPlaceholder} />

      <PayrollPanel payroll={showPlaceholder ? null : data.payroll} loading={showPlaceholder} />
    </div>
  )
}
