import { useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { firstName } from "@/lib/ownerDashboardStatus"
import {
  PAY_PERIOD_TIER_ORDER,
  type PayPeriodHoursGapSummary,
  type PayPeriodRoleTier,
  type PayPeriodStaffHoursRow,
} from "@/lib/payPeriodHoursGap"
import { staffProfilePath } from "@/lib/rosterScope"

const TIER_FILTER_LABELS: Record<PayPeriodRoleTier, string> = {
  technician: "Technicians",
  supervisor: "Supervisors",
  bcba: "BCBAs",
}

function PersonRow({
  name,
  hours,
  href,
  hoursClassName,
}: {
  name: string
  hours: number
  href: string
  hoursClassName?: string
}) {
  return (
    <Link
      to={href}
      className="flex items-baseline justify-between gap-3 rounded-[8px] px-1 py-0.5 -mx-1 text-[14px] transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="font-medium text-ink">{name}</span>
      <span className={cn("shrink-0 tabular-nums", hoursClassName ?? "text-ink-soft")}>
        {hours} hrs
      </span>
    </Link>
  )
}

function StaffSection({
  label,
  labelClassName,
  rows,
  hoursKey,
  hoursClassName,
}: {
  label: string
  labelClassName: string
  rows: PayPeriodStaffHoursRow[]
  hoursKey: "onHoldHours" | "payableHours"
  hoursClassName?: string
}) {
  if (rows.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className={cn("text-[12px] font-semibold uppercase tracking-[0.08em]", labelClassName)}>
        {label}
      </p>
      <div className="space-y-0.5">
        {rows.map((row) => {
          const href = row.staffExternalCode
            ? staffProfilePath(row.staffExternalCode)
            : `/staff/${row.staffId}`
          return (
            <PersonRow
              key={row.staffId}
              name={firstName(row.staffName)}
              hours={row[hoursKey]}
              href={href}
              hoursClassName={hoursClassName}
            />
          )
        })}
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-5 py-5 shadow-card">
      <div className="h-4 w-32 rounded bg-line-soft" />
      <div className="mt-4 h-8 w-full rounded-full bg-line-soft" />
      <div className="mt-5 h-6 w-48 rounded bg-line-soft" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-line-soft" />
        ))}
      </div>
    </div>
  )
}

export function PayrollPanel({
  gap,
  loading,
}: {
  gap: PayPeriodHoursGapSummary | null
  loading?: boolean
}) {
  const [selectedTier, setSelectedTier] = useState<PayPeriodRoleTier>("technician")

  if (loading || !gap) {
    return <PanelSkeleton />
  }

  const tierDetail = gap.byRole.find((row) => row.tier === selectedTier) ?? gap.byRole[0]!
  const onHoldStaff = tierDetail.staff
    .filter((row) => row.onHoldHours > 0)
    .sort((a, b) => b.onHoldHours - a.onHoldHours || a.staffName.localeCompare(b.staffName))
  const payableStaff = tierDetail.staff
    .filter((row) => row.payableHours > 0 && row.onHoldHours === 0)
    .sort((a, b) => b.payableHours - a.payableHours || a.staffName.localeCompare(b.staffName))

  return (
    <section
      className="flex min-h-0 flex-col rounded-[var(--radius)] bg-surface px-5 py-5 shadow-card short:px-4 short:py-4"
      aria-label="Payroll"
    >
      <div className="shrink-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-[16px] font-semibold text-ink">Payroll</h2>
          <span className="text-[14px] tabular-nums text-muted">{gap.payPeriodShortLabel}</span>
        </div>

        <div
          className="mt-3 flex rounded-full bg-surface-2 p-0.5"
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
                  "min-w-0 flex-1 rounded-full px-2 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink-soft",
                )}
              >
                {TIER_FILTER_LABELS[tier]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <p className="text-[14px] font-semibold text-ink">{tierDetail.label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-[22px] font-semibold leading-none tabular-nums text-brand">
            {tierDetail.payableHours}{" "}
            <span className="text-[14px] font-semibold text-brand">payable</span>
          </p>
          <p className="text-[22px] font-semibold leading-none tabular-nums text-alert">
            {tierDetail.onHoldHours}{" "}
            <span className="text-[14px] font-semibold text-alert">on hold</span>
          </p>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto">
        <StaffSection
          label="On hold"
          labelClassName="text-alert"
          rows={onHoldStaff}
          hoursKey="onHoldHours"
          hoursClassName="text-alert"
        />
        <StaffSection
          label="Payable"
          labelClassName="text-brand"
          rows={payableStaff}
          hoursKey="payableHours"
          hoursClassName="text-ink-soft"
        />
      </div>
    </section>
  )
}
