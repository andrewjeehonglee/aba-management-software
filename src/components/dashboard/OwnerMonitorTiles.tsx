import { cn } from "@/lib/utils"
import type { OwnerMonitorTile } from "@/lib/ownerDashboardConcerns"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { OwnerRankedRows, OwnerViewAllLink } from "@/components/dashboard/OwnerRankedRows"

function tileAccentClass(state: OwnerMonitorTile["state"], primary?: boolean): string {
  if (state === "urgent") {
    return primary ? "border-l-4 border-l-alert-strong" : "ring-1 ring-alert-strong/20"
  }
  if (state === "monitor") {
    return primary ? "border-l-4 border-l-alert" : ""
  }
  return primary ? "border-l-4 border-l-brand" : ""
}

function headerClass(state: OwnerMonitorTile["state"]): string {
  if (state === "urgent") return "text-alert-strong"
  if (state === "monitor") return "text-alert"
  return "text-ink-soft"
}

function maxMagnitude(rows: OwnerMonitorTile["rows"]): number {
  return rows.reduce((max, row) => Math.max(max, row.magnitude), 0) || 1
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
  const isHealthy = tile.state === "healthy" && tile.totalRowCount === 0
  const barKind = tile.id === "auth" ? "utilization" : "magnitude"
  const showViewAll =
    tile.viewAllHref && tile.totalRowCount > tile.rows.length

  return (
    <article
      id={sectionId}
      className={cn(
        "flex scroll-mt-4 flex-col rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card short:px-3.5 short:py-3",
        tileAccentClass(tile.state, primary),
        primary ? "min-h-[168px]" : "min-h-[132px]",
      )}
    >
      <h3 className={cn(TILE_TITLE, "text-ink")}>{tile.title}</h3>
      <p className={cn("mt-1.5 text-[14px] leading-snug tabular-nums", headerClass(tile.state))}>
        {tile.headerLine}
      </p>

      {isHealthy ? (
        <p className="mt-auto pt-4 text-[14px] font-medium text-brand">{tile.emptyLabel}</p>
      ) : tile.summaryOnly ? (
        <div className="mt-auto pt-3">
          {showViewAll && tile.viewAllHref && (
            <OwnerViewAllLink
              count={tile.totalRowCount}
              href={tile.viewAllHref}
              label={`View all (${tile.totalRowCount})`}
            />
          )}
        </div>
      ) : tile.rows.length > 0 ? (
        <>
          <OwnerRankedRows
            rows={tile.rows}
            maxMagnitude={maxMagnitude(tile.rows)}
            barKind={barKind}
          />
          {showViewAll && tile.viewAllHref && (
            <OwnerViewAllLink count={tile.totalRowCount} href={tile.viewAllHref} />
          )}
        </>
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
        primary ? "min-h-[168px]" : "min-h-[132px]",
      )}
    >
      <div className="h-5 w-36 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-48 rounded bg-line-soft" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full rounded bg-line-soft" />
        <div className="h-4 w-5/6 rounded bg-line-soft" />
        <div className="h-4 w-2/3 rounded bg-line-soft" />
      </div>
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
