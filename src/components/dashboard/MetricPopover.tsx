import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { OwnerDashboardListPopup } from "@/components/dashboard/OwnerDashboardListPopup"
import { MetricPopupBoxContent } from "@/components/dashboard/MetricPopupBoxes"

export type MetricPopoverItem = {
  id: string
  name: string
  /** Secondary line in the box (session date, percentage, hours, etc.). */
  detail?: string
  tone?: "healthy" | "monitor" | "urgent"
  href?: string
}

export type MetricPopoverGroup = {
  id: string
  name: string
  tone?: "healthy" | "monitor" | "urgent"
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
  title,
}: {
  metric: ReactNode
  metricClassName?: string
  items?: MetricPopoverItem[]
  groups?: MetricPopoverGroup[]
  emptyLabel?: string
  ariaLabel?: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const hasContent = items.length > 0 || groups.length > 0
  const popupTitle = title ?? ariaLabel

  function close() {
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className={cn(
          "cursor-pointer rounded-md text-left transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          metricClassName,
        )}
      >
        {metric}
      </button>

      <OwnerDashboardListPopup
        open={open}
        onClose={close}
        title={popupTitle}
        wide
      >
        {!hasContent ? (
          <p className="px-5 py-4 text-sm text-muted">{emptyLabel}</p>
        ) : (
          <MetricPopupBoxContent items={items} groups={groups} onNavigate={close} />
        )}
      </OwnerDashboardListPopup>
    </>
  )
}
