import { useState } from "react"
import { cn } from "@/lib/utils"
import type { OwnerMonitorTile, OwnerMonitorTileId, OwnerSummaryLine } from "@/lib/ownerDashboardConcerns"
import { TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { OwnerDashboardListPopup } from "@/components/dashboard/OwnerDashboardListPopup"
import { OwnerRankedRows, OwnerViewAllButton } from "@/components/dashboard/OwnerRankedRows"

function tileAccentClass(state: OwnerMonitorTile["state"]): string {
  if (state === "urgent") return "border-l-4 border-l-alert-strong"
  if (state === "monitor") return "border-l-4 border-l-alert"
  return "border-l-4 border-l-brand"
}

function summaryLineClass(tone: OwnerSummaryLine["tone"]): string {
  if (tone === "urgent") return "text-alert-strong"
  if (tone === "monitor") return "text-alert"
  return "text-ink-soft"
}

function TileSummary({ tile }: { tile: OwnerMonitorTile }) {
  const lines =
    tile.summaryLines ??
    (tile.headerLine ? [{ text: tile.headerLine, tone: "neutral" as const }] : [])

  return (
    <div className="mt-1.5 space-y-0.5">
      {lines.map((line) => (
        <p
          key={line.text}
          className={cn("text-[14px] leading-snug tabular-nums", summaryLineClass(line.tone))}
        >
          {line.text}
        </p>
      ))}
      {tile.subNote ? (
        <p className="pt-0.5 text-[12px] leading-snug text-muted">{tile.subNote}</p>
      ) : null}
    </div>
  )
}

function MonitorTileCard({
  tile,
  sectionId,
  onViewAll,
}: {
  tile: OwnerMonitorTile
  sectionId?: string
  onViewAll: () => void
}) {
  const isHealthy = tile.state === "healthy" && tile.totalRowCount === 0
  const showViewAll =
    tile.totalRowCount > 0 &&
    (tile.totalRowCount > tile.rows.length || tile.id === "directHours")

  return (
    <article
      id={sectionId}
      className={cn(
        "flex h-full min-h-[168px] scroll-mt-4 flex-col rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card short:px-3.5 short:py-3",
        tileAccentClass(tile.state),
      )}
    >
      <h3 className={cn(TILE_TITLE, "text-ink")}>{tile.title}</h3>
      <TileSummary tile={tile} />

      {isHealthy ? (
        <>
          {tile.calmNote ? (
            <p className="mt-2 text-[12px] leading-snug text-muted">{tile.calmNote}</p>
          ) : null}
          <p className="mt-auto pt-4 text-[14px] font-medium text-brand">{tile.emptyLabel}</p>
          {tile.footerNote ? (
            <p className="mt-3 text-[12px] leading-snug text-muted">{tile.footerNote}</p>
          ) : null}
        </>
      ) : tile.rows.length > 0 ? (
        <>
          <OwnerRankedRows rows={tile.rows} />
          <div className="mt-auto pt-1">
            {showViewAll && tile.totalRowCount > 0 ? (
              <OwnerViewAllButton count={tile.totalRowCount} onClick={onViewAll} />
            ) : null}
            {tile.footerNote ? (
              <p className="mt-3 text-[12px] leading-snug text-muted">{tile.footerNote}</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-auto pt-4 text-[14px] text-muted">{tile.emptyLabel}</p>
      )}
    </article>
  )
}

function TileSkeleton() {
  return (
    <div className="flex min-h-[168px] animate-pulse flex-col rounded-[var(--radius)] bg-surface px-4 py-4 shadow-card">
      <div className="h-5 w-36 rounded bg-line-soft" />
      <div className="mt-2 h-4 w-full rounded bg-line-soft" />
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
  const [popupTileId, setPopupTileId] = useState<OwnerMonitorTileId | null>(null)
  const popupTile = tiles.find((tile) => tile.id === popupTileId)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
        {tiles.map((tile) => (
          <MonitorTileCard
            key={tile.id}
            tile={tile}
            sectionId={`owner-pillar-${tile.id}`}
            onViewAll={() => setPopupTileId(tile.id)}
          />
        ))}
      </div>

      <OwnerDashboardListPopup
        open={popupTile != null}
        onClose={() => setPopupTileId(null)}
        title={popupTile?.title ?? ""}
        metaLine={popupTile?.popupMetaLine}
        rows={popupTile?.viewAllRows}
        footerNote={popupTile?.footerNote}
      />
    </>
  )
}
