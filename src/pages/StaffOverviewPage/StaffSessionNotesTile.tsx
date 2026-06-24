import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { AuditNoteBundleItem } from "@/lib/auditPull"
import { isCompleteSessionNote, type NotesStatusItem } from "@/lib/notesStatus"
import { clientProfilePath } from "@/lib/rosterScope"
import { formatEventStamp } from "@/lib/sessions"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffSessionNotesTileProps {
  staffRouteKey: string
  missingCount: number
  overdueCount: number
  recentSessions: AuditNoteBundleItem[]
  dueItems: NotesStatusItem[]
}

type RowBadge = {
  label: string
  bg: string
  ink: string
}

function sessionBadge(
  item: AuditNoteBundleItem,
  bucketBySessionId: Map<string, "missing" | "overdue">,
): RowBadge {
  if (item.status === "cancelled" || item.status === "no-show") {
    return { label: "Cancelled", bg: P.inset, ink: P.faint }
  }
  if (item.status === "completed") {
    if (item.note && isCompleteSessionNote(item.note)) {
      return { label: "Complete", bg: P.sageBg, ink: P.sageInk }
    }
    const bucket = bucketBySessionId.get(item.sessionId)
    if (bucket === "overdue") {
      return { label: "Note overdue", bg: "#F5D5CE", ink: P.cancel }
    }
    return { label: "Note due", bg: P.amberBg, ink: P.amberInk }
  }
  return { label: "Scheduled", bg: P.calScheduledTint, ink: P.calScheduled }
}

export function StaffSessionNotesTile({
  staffRouteKey,
  missingCount,
  overdueCount,
  recentSessions,
  dueItems,
}: StaffSessionNotesTileProps) {
  const notesPath = `/staff/${encodeURIComponent(staffRouteKey)}/notes`
  const hasIssues = missingCount > 0 || overdueCount > 0
  const bucketBySessionId = new Map(
    dueItems.map((item) => [item.sessionId, item.bucket]),
  )

  return (
    <section
      className="flex h-full flex-col p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={TILE_TITLE} style={{ color: P.ink }}>
        Session notes
      </h2>

      {hasIssues ? (
        <Link
          to={notesPath}
          className="group mt-4 flex items-start justify-between gap-3 rounded-[14px] p-4 transition-colors hover:opacity-90"
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
          className="mt-4 rounded-[14px] p-4"
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

      <div className="mt-4 min-h-0 flex-1">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: P.faint }}
        >
          Last 7 days
        </p>
        {recentSessions.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: P.soft }}>
            No sessions in the last 7 days.
          </p>
        ) : (
          <ul className="mt-2">
            {recentSessions.map((item, index) => {
              const { date, time } = formatEventStamp(undefined, item.sessionAt)
              const clientLabel = item.clientCode || item.clientName
              const badge = sessionBadge(item, bucketBySessionId)

              return (
                <li
                  key={item.sessionId}
                  className="flex items-start justify-between gap-2 py-2.5 first:pt-0"
                  style={{
                    borderTop: index > 0 ? `1px solid ${P.rule}` : undefined,
                  }}
                >
                  <div className="min-w-0">
                    <Link
                      to={
                        item.clientCode
                          ? clientProfilePath(item.clientCode)
                          : "#"
                      }
                      className="block truncate text-[14px] font-medium hover:underline underline-offset-2"
                      style={{ color: P.ink }}
                    >
                      {clientLabel}
                    </Link>
                    <p className="mt-0.5 text-[12px] tabular-nums" style={{ color: P.faint }}>
                      {date}
                      {time ? ` · ${time}` : ""}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: badge.bg, color: badge.ink }}
                  >
                    {badge.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
