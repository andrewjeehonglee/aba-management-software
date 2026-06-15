import { cn } from "@/lib/utils"
import type { OwnerAttentionItem, OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import { severityDotClass } from "@/lib/pulseSeverity"

function scrollToAttention(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}

const BUBBLE_LABELS: Record<OwnerAttentionItem["id"], string> = {
  notes: "Session notes",
  hours: "Hours by staff",
  auth: "Authorizations",
}

function highlightBubbleCopy(item: OwnerAttentionItem): { value: string; unit: string } {
  if (item.id === "notes") {
    const match = item.detail.match(/^(\d+)/)
    const count = match?.[1] ?? "0"
    return { value: count, unit: count === "1" ? "session unpayable" : "sessions unpayable" }
  }
  if (item.id === "hours") {
    const countMatch = item.detail.match(/^(\d+)/)
    if (countMatch) return { value: countMatch[1]!, unit: "below 50% direct" }
    return { value: "0", unit: "below 50% direct" }
  }
  const match = item.detail.match(/^(\d+)/)
  const count = match?.[1] ?? "0"
  return {
    value: count,
    unit: count === "1" ? "client over limit" : "clients over limit",
  }
}

function HighlightBubble({ item }: { item: OwnerAttentionItem }) {
  const { value, unit } = highlightBubbleCopy(item)
  const valueClass = item.severity === "crit" ? "text-alert-strong" : "text-alert"

  return (
    <button
      type="button"
      onClick={() => scrollToAttention(item.scrollTargetId)}
      className="flex flex-col rounded-[16px] border border-line/80 bg-surface-2/80 p-[18px] text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand short:p-4"
    >
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span className={cn("size-2 shrink-0 rounded-full", severityDotClass(item.severity))} aria-hidden />
        {BUBBLE_LABELS[item.id]}
      </p>
      <p className="mt-3 text-[20px] font-semibold leading-snug text-ink">
        <span className={cn("tabular-nums", valueClass)}>{value}</span>{" "}
        <span className="font-medium text-ink-soft">{unit}</span>
      </p>
    </button>
  )
}

export function FocalStatusArea({
  userName,
  attention,
  rosterReady,
}: {
  userName?: string | null
  attention: OwnerAttentionSummary
  rosterReady: boolean
}) {
  const greeting = timeGreeting()
  const name = firstName(userName)
  const showStatusPlaceholder = !attention.resolved && (!rosterReady || attention.loading)
  const { attentionCount, items } = attention

  return (
    <header className="shrink-0 animate-fade-rise short:space-y-3 space-y-4">
      <p className="text-[21px] font-normal text-ink-soft">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="h-12 max-w-xl animate-pulse rounded-[16px] bg-line-soft" aria-hidden />
      ) : attentionCount === 0 ? (
        <p className="text-[39px] font-semibold leading-tight tracking-[-0.028em] text-ink">
          Nothing needs your attention this morning.
        </p>
      ) : (
        <div className="short:space-y-3 space-y-4">
          <p className="whitespace-nowrap text-[clamp(1.5rem,2.6vw,2.4375rem)] font-semibold leading-tight tracking-[-0.028em] text-ink">
            <span className="text-alert">
              {attentionCount} {attentionCount === 1 ? "thing" : "things"}
            </span>{" "}
            need your attention this morning.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <HighlightBubble key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
