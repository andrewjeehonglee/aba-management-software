import { Link } from "react-router-dom"
import type {
  BtClientAssignment,
  RosterStaffLink,
  StaffClientTableRow,
  SuperviseeClientsRow,
} from "@/lib/clientAssignments"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"
import type { RosterStaffRole } from "@/lib/staffRole"
import { isSupervisorRole, isTechnicianRole } from "@/lib/staffRole"
import { P, TILE_LIST_MAX_H, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffPeoplePanelProps {
  role: RosterStaffRole
  clientTable: StaffClientTableRow[]
  supervisees: SuperviseeClientsRow[]
  loading?: boolean
}

export function StaffPeoplePanel({
  role,
  clientTable,
  supervisees,
  loading,
}: StaffPeoplePanelProps) {
  const title = isTechnicianRole(role)
    ? "My clients"
    : isSupervisorRole(role)
      ? "Technicians I supervise"
      : "My caseload"

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
        ) : isSupervisorRole(role) ? (
          <SuperviseesList rows={supervisees} />
        ) : isTechnicianRole(role) ? (
          <ClientTable
            rows={clientTable}
            columns={["client", "bcba", "supervisor"]}
          />
        ) : (
          <ClientTable
            rows={clientTable}
            columns={["client", "technician", "supervisor"]}
          />
        )}
      </div>
    </section>
  )
}

function StaffLink({ link }: { link: RosterStaffLink }) {
  return (
    <Link
      to={staffProfilePath(link.externalCode)}
      className="font-medium hover:underline underline-offset-2"
      style={{ color: P.ink }}
    >
      {link.fullName}
    </Link>
  )
}

function ClientTable({
  rows,
  columns,
}: {
  rows: StaffClientTableRow[]
  columns: ("client" | "technician" | "supervisor" | "bcba")[]
}) {
  if (rows.length === 0) {
    return (
      <div
        className="rounded-[12px] py-8 text-center text-[14px]"
        style={{ backgroundColor: P.inset, color: P.soft }}
      >
        No clients assigned yet
      </div>
    )
  }

  const headers: Record<string, string> = {
    client: "Client",
    technician: "Technician",
    supervisor: "Supervisor",
    bcba: "BCBA",
  }

  return (
    <table className="w-full text-[14px]">
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
        {rows.map((row) => (
          <tr
            key={row.clientId}
            style={{ borderTop: `1px solid ${P.rule}` }}
          >
            {columns.map((col) => (
              <td
                key={col}
                className={`py-2.5 ${col !== columns[columns.length - 1] ? "pr-4" : ""}`}
                style={{ color: col === "client" ? undefined : P.soft }}
              >
                {col === "client" && (
                  <Link
                    to={clientProfilePath(row.clientCode)}
                    className="font-medium hover:underline underline-offset-2"
                    style={{ color: P.ink }}
                  >
                    {row.clientCode}
                  </Link>
                )}
                {col === "technician" && (row.technician ? <StaffLink link={row.technician} /> : "—")}
                {col === "bcba" && (row.bcba ? <StaffLink link={row.bcba} /> : "—")}
                {col === "supervisor" && (row.supervisor ? <StaffLink link={row.supervisor} /> : "—")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SuperviseesList({ rows }: { rows: SuperviseeClientsRow[] }) {
  if (rows.length === 0) {
    return (
      <div
        className="rounded-[12px] py-8 text-center text-[14px]"
        style={{ backgroundColor: P.inset, color: P.soft }}
      >
        No supervisees on caseload yet
      </div>
    )
  }

  return (
    <ul className="space-y-0">
      {rows.map((row, index) => (
        <li
          key={row.technician.staffId}
          className="py-3 first:pt-0"
          style={{
            borderTop: index > 0 ? `1px solid ${P.rule}` : undefined,
          }}
        >
          <StaffLink link={row.technician} />
          {row.clients.length > 0 ? (
            <p className="mt-1.5 text-[13px]" style={{ color: P.soft }}>
              {row.clients.map((c: BtClientAssignment, i: number) => (
                <span key={c.clientId}>
                  {i > 0 && ", "}
                  <Link
                    to={clientProfilePath(c.clientCode)}
                    className="hover:underline underline-offset-2"
                    style={{ color: P.ink }}
                  >
                    {c.clientCode}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1 text-[13px]" style={{ color: P.faint }}>
              No clients assigned
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
