import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  BCBA_STATE_LABEL,
  BCBA_STATE_METRIC_CLASS,
  type BcbaTileState,
} from "@/lib/bcbaTileState"
import {
  MetricPopover,
  type MetricPopoverGroup,
  type MetricPopoverItem,
} from "@/components/dashboard/MetricPopover"

export type BcbaBubbleItem = MetricPopoverItem

export function BcbaDashboardTile({
  id,
  title,
  requirement,
  state,
  period,
  metric,
  descriptor,
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
  popoverItems?: MetricPopoverItem[]
  popoverGroups?: MetricPopoverGroup[]
  popoverEmptyLabel?: string
  className?: string
}) {
  const stateLabel = BCBA_STATE_LABEL[state]
  const metricClass = BCBA_STATE_METRIC_CLASS[state]

  return (
    <div
      id={id}
      className={cn(
        "flex flex-col rounded-[var(--radius)] bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <span className={cn("shrink-0 text-sm font-semibold", metricClass)}>
          {stateLabel}
        </span>
      </div>

      <p className="mt-2 text-[14px] leading-snug text-muted">{requirement}</p>

      <div className="mt-3 flex flex-col gap-0.5">
        <MetricPopover
          metric={metric}
          metricClassName={cn(
            "text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums",
            metricClass,
          )}
          items={popoverItems}
          groups={popoverGroups}
          emptyLabel={popoverEmptyLabel}
          ariaLabel={`${title} details`}
        />
        <span className="text-sm font-medium text-ink-soft">{descriptor}</span>
      </div>

      <div className="mt-auto pt-3 text-right text-[13px] font-medium leading-snug text-subtle">
        {period}
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
      <div className="flex justify-between">
        <div className="h-5 w-28 rounded bg-line-soft" />
        <div className="h-5 w-16 rounded bg-line-soft" />
      </div>
      <div className="mt-3 h-4 w-full rounded bg-line-soft" />
      <div className="mt-4 h-10 w-20 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-32 rounded bg-line-soft" />
      <div className="mt-6 h-8 w-24 rounded bg-line-soft ml-auto" />
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
      <h3 className="text-base font-semibold text-ink">{title}</h3>
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
