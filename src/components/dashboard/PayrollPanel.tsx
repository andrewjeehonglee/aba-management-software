import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { firstName } from "@/lib/ownerDashboardStatus"
import { OWNER_ON_HOLD_INK } from "@/lib/ownerDashboardConcerns"
import {
  PAY_PERIOD_TIER_ORDER,
  type PayPeriodHoursGapSummary,
  type PayPeriodRoleTier,
  type PayPeriodStaffHoursRow,
} from "@/lib/payPeriodHoursGap"
import { staffProfilePath } from "@/lib/rosterScope"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

type PayrollData = PayPeriodHoursGapSummary & {
  daysUntilClose: number
  totalOnHoldHours: number
}

const TAB_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Clinical Supervisors",
  bcba: "BCBAs",
}

function closeContextLabel(daysUntilClose: number): string {
  if (daysUntilClose <= 0) return "closes today"
  if (daysUntilClose === 1) return "closes in 1 day"
  return `closes in ${daysUntilClose} days`
}

function staffHref(row: PayPeriodStaffHoursRow): string {
  return row.staffExternalCode
    ? staffProfilePath(row.staffExternalCode)
    : `/staff/${row.staffId}`
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card">
      <div className="h-5 w-48 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-64 rounded bg-line-soft" />
      <div className="mt-4 h-10 w-full max-w-sm rounded bg-line-soft" />
      <div className="mt-4 h-9 w-72 rounded-full bg-line-soft" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[4.5rem] w-36 rounded-[12px] bg-line-soft" />
        ))}
      </div>
    </div>
  )
}

function StaffPayrollBox({ row }: { row: PayPeriodStaffHoursRow }) {
  return (
    <Link
      to={staffHref(row)}
      className="inline-flex w-fit min-w-[8.75rem] cursor-pointer flex-col rounded-[12px] border px-3 py-2.5 transition-opacity hover:opacity-90"
      style={{
        backgroundColor: P.inset,
        borderColor: P.rule,
      }}
    >
      <span className="truncate text-[15px] font-bold leading-snug" style={{ color: P.ink }}>
        {firstName(row.staffName)}
      </span>
      <span className="mt-1.5 text-[14px] tabular-nums leading-snug" style={{ color: P.sageInk }}>
        {row.payableHours} payable
      </span>
      <span
        className="text-[14px] tabular-nums leading-snug"
        style={{ color: row.onHoldHours > 0 ? OWNER_ON_HOLD_INK : P.faint }}
      >
        {row.onHoldHours} on hold
      </span>
    </Link>
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

  const allStaff = PAY_PERIOD_TIER_ORDER.flatMap((tier) => {
    const group = payroll.byRole.find((row) => row.tier === tier)
    return group?.staff ?? []
  })
  const totalPayableHours = allStaff.reduce((sum, row) => sum + row.payableHours, 0)
  const totalOnHoldHours = payroll.totalOnHoldHours
  const staffOnHoldCount = allStaff.filter((row) => row.onHoldHours > 0).length
  const tierDetail = payroll.byRole.find((row) => row.tier === selectedTier) ?? payroll.byRole[0]!
  const tierStaff = tierDetail?.staff ?? []

  return (
    <section
      id="owner-pillar-payroll"
      className="scroll-mt-4 rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card short:px-3.5 short:py-3"
      aria-label="Payroll"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className={cn(TILE_TITLE, "text-ink")}>Payroll</h2>
        <span className="text-[15px] tabular-nums text-muted">· {payroll.payPeriodTableLabel}</span>
        <span className="text-[14px] text-muted">· {closeContextLabel(payroll.daysUntilClose)}</span>
      </div>

      {staffOnHoldCount > 0 ? (
        <p className="mt-1.5 text-[14px] leading-snug text-muted">
          {staffOnHoldCount} staff have unfinished notes, holding {totalOnHoldHours} hours of pay.
        </p>
      ) : (
        <p className="mt-1.5 text-[14px] leading-snug text-muted">
          All completed session hours are payable for this pay period.
        </p>
      )}

      <div className="mt-4 grid max-w-md grid-cols-2 gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
            Hours payable now
          </p>
          <p className="mt-1 text-[28px] font-bold tabular-nums leading-none" style={{ color: P.sageInk }}>
            {totalPayableHours}
          </p>
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
            Hours on hold
          </p>
          <p
            className="mt-1 text-[28px] font-bold tabular-nums leading-none"
            style={{ color: OWNER_ON_HOLD_INK }}
          >
            {totalOnHoldHours}
          </p>
        </div>
      </div>

      <div
        className="mt-5 inline-flex max-w-full flex-wrap rounded-full bg-surface-2 p-0.5"
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
                "cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink-soft",
              )}
            >
              {TAB_LABELS[tier]}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        {tierStaff.length === 0 ? (
          <p className="py-2 text-[14px] text-muted">No staff in this group.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tierStaff.map((row) => (
              <li key={row.staffId}>
                <StaffPayrollBox row={row} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
