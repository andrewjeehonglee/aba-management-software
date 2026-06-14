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
    <div className="min-h-[5.5rem] space-y-3">
      <p className="text-[15px] text-muted">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="space-y-2">
          <div className="h-7 max-w-xl animate-pulse rounded bg-border" aria-hidden />
          <div className="h-4 w-64 animate-pulse rounded bg-border" aria-hidden />
        </div>
      ) : attentionCount === 0 ? (
        <p className="inline-flex items-center gap-2 text-[22px] font-semibold tracking-tight text-ink sm:text-[24px]">
          <Check className="size-5 shrink-0 text-ok" aria-hidden />
          Your practice is on track today.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-[22px] font-semibold tracking-tight text-ink sm:text-[24px]">
            Your practice is mostly on track —{" "}
            <span className="text-crit">
              {attentionCount === 1 ? "1 thing needs attention:" : `${attentionCount} things need attention:`}
            </span>
          </p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollToAttention(item.scrollTargetId)}
                  className="group inline-flex flex-wrap items-baseline gap-x-1.5 text-left text-sm text-ink"
                >
                  <span className="font-medium text-brand group-hover:underline underline-offset-2">
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
