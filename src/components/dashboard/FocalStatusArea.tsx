import type { OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"

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
  const attentionCount = attention.attentionCount

  return (
    <header className="shrink-0 animate-fade-rise">
      <p className="text-[21px] font-normal leading-snug text-ink-soft">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="mt-2 h-9 max-w-xl animate-pulse rounded-[12px] bg-line-soft" aria-hidden />
      ) : attentionCount === 0 ? (
        <p className="mt-2 text-[clamp(1.5rem,2.5vw,2.25rem)] font-semibold leading-tight tracking-[-0.028em] text-ink">
          Nothing needs your attention today.
        </p>
      ) : (
        <p className="mt-2 text-[clamp(1.5rem,2.6vw,2.4375rem)] font-semibold leading-tight tracking-[-0.028em] text-ink">
          <span className="text-alert">
            {attentionCount} {attentionCount === 1 ? "thing" : "things"}
          </span>{" "}
          need your attention today.
        </p>
      )}
    </header>
  )
}
