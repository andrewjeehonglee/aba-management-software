import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import {
  getOwnerDashboardData,
  type OwnerDashboardData,
} from "@/lib/ownerDashboardConcerns"
import { getRosterStaffManifest } from "@/lib/rosterScope"
import { OwnerConcernList } from "@/components/dashboard/OwnerConcernList"
import { PayrollPanel } from "@/components/dashboard/PayrollPanel"
import { PAY_PERIOD_TIER_ORDER } from "@/lib/payPeriodHoursGap"

const EMPTY_GAP: OwnerDashboardData["hoursGap"] = {
  payPeriodLabel: "",
  payPeriodShortLabel: "",
  byRole: PAY_PERIOD_TIER_ORDER.map((tier) => ({
    tier,
    label: tier === "technician" ? "Technicians" : tier === "supervisor" ? "Supervisors" : "BCBAs",
    payableHours: 0,
    onHoldHours: 0,
    staff: [],
  })),
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
    concerns: [],
    hoursGap: EMPTY_GAP,
    completenessLine: null,
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
          allStaffIds: manifest.map((s) => s.id),
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
    <div className={cn("flex min-h-0 flex-1 flex-col animate-fade-rise animate-fade-rise-delay-1", className)}>
      <header className="mb-4 shrink-0 short:mb-3">
        {showPlaceholder ? (
          <div className="h-7 w-56 animate-pulse rounded-[12px] bg-line-soft" aria-hidden />
        ) : (
          <p className="text-[22px] font-normal leading-snug text-ink-soft">
            {greeting}, {name}.
          </p>
        )}
      </header>

      <div className="grid min-h-0 flex-1 gap-5 min-[1000px]:grid-cols-[1.25fr_0.75fr] min-[1000px]:gap-6">
        <OwnerConcernList
          concerns={data.concerns}
          completenessLine={data.completenessLine}
          loading={showPlaceholder}
        />
        <PayrollPanel gap={showPlaceholder ? null : data.hoursGap} loading={showPlaceholder} />
      </div>
    </div>
  )
}
