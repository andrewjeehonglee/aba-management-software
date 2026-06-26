import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { MetricPopoverGroup, MetricPopoverItem } from "@/components/dashboard/MetricPopover"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

const BOX_GRID_CLASS =
  "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"

const BOX_CLASS =
  "flex min-h-[3.25rem] min-w-0 flex-col justify-center rounded-[10px] border border-line bg-surface px-2.5 py-2 shadow-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"

function MetricPopupBox({
  item,
  onNavigate,
}: {
  item: MetricPopoverItem
  onNavigate?: () => void
}) {
  const inner = (
    <>
      <span className="truncate text-[14px] font-semibold leading-snug text-ink">
        {item.name}
      </span>
      {item.detail ? (
        <span className="mt-0.5 truncate text-[12px] font-medium tabular-nums text-muted">
          {item.detail}
        </span>
      ) : null}
    </>
  )

  if (item.href) {
    return (
      <Link to={item.href} onClick={onNavigate} className={cn(BOX_CLASS, "cursor-pointer")}>
        {inner}
      </Link>
    )
  }

  return <div className={BOX_CLASS}>{inner}</div>
}

function ItemGrid({
  items,
  onNavigate,
}: {
  items: MetricPopoverItem[]
  onNavigate?: () => void
}) {
  return (
    <div className={BOX_GRID_CLASS}>
      {items.map((item) => (
        <MetricPopupBox key={item.id} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

export function MetricPopupBoxContent({
  items = [],
  groups = [],
  onNavigate,
}: {
  items?: MetricPopoverItem[]
  groups?: MetricPopoverGroup[]
  onNavigate?: () => void
}) {
  if (groups.length > 0) {
    return (
      <div className="space-y-5 px-3 pb-3 pt-1">
        {groups.map((group) => (
          <section key={group.id}>
            {group.name ? (
              <h3
                className="mb-2.5 text-[16px] font-bold leading-snug tracking-[-0.01em]"
                style={{ color: P.sageInk }}
              >
                {group.name}
              </h3>
            ) : null}
            <ItemGrid items={group.children} onNavigate={onNavigate} />
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="px-3 pb-3 pt-1">
      <ItemGrid items={items} onNavigate={onNavigate} />
    </div>
  )
}
