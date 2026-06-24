import { cn } from "@/lib/utils"
import type { OwnerMonitorChip, OwnerMonitorTile } from "@/lib/ownerDashboardConcerns"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { OwnerDetailPopover } from "@/components/dashboard/OwnerDetailPopover"

function MonitorChip({ chip }: { chip: OwnerMonitorChip }) {
  return (
    <OwnerDetailPopover
      title={chip.popoverTitle}
      lines={chip.popoverLines}
      ariaLabel={`${chip.label} details`}
      trigger={
        <span className="inline-flex cursor-pointer items-center rounded-full bg-surface-2 px-2.5 py-1 text-[14px] font-medium text-ink transition-colors hover:bg-accent-soft hover:text-brand">
          {chip.label}
        </span>
      }
    />
  )
}

function OverflowChip({
  count,
  title,
  overflowChips,
}: {
  count: number
  title: string
  overflowChips: OwnerMonitorChip[]
}) {
  if (count <= 0) return null

  return (
    <OwnerDetailPopover
      title={title}
      lines={overflowChips.map((chip) => ({
        id: chip.id,
        text: chip.label,
        href: chip.popoverLines.find((line) => line.href)?.href,
      }))}
      ariaLabel={`${count} more items`}
      trigger={
        <span className="inline-flex cursor-pointer items-center rounded-full border border-line bg-surface px-2.5 py-1 text-[14px] font-semibold text-muted transition-colors hover:text-ink">
          +{count} more
        </span>
      }
    />
  )
}

function tileAccentClass(state: OwnerMonitorTile["state"], primary?: boolean): string {
  if (state === "urgent") {
    return primary ? "border-l-4 border-l-alert-strong" : "ring-1 ring-alert-strong/20"
  }
  if (state === "monitor") {
    return primary ? "border-l-4 border-l-alert" : ""
  }
  return primary ? "border-l-4 border-l-brand" : ""
}

function MonitorTileCard({
  tile,
  primary = false,
  sectionId,
}: {
  tile: OwnerMonitorTile
  primary?: boolean
  sectionId?: string
}) {
  const isHealthy = tile.state === "healthy" && tile.chips.length === 0

  return (
    <article
      id={sectionId}
      className={cn(
        "flex min-h-[148px] scroll-mt-4 flex-col rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card short:px-3.5 short:py-3",
        tileAccentClass(tile.state, primary),
        primary && "min-h-[168px]",
      )}
    >
      <h3 className={cn(TILE_TITLE, "text-ink")}>{tile.title}</h3>
      <p
        className={cn(
          "mt-1.5 text-[14px] leading-snug",
          tile.state === "urgent"
            ? "text-alert-strong"
            : tile.state === "monitor"
              ? "text-alert"
              : "text-ink-soft",
        )}
      >
        {tile.headerLine}
      </p>

      {isHealthy ? (
        <p className="mt-auto pt-4 text-[14px] font-medium text-brand">{tile.emptyLabel}</p>
      ) : tile.chips.length > 0 ? (
        <div className="mt-3 flex min-h-[36px] flex-wrap items-center gap-1.5">
          {tile.chips.map((chip) => (
            <MonitorChip key={chip.id} chip={chip} />
          ))}
          <OverflowChip
            count={tile.overflowCount}
            title={tile.title}
            overflowChips={tile.overflowChips}
          />
        </div>
      ) : (
        <p className="mt-auto pt-4 text-[14px] text-muted">{tile.emptyLabel}</p>
      )}
    </article>
  )
}

function TileSkeleton({ primary }: { primary?: boolean }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card",
        primary ? "min-h-[168px]" : "min-h-[148px]",
      )}
    >
      <div className="h-5 w-36 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-full max-w-md rounded bg-line-soft" />
      <div className="mt-4 h-7 w-48 rounded-full bg-line-soft" />
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
  const notesTile = tiles.find((tile) => tile.id === "notes")
  const authTile = tiles.find((tile) => tile.id === "auth")
  const directTile = tiles.find((tile) => tile.id === "directHours")

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <TileSkeleton primary />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TileSkeleton />
          <TileSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {notesTile && (
        <MonitorTileCard tile={notesTile} primary sectionId="owner-pillar-notes" />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {authTile && <MonitorTileCard tile={authTile} sectionId="owner-pillar-auth" />}
        {directTile && <MonitorTileCard tile={directTile} sectionId="owner-pillar-direct" />}
      </div>
    </div>
  )
}
