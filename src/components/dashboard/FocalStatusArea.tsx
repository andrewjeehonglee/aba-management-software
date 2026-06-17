import { cn } from "@/lib/utils"
import type { OwnerAttentionItem, OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"

function scrollToAttention(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}

const BUBBLE_LABELS: Record<OwnerAttentionItem["id"], string> = {
  notes: "Session notes",
  hours: "Direct hours",
  auth: "Authorized hours",
}

function highlightBubbleCopy(item: OwnerAttentionItem): { value: string; unit: string } {
  if (item.id === "notes") {
    return { value: item.displayValue, unit: "incomplete notes" }
  }
  if (item.id === "hours") {
    return { value: item.displayValue, unit: "staff below 50% requirement" }
  }
  return { value: item.displayValue, unit: "clients" }
}

function HighlightBubble({ item }: { item: OwnerAttentionItem }) {
  const { value, unit } = highlightBubbleCopy(item)
  const useAmber = item.id === "notes" || item.id === "hours"
  const useLimit = item.id === "auth"

  return (
    <button
      type="button"
      onClick={() => scrollToAttention(item.scrollTargetId)}
      className="flex flex-col rounded-[16px] border border-line/80 bg-surface-2/80 p-[18px] text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand short:p-4"
    >
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            useAmber ? "bg-alert" : useLimit ? "bg-limit" : "bg-muted",
          )}
          aria-hidden
        />
        {BUBBLE_LABELS[item.id]}
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            "text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums",
            useAmber ? "text-alert" : useLimit ? "text-limit" : "text-brand",
          )}
        >
          {value}
        </span>
        <span className="text-[16px] text-ink-soft">{unit}</span>
      </p>
    </button>
  )
}

export function FocalStatusArea({
  userName,
  attention,
  rosterReady,
}: {
  userName: string
  attention: OwnerAttentionSummary
  rosterReady: boolean
}) {
  const greeting = timeGreeting()
  const name = firstName(userName)
  const items = attention.items
  const loading = attention.loading && !attention.resolved

  return (
    <div className="shrink-0">
      <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
        <div>
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
            {greeting}, {name}.
          </h1>
          {loading ? (
            <p className="mt-2 text-[17px] text-muted animate-pulse">Checking your practice…</p>
          ) : !rosterReady ? (
            <p className="mt-2 text-[17px] text-muted">Loading roster…</p>
          ) : items.length === 0 ? (
            <p className="mt-2 text-[17px] text-muted">Nothing needs your attention today.</p>
          ) : (
            <p className="mt-2 text-[17px] text-ink-soft">
              <strong className="font-semibold text-ink">{items.length} things</strong> need your
              attention today.
            </p>
          )}
        </div>

        {!loading && rosterReady && items.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {items.map((item) => (
              <HighlightBubble key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
