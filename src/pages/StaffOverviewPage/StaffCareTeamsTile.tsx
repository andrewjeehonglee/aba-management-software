import { AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"
import type { StaffClientTableRow } from "@/lib/clientAssignments"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import type { RosterStaffRole } from "@/lib/staffRole"
import { isLeadershipRole, isTechnicianRole } from "@/lib/staffRole"
import {
  SUPERVISION_THRESHOLD,
  isSupervisionBelowRequirement,
} from "@/lib/supervision"
import type { SupervisionRecord } from "@/lib/supabase"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

/** Body copy — matches Staff details / calendar value size */
const TILE_BODY = "text-[15px]"

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
      className={`inline-flex rounded-full px-2.5 py-0.5 ${TILE_BODY} font-medium hover:opacity-90`}
      style={{ backgroundColor: P.card, color: P.ink, boxShadow: `inset 0 0 0 1px ${P.rule}` }}
    >
      {name}
    </Link>
  )
}

function SupervisionCornerFlag({
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
    if (!supervision || !isSupervisionBelowRequirement(supervision.supervisionPct)) {
      return (
        <p className={`${TILE_BODY} text-right font-medium`} style={{ color: P.sageInk }}>
          Supervision ≥ {SUPERVISION_THRESHOLD}%
        </p>
      )
    }
    return (
      <div className={`${TILE_BODY} max-w-[220px] text-right`}>
        <p className="flex items-start justify-end gap-1 font-medium" style={{ color: P.cancel }}>
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          My supervision below {SUPERVISION_THRESHOLD}%
        </p>
        {monthLabel && (
          <p className="mt-0.5" style={{ color: P.soft }}>
            {monthLabel}
          </p>
        )}
        <p className="mt-0.5 tabular-nums font-semibold" style={{ color: P.cancel }}>
          {supervision.supervisionPct.toFixed(1)}%
        </p>
      </div>
    )
  }

  if (!isLeadershipRole(role)) return null

  const flagged = caseloadRecords.filter((r) =>
    isSupervisionBelowRequirement(r.supervisionPct),
  )

  if (flagged.length === 0) {
    return (
      <p className={`${TILE_BODY} text-right font-medium`} style={{ color: P.sageInk }}>
        All technicians ≥ {SUPERVISION_THRESHOLD}%
      </p>
    )
  }

  const n = flagged.length
  return (
    <div className={`${TILE_BODY} max-w-[240px] text-right`}>
      <p className="flex items-start justify-end gap-1 font-medium" style={{ color: P.cancel }}>
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {n} technician{n === 1 ? "" : "s"} below {SUPERVISION_THRESHOLD}% supervision
      </p>
      {monthLabel && (
        <p className="mt-0.5" style={{ color: P.soft }}>
          {monthLabel}
        </p>
      )}
      <ul className="mt-1 space-y-0.5">
        {flagged.map((row) => (
          <li key={row.staffId} className="tabular-nums" style={{ color: P.cancel }}>
            {row.staffExternalCode ? (
              <Link
                to={staffProfilePath(row.staffExternalCode)}
                className="font-medium hover:underline underline-offset-2"
                style={{ color: P.cancel }}
              >
                {row.staffName}
              </Link>
            ) : (
              <span className="font-medium">{row.staffName}</span>
            )}
            {" — "}
            <span className="font-semibold">{row.supervisionPct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CareTeamCard({
  row,
  flaggedTechnicianIds,
}: {
  row: StaffClientTableRow
  flaggedTechnicianIds: Set<string>
}) {
  const techFlagged = Boolean(
    row.technician && flaggedTechnicianIds.has(row.technician.staffId),
  )

  const roles: {
    label: string
    member: StaffClientTableRow["bcba"]
    warn?: boolean
  }[] = [
    { label: "BCBA", member: row.bcba },
    { label: "Clinical Supervisor", member: row.supervisor },
    {
      label: "Technician",
      member: row.technician,
      warn: techFlagged,
    },
  ]

  return (
    <article
      className="rounded-[14px] p-4"
      style={{ backgroundColor: P.inset }}
    >
      <Link
        to={clientProfilePath(row.clientCode)}
        className={`${TILE_TITLE} hover:underline underline-offset-2`}
        style={{ color: P.ink }}
      >
        {row.clientCode}
      </Link>

      <dl className={`mt-3 space-y-2.5 ${TILE_BODY}`}>
        {roles.map(({ label, member, warn }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt style={{ color: P.soft }}>{label}</dt>
            <dd className="flex items-center gap-1 text-right">
              {member ? (
                <>
                  <NameChip externalCode={member.externalCode} name={member.fullName} />
                  {warn && (
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
        ))}
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

  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className={`${TILE_TITLE} shrink-0`} style={{ color: P.ink }}>
          Care teams
        </h2>
        <SupervisionCornerFlag
          role={role}
          caseloadRecords={caseloadRecords}
          supervision={supervision}
          monthLabel={monthLabel}
        />
      </div>

      {clientTable.length === 0 ? (
        <div
          className={`mt-4 rounded-[12px] py-8 text-center ${TILE_BODY}`}
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
              flaggedTechnicianIds={flaggedTechnicianIds}
            />
          ))}
        </div>
      )}
    </section>
  )
}
