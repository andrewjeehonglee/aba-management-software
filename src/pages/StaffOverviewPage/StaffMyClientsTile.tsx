import { Link } from "react-router-dom"
import type { StaffClientTableRow } from "@/lib/clientAssignments"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import type { RosterStaffRole } from "@/lib/staffRole"
import { isLeadershipRole, isTechnicianRole } from "@/lib/staffRole"
import {
  SUPERVISION_THRESHOLD,
  complianceStatus,
  isSupervisionBelowRequirement,
} from "@/lib/supervision"
import type { SupervisionRecord } from "@/lib/supabase"
import { P, TILE_LIST_MAX_H, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffMyClientsTileProps {
  role: RosterStaffRole
  clientTable: StaffClientTableRow[]
  caseloadRecords: SupervisionRecord[]
  supervision: SupervisionRecord | null
  monthLabel: string
}

function SupervisionChip({ pct }: { pct: number }) {
  const status = complianceStatus(pct)
  const below = isSupervisionBelowRequirement(pct)
  const bg = below
    ? status === "non-compliant"
      ? "#F5D5CE"
      : P.amberBg
    : P.sageBg
  const ink = below
    ? status === "non-compliant"
      ? P.cancel
      : P.amberInk
    : P.sageInk

  return (
    <span
      className="ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
      style={{ backgroundColor: bg, color: ink }}
    >
      {pct.toFixed(1)}%
    </span>
  )
}

function StaffLink({ externalCode, name }: { externalCode: string; name: string }) {
  return (
    <Link
      to={staffProfilePath(externalCode)}
      className="font-medium hover:underline underline-offset-2"
      style={{ color: P.ink }}
    >
      {name}
    </Link>
  )
}

export function StaffMyClientsTile({
  role,
  clientTable,
  caseloadRecords,
  supervision,
  monthLabel,
}: StaffMyClientsTileProps) {
  const supervisionByStaffId = new Map(
    caseloadRecords.map((r) => [r.staffId, r.supervisionPct]),
  )

  const isLeadership = isLeadershipRole(role)
  const isTechnician = isTechnicianRole(role)

  const belowCount = caseloadRecords.filter((r) =>
    isSupervisionBelowRequirement(r.supervisionPct),
  ).length
  const rosterTotal = caseloadRecords.length

  const columns = isTechnician
    ? (["client", "supervisor"] as const)
    : (["client", "supervisor", "technician"] as const)

  const headers: Record<string, string> = {
    client: "Client",
    supervisor: "Supervisor",
    technician: "Technician",
  }

  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={TILE_TITLE} style={{ color: P.ink }}>
        My clients
      </h2>

      {isTechnician && supervision && (
        <TechnicianSupervisionHeader
          supervision={supervision}
          monthLabel={monthLabel}
        />
      )}

      {isLeadership && rosterTotal > 0 && (
        <p className="mt-3 text-[14px]" style={{ color: P.soft }}>
          <span
            className="font-semibold tabular-nums"
            style={{ color: belowCount > 0 ? P.cancel : P.sageInk }}
          >
            {belowCount} of {rosterTotal}
          </span>
          {" technician"}
          {rosterTotal === 1 ? "" : "s"}
          {" below "}
          {SUPERVISION_THRESHOLD}% supervision
          {monthLabel ? ` · ${monthLabel}` : ""}
        </p>
      )}

      <div className={`mt-4 ${TILE_LIST_MAX_H}`}>
        {clientTable.length === 0 ? (
          <div
            className="rounded-[12px] py-8 text-center text-[14px]"
            style={{ backgroundColor: P.inset, color: P.soft }}
          >
            No clients assigned yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[14px]">
              <thead>
                <tr
                  className="text-left text-[12px] font-semibold uppercase tracking-[0.06em]"
                  style={{ color: P.faint }}
                >
                  {columns.map((col) => (
                    <th key={col} className="pb-2 pr-4 font-semibold">
                      {headers[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientTable.map((row) => (
                  <tr
                    key={row.clientId}
                    style={{ borderTop: `1px solid ${P.rule}` }}
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        to={clientProfilePath(row.clientCode)}
                        className="font-medium hover:underline underline-offset-2"
                        style={{ color: P.ink }}
                      >
                        {row.clientCode}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: P.soft }}>
                      {row.supervisor ? (
                        <StaffLink
                          externalCode={row.supervisor.externalCode}
                          name={row.supervisor.fullName}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    {!isTechnician && (
                      <td className="py-2.5" style={{ color: P.soft }}>
                        {row.technician ? (
                          <span className="inline-flex flex-wrap items-center">
                            <StaffLink
                              externalCode={row.technician.externalCode}
                              name={row.technician.fullName}
                            />
                            {supervisionByStaffId.has(row.technician.staffId) && (
                              <SupervisionChip
                                pct={supervisionByStaffId.get(row.technician.staffId)!}
                              />
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function TechnicianSupervisionHeader({
  supervision,
  monthLabel,
}: {
  supervision: SupervisionRecord
  monthLabel: string
}) {
  const status = complianceStatus(supervision.supervisionPct)
  const below = isSupervisionBelowRequirement(supervision.supervisionPct)
  const statusLabel =
    status === "non-compliant"
      ? "Non-compliant"
      : status === "at-risk"
        ? "At risk"
        : "Compliant"

  return (
    <p className="mt-3 text-[14px]" style={{ color: P.soft }}>
      My supervision this month:{" "}
      <span
        className="font-semibold tabular-nums"
        style={{ color: below ? P.cancel : P.sageInk }}
      >
        {supervision.supervisionPct.toFixed(1)}%
      </span>
      {" · "}
      <span style={{ color: below ? P.cancel : P.sageInk }}>{statusLabel}</span>
      {monthLabel ? ` · ${monthLabel}` : ""}
    </p>
  )
}
