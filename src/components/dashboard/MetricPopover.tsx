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

export function MetricPopover({
  metric,
  metricClassName,
  items,
  emptyLabel = "All caught up",
  ariaLabel = "Show details",
}: {
  metric: ReactNode
  metricClassName?: string
  items: MetricPopoverItem[]
  emptyLabel?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
          className="absolute left-0 top-full z-50 mt-2 min-w-[min(100%,14rem)] max-w-[20rem] rounded-[var(--radius)] border border-line bg-surface p-3 shadow-card"
        >
          {items.length === 0 ? (
            <p className="text-sm text-muted">{emptyLabel}</p>
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
