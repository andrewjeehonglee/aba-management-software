import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { OwnerWorklistItem } from "@/lib/ownerDashboardStatus"
import { severityDotClass, severityTextClass } from "@/lib/pulseSeverity"

const GROUP_ORDER = ["notes", "auth", "hours"] as const
const GROUP_LABELS: Record<string, string> = {
  notes: "Notes overdue — unpayable sessions",
  auth: "Authorization — over / nearing limit",
  hours: "Hours — below direct mix",
}

function groupItems(items: OwnerWorklistItem[]): Map<string, OwnerWorklistItem[]> {
  const map = new Map<string, OwnerWorklistItem[]>()
  for (const item of items) {
    const key = item.group
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}

function WorklistRow({ item }: { item: OwnerWorklistItem }) {
  const inner = (
    <>
      <span
        className={cn("size-2 shrink-0 rounded-full", severityDotClass(item.severity))}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{item.name}</span>
      <span className={cn("shrink-0 tabular-nums text-sm font-semibold", severityTextClass(item.severity))}>
        {item.displayValue}
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden />
    </>
  )

  const className =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-bg"

  if (item.href) {
    return (
      <Link to={item.href} className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={className}>
      {inner}
    </div>
  )
}

export function WorklistRail({
  items,
  loading,
}: {
  items: OwnerWorklistItem[]
  loading: boolean
}) {
  const grouped = groupItems(items)

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-card">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <h2 className="text-base font-semibold text-ink">Needs your attention</h2>
        {!loading && (
          <span className="rounded-full bg-bg px-2.5 py-0.5 text-xs tabular-nums text-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="space-y-3 px-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-line" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-sm text-subtle">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-4">
            {GROUP_ORDER.map((groupKey) => {
              const groupItemsList = grouped.get(groupKey)
              if (!groupItemsList?.length) return null
              return (
                <section key={groupKey}>
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
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
