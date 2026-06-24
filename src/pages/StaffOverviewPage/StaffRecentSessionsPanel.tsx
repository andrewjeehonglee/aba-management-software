import { Link } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import type { SessionRecord } from "@/lib/supabase"
import { clientProfilePath } from "@/lib/rosterScope"
import { formatTime } from "@/lib/sessions"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import type { SessionStatus } from "@/types/session"

interface StaffRecentSessionsPanelProps {
  monthLabel: string
  sessions: SessionRecord[]
  exporting: boolean
  onExport: () => void
}

function sessionClientLabel(session: SessionRecord): string {
  return session.clientCode ?? session.clientName
}

export function StaffRecentSessionsPanel({
  monthLabel,
  sessions,
  exporting,
  onExport,
}: StaffRecentSessionsPanelProps) {
  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className={TILE_TITLE} style={{ color: P.ink }}>
          Recent sessions · {monthLabel}
        </h2>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-opacity disabled:opacity-50"
          style={{
            borderColor: P.rule,
            color: P.sageInk,
            backgroundColor: P.sageBg,
          }}
        >
          {exporting ? "Exporting…" : "Export all"}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div
          className="rounded-[12px] py-8 text-center text-[14px]"
          style={{ backgroundColor: P.inset, color: P.soft }}
        >
          No sessions logged this month
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-[14px]">
            <thead>
              <tr
                className="text-left text-[12px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: P.faint }}
              >
                <th className="pb-2 pr-4 font-semibold w-20">Time</th>
                <th className="pb-2 pr-4 font-semibold">Client</th>
                <th className="pb-2 pr-4 font-semibold w-28">Type</th>
                <th className="pb-2 text-right font-semibold w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  style={{ borderTop: `1px solid ${P.rule}` }}
                >
                  <td
                    className="py-2.5 pr-4 tabular-nums"
                    style={{ color: P.soft }}
                  >
                    {formatTime(session.time)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Link
                      to={
                        session.clientCode
                          ? clientProfilePath(session.clientCode)
                          : clientProfilePath(session.clientId)
                      }
                      className="font-medium hover:underline underline-offset-2"
                      style={{ color: P.ink }}
                    >
                      {sessionClientLabel(session)}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 capitalize" style={{ color: P.soft }}>
                    {session.sessionType}
                  </td>
                  <td className="py-2.5 text-right">
                    <SessionStatusBadge status={session.status as SessionStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
