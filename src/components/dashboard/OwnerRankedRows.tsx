import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { OwnerPopoverLine, OwnerRankedRow } from "@/lib/ownerDashboardConcerns"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { OwnerDetailPopover } from "@/components/dashboard/OwnerDetailPopover"

const TILE_BODY = "text-[15px]"

function rowInk(severity: OwnerRankedRow["severity"]): string {
  if (severity === "overdue" || severity === "over-cap") return P.cancel
  if (severity === "pending" || severity === "near-cap") return P.amberInk
  return P.soft
}

function MagnitudeBar({
  value,
  max,
  severity,
}: {
  value: number
  max: number
  severity: OwnerRankedRow["severity"]
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fill =
    severity === "overdue" || severity === "over-cap"
      ? P.cancel
      : severity === "pending" || severity === "near-cap"
        ? P.amberInk
        : P.sageInk
  return (
    <div
      className="h-1.5 w-full min-w-[72px] max-w-[120px] overflow-hidden rounded-full"
      style={{ backgroundColor: P.inset }}
      aria-hidden
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: fill }}
      />
    </div>
  )
}

function UtilizationBar({
  usedHours,
  authorizedHours,
  overCap,
}: {
  usedHours: number
  authorizedHours: number
  overCap: boolean
}) {
  const total = Math.max(usedHours, authorizedHours, 1)
  const capPct = Math.min(100, (authorizedHours / total) * 100)
  const overPct = overCap ? Math.min(100 - capPct, ((usedHours - authorizedHours) / total) * 100) : 0
  const usedPct = overCap ? capPct : Math.min(100, (usedHours / total) * 100)

  return (
    <div
      className="flex h-1.5 w-full min-w-[72px] max-w-[140px] overflow-hidden rounded-full"
      style={{ backgroundColor: P.inset }}
      aria-hidden
    >
      <div
        className="h-full"
        style={{
          width: `${usedPct}%`,
          backgroundColor: overCap ? P.sageInk : usedPct >= 85 ? P.amberInk : P.sageInk,
        }}
      />
      {overPct > 0 && (
        <div className="h-full" style={{ width: `${overPct}%`, backgroundColor: P.cancel }} />
      )}
    </div>
  )
}

function PayrollSplitBar({ payableHours, onHoldHours }: { payableHours: number; onHoldHours: number }) {
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

function RowLabel({
  row,
  popoverLines,
}: {
  row: OwnerRankedRow
  popoverLines?: OwnerPopoverLine[]
}) {
  const content = (
    <span className={cn(TILE_BODY, "font-medium tabular-nums")} style={{ color: rowInk(row.severity) }}>
      {row.label}
    </span>
  )

  if (popoverLines && popoverLines.length > 0) {
    return (
      <OwnerDetailPopover
        title={row.popoverTitle ?? row.label}
        lines={popoverLines}
        ariaLabel={`${row.label} details`}
        trigger={<button type="button" className="text-left hover:underline underline-offset-2">{content}</button>}
      />
    )
  }

  if (row.href) {
    return (
      <Link
        to={row.href}
        className={cn(TILE_BODY, "font-medium tabular-nums hover:underline underline-offset-2")}
        style={{ color: rowInk(row.severity) }}
      >
        {row.label}
      </Link>
    )
  }

  return content
}

export function OwnerRankedRows({
  rows,
  maxMagnitude,
  barKind = "magnitude",
}: {
  rows: OwnerRankedRow[]
  maxMagnitude: number
  barKind?: "magnitude" | "utilization"
}) {
  if (rows.length === 0) return null

  return (
    <ul className="mt-3 space-y-0">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 first:pt-0"
          style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
        >
          <RowLabel row={row} popoverLines={row.popoverLines} />
          {barKind === "utilization" && row.authorizedHours != null && row.usedHours != null ? (
            <UtilizationBar
              usedHours={row.usedHours}
              authorizedHours={row.authorizedHours}
              overCap={row.severity === "over-cap"}
            />
          ) : (
            <MagnitudeBar value={row.magnitude} max={maxMagnitude} severity={row.severity} />
          )}
        </li>
      ))}
    </ul>
  )
}

export function OwnerViewAllLink({
  count,
  href,
  label,
}: {
  count: number
  href: string
  label?: string
}) {
  if (count <= 0) return null
  return (
    <Link
      to={href}
      className="group mt-2 inline-flex items-center gap-1 text-[14px] font-semibold text-brand hover:underline underline-offset-2"
    >
      {label ?? `View all (${count})`}
      <ChevronRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}

export { PayrollSplitBar, TILE_BODY }
