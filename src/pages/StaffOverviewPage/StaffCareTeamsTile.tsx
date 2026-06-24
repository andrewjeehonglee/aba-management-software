import { AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"
import type { StaffClientTableRow } from "@/lib/clientAssignments"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import type { RosterStaffRole } from "@/lib/staffRole"
import {
  SUPERVISION_THRESHOLD,
  isSupervisionBelowRequirement,
} from "@/lib/supervision"
import type { SupervisionRecord } from "@/lib/supabase"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

/** Body copy — matches Staff details / calendar value size */
const TILE_BODY = "text-[15px]"

const ROLE_ROW_LABEL: Record<RosterStaffRole, string> = {
  bcba: "BCBA",
  supervisor: "Clinical Supervisor",
  technician: "Technician",
}

interface StaffCareTeamsTileProps {
  role: RosterStaffRole
  clientTable: StaffClientTableRow[]
  caseloadRecords: SupervisionRecord[]
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

function CareTeamCard({
  row,
  pageRole,
  flaggedTechnicianIds,
}: {
  row: StaffClientTableRow
  pageRole: RosterStaffRole
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
  ].filter((entry) => entry.label !== ROLE_ROW_LABEL[pageRole])

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
}: StaffCareTeamsTileProps) {
  const flaggedTechnicianIds = new Set(
    caseloadRecords
      .filter((r) => isSupervisionBelowRequirement(r.supervisionPct))
      .map((r) => r.staffId),
  )

  const showTechnicianRow = role !== "technician"
  const hasFlaggedMarker =
    showTechnicianRow &&
    clientTable.some(
      (row) =>
        row.technician && flaggedTechnicianIds.has(row.technician.staffId),
    )

  return (
    <section
      className="p-5"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <h2 className={TILE_TITLE} style={{ color: P.ink }}>
        Care teams
      </h2>

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
              pageRole={role}
              flaggedTechnicianIds={flaggedTechnicianIds}
            />
          ))}
        </div>
      )}

      {hasFlaggedMarker && (
        <div
          className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-[14px]"
          style={{ borderColor: P.rule, color: P.soft }}
        >
          <span className="inline-flex items-center gap-2">
            <AlertCircle
              className="size-3.5 shrink-0"
              style={{ color: P.cancel }}
              aria-hidden="true"
            />
            Technician below {SUPERVISION_THRESHOLD}% supervision.
          </span>
        </div>
      )}
    </section>
  )
}
