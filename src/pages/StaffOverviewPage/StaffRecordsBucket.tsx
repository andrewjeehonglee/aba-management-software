import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffRecordsBucketProps {
  staffRouteKey: string
  missingCount: number
  overdueCount: number
  loading?: boolean
}

export function StaffRecordsBucket({
  staffRouteKey,
  missingCount,
  overdueCount,
  loading,
}: StaffRecordsBucketProps) {
  const notesPath = `/staff/${encodeURIComponent(staffRouteKey)}/notes`
  const hasIssues = missingCount > 0 || overdueCount > 0

  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={`${TILE_TITLE} mb-4`} style={{ color: P.ink }}>
        Records
      </h2>

      {loading ? (
        <p className="text-[15px] animate-pulse" style={{ color: P.faint }}>
          Loading…
        </p>
      ) : hasIssues ? (
        <Link
          to={notesPath}
          className="group flex items-start justify-between gap-3 rounded-[14px] p-4 transition-colors hover:opacity-90"
          style={{ backgroundColor: P.inset }}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-[16px] font-semibold" style={{ color: P.ink }}>
              My session notes
            </p>
            <p className="text-[13.5px] tabular-nums" style={{ color: P.soft }}>
              {overdueCount > 0 && (
                <span style={{ color: P.cancel }}>
                  {overdueCount} overdue
                </span>
              )}
              {overdueCount > 0 && missingCount > 0 && (
                <span style={{ color: P.faint }}> · </span>
              )}
              {missingCount > 0 && (
                <span style={{ color: P.amberInk }}>
                  {missingCount} missing
                </span>
              )}
            </p>
            <p className="text-[13px] leading-snug" style={{ color: P.faint }}>
              View due notes by client and date
            </p>
          </div>
          <ChevronRight
            className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: P.faint }}
            aria-hidden="true"
          />
        </Link>
      ) : (
        <div
          className="rounded-[14px] p-4"
          style={{ backgroundColor: P.inset }}
        >
          <p className="text-[16px] font-semibold" style={{ color: P.sageInk }}>
            All notes complete
          </p>
          <p className="mt-1 text-[13px]" style={{ color: P.faint }}>
            No overdue or missing session notes this pay period
          </p>
        </div>
      )}
    </section>
  )
}
