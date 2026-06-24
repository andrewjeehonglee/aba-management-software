import { AlertCircle } from "lucide-react"
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
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffCareTeamsTileProps {
  role: RosterStaffRole
  clientTable: StaffClientTableRow[]
  caseloadRecords: SupervisionRecord[]
  supervision: SupervisionRecord | null
  monthLabel: string
}

function NameChip({ externalCode, name }: { externalCode: string; name: string }) {
  return (
    <Link
      to={staffProfilePath(externalCode)}
      className="inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-medium hover:opacity-90"
      style={{ backgroundColor: P.inset, color: P.ink }}
    >
      {name}
    </Link>
  )
}

function SupervisionWatchCallout({
  role,
  caseloadRecords,
  supervision,
  monthLabel,
}: {
  role: RosterStaffRole
  caseloadRecords: SupervisionRecord[]
  supervision: SupervisionRecord | null
  monthLabel: string
}) {
  if (isTechnicianRole(role)) {
    if (!supervision) return null
    const status = complianceStatus(supervision.supervisionPct)
    const below = isSupervisionBelowRequirement(supervision.supervisionPct)
    const statusLabel =
      status === "non-compliant"
        ? "Non-compliant"
        : status === "at-risk"
          ? "At risk"
          : "Compliant"

    return (
      <div
        className="mt-4 rounded-[12px] px-[18px] py-4"
        style={{ backgroundColor: P.inset }}
      >
        <p className="text-[14px]" style={{ color: P.soft }}>
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
      </div>
    )
  }

  if (!isLeadershipRole(role)) return null

  const flagged = caseloadRecords.filter((r) =>
    isSupervisionBelowRequirement(r.supervisionPct),
  )
  const total = caseloadRecords.length
  const periodSuffix = monthLabel ? ` · ${monthLabel}` : ""

  if (total === 0) return null

  return (
    <div
      className="mt-4 rounded-[12px] px-[18px] py-4"
      style={{ backgroundColor: P.inset }}
    >
      {flagged.length === 0 ? (
        <p className="text-[14px] font-medium" style={{ color: P.sageInk }}>
          All technicians meeting {SUPERVISION_THRESHOLD}% supervision
          {periodSuffix}
        </p>
      ) : (
        <>
          <p className="text-[14px]" style={{ color: P.soft }}>
            <span className="font-semibold tabular-nums" style={{ color: P.cancel }}>
              {flagged.length} of {total}
            </span>
            {" technician"}
            {total === 1 ? "" : "s"}
            {" below "}
            {SUPERVISION_THRESHOLD}% supervision
            {periodSuffix}
          </p>
          <ul className="mt-2 space-y-1">
            {flagged.map((row) => (
              <li key={row.staffId} className="text-[14px]" style={{ color: P.soft }}>
                {row.staffExternalCode ? (
                  <Link
                    to={staffProfilePath(row.staffExternalCode)}
                    className="font-medium hover:underline underline-offset-2"
                    style={{ color: P.cancel }}
                  >
                    {row.staffName}
                  </Link>
                ) : (
                  <span className="font-medium" style={{ color: P.cancel }}>
                    {row.staffName}
                  </span>
                )}
                {" — "}
                <span className="tabular-nums font-semibold" style={{ color: P.cancel }}>
                  {row.supervisionPct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function CareTeamCard({
  row,
  showTechnician,
  flaggedTechnicianIds,
}: {
  row: StaffClientTableRow
  showTechnician: boolean
  flaggedTechnicianIds: Set<string>
}) {
  const techFlagged =
    row.technician && flaggedTechnicianIds.has(row.technician.staffId)

  return (
    <article
      className="rounded-[14px] p-4"
      style={{ backgroundColor: P.inset }}
    >
      <Link
        to={clientProfilePath(row.clientCode)}
        className="text-[17px] font-bold hover:underline underline-offset-2"
        style={{ color: P.ink }}
      >
        {row.clientCode}
      </Link>

      <dl className="mt-3 space-y-2.5 text-[14px]">
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: P.soft }}>Supervisor</dt>
          <dd>
            {row.supervisor ? (
              <NameChip
                externalCode={row.supervisor.externalCode}
                name={row.supervisor.fullName}
              />
            ) : (
              <span style={{ color: P.faint }}>—</span>
            )}
          </dd>
        </div>
        {showTechnician && (
          <div className="flex items-center justify-between gap-3">
            <dt style={{ color: P.soft }}>Technician</dt>
            <dd className="flex items-center gap-1">
              {row.technician ? (
                <>
                  <NameChip
                    externalCode={row.technician.externalCode}
                    name={row.technician.fullName}
                  />
                  {techFlagged && (
                    <AlertCircle
                      className="size-3.5 shrink-0"
                      style={{ color: P.cancel }}
                      aria-label="Below 5% supervision"
                    />
                  )}
                </>
              ) : (
                <span style={{ color: P.faint }}>—</span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </article>
  )
}

export function StaffCareTeamsTile({
  role,
  clientTable,
  caseloadRecords,
  supervision,
  monthLabel,
}: StaffCareTeamsTileProps) {
  const flaggedTechnicianIds = new Set(
    caseloadRecords
      .filter((r) => isSupervisionBelowRequirement(r.supervisionPct))
      .map((r) => r.staffId),
  )

  const showTechnician = isLeadershipRole(role)

  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={TILE_TITLE} style={{ color: P.ink }}>
        Care teams
      </h2>

      <SupervisionWatchCallout
        role={role}
        caseloadRecords={caseloadRecords}
        supervision={supervision}
        monthLabel={monthLabel}
      />

      {clientTable.length === 0 ? (
        <div
          className="mt-4 rounded-[12px] py-8 text-center text-[14px]"
          style={{ backgroundColor: P.inset, color: P.soft }}
        >
          No clients assigned yet
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clientTable.map((row) => (
            <CareTeamCard
              key={row.clientId}
              row={row}
              showTechnician={showTechnician}
              flaggedTechnicianIds={flaggedTechnicianIds}
            />
          ))}
        </div>
      )}
    </section>
  )
}
