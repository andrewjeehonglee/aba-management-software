import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
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

  const statusLine =
    attentionCount === 0 ? (
      <p className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        <Check className="size-5 shrink-0 text-ok" aria-hidden />
        Your practice is on track today.
      </p>
    ) : (
      (() => {
        const phrase =
          attentionCount === 1
            ? "1 thing needs attention."
            : `${attentionCount} things need attention.`
        const primaryTarget = items[0]?.scrollTargetId
        return (
          <p className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Your practice is mostly on track —{" "}
            <button
              type="button"
              onClick={() => primaryTarget && scrollToAttention(primaryTarget)}
              className={cn(
                "text-crit underline-offset-2 hover:underline",
                !primaryTarget && "cursor-default hover:no-underline",
              )}
            >
              {phrase}
            </button>
          </p>
        )
      })()
    )

  return (
    <div className="min-h-[5.5rem] space-y-1">
      <p className="text-[15px] text-muted">
        {greeting}, {name}.
      </p>
      {showStatusPlaceholder ? (
        <div
          className="h-8 max-w-xl animate-pulse rounded bg-border sm:h-9"
          aria-hidden
        />
      ) : (
        statusLine
      )}
    </div>
  )
}
