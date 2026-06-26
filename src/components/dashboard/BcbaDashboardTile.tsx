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
import {
  summaryLineInk,
  type DashboardTileSummaryLine,
} from "@/lib/dashboardTileMetrics"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export type BcbaBubbleItem = MetricPopoverItem

function TileSummaryLines({ lines }: { lines: DashboardTileSummaryLine[] }) {
  return (
    <div className="mt-2 space-y-0.5">
      {lines.map((line) => (
        <p
          key={`${line.text}-${line.hint ?? ""}`}
          className="text-[14px] leading-snug"
          style={{ color: summaryLineInk(line.tone) }}
        >
          {line.text}
          {line.hint ? (
            <span style={{ color: P.faint }}> ({line.hint})</span>
          ) : null}
        </p>
      ))}
    </div>
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
  summaryLines,
  hideMetric,
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
  summaryLines?: DashboardTileSummaryLine[]
  hideMetric?: boolean
  popoverItems?: MetricPopoverItem[]
  popoverGroups?: MetricPopoverGroup[]
  popoverEmptyLabel?: string
  className?: string
}) {
  const stateLabel = BCBA_STATE_LABEL[state]
  const metricClass = BCBA_STATE_METRIC_CLASS[state]
  const showMetric = !hideMetric

  return (
    <div
      id={id}
      className={cn(
        "flex flex-col rounded-[var(--radius)] bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn(TILE_TITLE, "text-ink")}>{title}</h3>
        <span className={cn("shrink-0 text-sm font-semibold", metricClass)}>
          {stateLabel}
        </span>
      </div>

      {summaryLines && summaryLines.length > 0 ? (
        <TileSummaryLines lines={summaryLines} />
      ) : requirement ? (
        <p className="mt-2 text-[14px] leading-snug text-muted">{requirement}</p>
      ) : null}

      <div className={cn("flex flex-col gap-0.5", showMetric ? "mt-3" : summaryLines?.length ? "mt-2" : "")}>
        {showMetric ? (
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
        ) : popoverGroups.length > 0 || popoverItems.length > 0 ? (
          <MetricPopover
            metric={<span className="text-[14px] font-semibold text-brand">View breakdown</span>}
            metricClassName=""
            items={popoverItems}
            groups={popoverGroups}
            emptyLabel={popoverEmptyLabel}
            ariaLabel={`${title} details`}
          />
        ) : null}
        {descriptor ? (
          <span className="text-sm font-medium text-ink-soft">{descriptor}</span>
        ) : null}
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
