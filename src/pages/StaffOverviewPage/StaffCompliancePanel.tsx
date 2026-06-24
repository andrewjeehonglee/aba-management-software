import { Link } from "react-router-dom"
import type { StaffRecord, SupervisionRecord } from "@/lib/supabase"
import type { RosterStaffRole } from "@/lib/staffRole"
import { isTechnicianRole } from "@/lib/staffRole"
import {
  SUPERVISION_THRESHOLD,
  complianceStatus,
  isSupervisionBelowRequirement,
} from "@/lib/supervision"
import { staffProfilePath } from "@/lib/rosterScope"
import { P, TILE_LIST_MAX_H, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

const STATUS_STYLE = {
  compliant: { bg: P.sageBg, ink: P.sageInk, label: "Compliant" },
  "at-risk": { bg: P.amberBg, ink: P.amberInk, label: "At risk" },
  "non-compliant": { bg: "#F5D5CE", ink: P.cancel, label: "Non-compliant" },
} as const

interface StaffCompliancePanelProps {
  role: RosterStaffRole
  monthLabel: string
  supervision: SupervisionRecord | null
  staff: StaffRecord
  caseloadRecords: SupervisionRecord[]
  loading?: boolean
}

export function StaffCompliancePanel({
  role,
  monthLabel,
  supervision,
  staff,
  caseloadRecords,
  loading,
}: StaffCompliancePanelProps) {
  const title = isTechnicianRole(role)
    ? "My supervision received this month"
    : "Supervision compliance across my RBTs"

  return (
    <section
      className="flex h-full min-h-0 flex-col p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={TILE_TITLE} style={{ color: P.ink }}>
        {title}
      </h2>

      <div className={`mt-4 min-h-0 flex-1 ${TILE_LIST_MAX_H}`}>
        {loading ? (
          <p className="py-8 text-[15px] animate-pulse" style={{ color: P.faint }}>
            Loading…
          </p>
        ) : isTechnicianRole(role) ? (
          <TechnicianCompliance
            supervision={supervision}
            staff={staff}
            monthLabel={monthLabel}
          />
        ) : (
          <LeadershipCompliance records={caseloadRecords} monthLabel={monthLabel} />
        )}
      </div>
    </section>
  )
}

function ComplianceBadge({ status }: { status: ReturnType<typeof complianceStatus> }) {
  const style = STATUS_STYLE[status]
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: style.bg, color: style.ink }}
    >
      {style.label}
    </span>
  )
}

function TechnicianCompliance({
  supervision,
  staff,
  monthLabel,
}: {
  supervision: SupervisionRecord | null
  staff: StaffRecord
  monthLabel: string
}) {
  if (!supervision) {
    return (
      <div
        className="rounded-[12px] py-8 text-center text-[14px]"
        style={{ backgroundColor: P.inset, color: P.soft }}
      >
        No supervision data for {monthLabel}
      </div>
    )
  }

  const status = complianceStatus(supervision.supervisionPct)
  const pctInk = isSupervisionBelowRequirement(supervision.supervisionPct)
    ? P.cancel
    : status === "at-risk"
      ? P.amberInk
      : P.sageInk

  return (
    <div
      className="rounded-[12px] px-[18px] py-5"
      style={{ backgroundColor: P.inset }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[15px]" style={{ color: P.soft }}>
          Supervision received this month
        </p>
        <ComplianceBadge status={status} />
      </div>
      <p
        className="mt-3 text-[32px] font-semibold tabular-nums leading-none"
        style={{ color: pctInk }}
      >
        {supervision.supervisionPct.toFixed(1)}%
      </p>
      <p className="mt-3 text-[13px]" style={{ color: P.faint }}>
        {staff.name} · {monthLabel}
      </p>
    </div>
  )
}

function LeadershipCompliance({
  records,
  monthLabel,
}: {
  records: SupervisionRecord[]
  monthLabel: string
}) {
  const total = records.length
  const belowCount = records.filter((r) =>
    isSupervisionBelowRequirement(r.supervisionPct),
  ).length

  if (total === 0) {
    return (
      <div
        className="rounded-[12px] py-8 text-center text-[14px]"
        style={{ backgroundColor: P.inset, color: P.soft }}
      >
        No RBTs on shared caseload yet
      </div>
    )
  }

  return (
    <>
      <p className="mb-3 text-[14px]" style={{ color: P.soft }}>
        <span
          className="font-semibold tabular-nums"
          style={{ color: belowCount > 0 ? P.cancel : P.sageInk }}
        >
          {belowCount} of {total}
        </span>
        {" RBT"}
        {total === 1 ? "" : "s"}
        {" below "}
        {SUPERVISION_THRESHOLD}%
      </p>

      <table className="w-full text-[14px]">
        <thead>
          <tr
            className="text-left text-[12px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: P.faint }}
          >
            <th className="pb-2 pr-3 font-semibold">Staff</th>
            <th className="pb-2 pr-3 text-right font-semibold">%</th>
            <th className="pb-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((row) => {
            const status = complianceStatus(row.supervisionPct)
            return (
              <tr
                key={row.staffId}
                style={{ borderTop: `1px solid ${P.rule}` }}
              >
                <td className="py-2.5 pr-3">
                  {row.staffExternalCode ? (
                    <Link
                      to={staffProfilePath(row.staffExternalCode)}
                      className="font-medium hover:underline underline-offset-2"
                      style={{ color: P.ink }}
                    >
                      {row.staffName}
                    </Link>
                  ) : (
                    row.staffName
                  )}
                </td>
                <td
                  className="py-2.5 pr-3 text-right tabular-nums font-medium"
                  style={{
                    color: isSupervisionBelowRequirement(row.supervisionPct)
                      ? P.cancel
                      : P.ink,
                  }}
                >
                  {row.supervisionPct.toFixed(1)}%
                </td>
                <td className="py-2.5">
                  <ComplianceBadge status={status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[12px]" style={{ color: P.faint }}>
        {monthLabel}
      </p>
    </>
  )
}
