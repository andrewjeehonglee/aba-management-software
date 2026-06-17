import { cn } from "@/lib/utils"
import {
  BCBA_STATE_LABEL,
  TILE_STATE_DOT_CLASS,
} from "@/lib/bcbaTileState"
import type { OwnerMonitorTile } from "@/lib/ownerDashboardConcerns"
import { OwnerDetailPopover } from "@/components/dashboard/OwnerDetailPopover"

function MonitorChip({ chip }: { chip: OwnerMonitorTile["chips"][number] }) {
  return (
    <OwnerDetailPopover
      title={chip.popoverTitle}
      lines={chip.popoverLines}
      ariaLabel={`${chip.label} details`}
      trigger={
        <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-[14px] font-medium text-ink transition-colors hover:bg-accent-soft hover:text-brand">
          {chip.label}
        </span>
      }
    />
  )
}

export function OwnerMonitorTileCard({ tile }: { tile: OwnerMonitorTile }) {
  return (
    <article className="flex min-h-0 flex-col rounded-[var(--radius)] bg-surface px-4 py-3.5 shadow-card short:px-3.5 short:py-3">
      <div className="flex items-start gap-2">
        <span
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", TILE_STATE_DOT_CLASS[tile.state])}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[16px] font-semibold leading-snug text-ink">{tile.title}</h3>
            <span
              className={cn(
                "text-[12px] font-semibold uppercase tracking-[0.08em]",
                tile.state === "healthy"
                  ? "text-brand"
                  : tile.state === "monitor"
                    ? "text-alert"
                    : "text-alert-strong",
              )}
            >
              {BCBA_STATE_LABEL[tile.state]}
            </span>
          </div>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{tile.situation}</p>
          {tile.chips.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tile.chips.map((chip) => (
                <MonitorChip key={chip.id} chip={chip} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function TileSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] bg-surface px-4 py-3.5 shadow-card">
      <div className="h-4 w-32 rounded bg-line-soft" />
      <div className="mt-2 h-3.5 w-full rounded bg-line-soft" />
    </div>
  )
}

export function OwnerMonitorTiles({
  tiles,
  loading,
}: {
  tiles: OwnerMonitorTile[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-3 min-[900px]:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-3 min-[900px]:gap-4">
      {tiles.map((tile) => (
        <OwnerMonitorTileCard key={tile.id} tile={tile} />
      ))}
    </div>
  )
}
