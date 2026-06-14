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
        "flex flex-col rounded-2xl bg-surface p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn("size-3 shrink-0 rounded-full", severityDotClass(status))}
            aria-hidden
          />
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
        </div>
        <p className="max-w-[11rem] shrink-0 text-right text-sm leading-snug text-subtle">{period}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            "text-[56px] font-bold leading-none tabular-nums tracking-[-0.03em]",
            severityTextClass(metricSeverity),
          )}
        >
          {metric}
        </span>
        <span className="text-base font-medium text-muted">{unit}</span>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="text-[15px] leading-relaxed text-muted">{support}</div>
      </div>
    </div>
  )
}

export function PulseTileSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-6 w-44 animate-pulse rounded bg-line" />
        <div className="h-10 w-28 animate-pulse rounded bg-line" />
      </div>
      <div className="mt-5 h-14 w-32 animate-pulse rounded bg-line" />
      <div className="mt-5 border-t border-line pt-4">
        <div className="h-5 w-full animate-pulse rounded bg-line" />
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
