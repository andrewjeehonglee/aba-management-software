import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import { severityDotClass, severityTextClass } from "@/lib/pulseSeverity"

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
  const { attentionCount, items, worstSeverity } = attention

  return (
    <div className="shrink-0 space-y-2">
      <p className="text-sm text-muted">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="h-7 max-w-lg animate-pulse rounded bg-line" aria-hidden />
      ) : attentionCount === 0 ? (
        <p className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          <Check className="size-5 shrink-0 text-ok" aria-hidden />
          Your practice is on track today.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold leading-snug tracking-tight text-ink">
            Your practice is mostly on track —{" "}
            <span className={cn(severityTextClass(worstSeverity))}>
              {attentionCount === 1 ? "1 thing needs attention." : `${attentionCount} things need attention.`}
            </span>
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollToAttention(item.scrollTargetId)}
                  className="group inline-flex items-center gap-2 text-left text-sm text-ink"
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", severityDotClass(item.severity))}
                    aria-hidden
                  />
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
