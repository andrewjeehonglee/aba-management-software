import { cn } from "@/lib/utils"
import type { PayPeriodHoursGapSummary, PayPeriodRoleTierRow } from "@/lib/payPeriodHoursGap"

function RoleFillRow({ row }: { row: PayPeriodRoleTierRow }) {
  const total = row.payableHours + row.onHoldHours
  const payablePct = total > 0 ? (row.payableHours / total) * 100 : 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-ink">{row.label}</span>
        <span className="shrink-0 text-[14px] tabular-nums text-ink-soft">
          {row.payableHours} payable · {row.onHoldHours} on hold
        </span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-line-soft"
        role="img"
        aria-label={`${row.label}: ${row.payableHours} payable hours, ${row.onHoldHours} on hold`}
      >
        <div
          className="h-full bg-brand transition-[width] duration-300"
          style={{ width: `${payablePct}%` }}
        />
        {row.onHoldHours > 0 ? (
          <div
            className="h-full bg-alert transition-[width] duration-300"
            style={{ width: `${100 - payablePct}%` }}
          />
        ) : null}
      </div>
    </div>
  )
}

function GapSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-5 py-5 shadow-card">
      <div className="h-3 w-40 rounded bg-line-soft" />
      <div className="mt-4 h-10 w-24 rounded bg-line-soft" />
      <div className="mt-2 h-3.5 w-56 rounded bg-line-soft" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-line-soft" />
        ))}
      </div>
    </div>
  )
}

export function HoursOnHoldGap({
  gap,
  loading,
}: {
  gap: PayPeriodHoursGapSummary | null
  loading?: boolean
}) {
  if (loading || !gap) {
    return <GapSkeleton />
  }

  const heroTone =
    gap.totalOnHoldHours > 0 ? "text-alert" : "text-brand"

  return (
    <section
      className="rounded-[var(--radius)] bg-surface px-5 py-5 shadow-card short:px-4 short:py-4"
      aria-label="Hours on hold this pay period"
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-muted">
        Hours on hold this pay period
      </p>

      <p className={cn("mt-2 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums", heroTone)}>
        {gap.totalOnHoldHours} hrs
      </p>

      <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">
        Held until notes are submitted
      </p>

      <div className="mt-6 space-y-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">By role</p>
        {gap.byRole.map((row) => (
          <RoleFillRow key={row.tier} row={row} />
        ))}
      </div>
    </section>
  )
}
