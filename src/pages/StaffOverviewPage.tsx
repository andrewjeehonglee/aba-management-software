import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import { HoursByStaffTile } from "@/components/HoursByStaffTile"
import { NotesOverdueTile } from "@/components/NotesOverdueTile"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatTime } from "@/lib/sessions"
import { unslug } from "@/lib/slug"
import { resolveStaffByRouteKey, staffProfilePath } from "@/lib/rosterScope"
import {
  getSessionsByStaffIdForMonth,
  getSupervisionByStaffId,
  getSupervisionForStaffIds,
  supabase,
  type SessionRecord,
  type StaffRecord,
  type SupervisionRecord,
} from "@/lib/supabase"
import {
  getBtClientAssignments,
  getCaseloadBtStaffIds,
  getStaffClientTableForBcba,
  getStaffClientTableForSupervisor,
  getStaffPeopleGroups,
  type BtClientAssignment,
  type RosterStaffLink,
  type StaffClientTableRow,
  type StaffPeopleGroups,
} from "@/lib/clientAssignments"
import { filterSupervisionRecordsForTile } from "@/lib/dashboardScope"
import { getCurrentCalendarMonthDateBounds } from "@/lib/payPeriod"
import { parseCertification } from "@/lib/staff"
import {
  downloadStaffSessionsCsv,
  getStaffSessionExportBundle,
} from "@/lib/staffSessionExport"
import { demoStaffEmail, demoStaffPhone } from "@/lib/staffContact"
import {
  isBcbaRole,
  isLeadershipRole,
  isTechnicianRole,
  resolveRosterStaffRole,
  staffRoleHeaderLabel,
  staffRoleTitle,
  type RosterStaffRole,
} from "@/lib/staffRole"
import {
  SUPERVISION_THRESHOLD,
  actualSupervisionHours,
  complianceClasses,
  complianceStatus,
  requiredHours,
  type ComplianceStatus,
} from "@/lib/supervision"
import type { SessionStatus } from "@/types/session"

const COMPLIANCE_CONFIG: Record<
  ComplianceStatus,
  { label: string; className: string }
> = {
  compliant:       { label: "Compliant",     className: "bg-emerald-100 text-emerald-800" },
  "at-risk":       { label: "At risk",       className: "bg-amber-100 text-amber-800" },
  "non-compliant": { label: "Non-compliant", className: "bg-red-100 text-red-800" },
}

function StaffBreadcrumb({ name }: { name: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex w-full max-w-3xl flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      <Link to="/" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      <span aria-hidden="true">·</span>
      <Link to="/roster" className="hover:text-foreground transition-colors">
        Roster
      </Link>
      <span aria-hidden="true">·</span>
      <span className="text-foreground font-medium">{name}</span>
    </nav>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const { label, className } = COMPLIANCE_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatCertInline(cert: string): string {
  const parsed = parseCertification(cert)
  if (!parsed) return cert
  const formattedExpiry = parsed.expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  return `${parsed.type} — expires ${formattedExpiry}`
}

function sessionClientLabel(session: SessionRecord): string {
  return session.clientCode ?? session.clientName
}

function StaffLink({ link }: { link: RosterStaffLink }) {
  return (
    <Link
      to={staffProfilePath(link.externalCode)}
      className="font-medium hover:underline underline-offset-2"
    >
      {link.fullName}
    </Link>
  )
}

async function enrichSupervisionForStaffIds(
  staffIds: string[],
  records: SupervisionRecord[],
): Promise<SupervisionRecord[]> {
  const present = new Set(records.map((r) => r.staffId))
  const missingIds = staffIds.filter((id) => !present.has(id))
  if (missingIds.length === 0) return records

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, full_name, external_code, team")
    .in("id", missingIds)
    .eq("status", "active")

  const placeholders: SupervisionRecord[] = []
  for (const s of (staffRows ?? []) as {
    id: string
    full_name: string
    external_code: string | null
    team: string | null
  }[]) {
    placeholders.push({
      id: `placeholder-${s.id}`,
      staffId: s.id,
      staffName: s.full_name,
      staffExternalCode: s.external_code,
      staffTeam: s.team?.startsWith("Team") ? s.team : s.team ? `Team ${s.team}` : "",
      supervisionPct: 0,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    })
  }
  return [...records, ...placeholders]
}

export function StaffOverviewPage({ practiceId }: { practiceId: string }) {
  const { staffId } = useParams<{ staffId: string }>()

  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [resolvedRole, setResolvedRole] = useState<RosterStaffRole | null>(null)
  const [supervision, setSupervision] = useState<SupervisionRecord | null>(null)
  const [caseloadSupervision, setCaseloadSupervision] = useState<SupervisionRecord[]>([])
  const [supervisionMonthLabel, setSupervisionMonthLabel] = useState("")
  const [monthSessions, setMonthSessions] = useState<SessionRecord[]>([])
  const [monthLabel, setMonthLabel] = useState("")
  const [btClients, setBtClients] = useState<BtClientAssignment[]>([])
  const [peopleGroups, setPeopleGroups] = useState<StaffPeopleGroups | null>(null)
  const [clientTable, setClientTable] = useState<StaffClientTableRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!staffId) { setDataLoading(false); return }
    let cancelled = false
    setDataLoading(true)
    setDataError(false)

    resolveStaffByRouteKey(practiceId, staffId)
      .then(async (entry) => {
        if (cancelled) return
        if (!entry) {
          setStaff(null)
          setDataLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("staff")
          .select("id, full_name, external_code, role, team, hire_date, certification, direct_hours, indirect_hours, cancellation_hours")
          .eq("id", entry.id)
          .eq("practice_id", practiceId)
          .maybeSingle()

        if (cancelled) return
        if (error || !data) {
          setStaff(null)
          setDataLoading(false)
          return
        }

        const row = data as {
          id: string
          full_name: string
          external_code: string
          role: string
          team: string
          hire_date: string
          certification: string
          direct_hours: number
          indirect_hours: number
          cancellation_hours: number
        }

        const role = resolveRosterStaffRole(row.external_code, row.role)
        const rawTeam = row.team ?? ""
        const staffRecord: StaffRecord = {
          id: row.id,
          name: row.full_name,
          externalCode: row.external_code,
          role: row.role,
          team: rawTeam.startsWith("Team") ? rawTeam : rawTeam ? `Team ${rawTeam}` : "—",
          hireDate: row.hire_date,
          certification: row.certification,
          directHours: row.direct_hours,
          indirectHours: row.indirect_hours,
          cancellationHours: row.cancellation_hours,
          totalHours: row.direct_hours + row.indirect_hours + row.cancellation_hours,
        }

        setStaff(staffRecord)
        setResolvedRole(role)

        const monthResult = await getSessionsByStaffIdForMonth(entry.id)
        if (cancelled) return
        setMonthLabel(monthResult.label)
        setMonthSessions(monthResult.sessions)

        if (isTechnicianRole(role)) {
          const [supervisionRow, assignments] = await Promise.all([
            getSupervisionByStaffId(entry.id),
            getBtClientAssignments(entry.id),
          ])
          if (cancelled) return
          setSupervision(supervisionRow)
          setBtClients(assignments)
          setCaseloadSupervision([])
          setPeopleGroups(null)
          setClientTable([])
        } else if (isLeadershipRole(role)) {
          const viewerRole = isBcbaRole(role) ? "bcba" : "supervisor"
          const [btIds, people, table] = await Promise.all([
            getCaseloadBtStaffIds(entry.id, viewerRole),
            getStaffPeopleGroups(entry.id, viewerRole),
            isBcbaRole(role)
              ? getStaffClientTableForBcba(entry.id)
              : getStaffClientTableForSupervisor(entry.id),
          ])
          const rawSupervision = btIds.length
            ? await getSupervisionForStaffIds(btIds)
            : []
          const enriched = await enrichSupervisionForStaffIds(btIds, rawSupervision)
          const { records, displayMonthLabel } = filterSupervisionRecordsForTile(enriched)
          if (cancelled) return
          setSupervision(null)
          setBtClients([])
          setPeopleGroups(people)
          setClientTable(table)
          setCaseloadSupervision(
            [...records].sort(
              (a, b) =>
                a.supervisionPct - b.supervisionPct ||
                a.staffName.localeCompare(b.staffName),
            ),
          )
          setSupervisionMonthLabel(displayMonthLabel)
        }
      })
      .catch(() => { if (!cancelled) setDataError(true) })
      .finally(() => { if (!cancelled) setDataLoading(false) })

    return () => { cancelled = true }
  }, [staffId, practiceId])

  const displayName =
    staff?.name
    ?? monthSessions[0]?.staffName
    ?? (staffId ? unslug(staffId) : "Unknown staff")

  const subtitle =
    resolvedRole && monthLabel
      ? `${staffRoleHeaderLabel(resolvedRole)} · ${monthLabel}`
      : resolvedRole
        ? staffRoleHeaderLabel(resolvedRole)
        : null

  const monthClientCount = new Set(monthSessions.map((s) => s.clientId)).size

  const recentSessions = useMemo(
    () =>
      [...monthSessions]
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, 5),
    [monthSessions],
  )

  async function handleExportSessions() {
    if (!staff) return
    setExporting(true)
    try {
      const { start, end } = getCurrentCalendarMonthDateBounds()
      const items = await getStaffSessionExportBundle(staff.id, start, end)
      downloadStaffSessionsCsv(
        staff.externalCode ?? staff.id,
        staff.name,
        start.slice(0, 7),
        start,
        end,
        items,
      )
    } finally {
      setExporting(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading staff…
      </div>
    )
  }

  if (dataError || !staff || !resolvedRole) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center text-muted-foreground text-sm">
        Staff member not found.
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl flex-col gap-4 py-6">
        <StaffBreadcrumb name={displayName} />
      </header>

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {displayName}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Chip>
              {monthSessions.length} session{monthSessions.length === 1 ? "" : "s"} this month
            </Chip>
            <Chip>
              {monthClientCount} client{monthClientCount === 1 ? "" : "s"} served
            </Chip>
          </div>
          <StaffDetailGrid staff={staff} role={resolvedRole} />
        </CardContent>
      </Card>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <HoursByStaffTile staffIds={[staff.id]} />
        <NotesOverdueTile staffIds={[staff.id]} selfMode />
      </div>

      {isTechnicianRole(resolvedRole) && (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Supervision compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {supervision ? (
              <SupervisionDetail
                supervision={supervision}
                staff={staff}
                monthLabel={monthLabel}
              />
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No supervision data available for this staff member.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLeadershipRole(resolvedRole) && (
        <StaffSupervisionTable
          records={caseloadSupervision}
          monthLabel={supervisionMonthLabel || monthLabel}
        />
      )}

      {isTechnicianRole(resolvedRole) && (
        <BtClientsSection clients={btClients} />
      )}

      {isLeadershipRole(resolvedRole) && peopleGroups && (
        <StaffPeopleSection role={resolvedRole} groups={peopleGroups} />
      )}

      {isLeadershipRole(resolvedRole) && (
        <StaffClientTableSection rows={clientTable} />
      )}

      <SessionsSection
        monthLabel={monthLabel}
        sessions={recentSessions}
        exporting={exporting}
        onExport={handleExportSessions}
      />
    </div>
  )
}

function StaffDetailGrid({
  staff,
  role,
}: {
  staff: StaffRecord
  role: RosterStaffRole
}) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
      <dt className="text-muted-foreground">Role title</dt>
      <dd>{staffRoleTitle(role)}</dd>

      <dt className="text-muted-foreground">Hire date</dt>
      <dd>{formatDate(staff.hireDate)}</dd>

      <dt className="text-muted-foreground">Certification</dt>
      <dd>{staff.certification ? formatCertInline(staff.certification) : "—"}</dd>

      <dt className="text-muted-foreground">Phone</dt>
      <dd>{demoStaffPhone(staff.externalCode)}</dd>

      <dt className="text-muted-foreground">Email</dt>
      <dd>{demoStaffEmail(staff.externalCode)}</dd>
    </dl>
  )
}

function SupervisionDetail({
  supervision,
  staff,
  monthLabel,
}: {
  supervision: SupervisionRecord
  staff: StaffRecord
  monthLabel: string
}) {
  const { bar, text } = complianceClasses(supervision.supervisionPct)
  const status = complianceStatus(supervision.supervisionPct)
  const actual = actualSupervisionHours(supervision.supervisionPct, staff.totalHours)
  const required = requiredHours(staff.totalHours)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-3xl font-semibold tabular-nums ${text}`}>
          {supervision.supervisionPct.toFixed(1)}%
        </span>
        <ComplianceBadge status={status} />
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full ${bar}`}
          style={{ width: `${Math.min(supervision.supervisionPct, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-slate-500/70"
          style={{ left: `${SUPERVISION_THRESHOLD}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="text-sm">
        <span className="font-medium tabular-nums">{actual}</span>
        <span className="text-muted-foreground"> of </span>
        <span className="font-medium tabular-nums">{required}</span>
        <span className="text-muted-foreground"> required supervision hours in {monthLabel}</span>
      </p>
    </div>
  )
}

function StaffSupervisionTable({
  records,
  monthLabel,
}: {
  records: SupervisionRecord[]
  monthLabel: string
}) {
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Staff supervision compliance</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No BTs on shared caseload yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Staff</th>
                  <th className="pb-2 font-medium">Compliance ({monthLabel.split(" ")[0]})</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => {
                  const status = complianceStatus(row.supervisionPct)
                  return (
                    <tr key={row.staffId} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-4">
                        {row.staffExternalCode ? (
                          <Link
                            to={staffProfilePath(row.staffExternalCode)}
                            className="font-medium hover:underline underline-offset-2"
                          >
                            {row.staffName}
                          </Link>
                        ) : (
                          row.staffName
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <span className="tabular-nums font-medium">
                            {row.supervisionPct.toFixed(1)}%
                          </span>
                          <ComplianceBadge status={status} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BtClientsSection({ clients }: { clients: BtClientAssignment[] }) {
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Clients this person is working with</CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Not assigned to any clients yet
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {clients.map((client) => (
              <Link
                key={client.clientId}
                to={`/clients/${client.clientCode}`}
                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                {client.clientCode}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StaffPeopleSection({
  role,
  groups,
}: {
  role: RosterStaffRole
  groups: StaffPeopleGroups
}) {
  const sections = isBcbaRole(role)
    ? [
        { title: "Clinical supervisors", links: groups.supervisors },
        { title: "Technicians", links: groups.technicians },
      ]
    : [
        { title: "BCBAs", links: groups.bcbas },
        { title: "Technicians", links: groups.technicians },
      ]

  const hasAny = sections.some((s) => s.links.length > 0)

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>People this person works with</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No colleagues on shared caseload yet
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(({ title, links }) =>
              links.length === 0 ? null : (
                <div key={title}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {links.map((link) => (
                      <li key={link.staffId}>
                        <StaffLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StaffClientTableSection({ rows }: { rows: StaffClientTableRow[] }) {
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Clients</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Not assigned to any client caseload yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Client</th>
                  <th className="pb-2 pr-4 font-medium">Technician</th>
                  <th className="pb-2 font-medium">Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.clientId} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <Link
                        to={`/clients/${row.clientCode}`}
                        className="font-medium hover:underline underline-offset-2"
                      >
                        {row.clientCode}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {row.technician ? <StaffLink link={row.technician} /> : "—"}
                    </td>
                    <td className="py-2.5">
                      {row.supervisor ? <StaffLink link={row.supervisor} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SessionsSection({
  monthLabel,
  sessions,
  exporting,
  onExport,
}: {
  monthLabel: string
  sessions: SessionRecord[]
  exporting: boolean
  onExport: () => void
}) {
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle>Sessions — {monthLabel}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export all sessions"}
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <p>No sessions logged this month.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem] items-center gap-x-3 gap-y-1 text-xs">
            <div className="text-muted-foreground pb-2 border-b">Time</div>
            <div className="text-muted-foreground pb-2 border-b">Client</div>
            <div className="text-muted-foreground pb-2 border-b">Type</div>
            <div className="text-muted-foreground pb-2 border-b text-right">Status</div>

            {sessions.map((s) => (
              <div key={s.id} className="contents">
                <div className="font-mono text-muted-foreground tabular-nums py-1.5">
                  {formatTime(s.time)}
                </div>
                <div className="truncate min-w-0 py-1.5 text-sm">
                  <Link
                    to={s.clientCode ? `/clients/${s.clientCode}` : `/clients/${s.clientId}`}
                    className="hover:underline underline-offset-2"
                  >
                    {sessionClientLabel(s)}
                  </Link>
                </div>
                <div className="truncate min-w-0 py-1.5 text-muted-foreground">
                  {s.sessionType}
                </div>
                <div className="flex items-center justify-end py-1.5">
                  <SessionStatusBadge status={s.status as SessionStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
