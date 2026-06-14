import { Check } from "lucide-react"
import type { OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"

function scrollToAttention(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
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
    <div className="space-y-1.5">
      <p className="text-[15px] text-muted">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="h-6 max-w-lg animate-pulse rounded bg-border" aria-hidden />
      ) : attentionCount === 0 ? (
        <p className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
          <Check className="size-4 shrink-0 text-ok" aria-hidden />
          Your practice is on track today.
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-xl font-semibold leading-snug tracking-tight text-ink">
            Your practice is mostly on track —{" "}
            <span className="text-crit">
              {attentionCount === 1 ? "1 thing needs attention:" : `${attentionCount} things need attention:`}
            </span>
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollToAttention(item.scrollTargetId)}
                  className="group inline-flex items-baseline gap-1.5 text-left text-[15px] text-ink"
                >
                  <span className="font-semibold text-brand group-hover:underline underline-offset-2">
                    {item.label}
                  </span>
                  <span className="text-muted">— {item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
