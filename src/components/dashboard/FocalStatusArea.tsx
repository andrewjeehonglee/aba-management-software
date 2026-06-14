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
}: {
  userName?: string | null
  attention: OwnerAttentionSummary
}) {
  const greeting = timeGreeting()
  const name = firstName(userName)

  if (attention.loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-border" />
        <div className="h-7 w-full max-w-lg animate-pulse rounded bg-border" />
      </div>
    )
  }

  const { attentionCount, items } = attention

  if (attentionCount === 0) {
    return (
      <div className="space-y-1">
        <p className="text-[15px] text-muted">
          {greeting}, {name}.
        </p>
        <p className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          <Check className="size-5 shrink-0 text-ok" aria-hidden />
          Your practice is on track today.
        </p>
      </div>
    )
  }

  const phrase =
    attentionCount === 1
      ? "1 thing needs attention."
      : `${attentionCount} things need attention.`

  const primaryTarget = items[0]?.scrollTargetId

  return (
    <div className="space-y-1">
      <p className="text-[15px] text-muted">
        {greeting}, {name}.
      </p>
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
    </div>
  )
}
