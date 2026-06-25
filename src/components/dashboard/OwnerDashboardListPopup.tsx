import { useEffect } from "react"
import { Link } from "react-router-dom"
import { X } from "lucide-react"
import type { OwnerRankedRow } from "@/lib/ownerDashboardConcerns"
import { cn } from "@/lib/utils"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { PANEL_SURFACE } from "@/pages/SessionsPage/sessionDetailUtils"
import { rowInk, TILE_BODY } from "@/components/dashboard/OwnerRankedRows"

interface OwnerDashboardListPopupProps {
  open: boolean
  onClose: () => void
  title: string
  metaLine?: string
  rows?: OwnerRankedRow[]
  children?: React.ReactNode
}

function RankedPopupRow({ row, onNavigate }: { row: OwnerRankedRow; onNavigate?: () => void }) {
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
        onClick={onNavigate}
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1 py-2.5 transition-opacity hover:opacity-85"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-2.5">
      {content}
    </div>
  )
}

export function OwnerDashboardListPopup({
  open,
  onClose,
  title,
  metaLine,
  rows,
  children,
}: OwnerDashboardListPopupProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-[rgba(44,41,36,0.28)]"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={title}
        className="relative z-10 flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-[14px] shadow-[0_8px_32px_rgba(44,41,36,0.16)]"
        style={{ backgroundColor: PANEL_SURFACE }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: P.rule }}
        >
          <div>
            <h2 className="text-[17px] font-bold leading-snug" style={{ color: P.ink }}>
              {title}
            </h2>
            {metaLine ? (
              <p className="mt-0.5 text-[14px]" style={{ color: P.soft }}>
                {metaLine}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 transition-opacity hover:opacity-70"
            aria-label="Close"
          >
            <X className="size-5" style={{ color: P.soft }} />
          </button>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto px-4 py-2">
          {children ??
            (rows ?? []).map((row, index) => (
              <div
                key={row.id}
                style={{ borderTop: index > 0 ? `1px solid ${P.rule}` : undefined }}
              >
                <RankedPopupRow row={row} onNavigate={onClose} />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
