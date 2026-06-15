import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { OwnerWorklistItem } from "@/lib/ownerDashboardStatus"
import { severityDotClass } from "@/lib/pulseSeverity"

const GROUP_ORDER = ["notes", "auth", "hours"] as const
const GROUP_LABELS: Record<string, string> = {
  notes: "Notes to wrap up",
  auth: "Over their authorized hours",
  hours: "Below direct mix",
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

function bubbleShortValue(displayValue: string): string {
  const sessions = displayValue.match(/^(\d+)\s*session/i)
  if (sessions) return sessions[1]!
  const hrs = displayValue.match(/^(\d+)\s*hrs?/i)
  if (hrs) return `${hrs[1]} hrs`
  const pct = displayValue.match(/^(\d+)%/)
  if (pct) return pct[0]!
  const num = displayValue.match(/^(\d+)/)
  return num?.[1] ?? displayValue
}

function WorklistBubble({
  item,
  popping,
  onTap,
}: {
  item: OwnerWorklistItem
  popping: boolean
  onTap: (item: OwnerWorklistItem) => void
}) {
  const valueClass = item.severity === "crit" ? "text-alert-strong" : "text-alert"

  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-[15px] py-[9px] text-[14px] shadow-card transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        popping && "animate-bubble-pop pointer-events-none",
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", severityDotClass(item.severity))}
        aria-hidden
      />
      <span className="font-medium text-ink">{item.name}</span>
      <span className={cn("font-semibold tabular-nums", valueClass)}>
        {bubbleShortValue(item.displayValue)}
      </span>
    </button>
  )
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
  const navigate = useNavigate()
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set())
  const [poppingId, setPoppingId] = useState<string | null>(null)

  useEffect(() => {
    setClearedIds(new Set())
    setPoppingId(null)
  }, [items])

  const visibleItems = useMemo(
    () => items.filter((item) => !clearedIds.has(item.id)),
    [items, clearedIds],
  )

  const grouped = groupItems(visibleItems)

  const handleTap = useCallback(
    (item: OwnerWorklistItem) => {
      if (poppingId) return
      setPoppingId(item.id)
      window.setTimeout(() => {
        setClearedIds((prev) => new Set([...prev, item.id]))
        setPoppingId(null)
        if (item.href) navigate(item.href)
      }, 360)
    },
    [navigate, poppingId],
  )

  return (
    <section
      className={cn(
        "animate-fade-rise animate-fade-rise-delay-2 flex min-h-0 flex-col",
        className,
      )}
      aria-labelledby="worklist-heading"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 short:mb-3 mb-4">
        <h2
          id="worklist-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.10em] text-muted"
        >
          Needs you
        </h2>
        {!loading && visibleItems.length > 0 && (
          <span className="rounded-full bg-alert-soft px-3 py-1 text-[12px] font-semibold tabular-nums text-alert">
            {visibleItems.length} in all
          </span>
        )}
      </div>

      <div className="owner-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-line-soft" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <p className="text-[14px] text-muted">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-5 short:space-y-4">
            {GROUP_ORDER.map((groupKey) => {
              const groupItemsList = grouped.get(groupKey)
              if (!groupItemsList?.length) return null
              return (
                <section key={groupKey}>
                  <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {GROUP_LABELS[groupKey] ?? groupItemsList[0]!.groupLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groupItemsList.map((item) => (
                      <WorklistBubble
                        key={item.id}
                        item={item}
                        popping={poppingId === item.id}
                        onTap={handleTap}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {!loading && visibleItems.length > 0 && (
        <p className="mt-3 shrink-0 text-[12px] text-muted">Tap one to clear it.</p>
      )}
    </section>
  )
}
