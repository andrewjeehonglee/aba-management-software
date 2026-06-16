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
  size = "default",
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
  size?: "default" | "compact"
}) {
  const compact = size === "compact"

  return (
    <div
      id={id}
      className={cn(
        "flex flex-col rounded-2xl bg-surface shadow-card",
        compact ? "p-5" : "p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn("size-3 shrink-0 rounded-full", severityDotClass(status))}
            aria-hidden
          />
          <h3 className={cn("font-semibold text-ink", compact ? "text-base" : "text-lg")}>
            {title}
          </h3>
        </div>
        <p
          className={cn(
            "max-w-[11rem] shrink-0 text-right leading-snug text-subtle",
            compact ? "text-[11px] uppercase tracking-[0.08em]" : "text-sm",
          )}
        >
          {period}
        </p>
      </div>

      <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", compact ? "mt-4" : "mt-5")}>
        <span
          className={cn(
            "font-bold leading-none tabular-nums tracking-[-0.03em]",
            compact ? "text-[42px] font-semibold" : "text-[56px]",
            severityTextClass(metricSeverity),
          )}
        >
          {metric}
        </span>
        <span className={cn("font-medium text-muted", compact ? "text-sm" : "text-base")}>
          {unit}
        </span>
      </div>

      <div className={cn("border-t border-line", compact ? "mt-4 pt-3" : "mt-5 pt-4")}>
        <div className={cn("leading-relaxed text-muted", compact ? "text-sm" : "text-[15px]")}>
          {support}
        </div>
      </div>
    </div>
  )
}

export function PulseTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-2xl bg-surface p-6 shadow-card", className)}>
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
