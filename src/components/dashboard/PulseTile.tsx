import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { PulseSeverity } from "@/lib/pulseSeverity"
import { severityDotClass, severityTextClass } from "@/lib/pulseSeverity"

export function PulsePillarCard({
  status,
  title,
  period,
  metric,
  unit,
  metricSeverity = "ok",
  support,
  className,
  id,
}: {
  status: PulseSeverity
  title: string
  period: string
  metric: string | number
  unit: string
  metricSeverity?: PulseSeverity
  support: ReactNode
  className?: string
  id?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        "flex min-h-0 flex-col rounded-2xl bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn("size-2.5 shrink-0 rounded-full", severityDotClass(status))}
            aria-hidden
          />
          <h3 className="text-base font-semibold text-ink">{title}</h3>
        </div>
        <p className="shrink-0 text-right text-xs leading-snug text-subtle">{period}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "text-[52px] font-bold tabular-nums tracking-[-0.03em]",
            severityTextClass(metricSeverity),
          )}
        >
          {metric}
        </span>
        <span className="text-sm font-medium text-muted">{unit}</span>
      </div>

      <div className="mt-auto border-t border-line pt-3.5">
        <div className="text-[13.5px] leading-snug text-muted">{support}</div>
      </div>
    </div>
  )
}

export function PulseTileSkeleton() {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-5 w-40 animate-pulse rounded bg-line" />
        <div className="h-8 w-24 animate-pulse rounded bg-line" />
      </div>
      <div className="mt-4 h-14 w-28 animate-pulse rounded bg-line" />
      <div className="mt-auto border-t border-line pt-3.5">
        <div className="h-4 w-full animate-pulse rounded bg-line" />
      </div>
    </div>
  )
}

export function PulseTileError({
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
    <div className={cn("flex min-h-0 flex-col rounded-2xl bg-surface p-5 shadow-card", className)}>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 w-fit text-sm font-medium text-brand hover:underline">
        Retry
      </button>
    </div>
  )
}
