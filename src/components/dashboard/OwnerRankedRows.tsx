import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { OwnerRankedRow } from "@/lib/ownerDashboardConcerns"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export const TILE_BODY = "text-[15px]"

export function rowInk(severity: OwnerRankedRow["severity"]): string {
  if (severity === "overdue" || severity === "over-cap") return P.cancel
  if (severity === "pending" || severity === "near-cap") return P.amberInk
  return P.soft
}

export function PayrollSplitBar({
  payableHours,
  onHoldHours,
}: {
  payableHours: number
  onHoldHours: number
}) {
  const total = payableHours + onHoldHours
  if (total <= 0) {
    return (
      <div className="h-2 w-full rounded-full" style={{ backgroundColor: P.inset }} aria-hidden />
    )
  }
  const payablePct = (payableHours / total) * 100
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: P.inset }}
      aria-hidden
    >
      <div style={{ width: `${payablePct}%`, backgroundColor: P.sageInk }} className="h-full" />
      <div style={{ width: `${100 - payablePct}%`, backgroundColor: P.amberInk }} className="h-full" />
    </div>
  )
}

function RankedRowItem({ row }: { row: OwnerRankedRow }) {
  const name = row.nameLabel ?? row.label
  const consequence = row.consequenceLabel
  const ink = rowInk(row.severity)

  const content = (
    <>
      <span className={cn(TILE_BODY, "truncate font-medium")} style={{ color: P.ink }}>
        {name}
      </span>
      {consequence ? (
        <span
          className={cn(TILE_BODY, "shrink-0 font-medium tabular-nums")}
          style={{ color: ink }}
        >
          {consequence}
        </span>
      ) : null}
    </>
  )

  if (row.href) {
    return (
      <Link
        to={row.href}
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 hover:opacity-85"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      {content}
    </div>
  )
}

export function OwnerRankedRows({ rows }: { rows: OwnerRankedRow[] }) {
  if (rows.length === 0) return null

  return (
    <ul className="mt-3 space-y-0">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="py-2.5 first:pt-0"
          style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
        >
          <RankedRowItem row={row} />
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
      className="group mt-2 inline-flex cursor-pointer items-center gap-1 text-[14px] font-semibold text-brand hover:underline underline-offset-2"
    >
      {label ?? `View all (${count})`}
      <ChevronRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  )
}
