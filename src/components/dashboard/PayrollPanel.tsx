import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { firstName } from "@/lib/ownerDashboardStatus"
import {
  PAY_PERIOD_TIER_ORDER,
  type PayPeriodHoursGapSummary,
  type PayPeriodStaffHoursRow,
} from "@/lib/payPeriodHoursGap"
import { staffProfilePath } from "@/lib/rosterScope"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { OwnerDashboardListPopup } from "@/components/dashboard/OwnerDashboardListPopup"
import { OwnerViewAllButton, PayrollSplitBar, TILE_BODY } from "@/components/dashboard/OwnerRankedRows"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

type PayrollData = PayPeriodHoursGapSummary & {
  daysUntilClose: number
  totalOnHoldHours: number
}

function closeContextLabel(daysUntilClose: number): string {
  if (daysUntilClose <= 0) return "closes today"
  if (daysUntilClose === 1) return "closes in 1 day"
  return `closes in ${daysUntilClose} days`
}

function flattenPayrollStaff(payroll: PayrollData): PayPeriodStaffHoursRow[] {
  return PAY_PERIOD_TIER_ORDER.flatMap((tier) => {
    const group = payroll.byRole.find((row) => row.tier === tier)
    return group?.staff ?? []
  })
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
      <div className="mt-3 h-2 w-full max-w-md rounded-full bg-line-soft" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-line-soft" />
        ))}
      </div>
    </div>
  )
}

function PayrollFullBreakdown({
  staff,
  onNavigate,
}: {
  staff: PayPeriodStaffHoursRow[]
  onNavigate: () => void
}) {
  return (
    <ul>
      {staff.map((row, index) => (
        <li
          key={row.staffId}
          className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
          style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
        >
          <Link
            to={staffHref(row)}
            onClick={onNavigate}
            className={cn(TILE_BODY, "cursor-pointer truncate font-medium hover:underline underline-offset-2")}
            style={{ color: P.ink }}
          >
            {firstName(row.staffName)}
          </Link>
          <span className={cn(TILE_BODY, "tabular-nums")} style={{ color: P.sageInk }}>
            {row.payableHours} payable
          </span>
          <span
            className={cn(TILE_BODY, "tabular-nums")}
            style={{ color: row.onHoldHours > 0 ? P.amberInk : P.faint }}
          >
            {row.onHoldHours} on hold
          </span>
        </li>
      ))}
    </ul>
  )
}

export function PayrollPanel({
  payroll,
  loading,
}: {
  payroll: PayrollData | null
  loading?: boolean
}) {
  const [popupOpen, setPopupOpen] = useState(false)

  if (loading || !payroll) {
    return <PanelSkeleton />
  }

  const allStaff = flattenPayrollStaff(payroll)
  const totalPayableHours = allStaff.reduce((sum, row) => sum + row.payableHours, 0)
  const totalOnHoldHours = payroll.totalOnHoldHours
  const blockers = allStaff
    .filter((row) => row.onHoldHours > 0)
    .sort(
      (a, b) =>
        b.onHoldHours - a.onHoldHours ||
        b.payableHours - a.payableHours ||
        a.staffName.localeCompare(b.staffName),
    )
  const fullyPayableCount = allStaff.filter((row) => row.onHoldHours === 0).length
  const staffOnHoldCount = blockers.length

  return (
    <>
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
          <p className="mt-1.5 text-[14px] leading-snug" style={{ color: P.amberInk }}>
            {totalOnHoldHours} hours are on hold until {staffOnHoldCount} staff complete their notes.
          </p>
        ) : (
          <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">
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
            <p className="mt-1 text-[28px] font-bold tabular-nums leading-none" style={{ color: P.amberInk }}>
              {totalOnHoldHours}
            </p>
          </div>
        </div>

        <div className="mt-4 max-w-md">
          <PayrollSplitBar payableHours={totalPayableHours} onHoldHours={totalOnHoldHours} />
        </div>

        {blockers.length > 0 ? (
          <ul className="mt-4 space-y-0">
            {blockers.map((row, index) => (
              <li
                key={row.staffId}
                className="py-2.5 first:pt-0"
                style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
              >
                <Link
                  to={staffHref(row)}
                  className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 hover:opacity-85"
                >
                  <span className={cn(TILE_BODY, "truncate font-medium")} style={{ color: P.ink }}>
                    {firstName(row.staffName)}
                  </span>
                  <span
                    className={cn(TILE_BODY, "shrink-0 font-medium tabular-nums")}
                    style={{ color: P.amberInk }}
                  >
                    {row.onHoldHours} on hold
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {fullyPayableCount > 0 ? (
          <p className="mt-4 text-[14px] text-muted">
            {fullyPayableCount} staff fully payable
          </p>
        ) : null}

        {allStaff.length > 0 ? (
          <OwnerViewAllButton
            count={allStaff.length}
            onClick={() => setPopupOpen(true)}
            label="View full payroll"
          />
        ) : null}
      </section>

      <OwnerDashboardListPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        title="Payroll"
        metaLine={`${allStaff.length} staff · ${payroll.payPeriodTableLabel}`}
      >
        <PayrollFullBreakdown staff={allStaff} onNavigate={() => setPopupOpen(false)} />
      </OwnerDashboardListPopup>
    </>
  )
}
