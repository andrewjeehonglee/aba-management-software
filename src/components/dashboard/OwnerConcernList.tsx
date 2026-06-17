import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  BCBA_STATE_LABEL,
  TILE_STATE_DOT_CLASS,
} from "@/lib/bcbaTileState"
import type { OwnerConcern } from "@/lib/ownerDashboardConcerns"

export function OwnerConcernCard({ concern }: { concern: OwnerConcern }) {
  return (
    <article className="rounded-[var(--radius)] bg-surface px-4 py-3.5 shadow-card short:px-3.5 short:py-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", TILE_STATE_DOT_CLASS[concern.state])}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[16px] font-semibold leading-snug text-ink">{concern.title}</h3>
            <span
              className={cn(
                "text-[12px] font-semibold uppercase tracking-[0.08em]",
                concern.state === "healthy"
                  ? "text-brand"
                  : concern.state === "monitor"
                    ? "text-alert"
                    : "text-alert-strong",
              )}
            >
              {BCBA_STATE_LABEL[concern.state]}
            </span>
          </div>

          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{concern.situation}</p>

          {concern.items.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-1">
              {concern.items.map((item, index) => (
                <span key={`${item.href}-${item.label}`} className="inline-flex items-baseline">
                  {index > 0 ? (
                    <span className="mr-1 text-[14px] text-muted" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <Link
                    to={item.href}
                    className="rounded-sm text-[14px] font-medium text-ink underline-offset-2 transition-colors hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {item.label}
                    {item.value ? ` ${item.value}` : ""}
                  </Link>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ConcernSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-4 py-3.5 shadow-card">
      <div className="h-4 w-48 rounded bg-line-soft" />
      <div className="mt-2 h-3.5 w-full max-w-md rounded bg-line-soft" />
      <div className="mt-3 h-3 w-56 rounded bg-line-soft" />
    </div>
  )
}

export function OwnerConcernList({
  concerns,
  completenessLine,
  loading,
}: {
  concerns: OwnerConcern[]
  completenessLine: string | null
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ConcernSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.10em] text-muted">
        Needs your attention
      </p>

      {concerns.length === 0 ? (
        <div className="rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card">
          <p className="text-[14px] text-ink-soft">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {concerns.map((concern) => (
            <OwnerConcernCard key={concern.id} concern={concern} />
          ))}
        </div>
      )}

      {completenessLine ? (
        <p className="mt-4 text-[14px] leading-snug text-brand">{completenessLine}</p>
      ) : null}
    </div>
  )
}
