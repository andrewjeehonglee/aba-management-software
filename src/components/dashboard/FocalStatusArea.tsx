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
    <div className="min-h-[6.5rem] space-y-4">
      <p className="text-lg text-muted">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="space-y-3">
          <div className="h-8 max-w-xl animate-pulse rounded bg-border" aria-hidden />
          <div className="h-5 w-72 animate-pulse rounded bg-border" aria-hidden />
        </div>
      ) : attentionCount === 0 ? (
        <p className="inline-flex items-center gap-2.5 text-[26px] font-semibold leading-snug tracking-tight text-ink sm:text-[28px]">
          <Check className="size-6 shrink-0 text-ok" aria-hidden />
          Your practice is on track today.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[26px] font-semibold leading-snug tracking-tight text-ink sm:text-[28px]">
            Your practice is mostly on track —{" "}
            <span className="text-crit">
              {attentionCount === 1 ? "1 thing needs attention:" : `${attentionCount} things need attention:`}
            </span>
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollToAttention(item.scrollTargetId)}
                  className="group inline-flex flex-wrap items-baseline gap-x-2 text-left text-lg text-ink"
                >
                  <span className="font-semibold text-brand group-hover:underline underline-offset-2">
                    {item.label}
                  </span>
                  <span className="font-medium text-muted">— {item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
