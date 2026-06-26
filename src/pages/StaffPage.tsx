import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { AppPageHeader } from "@/components/dashboard/AppPageHeader"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import { getRosterRows } from "@/lib/rosterTable"
import {
  getRosterStaffManifest,
  staffProfilePath,
  type RosterStaffEntry,
} from "@/lib/rosterScope"

const ROLE_GROUPS: { label: string; role: RosterStaffEntry["role"] }[] = [
  { label: "BCBAs", role: "bcba" },
  { label: "Clinical supervisors", role: "supervisor" },
  { label: "Technicians", role: "technician" },
]

function clientCountLabel(role: RosterStaffEntry["role"], count: number): string | null {
  if (count <= 0) return null
  const noun = count === 1 ? "client" : "clients"
  if (role === "bcba") return `Leads ${count} ${noun}`
  if (role === "supervisor") return `Supervises ${count} ${noun}`
  return `Assigned to ${count} ${noun}`
}

function StaffMemberCard({
  member,
  clientCount,
}: {
  member: RosterStaffEntry
  clientCount: number
}) {
  const subtitle = clientCountLabel(member.role, clientCount)

  return (
    <Link
      to={staffProfilePath(member.externalCode)}
      className="group flex flex-col rounded-[16px] border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-brand/30 hover:bg-surface-2"
    >
      <p className="text-[17px] font-semibold text-ink group-hover:text-brand">{member.fullName}</p>
      {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
    </Link>
  )
}

export function StaffPage({
  practiceId,
  userRole,
}: {
  practiceId: string
  userRole?: string
}) {
  const { ownerName, practiceName } = useOwnerShell(practiceId, userRole)
  const [staff, setStaff] = useState<RosterStaffEntry[]>([])
  const [clientCounts, setClientCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    Promise.all([getRosterStaffManifest(practiceId), getRosterRows(practiceId)])
      .then(([manifest, rows]) => {
        if (cancelled) return
        setStaff(manifest)
        const counts = new Map<string, number>()
        for (const row of rows) {
          if (row.bcbaId) counts.set(row.bcbaId, (counts.get(row.bcbaId) ?? 0) + 1)
          if (row.supervisorId) {
            counts.set(row.supervisorId, (counts.get(row.supervisorId) ?? 0) + 1)
          }
          if (row.btId) counts.set(row.btId, (counts.get(row.btId) ?? 0) + 1)
        }
        setClientCounts(counts)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [practiceId])

  const roleCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const member of staff) {
      map[member.role] = (map[member.role] ?? 0) + 1
    }
    return map
  }, [staff])

  const hasStaff = staff.length > 0

  return (
    <OwnerAppShell
      ownerName={ownerName}
      practiceName={practiceName}
      maxWidthClass="max-w-[1600px]"
    >
      <AppPageHeader
        title="Staff"
        subtitle={
          hasStaff
            ? `${roleCounts.bcba ?? 0} BCBAs · ${roleCounts.supervisor ?? 0} clinical supervisors · ${roleCounts.technician ?? 0} technicians`
            : "Your practice team"
        }
      />

      <div className="owner-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && (
            <p className="py-16 text-center text-[15px] text-muted animate-pulse">Loading staff…</p>
          )}

          {error && (
            <div className="rounded-[var(--radius)] bg-surface p-8 text-center shadow-card">
              <p className="text-[15px] text-alert">Could not load staff. Please refresh and try again.</p>
            </div>
          )}

          {!loading && !error && !hasStaff && (
            <div className="rounded-[var(--radius)] bg-surface p-8 shadow-card">
              <h2 className="text-[17px] font-semibold text-ink">No staff imported yet</h2>
              <p className="mt-2 text-[15px] text-muted">
                Import your roster from{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
                  templates/roster_import.csv
                </code>
                .
              </p>
            </div>
          )}

          {!loading && !error && hasStaff && (
            <div className="space-y-12">
              {ROLE_GROUPS.map(({ label, role }) => {
                const members = staff
                  .filter((s) => s.role === role)
                  .sort((a, b) => a.fullName.localeCompare(b.fullName))

                if (members.length === 0) return null

                return (
                  <section key={role} className="pt-2 first:pt-0">
                    <h2 className="mb-5 text-[18px] font-semibold text-ink">{label}</h2>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {members.map((member) => (
                        <li key={member.id}>
                          <StaffMemberCard
                            member={member}
                            clientCount={clientCounts.get(member.id) ?? 0}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>
    </OwnerAppShell>
  )
}
