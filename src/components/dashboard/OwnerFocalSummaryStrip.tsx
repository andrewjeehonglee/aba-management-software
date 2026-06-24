import { cn } from "@/lib/utils"
import type { OwnerFocalSegment, OwnerFocalSummary } from "@/lib/ownerDashboardConcerns"

const SEGMENT_CLASS: Record<OwnerFocalSegment["severity"], string> = {
  neutral: "text-brand",
  monitor: "text-alert",
  urgent: "text-alert-strong",
}

function scrollToTarget(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function FocalSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-4 py-3.5 shadow-card">
      <div className="h-5 w-full max-w-2xl rounded bg-line-soft" />
    </div>
  )
}

export function OwnerFocalSummaryStrip({
  summary,
  loading,
}: {
  summary: OwnerFocalSummary | null
  loading?: boolean
}) {
  if (loading || !summary) {
    return <FocalSkeleton />
  }

  if (summary.allClear) {
    return (
      <section
        className="rounded-[var(--radius)] border border-line-soft bg-accent-soft px-4 py-3.5 shadow-card"
        aria-label="Practice status"
      >
        <p className="text-[16px] font-semibold leading-snug text-brand">
          {summary.segments[0]?.text ?? "All clear this morning."}
        </p>
      </section>
    )
  }

  return (
    <section
      className="rounded-[var(--radius)] bg-surface px-4 py-3.5 shadow-card"
      aria-label="Practice status"
    >
      <p className="text-[15px] leading-relaxed text-ink-soft">
        {summary.segments.map((segment, index) => (
          <span key={`${segment.id}-${index}`}>
            {index > 0 && <span className="text-muted"> · </span>}
            <button
              type="button"
              onClick={() => scrollToTarget(segment.scrollTargetId)}
              className={cn(
                "font-semibold underline-offset-2 transition-opacity hover:underline",
                SEGMENT_CLASS[segment.severity],
              )}
            >
              {segment.text}
            </button>
          </span>
        ))}
      </p>
    </section>
  )
}
