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
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { OwnerDetailPopover } from "@/components/dashboard/OwnerDetailPopover"
import { PayrollSplitBar, TILE_BODY } from "@/components/dashboard/OwnerRankedRows"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

const TIER_FILTER_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Supervisors",
  bcba: "BCBAs",
}

type PayrollData = PayPeriodHoursGapSummary & {
  daysUntilClose: number
  totalOnHoldHours: number
}

function closeContextLabel(daysUntilClose: number): string {
  if (daysUntilClose <= 0) return "closes today"
  if (daysUntilClose === 1) return "closes in 1 day"
  return `closes in ${daysUntilClose} days`
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card">
      <div className="h-5 w-48 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-64 rounded bg-line-soft" />
      <div className="mt-3 h-8 w-full max-w-md rounded-full bg-line-soft" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-line-soft" />
        ))}
      </div>
    </div>
  )
}

export function PayrollPanel({
  payroll,
  loading,
}: {
  payroll: PayrollData | null
  loading?: boolean
}) {
  const [selectedTier, setSelectedTier] = useState<PayPeriodRoleTier>("technician")

  if (loading || !payroll) {
    return <PanelSkeleton />
  }

  const tierDetail = payroll.byRole.find((row) => row.tier === selectedTier) ?? payroll.byRole[0]!

  return (
    <section
      id="owner-pillar-payroll"
      className="scroll-mt-4 rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card short:px-3.5 short:py-3"
      aria-label="Payroll"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className={cn(TILE_TITLE, "text-ink")}>Payroll</h2>
        <span className="text-[15px] tabular-nums text-muted">· {payroll.payPeriodTableLabel}</span>
        <span className="text-[14px] text-muted">({closeContextLabel(payroll.daysUntilClose)})</span>
      </div>

      <p className="mt-1.5 text-[14px] leading-snug" style={{ color: P.amberInk }}>
        Amber = on hold until notes are complete.
      </p>

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
        {tierDetail.staff.length === 0 ? (
          <p className="py-3 text-[14px] text-muted">No staff in this group.</p>
        ) : (
          <ul className="space-y-0">
            {tierDetail.staff.map((row, index) => {
              const nameHref = row.staffExternalCode
                ? staffProfilePath(row.staffExternalCode)
                : `/staff/${row.staffId}`

              return (
                <li
                  key={row.staffId}
                  className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,140px)_1fr_auto] sm:items-center sm:gap-4"
                  style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
                >
                  <Link
                    to={nameHref}
                    className={cn(TILE_BODY, "truncate font-medium hover:underline underline-offset-2")}
                    style={{ color: P.ink }}
                  >
                    {firstName(row.staffName)}
                  </Link>

                  <PayrollSplitBar
                    payableHours={row.payableHours}
                    onHoldHours={row.onHoldHours}
                  />

                  <div className={cn(TILE_BODY, "flex shrink-0 items-center gap-2 tabular-nums sm:justify-end")}>
                    <span style={{ color: P.sageInk }}>{row.payableHours} payable</span>
                    <span style={{ color: P.faint }}>·</span>
                    {row.onHoldHours > 0 ? (
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
                          <button
                            type="button"
                            className="font-semibold hover:underline underline-offset-2"
                            style={{ color: P.amberInk }}
                          >
                            {row.onHoldHours} on hold
                          </button>
                        }
                      />
                    ) : (
                      <span style={{ color: P.faint }}>0 on hold</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
