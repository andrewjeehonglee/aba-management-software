import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import { StaffMonthMetrics } from "@/components/staff/StaffMonthMetrics"
import { StaffSupervisionPanel } from "@/components/staff/StaffSupervisionPanel"
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
  type BtClientAssignment,
  type RosterStaffLink,
  type StaffClientTableRow,
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
  type RosterStaffRole,
} from "@/lib/staffRole"
import type { SessionStatus } from "@/types/session"

const PAGE_SHELL = "w-full max-w-[min(100%,1680px)] px-4 sm:px-6"

function StaffBreadcrumb({ name }: { name: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      <Link to="/" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      <span aria-hidden="true">·</span>
      <Link to="/staff" className="hover:text-foreground transition-colors">
        Staff
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

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatCertExpiryShort(cert: string): string | null {
  const parsed = parseCertification(cert)
  if (!parsed) return null
  const formattedExpiry = parsed.expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  return `Cert expires ${formattedExpiry}`
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
          setClientTable([])
        } else if (isLeadershipRole(role)) {
          const viewerRole = isBcbaRole(role) ? "bcba" : "supervisor"
          const [btIds, table] = await Promise.all([
            getCaseloadBtStaffIds(entry.id, viewerRole),
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

  const identityMeta = useMemo(() => {
    if (!staff) return ""
    const parsed = staff.certification ? parseCertification(staff.certification) : null
    const parts = [
      parsed?.type ?? null,
      `Hired ${formatDate(staff.hireDate)}`,
      staff.certification ? formatCertExpiryShort(staff.certification) : null,
      demoStaffPhone(staff.externalCode),
      demoStaffEmail(staff.externalCode),
    ].filter(Boolean)
    return parts.join(" · ")
  }, [staff])

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

  const supervisionPanelMonth = supervisionMonthLabel || monthLabel

  return (
    <div className="min-h-svh bg-bg text-foreground">
      <div className={`${PAGE_SHELL} py-4`}>
        <StaffBreadcrumb name={displayName} />
      </div>

      <section className="border-b bg-slate-50/80">
        <div className={`${PAGE_SHELL} py-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {displayName}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              {identityMeta && (
                <p className="text-sm text-muted-foreground">{identityMeta}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Chip>
                {monthSessions.length} session{monthSessions.length === 1 ? "" : "s"} this month
              </Chip>
              <Chip>
                {monthClientCount} client{monthClientCount === 1 ? "" : "s"} served
              </Chip>
            </div>
          </div>
        </div>
      </section>

      <div className={`${PAGE_SHELL} space-y-4 py-4`}>
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <StaffMonthMetrics staffId={staff.id} />
          <StaffSupervisionPanel
            mode={isTechnicianRole(resolvedRole) ? "technician" : "leadership"}
            monthLabel={supervisionPanelMonth}
            supervision={supervision}
            staff={staff}
            caseloadRecords={caseloadSupervision}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[11fr_9fr]">
          <StaffClientsPanel
            role={resolvedRole}
            btClients={btClients}
            clientTable={clientTable}
          />
          <StaffRecentSessions
            monthLabel={monthLabel}
            sessions={recentSessions}
            exporting={exporting}
            onExport={handleExportSessions}
          />
        </div>
      </div>
    </div>
  )
}

function StaffClientsPanel({
  role,
  btClients,
  clientTable,
}: {
  role: RosterStaffRole
  btClients: BtClientAssignment[]
  clientTable: StaffClientTableRow[]
}) {
  const isBt = isTechnicianRole(role)

  return (
    <Card size="sm" className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {isBt ? "Clients this person is working with" : "Clients"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isBt ? (
          btClients.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Not assigned to any clients yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {btClients.map((client) => (
                <Link
                  key={client.clientId}
                  to={`/clients/${client.clientCode}`}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                >
                  {client.clientCode}
                </Link>
              ))}
            </div>
          )
        ) : clientTable.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
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
                {clientTable.map((row) => (
                  <tr key={row.clientId} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-4">
                      <Link
                        to={`/clients/${row.clientCode}`}
                        className="font-medium hover:underline underline-offset-2"
                      >
                        {row.clientCode}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-4">
                      {row.technician ? <StaffLink link={row.technician} /> : "—"}
                    </td>
                    <td className="py-1.5">
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

function StaffRecentSessions({
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
    <Card size="sm" className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-base">Recent sessions · {monthLabel}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2.5 text-xs"
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export all"}
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No sessions logged this month.
          </div>
        ) : (
          <div className="grid grid-cols-[3rem_minmax(0,1fr)_5.5rem_5rem] items-center gap-x-2 gap-y-0 text-xs">
            <div className="text-muted-foreground pb-1.5 border-b">Time</div>
            <div className="text-muted-foreground pb-1.5 border-b">Client</div>
            <div className="text-muted-foreground pb-1.5 border-b">Type</div>
            <div className="text-muted-foreground pb-1.5 border-b text-right">Status</div>

            {sessions.map((s) => (
              <div key={s.id} className="contents">
                <div className="font-mono text-muted-foreground tabular-nums py-1">
                  {formatTime(s.time)}
                </div>
                <div className="truncate min-w-0 py-1">
                  <Link
                    to={s.clientCode ? `/clients/${s.clientCode}` : `/clients/${s.clientId}`}
                    className="hover:underline underline-offset-2"
                  >
                    {sessionClientLabel(s)}
                  </Link>
                </div>
                <div className="truncate min-w-0 py-1 text-muted-foreground">
                  {s.sessionType}
                </div>
                <div className="flex items-center justify-end py-1">
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
