import { cn } from "@/lib/utils"
import type { OwnerAttentionSummary } from "@/lib/ownerDashboardStatus"
import { firstName, timeGreeting } from "@/lib/ownerDashboardStatus"
import { severityDotClass } from "@/lib/pulseSeverity"

function scrollToAttention(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}

function formatEyebrowDate(date: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date)
  return `${weekday.toUpperCase()} · ${monthDay.toUpperCase()}`
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
    <header className="shrink-0 animate-fade-rise short:space-y-2 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted">
        {formatEyebrowDate()}
      </p>

      <p className="text-[15px] font-medium text-ink-soft">
        {greeting}, {name}.
      </p>

      {showStatusPlaceholder ? (
        <div className="h-10 max-w-xl animate-pulse rounded bg-line-soft" aria-hidden />
      ) : attentionCount === 0 ? (
        <p className="max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.025em] text-ink">
          Nothing needs your attention this morning.
        </p>
      ) : (
        <div className="short:space-y-2.5 space-y-3">
          <p className="max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.025em] text-ink">
            <span className="text-alert">
              {attentionCount} {attentionCount === 1 ? "thing" : "things"}
            </span>{" "}
            need your attention this morning.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollToAttention(item.scrollTargetId)}
                  className="group inline-flex items-center gap-2 text-left text-[13.5px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", severityDotClass(item.severity))}
                    aria-hidden
                  />
                  <span className="font-medium text-ink-soft group-hover:text-ink">
                    {item.label}
                  </span>
                  <span className="text-muted">—</span>
                  <span className="font-semibold text-ink">{item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
