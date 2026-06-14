import { Check } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export function trendGlyph(current: number, previous: number): string {
  if (current > previous) return "▲"
  if (current < previous) return "▼"
  return "▸"
}

type FlagSeverity = "crit" | "warn" | "none"

export function PulseTileShell({
  flagged,
  severity = "crit",
  className,
  children,
}: {
  flagged: boolean
  severity?: FlagSeverity
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-flagged={flagged}
      className={cn(
        "flex h-full flex-col rounded-2xl border-0 bg-surface p-6 shadow-card",
        flagged && severity === "crit" && "border-l-4 border-l-crit shadow-card-flagged",
        flagged && severity === "warn" && "border-l-4 border-l-warn shadow-card-flagged",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PulseTileHeader({
  title,
  periodPrefix,
  periodLabel,
}: {
  title: string
  periodPrefix: string
  periodLabel?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h3 className="text-xl font-semibold text-ink">{title}</h3>
      {periodLabel && (
        <span className="shrink-0 text-right text-base leading-snug text-subtle">
          {periodPrefix}
          <br />
          {periodLabel}
        </span>
      )}
    </div>
  )
}

export function PulseMetric({
  value,
  unit,
  flagged = false,
  severity = "crit",
}: {
  value: number
  unit: string
  flagged?: boolean
  severity?: "crit" | "warn"
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={cn(
          "text-5xl font-semibold tabular-nums tracking-[-0.02em]",
          flagged && severity === "crit" && "text-crit",
          flagged && severity === "warn" && "text-warn",
          !flagged && "text-ink",
        )}
      >
        {value}
      </span>
      <span className="text-lg text-muted">{unit}</span>
    </div>
  )
}

export function PulseBaseline({ children }: { children: React.ReactNode }) {
  return <p className="mt-2.5 text-base leading-snug text-subtle">{children}</p>
}

export function PulseHealthyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2.5 inline-flex items-start gap-2 text-base leading-snug text-ok">
      <Check className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/** Compact completion bar — fixed width so it never spans the full tile. */
export function PulseCompletionBar({ pct, label }: { pct: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="mt-5 flex items-center gap-4">
      <div className="h-2.5 w-36 shrink-0 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-base font-medium text-subtle">{label}</p>
    </div>
  )
}

export function PulseDrillSection({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-5 flex flex-1 flex-col border-t border-border pt-4">
      <p className="mb-3 text-base font-medium text-subtle">{eyebrow}</p>
      {children}
    </div>
  )
}

export function PulseDrillRow({
  name,
  to,
  flagged,
  severity = "warn",
  value,
}: {
  name: string
  to?: string
  /** When true, dot and value use severity color; otherwise neutral. */
  flagged: boolean
  severity?: "crit" | "warn"
  value: React.ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-lg text-ink">
      {to ? (
        <Link to={to} className="truncate font-medium hover:underline underline-offset-2">
          {name}
        </Link>
      ) : (
        <span className="truncate font-medium">{name}</span>
      )}
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-2.5 text-xl tabular-nums font-semibold",
          flagged && severity === "crit" && "text-crit",
          flagged && severity === "warn" && "text-warn",
          !flagged && "text-ink",
        )}
      >
        <span
          className={cn(
            "size-2.5 rounded-full",
            flagged && severity === "crit" && "bg-crit",
            flagged && severity === "warn" && "bg-warn",
            !flagged && "bg-subtle",
          )}
          aria-hidden
        />
        {value}
      </span>
    </li>
  )
}

export function PulseDrillExpand({
  hiddenCount,
  noun,
  onClick,
}: {
  hiddenCount: number
  noun: string
  onClick: () => void
}) {
  if (hiddenCount <= 0) return null
  return (
    <button type="button" onClick={onClick} className="mt-3 text-left text-base font-medium text-brand hover:underline">
      + {hiddenCount} more {noun}
    </button>
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
    <PulseTileShell flagged={false} className={className}>
      <h3 className="text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-4 text-lg text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 w-fit text-base font-medium text-brand hover:underline">
        Retry
      </button>
    </PulseTileShell>
  )
}

export function PulseTileSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-6 w-36 animate-pulse rounded bg-border" />
        <div className="h-12 w-24 animate-pulse rounded bg-border" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-12 w-24 animate-pulse rounded bg-border" />
        <div className="h-5 w-44 animate-pulse rounded bg-border" />
      </div>
      <div className="mt-5 h-2.5 w-36 animate-pulse rounded-full bg-border" />
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <div className="h-5 w-24 animate-pulse rounded bg-border" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-border" />
        ))}
      </div>
    </div>
  )
}
