import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { getAuthUtilizationByMonth } from "@/lib/authUtilization"
import {
  buildAuthorizationTileViewModel,
  buildDirectHoursTileViewModel,
  buildNotesTileViewModel,
  formatDashboardMonthLabel,
  TILE_DEFINITIONS,
} from "@/lib/dashboardTileMetrics"
import { getNotesStatus } from "@/lib/notesStatus"
import { getStaffHoursByMonth } from "@/lib/staffHours"
import { formatPayPeriodCloseDate } from "@/lib/payPeriod"
import type { OwnerWorklistItem } from "@/lib/ownerDashboardStatus"
import {
  BCBA_STATE_LABEL,
  BCBA_STATE_METRIC_CLASS,
  TILE_STATE_DOT_CLASS,
  TILE_STATE_TAG_CLASS,
  TILE_STATE_VALUE_CLASS,
  type BcbaTileState,
} from "@/lib/bcbaTileState"

type Domain = "notes" | "hours" | "auth"

const DOMAIN_ORDER: Domain[] = ["notes", "hours", "auth"]

const WORKLIST_GROUP_LABELS: Record<Domain, string> = {
  notes: "Incomplete notes",
  hours: "Below 50% direct engagement",
  auth: "Limited hours remaining",
}

function ConsequenceLines({ lines }: { lines: ReactNode[] }) {
  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <p key={i} className="text-[16px] leading-snug text-ink-soft [&_strong]:font-semibold [&_strong]:text-ink">
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
  tileState,
}: {
  value: ReactNode
  label: string
  period: string
  tileState: BcbaTileState
}) {
  return (
    <div className="shrink-0 text-left lg:text-right">
      <p
        className={cn(
          "text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums",
          BCBA_STATE_METRIC_CLASS[tileState],
        )}
      >
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
  tileState,
  lines,
  metric,
  metricLabel,
  metricPeriod,
  isLast = false,
}: {
  id?: string
  title: string
  tileState: BcbaTileState
  lines: ReactNode[]
  metric: ReactNode
  metricLabel: string
  metricPeriod: string
  isLast?: boolean
}) {
  const tag = BCBA_STATE_LABEL[tileState]

  return (
    <div
      id={id}
      className={cn(
        "grid grid-cols-1 items-center gap-4 px-5 py-8 short:gap-3 short:px-4 short:py-6 lg:grid-cols-[1fr_auto] lg:gap-10",
        !isLast && "border-b border-line-soft",
      )}
    >
      <div className="min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[13px] font-semibold uppercase tracking-[0.08em]",
              TILE_STATE_TAG_CLASS[tileState],
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
        tileState={tileState}
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
  const tone: BcbaTileState = item.severity === "crit" ? "urgent" : "monitor"

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
        className={cn("size-2 shrink-0 rounded-full", TILE_STATE_DOT_CLASS[tone])}
        aria-hidden
      />
      <span className="font-medium text-ink">{item.name}</span>
      <span className={cn("font-semibold tabular-nums", TILE_STATE_VALUE_CLASS[tone])}>
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
  linkedTileState,
}: {
  domain: Domain
  items: OwnerWorklistItem[]
  poppingId: string | null
  onTap: (item: OwnerWorklistItem) => void
  linkedTag?: string
  linkedTileState?: BcbaTileState
}) {
  if (items.length === 0) {
    return <div className="hidden min-h-[120px] min-[1000px]:block" aria-hidden />
  }

  const linkedTagClass =
    linkedTileState ? TILE_STATE_TAG_CLASS[linkedTileState] : TILE_STATE_TAG_CLASS.healthy

  return (
    <div className="flex min-h-[120px] flex-col justify-center py-4 short:py-3 min-[1000px]:py-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-[16px] font-semibold uppercase tracking-[0.08em] text-ink">
          {WORKLIST_GROUP_LABELS[domain]}
        </p>
        {linkedTag && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[13px] font-semibold uppercase tracking-[0.08em] tabular-nums",
              linkedTagClass,
            )}
          >
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

  const notesView = notes ? buildNotesTileViewModel(notes) : null
  const hoursView = hours ? buildDirectHoursTileViewModel(hours) : null
  const authView = auth ? buildAuthorizationTileViewModel(auth.byClient) : null

  const periodLabel = notes?.payPeriodLabel ?? formatPayPeriodCloseDate()
  const monthLabel = formatDashboardMonthLabel(hours?.monthLabel ?? "")
  const authMonthLabel = formatDashboardMonthLabel(auth?.monthLabel ?? "")

  const domainRows: Record<
    Domain,
    {
      id: string
      title: string
      tileState: BcbaTileState
      lines: ReactNode[]
      metric: ReactNode
      metricLabel: string
      metricPeriod: string
      linkedTag?: string
    }
  > = {
    notes: {
      id: TILE_DEFINITIONS.notes.id,
      title: TILE_DEFINITIONS.notes.title,
      tileState: notesView?.state ?? "healthy",
      lines: notesView ? [<>{notesView.requirement}</>] : ["Loading session notes…"],
      metric: notesView?.metric ?? "—",
      metricLabel: notesView?.descriptor ?? "All notes complete",
      metricPeriod: periodLabel,
      linkedTag: notesView && notesView.metric > 0 ? String(notesView.metric) : undefined,
    },
    hours: {
      id: TILE_DEFINITIONS.directHours.id,
      title: TILE_DEFINITIONS.directHours.title,
      tileState: hoursView?.state ?? "healthy",
      lines: hoursView ? [<>{hoursView.requirement}</>] : ["Loading direct hours…"],
      metric: hoursView?.metric ?? 0,
      metricLabel: hoursView?.descriptor ?? "All staff on track",
      metricPeriod: monthLabel || "This month",
      linkedTag: hoursView && hoursView.metric > 0 ? String(hoursView.metric) : undefined,
    },
    auth: {
      id: TILE_DEFINITIONS.authorization.id,
      title: TILE_DEFINITIONS.authorization.title,
      tileState: authView?.state ?? "healthy",
      lines: authView ? [<>{authView.requirement}</>] : ["Loading authorized hours…"],
      metric: authView?.metric ?? 0,
      metricLabel: authView?.descriptor ?? "No clients flagged",
      metricPeriod: authMonthLabel || "This month",
      linkedTag: authView && authView.metric > 0 ? String(authView.metric) : undefined,
    },
  }

  return (
    <section
      className={cn("animate-fade-rise animate-fade-rise-delay-1 flex min-h-0 flex-1 flex-col", className)}
      aria-label="Practice overview and action items"
    >
      <div className="owner-scroll-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mb-3 shrink-0 short:mb-2">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.10em] text-muted">
            Your practice today
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            3 BCBAs · 5 clinical supervisors · 6 technicians
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 min-[1000px]:gap-4">
          {DOMAIN_ORDER.map((domain) => {
            const row = domainRows[domain]
            return (
              <div
                key={domain}
                className={cn(
                  "flex flex-col gap-4",
                  "min-[1000px]:grid min-[1000px]:min-h-0 min-[1000px]:flex-1 min-[1000px]:grid-cols-[1.15fr_1fr] min-[1000px]:items-stretch min-[1000px]:gap-x-8",
                )}
              >
                <div className="rounded-[var(--radius)] bg-surface shadow-card">
                  <OpsRow
                    id={row.id}
                    title={row.title}
                    tileState={row.tileState}
                    lines={row.lines}
                    metric={row.metric}
                    metricLabel={row.metricLabel}
                    metricPeriod={row.metricPeriod}
                    isLast
                  />
                </div>
                <LinkedBubbleGroup
                  domain={domain}
                  items={worklistByDomain[domain]}
                  poppingId={poppingId}
                  onTap={handleTap}
                  linkedTag={row.linkedTag}
                  linkedTileState={row.tileState}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
