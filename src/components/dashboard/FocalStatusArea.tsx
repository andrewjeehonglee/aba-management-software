import { cn } from "@/lib/utils"
import type { OwnerAttentionItem, OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import { severityDotClass } from "@/lib/pulseSeverity"

function scrollToAttention(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}

const BUBBLE_LABELS: Record<OwnerAttentionItem["id"], string> = {
  notes: "Session notes",
  hours: "Payroll",
  auth: "Authorizations",
}

function highlightBubbleCopy(item: OwnerAttentionItem): { value: string; unit: string } {
  if (item.id === "notes") {
    const match = item.detail.match(/^(\d+)/)
    const count = match?.[1] ?? "0"
    return { value: count, unit: count === "1" ? "session unpayable" : "sessions unpayable" }
  }
  if (item.id === "hours") {
    const hrsMatch = item.detail.match(/^(\d+)\s*hours?/i)
    const countMatch = item.detail.match(/^(\d+)/)
    if (hrsMatch) return { value: hrsMatch[1]!, unit: hrsMatch[1] === "1" ? "hour on hold" : "hours on hold" }
    if (countMatch) return { value: countMatch[1]!, unit: "below direct mix" }
    return { value: "0", unit: "hours on hold" }
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
      className="flex flex-col rounded-[16px] border border-line bg-surface p-[18px] text-left shadow-card transition-shadow hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand short:p-4"
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
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
        <p className="max-w-2xl text-[39px] font-semibold leading-tight tracking-[-0.028em] text-ink">
          Nothing needs your attention this morning.
        </p>
      ) : (
        <div className="short:space-y-3 space-y-4">
          <p className="max-w-2xl text-[39px] font-semibold leading-tight tracking-[-0.028em] text-ink">
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
