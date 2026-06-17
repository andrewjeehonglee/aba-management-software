import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AttentionBubble, type AttentionBubbleTone } from "@/components/dashboard/AttentionBubble"

export type MetricPopoverItem = {
  id: string
  name: string
  value: string
  tone?: AttentionBubbleTone
  href?: string
}

export type MetricPopoverGroup = {
  id: string
  name: string
  tone?: AttentionBubbleTone
  href?: string
  children: MetricPopoverItem[]
}

export function MetricPopover({
  metric,
  metricClassName,
  items = [],
  groups = [],
  emptyLabel = "All caught up",
  ariaLabel = "Show details",
  placement = "top-right",
}: {
  metric: ReactNode
  metricClassName?: string
  items?: MetricPopoverItem[]
  groups?: MetricPopoverGroup[]
  emptyLabel?: string
  ariaLabel?: string
  /** Where the detail panel opens relative to the metric trigger. */
  placement?: "top-right" | "below"
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const hasContent = items.length > 0 || groups.length > 0

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "cursor-pointer rounded-md text-left transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          metricClassName,
        )}
      >
        {metric}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Details"
          className={cn(
            "z-50 min-w-[min(100%,14rem)] max-w-[22rem] rounded-[var(--radius)] border border-line bg-surface p-3 shadow-card",
            placement === "top-right"
              ? "absolute bottom-full right-0 mb-2"
              : "absolute left-0 top-full mt-2",
          )}
        >
          {!hasContent ? (
            <p className="text-sm text-muted">{emptyLabel}</p>
          ) : groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-[13px] font-semibold text-ink">{group.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.children.map((item) => (
                      <AttentionBubble
                        key={item.id}
                        name={item.name}
                        value={item.value}
                        tone={item.tone}
                        href={item.href}
                        onClick={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <AttentionBubble
                  key={item.id}
                  name={item.name}
                  value={item.value}
                  tone={item.tone}
                  href={item.href}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
