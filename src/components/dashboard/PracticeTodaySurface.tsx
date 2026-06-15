import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { formatPayPeriodCloseDate } from "@/lib/payPeriod"
import { severityTagClass } from "@/lib/pulseSeverity"
import type { PulseSeverity } from "@/lib/pulseSeverity"

function ConsequenceLines({ lines }: { lines: ReactNode[] }) {
  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <p key={i} className="text-[14px] leading-snug text-ink-soft">
          {line}
        </p>
      ))}
    </div>
  )
}

function StackedMetric({
  value,
  label,
  period,
  severity = "ok",
}: {
  value: ReactNode
  label: string
  period: string
  severity?: PulseSeverity
}) {
  const valueColor =
    severity === "crit"
      ? "text-alert-strong"
      : severity === "warn"
        ? "text-alert"
        : "text-brand"

  return (
    <div className="shrink-0 text-left lg:text-right">
      <p className={cn("text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums", valueColor)}>
        {value}
      </p>
      <p className="mt-1.5 text-[14px] text-ink-soft">{label}</p>
      <p className="mt-0.5 text-[12px] text-muted">{period}</p>
    </div>
  )
}

function OpsRow({
  id,
  title,
  tag,
  tagSeverity,
  lines,
  metric,
  metricLabel,
  metricPeriod,
  metricSeverity = "ok",
  className,
}: {
  id?: string
  title: string
  tag: string
  tagSeverity: PulseSeverity
  lines: ReactNode[]
  metric: ReactNode
  metricLabel: string
  metricPeriod: string
  metricSeverity?: PulseSeverity
  className?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        "grid grid-cols-1 items-start gap-4 border-b border-line-soft px-5 py-5 last:border-b-0 short:gap-3 short:px-4 short:py-3.5 lg:grid-cols-[1fr_auto] lg:gap-10",
        className,
      )}
    >
      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
              severityTagClass(tagSeverity),
            )}
          >
            {tag}
          </span>
        </div>
        <ConsequenceLines lines={lines} />
      </div>

      <StackedMetric
        value={metric}
        label={metricLabel}
        period={metricPeriod}
        severity={metricSeverity}
      />
    </div>
  )
}

function SurfaceSkeleton() {
  return (
    <div className="rounded-[var(--radius)] bg-surface shadow-card">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-b border-line-soft px-5 py-5 last:border-b-0">
          <div className="h-5 w-40 animate-pulse rounded bg-line-soft" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-line-soft" />
        </div>
      ))}
    </div>
  )
}

export function PracticeTodaySurface({
  refreshKey,
  staffIds,
  clientIds,
  includeCaseloadStaff,
  className,
}: {
  refreshKey?: number
  staffIds?: string[]
  clientIds?: string[]
  includeCaseloadStaff?: boolean
  className?: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const [notes, setNotes] = useState<Awaited<ReturnType<typeof getNotesStatus>> | null>(null)
  const [hours, setHours] = useState<Awaited<ReturnType<typeof getStaffHoursByMonth>> | null>(null)
  const [auth, setAuth] = useState<Awaited<ReturnType<typeof getAuthUtilizationByMonth>> | null>(null)

  const scopeOptions =
    staffIds?.length || clientIds?.length || includeCaseloadStaff
      ? {
          staffIds: staffIds?.length ? staffIds : undefined,
          clientIds: clientIds?.length ? clientIds : undefined,
          includeCaseloadStaff,
          includeZeroHourStaff: true,
        }
      : { includeZeroHourStaff: true }

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getNotesStatus(undefined, scopeOptions),
      getStaffHoursByMonth(undefined, scopeOptions),
      getAuthUtilizationByMonth(undefined, clientIds?.length ? { clientIds } : undefined),
    ])
      .then(([notesData, hoursData, authData]) => {
        setNotes(notesData)
        setHours(hoursData)
        setAuth(authData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load practice data"))
      .finally(() => setLoading(false))
  }, [refreshKey, staffIds, clientIds, includeCaseloadStaff, retryTick])

  if (loading) return <SurfaceSkeleton />

  if (error) {
    return (
      <div className={cn("rounded-[var(--radius)] bg-surface p-6 shadow-card", className)}>
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => setRetryTick((k) => k + 1)}
          className="mt-2 text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Retry
        </button>
      </div>
    )
  }

  const unpayableCount = (notes?.totalMissing ?? 0) + (notes?.totalOverdue ?? 0)
  const pctDocumented = notes?.pctDocumented ?? 0
  const periodLabel = notes?.payPeriodLabel ?? formatPayPeriodCloseDate()
  const totalCompleted = notes?.totalCompleted ?? 0

  const allStaff = hours?.byStaff ?? []
  const flaggedCount = allStaff.filter((row) => row.flagged).length
  const staffCount = allStaff.length
  const monthLabel = hours?.monthLabel ?? ""
  const payableHoursPending = notes?.payableHoursPending ?? 0

  const overCount = auth?.overCount ?? 0
  const authMonthLabel = auth?.monthLabel ?? ""

  const notesTag = unpayableCount > 0 ? `${unpayableCount} overdue` : "healthy"
  const notesTagSeverity: PulseSeverity = unpayableCount > 0 ? "warn" : "ok"

  const hoursTag =
    flaggedCount > 0
      ? `${flaggedCount} below mix`
      : payableHoursPending > 0
        ? `${payableHoursPending} hrs held`
        : "healthy"
  const hoursTagSeverity: PulseSeverity =
    flaggedCount > 0 || payableHoursPending > 0 ? "warn" : "ok"

  const authTag = overCount > 0 ? `${overCount} over` : "healthy"
  const authTagSeverity: PulseSeverity = overCount > 0 ? "warn" : "ok"

  const notesLines: ReactNode[] =
    totalCompleted === 0
      ? ["No sessions logged yet this period — nothing to document or pay."]
      : unpayableCount > 0
        ? [
            <>
              <strong className="font-semibold text-alert-strong">
                {unpayableCount} {unpayableCount === 1 ? "session can't" : "sessions can't"} be paid
              </strong>{" "}
              until their notes are in.
            </>,
            "It's also the first thing an audit checks.",
          ]
        : [
            "All sessions documented and payable.",
            "No audit exposure this period.",
          ]

  const hoursLines: ReactNode[] =
    staffCount === 0
      ? [
          "No billable hours logged yet.",
          "Payroll tracking starts when sessions are documented.",
        ]
      : flaggedCount > 0
        ? [
            <>
              <strong className="font-semibold text-alert-strong">{flaggedCount} staff</strong> are below
              50% direct mix.
            </>,
            payableHoursPending > 0
              ? `${payableHoursPending} hours are paused until the notes are in.`
              : "Review direct mix before payroll closes.",
          ]
        : [
            `All ${staffCount} staff are billing within range.`,
            payableHoursPending > 0
              ? `${payableHoursPending} hours are paused until the notes are in.`
              : "No overpayment or compliance risk.",
          ]

  const authLines: ReactNode[] =
    overCount > 0
      ? [
          <>
            <strong className="font-semibold text-alert-strong">
              {overCount} {overCount === 1 ? "client is" : "clients are"} over
            </strong>{" "}
            their authorized hours.
          </>,
          "Review before the next session bills.",
        ]
      : (auth?.totalClients ?? 0) === 0
        ? [
            "No utilization logged yet.",
            "Delivery against auth limits appears as sessions are documented.",
          ]
        : [
            "All clients within authorized limits.",
            "No unreimbursed delivery this month.",
          ]

  return (
    <section className={cn("animate-fade-rise animate-fade-rise-delay-1 min-h-0", className)} aria-labelledby="practice-today-heading">
      <h2
        id="practice-today-heading"
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.10em] text-muted short:mb-2"
      >
        Your practice today
      </h2>
      <div className="rounded-[var(--radius)] bg-surface shadow-card">
        <OpsRow
          id="notes-overdue"
          title="Session notes"
          tag={notesTag}
          tagSeverity={notesTagSeverity}
          lines={notesLines}
          metric={totalCompleted === 0 ? "—" : `${pctDocumented}%`}
          metricLabel="documented"
          metricPeriod={`Pay period · ${periodLabel}`}
          metricSeverity={unpayableCount > 0 ? "warn" : "ok"}
        />
        <OpsRow
          id="hours-by-staff"
          title="Hours by staff"
          tag={hoursTag}
          tagSeverity={hoursTagSeverity}
          lines={hoursLines}
          metric={flaggedCount}
          metricLabel="staff below 50% direct"
          metricPeriod={monthLabel ? `Month of ${monthLabel}` : "This month"}
          metricSeverity={flaggedCount > 0 ? "warn" : "ok"}
        />
        <OpsRow
          id="auth-utilization"
          title="Authorization utilization"
          tag={authTag}
          tagSeverity={authTagSeverity}
          lines={authLines}
          metric={overCount}
          metricLabel="clients over limit"
          metricPeriod={authMonthLabel ? `Month of ${authMonthLabel}` : "This month"}
          metricSeverity={overCount > 0 ? "crit" : "ok"}
        />
      </div>
    </section>
  )
}
