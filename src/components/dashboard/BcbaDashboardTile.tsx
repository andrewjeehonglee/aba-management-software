import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BCBA_STATE_METRIC_CLASS,
  type BcbaTileState,
} from "@/lib/bcbaTileState"
import {
  MetricPopover,
  type MetricPopoverGroup,
  type MetricPopoverItem,
} from "@/components/dashboard/MetricPopover"
import {
  BIG_METRIC_CLASS,
  metricToneInk,
  type DashboardDualMetricSide,
} from "@/lib/dashboardTileMetrics"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

export type BcbaBubbleItem = MetricPopoverItem

/** Reserve consistent space so every tile's big number starts at the same row. */
const HEADER_ZONE_CLASS = "min-h-[2.75rem]"

function DualMetricColumn({ side }: { side: DashboardDualMetricSide }) {
  return (
    <div className="min-w-0">
      <p
        className={BIG_METRIC_CLASS}
        style={{ color: metricToneInk(side.tone) }}
      >
        {side.value}
      </p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{side.unit}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">{side.clarifier}</p>
    </div>
  )
}

function ViewAllLink({
  title,
  popoverItems,
  popoverGroups,
  popoverEmptyLabel,
}: {
  title: string
  popoverItems: MetricPopoverItem[]
  popoverGroups: MetricPopoverGroup[]
  popoverEmptyLabel: string
}) {
  return (
    <MetricPopover
      metric={
        <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-muted hover:text-ink-soft hover:underline underline-offset-2">
          View all
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      }
      metricClassName=""
      items={popoverItems}
      groups={popoverGroups}
      emptyLabel={popoverEmptyLabel}
      ariaLabel={`${title} details`}
    />
  )
}

export function BcbaDashboardTile({
  id,
  title,
  requirement,
  state,
  period,
  metric,
  descriptor,
  dualMetric,
  showViewAll,
  popoverItems = [],
  popoverGroups = [],
  popoverEmptyLabel = "All caught up",
  className,
}: {
  id?: string
  title: string
  requirement: string
  state: BcbaTileState
  period: ReactNode
  metric: ReactNode
  descriptor: string
  dualMetric?: {
    left: DashboardDualMetricSide
    right: DashboardDualMetricSide
  }
  showViewAll?: boolean
  popoverItems?: MetricPopoverItem[]
  popoverGroups?: MetricPopoverGroup[]
  popoverEmptyLabel?: string
  className?: string
}) {
  const metricClass = BCBA_STATE_METRIC_CLASS[state]

  return (
    <div
      id={id}
      className={cn(
        "flex min-h-[220px] flex-col rounded-[var(--radius)] bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <h3 className={cn(TILE_TITLE, "text-ink")}>{title}</h3>

      <div className={cn(HEADER_ZONE_CLASS, "mt-2")}>
        {requirement ? (
          <p className="text-[14px] leading-snug text-muted">{requirement}</p>
        ) : null}
      </div>

      {dualMetric ? (
        <div className="mt-3 grid grid-cols-2 gap-x-4">
          <DualMetricColumn side={dualMetric.left} />
          <DualMetricColumn side={dualMetric.right} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-0.5">
          <MetricPopover
            metric={metric}
            metricClassName={cn(BIG_METRIC_CLASS, metricClass)}
            items={popoverItems}
            groups={popoverGroups}
            emptyLabel={popoverEmptyLabel}
            ariaLabel={`${title} details`}
          />
          {descriptor ? (
            <span className="text-sm font-medium text-ink-soft">{descriptor}</span>
          ) : null}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          {showViewAll ? (
            <ViewAllLink
              title={title}
              popoverItems={popoverItems}
              popoverGroups={popoverGroups}
              popoverEmptyLabel={popoverEmptyLabel}
            />
          ) : null}
        </div>
        <div className="shrink-0 text-right text-[13px] font-medium leading-snug text-subtle">
          {period}
        </div>
      </div>
    </div>
  )
}

export function BcbaDashboardTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius)] bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="h-5 w-28 rounded bg-line-soft" />
      <div className="mt-3 h-4 w-full rounded bg-line-soft" />
      <div className="mt-4 h-10 w-20 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-32 rounded bg-line-soft" />
      <div className="mt-6 flex justify-between">
        <div className="h-4 w-16 rounded bg-line-soft" />
        <div className="h-4 w-24 rounded bg-line-soft" />
      </div>
    </div>
  )
}

export function BcbaDashboardTileError({
  title,
  message,
  onRetry,
  className,
}: {
  title: string
  message: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--radius)] bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <h3 className={cn(TILE_TITLE, "text-ink")}>{title}</h3>
      <p className="mt-3 text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 w-fit text-sm font-medium text-brand hover:underline"
      >
        Retry
      </button>
    </div>
  )
}
