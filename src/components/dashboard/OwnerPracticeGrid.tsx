import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { formatPayPeriodCloseDate } from "@/lib/payPeriod"
import type { OwnerWorklistItem } from "@/lib/ownerDashboardStatus"
import { severityDotClass, severityTagClass } from "@/lib/pulseSeverity"
import type { PulseSeverity } from "@/lib/pulseSeverity"

type Domain = "notes" | "hours" | "auth"

const DOMAIN_ORDER: Domain[] = ["notes", "hours", "auth"]

const WORKLIST_GROUP_LABELS: Record<Domain, string> = {
  notes: "Notes to wrap up",
  hours: "Below 50% direct",
  auth: "Over their authorized hours",
}

function ConsequenceLines({ lines }: { lines: ReactNode[] }) {
  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <p key={i} className="text-[16px] leading-snug text-ink-soft">
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
      <p className="mt-1.5 text-[16px] text-ink-soft">{label}</p>
      <p className="mt-0.5 text-[14px] text-muted">{period}</p>
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
  isLast = false,
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
  isLast?: boolean
}) {
  return (
    <div
      id={id}
      className={cn(
        "grid grid-cols-1 items-start gap-4 px-5 py-5 short:gap-3 short:px-4 short:py-4 lg:grid-cols-[1fr_auto] lg:gap-10",
        !isLast && "border-b border-line-soft",
      )}
    >
      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[13px] font-semibold uppercase tracking-[0.08em]",
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

function bubbleShortValue(displayValue: string): string {
  const sessions = displayValue.match(/^(\d+)\s*session/i)
  if (sessions) return sessions[1]!
  const hrs = displayValue.match(/^(\d+)\s*hrs?/i)
  if (hrs) return `${hrs[1]} hrs`
  const pct = displayValue.match(/^(\d+)%/)
  if (pct) return pct[0]!
  const num = displayValue.match(/^(\d+)/)
  return num?.[1] ?? displayValue
}

function WorklistBalloon({
  item,
  popping,
  onTap,
}: {
  item: OwnerWorklistItem
  popping: boolean
  onTap: (item: OwnerWorklistItem) => void
}) {
  const valueClass = item.severity === "crit" ? "text-alert-strong" : "text-alert"

  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-[18px_18px_18px_6px] border border-line bg-surface px-3.5 py-2.5 text-[16px] shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        popping && "animate-bubble-pop pointer-events-none",
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", severityDotClass(item.severity))}
        aria-hidden
      />
      <span className="font-medium text-ink">{item.name}</span>
      <span className={cn("font-semibold tabular-nums", valueClass)}>
        {bubbleShortValue(item.displayValue)}
      </span>
    </button>
  )
}

function LinkedBubbleGroup({
  domain,
  items,
  poppingId,
  onTap,
  linkedTag,
}: {
  domain: Domain
  items: OwnerWorklistItem[]
  poppingId: string | null
  onTap: (item: OwnerWorklistItem) => void
  linkedTag?: string
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={cn("py-4 short:py-3 min-[1000px]:border-l-2 min-[1000px]:border-alert/25 min-[1000px]:pl-4")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-[16px] font-semibold uppercase tracking-[0.08em] text-ink">
          {WORKLIST_GROUP_LABELS[domain]}
        </p>
        {linkedTag && (
          <span className="rounded-full bg-alert-soft px-2.5 py-0.5 text-[13px] font-semibold tabular-nums text-alert">
            {linkedTag}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <WorklistBalloon
            key={item.id}
            item={item}
            popping={poppingId === item.id}
            onTap={onTap}
          />
        ))}
      </div>
    </div>
  )
}

function SurfaceSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface shadow-card">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-b border-line-soft px-5 py-5 last:border-b-0">
          <div className="h-5 w-40 rounded bg-line-soft" />
          <div className="mt-3 h-4 w-full max-w-md rounded bg-line-soft" />
        </div>
      ))}
    </div>
  )
}

export function OwnerPracticeGrid({
  refreshKey,
  staffIds,
  clientIds,
  includeCaseloadStaff,
  worklistItems,
  className,
}: {
  refreshKey?: number
  staffIds?: string[]
  clientIds?: string[]
  includeCaseloadStaff?: boolean
  worklistItems: OwnerWorklistItem[]
  worklistLoading?: boolean
  className?: string
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set())
  const [poppingId, setPoppingId] = useState<string | null>(null)

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

  useEffect(() => {
    setClearedIds(new Set())
    setPoppingId(null)
  }, [worklistItems])

  const visibleWorklist = useMemo(
    () => worklistItems.filter((item) => !clearedIds.has(item.id)),
    [worklistItems, clearedIds],
  )

  const worklistByDomain = useMemo(() => {
    const map: Record<Domain, OwnerWorklistItem[]> = { notes: [], hours: [], auth: [] }
    for (const item of visibleWorklist) {
      if (item.group in map) map[item.group as Domain].push(item)
    }
    return map
  }, [visibleWorklist])

  const handleTap = useCallback(
    (item: OwnerWorklistItem) => {
      if (poppingId) return
      setPoppingId(item.id)
      window.setTimeout(() => {
        setClearedIds((prev) => new Set([...prev, item.id]))
        setPoppingId(null)
        if (item.href) navigate(item.href)
      }, 360)
    },
    [navigate, poppingId],
  )

  if (loading) return <SurfaceSkeleton />

  if (error) {
    return (
      <div className={cn("rounded-[var(--radius)] bg-surface p-6 shadow-card", className)}>
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => setRetryTick((k) => k + 1)}
          className="mt-2 text-sm font-medium text-brand hover:underline"
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

  const overCount = auth?.overCount ?? 0
  const authMonthLabel = auth?.monthLabel ?? ""

  const notesTag = unpayableCount > 0 ? `${unpayableCount} overdue` : "healthy"
  const notesTagSeverity: PulseSeverity = unpayableCount > 0 ? "warn" : "ok"

  const hoursTag = flaggedCount > 0 ? `${flaggedCount} below direct` : "healthy"
  const hoursTagSeverity: PulseSeverity = flaggedCount > 0 ? "warn" : "ok"

  const authTag = overCount > 0 ? `${overCount} over limit` : "healthy"
  const authTagSeverity: PulseSeverity = overCount > 0 ? "warn" : "ok"

  const notesLines: ReactNode[] =
    totalCompleted === 0
      ? ["No sessions logged yet this period."]
      : unpayableCount > 0
        ? [
            <>
              <strong className="font-semibold text-alert-strong">
                {unpayableCount} {unpayableCount === 1 ? "session can't" : "sessions can't"} be paid
              </strong>{" "}
              until their notes are in.
            </>,
          ]
        : ["All sessions documented and payable this period."]

  const hoursLines: ReactNode[] =
    staffCount === 0
      ? ["No billable hours logged yet."]
      : flaggedCount > 0
        ? [
            <>
              <strong className="font-semibold text-alert-strong">{flaggedCount} staff</strong> are below
              the 50% direct-service requirement.
            </>,
          ]
        : [`All ${staffCount} staff meet the 50% direct-service requirement.`]

  const authLines: ReactNode[] =
    overCount > 0
      ? [
          <>
            <strong className="font-semibold text-alert-strong">
              {overCount} {overCount === 1 ? "client has" : "clients have"}
            </strong>{" "}
            billed more hours than their authorization allows.
          </>,
        ]
      : (auth?.totalClients ?? 0) === 0
        ? ["No client authorization usage logged yet this month."]
        : ["All clients are within their authorized hours this month."]

  const domainRows = {
    notes: {
      id: "notes-overdue",
      title: "Session notes",
      tag: notesTag,
      tagSeverity: notesTagSeverity,
      lines: notesLines,
      metric: totalCompleted === 0 ? "—" : `${pctDocumented}%`,
      metricLabel: "of sessions documented",
      metricPeriod: `Pay period · ${periodLabel}`,
      metricSeverity: (unpayableCount > 0 ? "warn" : "ok") as PulseSeverity,
      linkedTag: unpayableCount > 0 ? `${unpayableCount} overdue` : undefined,
    },
    hours: {
      id: "hours-by-staff",
      title: "Hours by staff",
      tag: hoursTag,
      tagSeverity: hoursTagSeverity,
      lines: hoursLines,
      metric: flaggedCount,
      metricLabel: "staff below 50% direct",
      metricPeriod: monthLabel ? `Month of ${monthLabel}` : "This month",
      metricSeverity: (flaggedCount > 0 ? "warn" : "ok") as PulseSeverity,
      linkedTag: flaggedCount > 0 ? `${flaggedCount} staff` : undefined,
    },
    auth: {
      id: "auth-utilization",
      title: "Authorization utilization",
      tag: authTag,
      tagSeverity: authTagSeverity,
      lines: authLines,
      metric: overCount,
      metricLabel: "clients over authorized hours",
      metricPeriod: authMonthLabel ? `Month of ${authMonthLabel}` : "This month",
      metricSeverity: (overCount > 0 ? "crit" : "ok") as PulseSeverity,
      linkedTag: overCount > 0 ? `${overCount} clients` : undefined,
    },
  }

  return (
    <section
      className={cn("animate-fade-rise animate-fade-rise-delay-1 flex min-h-0 flex-1 flex-col", className)}
      aria-label="Practice overview and action items"
    >
      <div className="owner-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 min-[1000px]:grid-cols-[1.15fr_1fr] min-[1000px]:gap-x-8">
          <h2 className="mb-2 text-[14px] font-semibold uppercase tracking-[0.10em] text-muted min-[1000px]:mb-3">
            Your practice today
          </h2>
          <div className="hidden min-[1000px]:block" aria-hidden />

          {DOMAIN_ORDER.map((domain, index) => {
            const row = domainRows[domain]
            const isLast = index === DOMAIN_ORDER.length - 1
            return (
              <div key={domain} className="contents">
                <div
                  className={cn(
                    "bg-surface",
                    index === 0 && "rounded-t-[var(--radius)]",
                    isLast && "rounded-b-[var(--radius)] shadow-card",
                    index === 0 && "shadow-card",
                  )}
                >
                  <OpsRow
                    id={row.id}
                    title={row.title}
                    tag={row.tag}
                    tagSeverity={row.tagSeverity}
                    lines={row.lines}
                    metric={row.metric}
                    metricLabel={row.metricLabel}
                    metricPeriod={row.metricPeriod}
                    metricSeverity={row.metricSeverity}
                    isLast={isLast}
                  />
                </div>
                <LinkedBubbleGroup
                  domain={domain}
                  items={worklistByDomain[domain]}
                  poppingId={poppingId}
                  onTap={handleTap}
                  linkedTag={row.linkedTag}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
