import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { PulseSeverity } from "@/lib/pulseSeverity"
import { severityDotClass, severityTagClass, severityTextClass } from "@/lib/pulseSeverity"
import { AttentionBubble, type AttentionBubbleTone } from "@/components/dashboard/AttentionBubble"

export type BcbaBubbleItem = {
  id: string
  name: string
  value: string
  tone?: AttentionBubbleTone
  href?: string
}

export function BcbaDashboardTile({
  id,
  title,
  tag,
  tagSeverity = "ok",
  period,
  metric,
  unit,
  metricSeverity = "ok",
  calmLine = "All caught up",
  bubbles = [],
  className,
}: {
  id?: string
  title: string
  tag: string
  tagSeverity?: PulseSeverity
  period: string
  metric: ReactNode
  unit: string
  metricSeverity?: PulseSeverity
  calmLine?: string
  bubbles?: BcbaBubbleItem[]
  className?: string
}) {
  const hasAttention = bubbles.length > 0

  return (
    <div
      id={id}
      className={cn(
        "flex min-h-[11.5rem] flex-col rounded-[var(--radius)] bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn("size-2.5 shrink-0 rounded-full", severityDotClass(tagSeverity))}
            aria-hidden
          />
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
              severityTagClass(tagSeverity),
            )}
          >
            {tag}
          </span>
        </div>
        <p className="max-w-[9rem] shrink-0 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
          {period}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span
          className={cn(
            "text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums",
            severityTextClass(metricSeverity),
          )}
        >
          {metric}
        </span>
        <span className="text-sm font-medium text-muted">{unit}</span>
      </div>

      <div className="mt-auto pt-4">
        {hasAttention ? (
          <div className="flex flex-wrap gap-2">
            {bubbles.map((bubble) => (
              <AttentionBubble
                key={bubble.id}
                name={bubble.name}
                value={bubble.value}
                tone={bubble.tone}
                href={bubble.href}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{calmLine}</p>
        )}
      </div>
    </div>
  )
}

export function BcbaDashboardTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-h-[11.5rem] animate-pulse rounded-[var(--radius)] bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="h-5 w-32 rounded bg-line-soft" />
      <div className="mt-4 h-10 w-20 rounded bg-line-soft" />
      <div className="mt-auto h-8 w-full rounded bg-line-soft" />
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
        "flex min-h-[11.5rem] flex-col rounded-[var(--radius)] bg-surface p-5 shadow-card",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-auto w-fit text-sm font-medium text-brand hover:underline"
      >
        Retry
      </button>
    </div>
  )
}
