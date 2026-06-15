import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { OwnerWorklistItem } from "@/lib/ownerDashboardStatus"

const GROUP_ORDER = ["notes", "auth", "hours"] as const
const GROUP_LABELS: Record<string, string> = {
  notes: "Notes overdue — unpayable sessions",
  auth: "Authorization — over limit",
  hours: "Hours — below direct mix",
}

function groupItems(items: OwnerWorklistItem[]): Map<string, OwnerWorklistItem[]> {
  const map = new Map<string, OwnerWorklistItem[]>()
  for (const item of items) {
    const list = map.get(item.group) ?? []
    list.push(item)
    map.set(item.group, list)
  }
  return map
}

function WorklistRow({ item }: { item: OwnerWorklistItem }) {
  const valueClass =
    item.severity === "crit" ? "text-alert-strong" : "text-alert"

  const inner = (
    <>
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.name}</span>
      <span className={cn("shrink-0 tabular-nums text-[13.5px] font-semibold", valueClass)}>
        {item.displayValue}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </>
  )

  const className =
    "flex w-full items-center gap-3 rounded-[var(--radius-sm-token)] px-3 py-2.5 text-left text-[13.5px] transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"

  if (item.href) {
    return (
      <Link to={item.href} className={className}>
        {inner}
      </Link>
    )
  }

  return <div className={className}>{inner}</div>
}

export function WorklistRail({
  items,
  loading,
  className,
}: {
  items: OwnerWorklistItem[]
  loading: boolean
  className?: string
}) {
  const grouped = groupItems(items)

  return (
    <aside
      className={cn(
        "animate-fade-rise animate-fade-rise-delay-2 flex min-h-0 flex-col overflow-hidden rounded-[var(--radius)] bg-surface shadow-card",
        className,
      )}
      aria-labelledby="worklist-heading"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-5 py-4 short:px-4 short:py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted">
            Needs you
          </p>
          <h2 id="worklist-heading" className="mt-1 text-[15px] font-semibold text-ink">
            Clear these first
          </h2>
        </div>
        {!loading && items.length > 0 && (
          <span className="rounded-full bg-alert-soft px-3 py-1 text-[12px] font-semibold tabular-nums text-alert">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      <div className="owner-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="space-y-3 px-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-[var(--radius-sm-token)] bg-line-soft" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-[13.5px] text-muted">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-4">
            {GROUP_ORDER.map((groupKey) => {
              const groupItemsList = grouped.get(groupKey)
              if (!groupItemsList?.length) return null
              return (
                <section key={groupKey}>
                  <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-muted">
                    {GROUP_LABELS[groupKey] ?? groupItemsList[0]!.groupLabel}
                  </p>
                  <div className="space-y-0.5">
                    {groupItemsList.map((item) => (
                      <WorklistRow key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
