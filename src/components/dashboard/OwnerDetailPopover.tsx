import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

import type { OwnerPopoverLine } from "@/lib/ownerDashboardConcerns"

export function OwnerDetailPopover({
  trigger,
  title,
  lines,
  emptyLabel = "Nothing to show",
  ariaLabel,
  align = "start",
}: {
  trigger: ReactNode
  title: string
  lines: OwnerPopoverLine[]
  emptyLabel?: string
  ariaLabel?: string
  align?: "start" | "end"
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
        aria-label={ariaLabel ?? title}
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer rounded-md text-left transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={title}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-[min(100%,12rem)] max-w-[20rem] rounded-[var(--radius)] border border-line bg-surface p-3 shadow-card",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          {lines.length === 0 ? (
            <p className="mt-2 text-[14px] text-muted">{emptyLabel}</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {lines.map((line) => (
                <li key={line.id} className="text-[14px] leading-snug text-ink-soft">
                  {line.href ? (
                    <Link
                      to={line.href}
                      className="hover:text-brand hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {line.text}
                    </Link>
                  ) : (
                    line.text
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
