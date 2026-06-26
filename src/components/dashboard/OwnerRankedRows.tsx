import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  OWNER_NEAR_CAP_INK,
  OWNER_OVER_CAP_INK,
  type OwnerRankedRow,
} from "@/lib/ownerDashboardConcerns"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export const TILE_BODY = "text-[15px]"

/** Shared two-column row: widest name sets column 1; values stack on one line. */
export const OWNER_RANKED_ROW_CLASS =
  "col-span-2 grid grid-cols-subgrid items-center gap-x-3 px-2.5 py-0.5 hover:opacity-85"

export function rowInk(severity: OwnerRankedRow["severity"]): string {
  if (severity === "overdue" || severity === "over-cap") return OWNER_OVER_CAP_INK
  if (severity === "pending") return P.amberInk
  if (severity === "near-cap") return OWNER_NEAR_CAP_INK
  if (severity === "neutral") return P.soft
  return P.soft
}

function RankedRowContent({ row }: { row: OwnerRankedRow }) {
  const name = row.nameLabel ?? row.label
  const consequence = row.consequenceLabel
  const ink = rowInk(row.severity)

  return (
    <>
      <span className={cn(TILE_BODY, "min-w-0 truncate font-medium")} style={{ color: P.ink }}>
        {name}
      </span>
      {consequence ? (
        <span
          className={cn(TILE_BODY, "font-medium tabular-nums")}
          style={{ color: ink }}
        >
          {consequence}
        </span>
      ) : null}
    </>
  )
}

function RankedRowItem({
  row,
  showBorder,
}: {
  row: OwnerRankedRow
  showBorder: boolean
}) {
  const rowClass = cn(
    OWNER_RANKED_ROW_CLASS,
    row.href && "cursor-pointer",
  )
  const borderStyle = showBorder ? { borderTop: `1px solid ${P.rule}` } : undefined

  if (row.href) {
    return (
      <Link to={row.href} className={rowClass} style={borderStyle}>
        <RankedRowContent row={row} />
      </Link>
    )
  }

  return (
    <div className={rowClass} style={borderStyle}>
      <RankedRowContent row={row} />
    </div>
  )
}

export function OwnerRankedRows({ rows }: { rows: OwnerRankedRow[] }) {
  if (rows.length === 0) return null

  return (
    <ul
      className="mt-3 grid gap-x-3"
      style={{ gridTemplateColumns: "max-content auto" }}
    >
      {rows.map((row, index) => (
        <li key={row.id} className="contents">
          <RankedRowItem row={row} showBorder={index > 0} />
        </li>
      ))}
    </ul>
  )
}

export function OwnerViewAllButton({
  count,
  onClick,
  label,
}: {
  count: number
  onClick: () => void
  label?: string
}) {
  if (count <= 0) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mt-2 inline-flex cursor-pointer items-center gap-1 text-[14px] font-semibold text-muted hover:text-ink-soft hover:underline underline-offset-2"
    >
      {label ?? `View all (${count})`}
      <ChevronRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  )
}

export function OwnerRankedRowContent({ row }: { row: OwnerRankedRow }) {
  return <RankedRowContent row={row} />
}
