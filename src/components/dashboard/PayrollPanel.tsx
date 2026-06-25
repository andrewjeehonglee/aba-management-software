import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { firstName } from "@/lib/ownerDashboardStatus"
import { OWNER_ON_HOLD_INK } from "@/lib/ownerDashboardConcerns"
import {
  type PayPeriodHoursGapSummary,
  type PayPeriodRoleTier,
  type PayPeriodStaffHoursRow,
} from "@/lib/payPeriodHoursGap"
import { staffProfilePath } from "@/lib/rosterScope"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { TILE_BODY } from "@/components/dashboard/OwnerRankedRows"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

type PayrollData = PayPeriodHoursGapSummary & {
  daysUntilClose: number
  totalOnHoldHours: number
}

const PAYROLL_ROLE_ORDER: PayPeriodRoleTier[] = ["bcba", "supervisor", "technician"]

const PAYROLL_ROLE_HEADINGS: Record<PayPeriodRoleTier, string> = {
  bcba: "BCBAs",
  supervisor: "Clinical Supervisors",
  technician: "Technicians",
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
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-[12px] bg-line-soft" />
        ))}
      </div>
    </div>
  )
}

function StaffPayrollBox({ row }: { row: PayPeriodStaffHoursRow }) {
  return (
    <Link
      to={staffHref(row)}
      className="flex cursor-pointer flex-col rounded-[12px] border px-3 py-2.5 transition-opacity hover:opacity-90"
      style={{
        backgroundColor: P.inset,
        borderColor: P.rule,
      }}
    >
      <span className={cn(TILE_BODY, "truncate font-bold")} style={{ color: P.ink }}>
        {firstName(row.staffName)}
      </span>
      <span className="mt-1.5 text-[13px] tabular-nums" style={{ color: P.sageInk }}>
        {row.payableHours} payable
      </span>
      <span
        className="text-[13px] tabular-nums"
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
  if (loading || !payroll) {
    return <PanelSkeleton />
  }

  const allStaff = PAYROLL_ROLE_ORDER.flatMap((tier) => {
    const group = payroll.byRole.find((row) => row.tier === tier)
    return group?.staff ?? []
  })
  const totalPayableHours = allStaff.reduce((sum, row) => sum + row.payableHours, 0)
  const totalOnHoldHours = payroll.totalOnHoldHours
  const staffOnHoldCount = allStaff.filter((row) => row.onHoldHours > 0).length

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
        <p className="mt-1.5 text-[14px] leading-snug" style={{ color: OWNER_ON_HOLD_INK }}>
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
          <p
            className="mt-1 text-[28px] font-bold tabular-nums leading-none"
            style={{ color: OWNER_ON_HOLD_INK }}
          >
            {totalOnHoldHours}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {PAYROLL_ROLE_ORDER.map((tier) => {
          const group = payroll.byRole.find((row) => row.tier === tier)
          const staff = group?.staff ?? []
          if (staff.length === 0) return null

          return (
            <div key={tier}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                {PAYROLL_ROLE_HEADINGS[tier]}
              </h3>
              <ul className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2.5">
                {staff.map((row) => (
                  <li key={row.staffId}>
                    <StaffPayrollBox row={row} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
