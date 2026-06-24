import type { AuditReadinessStats } from "@/lib/auditReadiness"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

interface AuditReadinessSummaryProps {
  stats: AuditReadinessStats
}

export function AuditReadinessSummary({ stats }: AuditReadinessSummaryProps) {
  const {
    sessionsInRange,
    billableCount,
    completeCount,
    missingCount,
    overdueCount,
    unsignedCount,
    gapCount,
    auditReady,
  } = stats

  const overdueMissingTotal = missingCount + overdueCount

  return (
    <section className="p-5" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={TILE_TITLE} style={{ color: P.ink }}>
            Readiness summary
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: P.soft }}>
            {sessionsInRange} session{sessionsInRange === 1 ? "" : "s"} in range ·{" "}
            {completeCount} note{completeCount === 1 ? "" : "s"} complete ·{" "}
            {overdueMissingTotal} overdue/missing · {unsignedCount} unsigned
          </p>
          <p className="mt-1 text-[13px]" style={{ color: P.faint }}>
            Denominator: {billableCount} billable session{billableCount === 1 ? "" : "s"} (cancelled
            sessions excluded)
          </p>
        </div>

        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold"
          style={{
            backgroundColor: auditReady ? P.sageBg : "#F5D5CE",
            color: auditReady ? P.sageInk : P.cancel,
          }}
        >
          {auditReady ? "Audit-ready" : `Has gaps · ${gapCount}`}
        </span>
      </div>

      {!auditReady && billableCount > 0 && (
        <div className="mt-4 space-y-1.5 text-[14px]" style={{ color: P.soft }}>
          {overdueCount > 0 && (
            <p>
              <span className="font-semibold" style={{ color: P.cancel }}>
                {overdueCount} overdue
              </span>{" "}
              — these block a clean audit.
            </p>
          )}
          {missingCount > 0 && (
            <p>
              <span className="font-semibold" style={{ color: P.amberInk }}>
                {missingCount} missing
              </span>{" "}
              — these block a clean audit.
            </p>
          )}
          {unsignedCount > 0 && (
            <p>
              <span className="font-semibold" style={{ color: P.amberInk }}>
                {unsignedCount} unsigned
              </span>{" "}
              — incomplete notes need signatures before handoff.
            </p>
          )}
        </div>
      )}

      {auditReady && billableCount > 0 && (
        <p className="mt-4 text-[14px]" style={{ color: P.sageInk }}>
          Every billable session has a complete, signed note — ready to export.
        </p>
      )}

      {billableCount === 0 && sessionsInRange > 0 && (
        <p className="mt-4 text-[14px]" style={{ color: P.soft }}>
          No billable sessions in this range — adjust dates or pick another client.
        </p>
      )}
    </section>
  )
}
