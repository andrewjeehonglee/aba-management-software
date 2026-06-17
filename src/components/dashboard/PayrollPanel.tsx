import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { firstName } from "@/lib/ownerDashboardStatus"
import {
  PAY_PERIOD_TIER_ORDER,
  type PayPeriodHoursGapSummary,
  type PayPeriodRoleTier,
} from "@/lib/payPeriodHoursGap"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import { OwnerDetailPopover } from "@/components/dashboard/OwnerDetailPopover"

const TIER_FILTER_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Supervisors",
  bcba: "BCBAs",
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card">
      <div className="h-4 w-40 rounded bg-line-soft" />
      <div className="mt-3 h-8 w-full max-w-md rounded-full bg-line-soft" />
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-3">
        <div className="h-3 rounded bg-line-soft" />
        <div className="h-3 w-16 rounded bg-line-soft" />
        <div className="h-3 w-16 rounded bg-line-soft" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="contents">
            <div className="h-4 rounded bg-line-soft" />
            <div className="h-4 rounded bg-line-soft" />
            <div className="h-4 rounded bg-line-soft" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PayrollPanel({
  payroll,
  loading,
}: {
  payroll: PayPeriodHoursGapSummary | null
  loading?: boolean
}) {
  const [selectedTier, setSelectedTier] = useState<PayPeriodRoleTier>("technician")

  if (loading || !payroll) {
    return <PanelSkeleton />
  }

  const tierDetail = payroll.byRole.find((row) => row.tier === selectedTier) ?? payroll.byRole[0]!

  return (
    <section
      className="rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card short:px-3.5 short:py-3"
      aria-label="Payroll"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-[16px] font-semibold text-ink">Payroll</h2>
        <span className="text-[14px] tabular-nums text-muted">{payroll.payPeriodTableLabel}</span>
      </div>

      <div
        className="mt-3 inline-flex max-w-full rounded-full bg-surface-2 p-0.5"
        role="tablist"
        aria-label="Staff group"
      >
        {PAY_PERIOD_TIER_ORDER.map((tier) => {
          const active = selectedTier === tier
          return (
            <button
              key={tier}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedTier(tier)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink-soft",
              )}
            >
              {TIER_FILTER_LABELS[tier]}
            </button>
          )
        })}
      </div>

      <div className="mt-4 w-full">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-0 border-b border-line-soft pb-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Name
          </span>
          <span className="text-right text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Payable hours
          </span>
          <span className="text-right text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            On hold hours
          </span>
        </div>

        <div className="divide-y divide-line-soft">
          {tierDetail.staff.length === 0 ? (
            <p className="py-3 text-[14px] text-muted">No staff in this group.</p>
          ) : (
            tierDetail.staff.map((row) => {
              const nameHref = row.staffExternalCode
                ? staffProfilePath(row.staffExternalCode)
                : `/staff/${row.staffId}`

              return (
                <div
                  key={row.staffId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 py-2"
                >
                  <Link
                    to={nameHref}
                    className="truncate text-[14px] font-medium text-ink transition-colors hover:text-brand"
                  >
                    {firstName(row.staffName)}
                  </Link>
                  <span className="text-right text-[14px] tabular-nums text-brand">
                    {row.payableHours} hrs
                  </span>
                  {row.onHoldHours > 0 ? (
                    <div className="text-right">
                      <OwnerDetailPopover
                        title={firstName(row.staffName)}
                        lines={row.onHoldSessions.map((session) => ({
                          id: session.sessionId,
                          text: session.displayText,
                          href: session.clientCode
                            ? clientProfilePath(session.clientCode)
                            : undefined,
                        }))}
                        align="end"
                        ariaLabel={`${firstName(row.staffName)} on hold hours`}
                        trigger={
                          <span className="text-[14px] font-semibold tabular-nums text-alert">
                            {row.onHoldHours} hrs
                          </span>
                        }
                      />
                    </div>
                  ) : (
                    <span className="text-right text-[14px] tabular-nums text-muted">
                      0 hrs
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
