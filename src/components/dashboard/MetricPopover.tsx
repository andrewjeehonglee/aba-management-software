import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { OwnerRankedRow } from "@/lib/ownerDashboardConcerns"
import { OwnerDashboardListPopup } from "@/components/dashboard/OwnerDashboardListPopup"
import { OWNER_RANKED_ROW_CLASS, OwnerRankedRowContent } from "@/components/dashboard/OwnerRankedRows"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export type MetricPopoverItem = {
  id: string
  name: string
  value: string
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

function itemToRow(item: MetricPopoverItem): OwnerRankedRow {
  return {
    id: item.id,
    label: `${item.name} ${item.value}`,
    nameLabel: item.name,
    consequenceLabel: item.value,
    severity: "neutral",
    magnitude: 0,
    href: item.href,
  }
}

function PopupRow({ row, onNavigate }: { row: OwnerRankedRow; onNavigate: () => void }) {
  if (row.href) {
    return (
      <Link
        to={row.href}
        onClick={onNavigate}
        className={cn(OWNER_RANKED_ROW_CLASS, "cursor-pointer rounded-md py-2.5")}
      >
        <OwnerRankedRowContent row={row} />
      </Link>
    )
  }

  return (
    <div className={cn(OWNER_RANKED_ROW_CLASS, "py-2.5")}>
      <OwnerRankedRowContent row={row} />
    </div>
  )
}

function GroupedPopupContent({
  groups,
  onClose,
}: {
  groups: MetricPopoverGroup[]
  onClose: () => void
}) {
  let rowIndex = 0

  return (
    <>
      {groups.map((group) => (
        <div key={group.id}>
          <p
            className="px-2.5 pb-1 pt-3 text-[13px] font-semibold"
            style={{ color: P.ink }}
          >
            {group.name}
          </p>
          {group.children.map((item) => {
            const index = rowIndex++
            return (
              <div
                key={item.id}
                style={{
                  borderTop: index > 0 ? `1px solid ${P.rule}` : undefined,
                }}
              >
                <PopupRow row={itemToRow(item)} onNavigate={onClose} />
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
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
  const rows = items.map(itemToRow)

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
        rows={groups.length > 0 ? undefined : hasContent ? rows : undefined}
      >
        {!hasContent ? (
          <p className="px-5 py-4 text-sm text-muted">{emptyLabel}</p>
        ) : groups.length > 0 ? (
          <GroupedPopupContent groups={groups} onClose={close} />
        ) : undefined}
      </OwnerDashboardListPopup>
    </>
  )
}
