import { useEffect } from "react"
import { Link } from "react-router-dom"
import { X } from "lucide-react"
import type { OwnerRankedRow } from "@/lib/ownerDashboardConcerns"
import { cn } from "@/lib/utils"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { PANEL_SURFACE } from "@/pages/SessionsPage/sessionDetailUtils"
import { OWNER_RANKED_ROW_CLASS, OwnerRankedRowContent } from "@/components/dashboard/OwnerRankedRows"

interface OwnerDashboardListPopupProps {
  open: boolean
  onClose: () => void
  title: string
  metaLine?: string
  rows?: OwnerRankedRow[]
  children?: React.ReactNode
  /** Wider panel for box-grid KPI popups (BCBA dashboard). */
  wide?: boolean
}

function RankedPopupRow({ row, onNavigate }: { row: OwnerRankedRow; onNavigate?: () => void }) {
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

export function OwnerDashboardListPopup({
  open,
  onClose,
  title,
  metaLine,
  rows,
  children,
  wide = false,
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
        className="absolute inset-0 cursor-pointer bg-transparent"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[min(32rem,85vh)] w-full flex-col overflow-hidden rounded-[14px] border shadow-[0_12px_48px_rgba(44,41,36,0.18),0_2px_8px_rgba(44,41,36,0.08)]",
          wide ? "max-w-3xl" : "max-w-md",
        )}
        style={{ backgroundColor: PANEL_SURFACE, borderColor: P.rule }}
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

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto px-2 py-2">
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
