import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatTime } from "@/lib/sessions"
import { toSlug, unslug } from "@/lib/slug"
import {
  getSessionsByStaffIdForMonth,
  getStaff,
  getSupervisionByStaffId,
  type SessionRecord,
  type StaffRecord,
  type SupervisionRecord,
} from "@/lib/supabase"
import { getAssignmentsForStaff, type ClientAssignmentRole } from "@/lib/clientAssignments"
import { getClientCaseloadLabels, type ClientCaseloadLabel } from "@/lib/rosterTable"
import {
  CERT_URGENT_DAYS,
  CERT_WARNING_DAYS,
  daysUntil,
  parseCertification,
} from "@/lib/staff"
import {
  SUPERVISION_THRESHOLD,
  actualSupervisionHours,
  complianceClasses,
  complianceStatus,
  requiredHours,
  type ComplianceStatus,
} from "@/lib/supervision"
import type { SessionStatus } from "@/types/session"
import type { Staff } from "@/types/staff"

// Compliance status display config — color + label per status. Mirrors the
// shape of STATUS_CONFIG in src/lib/sessions.ts but for the supervision
// domain. Inlined here (rule of three: only one caller for now).
const COMPLIANCE_CONFIG: Record<
  ComplianceStatus,
  { label: string; className: string }
> = {
  compliant:       { label: "Compliant",     className: "bg-emerald-100 text-emerald-800" },
  "at-risk":       { label: "At risk",       className: "bg-amber-100 text-amber-800" },
  "non-compliant": { label: "Non-compliant", className: "bg-red-100 text-red-800" },
}

// Formal role title for the detail grid. The single-word enum value is fine
// in chips and short labels, but the formal "this is who they are on paper"
// reads better with the full credential name.
const ROLE_TITLE: Record<Staff["role"], string> = {
  BCBA:       "Board Certified Behavior Analyst (BCBA)",
  Supervisor: "Clinical Supervisor",
  Technician: "Behavior Technician (RBT)",
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

// Pretty-print an ISO date "2023-08-15" as "Aug 15, 2023". The "T00:00:00"
// suffix forces local-midnight interpretation; without it, JS treats a bare
// "YYYY-MM-DD" as UTC-midnight and can shift the displayed day by one in
// negative-UTC-offset locales.
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function sessionClientLabel(session: SessionRecord): string {
  return session.clientCode ?? session.clientName
}

// Derive the role this staff member is *acting* in this week from session
// types. Same priority logic as ClientOverviewPage: any BCBA-level session
// (Supervision, Assessment, or Parent training) outranks Direct therapy. A
// Technician who ran one Assessment under supervision will show as BCBA
// here while their formal role on the detail grid stays Technician — the
// mismatch surfaces a real-life moment ("did you see Tyler is doing his
// first BCBA assessment this week?") rather than hiding it.
function deriveStaffRoleFromSessions(
  staffName: string,
  sessions: SessionRecord[]
): "Supervisor / BCBA" | "Technician" | null {
  const theirSessions = sessions.filter((s) => s.staffName === staffName)
  if (theirSessions.length === 0) return null

  const hasBcbaSession = theirSessions.some(
    (s) =>
      s.sessionType === "Supervision" ||
      s.sessionType === "Assessment" ||
      s.sessionType === "Parent training"
  )
  return hasBcbaSession ? "Supervisor / BCBA" : "Technician"
}

export function StaffOverviewPage() {
  const { staffId } = useParams<{ staffId: string }>()

  // ── Live data ──────────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [supervision, setSupervision] = useState<SupervisionRecord | null>(null)
  const [monthSessions, setMonthSessions] = useState<SessionRecord[]>([])
  const [monthLabel, setMonthLabel] = useState("")
  const [assignmentCaseloadTotal, setAssignmentCaseloadTotal] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(false)

  useEffect(() => {
    if (!staffId) { setDataLoading(false); return }
    let cancelled = false
    setDataLoading(true)
    setDataError(false)

    getStaff()
      .then(async (allStaff) => {
        if (cancelled) return
        const match = allStaff.find((s) => toSlug(s.name) === staffId)
        if (!match) { if (!cancelled) setDataLoading(false); return }
        setStaff(match)

        const [supervisionRow, monthResult] = await Promise.all([
          getSupervisionByStaffId(match.id),
          getSessionsByStaffIdForMonth(match.id),
        ])
        if (cancelled) return
        setSupervision(supervisionRow)
        setMonthLabel(monthResult.label)
        setMonthSessions(monthResult.sessions)
      })
      .catch(() => { if (!cancelled) setDataError(true) })
      .finally(() => { if (!cancelled) setDataLoading(false) })

    return () => { cancelled = true }
  }, [staffId])

  const displayName =
    staff?.name
    ?? monthSessions[0]?.staffName
    ?? (staffId ? unslug(staffId) : "Unknown staff")

  const derivedRole = deriveStaffRoleFromSessions(displayName, monthSessions)

  const subtitle = derivedRole
    ? `${derivedRole} · this month`
    : staff?.role ?? null

  const sortedMonthSessions = [...monthSessions].sort((a, b) =>
    a.time.localeCompare(b.time),
  )

  const monthClientCount = new Set(monthSessions.map((s) => s.clientId)).size

  const hasNoActivity = monthSessions.length === 0 && !supervision
  const hasAssignments = assignmentCaseloadTotal > 0
  const showCollapsedEmpty = hasNoActivity && !hasAssignments

  if (dataLoading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading staff…
      </div>
    )
  }

  if (dataError || !staff) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center text-muted-foreground text-sm">
        Staff member not found.
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl items-center py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </header>

      {/* Section 1 — Staff header */}
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

          {staff && <StaffDetailGrid staff={staff} />}
        </CardContent>
      </Card>

      {staff && (
        <AssignmentCaseloadCard
          staffId={staff.id}
          onTotalChange={setAssignmentCaseloadTotal}
        />
      )}

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>
            Sessions this month
            {monthLabel ? ` (${monthLabel})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedMonthSessions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-1">
              <p>No sessions logged this month.</p>
              {hasAssignments && (
                <p className="text-xs">Caseload assignments are listed above.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem] items-center gap-x-3 gap-y-1 text-xs">
              <div className="text-muted-foreground pb-2 border-b">Time</div>
              <div className="text-muted-foreground pb-2 border-b">Client</div>
              <div className="text-muted-foreground pb-2 border-b">Type</div>
              <div className="text-muted-foreground pb-2 border-b text-right">
                Status
              </div>

              {sortedMonthSessions.map((s) => (
                <div key={s.id} className="contents">
                  <div className="font-mono text-muted-foreground tabular-nums py-1.5">
                    {formatTime(s.time)}
                  </div>
                  <div className="truncate min-w-0 py-1.5 text-sm">
                    <Link
                      to={`/clients/${s.clientId}`}
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

      {/* Certifications (always visible regardless of activity) */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          {staff ? (
            <CertificationsDetail staff={staff} />
          ) : (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No certification data on file.
            </div>
          )}
        </CardContent>
      </Card>

      {showCollapsedEmpty ? (
        <Card className="w-full max-w-3xl">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No session activity for {displayName} this month.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              When sessions are scheduled, supervision compliance will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Supervision compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {supervision && staff ? (
              <SupervisionDetail supervision={supervision} staff={staff} />
            ) : (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No supervision data available for this staff member.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Caseload from client_assignments — distinct from session activity this week.
function AssignmentCaseloadCard({
  staffId,
  onTotalChange,
}: {
  staffId: string
  onTotalChange?: (total: number) => void
}) {
  const [loading, setLoading] = useState(true)
  const [asBcba, setAsBcba] = useState<ClientCaseloadLabel[]>([])
  const [asSupervisor, setAsSupervisor] = useState<ClientCaseloadLabel[]>([])
  const [asBt, setAsBt] = useState<ClientCaseloadLabel[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getAssignmentsForStaff(staffId)
      .then(async (assignments) => {
        if (cancelled) return

        const roleBuckets: Record<ClientAssignmentRole, string[]> = {
          primary_bcba: [],
          clinical_supervisor: [],
          primary_bt: [],
          secondary_bt: [],
        }

        for (const row of assignments) {
          roleBuckets[row.assignmentRole].push(row.clientId)
        }

        const bcbaIds = [...new Set(roleBuckets.primary_bcba)]
        const supervisorIds = [...new Set(roleBuckets.clinical_supervisor)]
        const btIds = [...new Set([...roleBuckets.primary_bt, ...roleBuckets.secondary_bt])]

        const [bcbaLabels, supervisorLabels, btLabels] = await Promise.all([
          getClientCaseloadLabels(bcbaIds),
          getClientCaseloadLabels(supervisorIds),
          getClientCaseloadLabels(btIds),
        ])

        if (cancelled) return
        setAsBcba(bcbaLabels)
        setAsSupervisor(supervisorLabels)
        setAsBt(btLabels)
        onTotalChange?.(bcbaLabels.length + supervisorLabels.length + btLabels.length)
      })
      .catch(() => {
        if (!cancelled) {
          setAsBcba([])
          setAsSupervisor([])
          setAsBt([])
          onTotalChange?.(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [staffId, onTotalChange])

  const total = asBcba.length + asSupervisor.length + asBt.length

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Caseload</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse py-4">Loading caseload…</p>
        ) : total === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Not assigned to any client caseload yet
          </div>
        ) : (
          <div className="space-y-4">
            {asBcba.length > 0 && (
              <CaseloadRoleSection
                title={`As BCBA (${asBcba.length})`}
                clients={asBcba}
              />
            )}
            {asSupervisor.length > 0 && (
              <CaseloadRoleSection
                title={`As Supervisor (${asSupervisor.length})`}
                clients={asSupervisor}
              />
            )}
            {asBt.length > 0 && (
              <CaseloadRoleSection
                title={`As BT (${asBt.length})`}
                clients={asBt}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CaseloadRoleSection({
  title,
  clients,
}: {
  title: string
  clients: ClientCaseloadLabel[]
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {clients.map((client) => (
          <Link
            key={client.clientId}
            to={`/clients/${client.clientId}`}
            className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            {client.clientCode ?? client.displayName}
          </Link>
        ))}
      </div>
    </div>
  )
}

// Certification expiry section. Renders one row per certification (currently
// one per staff member — designed as a list so it extends naturally when the
// data model adds more). Thresholds and parsing live in @/lib/staff so this
// component stays declarative.
function CertificationsDetail({ staff }: { staff: StaffRecord }) {
  const TODAY = new Date()
  const parsed = parseCertification(staff.certification)

  if (!parsed) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No certification data on file.
      </div>
    )
  }

  // Single-element array today; extend by pushing more ParsedCertification
  // entries here when the Staff type grows a `certs` array field.
  const certs = [parsed]

  return (
    <ul className="space-y-3">
      {certs.map((cert, i) => {
        const daysLeft = daysUntil(cert.expiryDate, TODAY)
        const formattedExpiry = cert.expiryDate.toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })

        let chipClass: string
        let chipLabel: string
        let subtext: string

        if (daysLeft < 0) {
          chipClass = "bg-red-100 text-red-800"
          chipLabel = "Expired"
          subtext = `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago · ${formattedExpiry}`
        } else if (daysLeft <= CERT_URGENT_DAYS) {
          chipClass = "bg-red-100 text-red-800"
          chipLabel = "Urgent"
          const when = daysLeft === 0 ? "Expires today" : daysLeft === 1 ? "Expires tomorrow" : `Expires in ${daysLeft} days`
          subtext = `${when} · ${formattedExpiry}`
        } else if (daysLeft <= CERT_WARNING_DAYS) {
          chipClass = "bg-amber-100 text-amber-800"
          chipLabel = "Warning"
          subtext = `Expires in ${daysLeft} days · ${formattedExpiry}`
        } else {
          chipClass = "bg-emerald-100 text-emerald-800"
          chipLabel = "Current"
          subtext = `Expires ${formattedExpiry}`
        }

        return (
          <li key={i} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{cert.type} Certification</p>
              <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${chipClass}`}>
              {chipLabel}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// 4-row label/value detail grid. Uses semantic <dl>/<dt>/<dd> for screen-
// reader-friendly definition list semantics. Same pattern as
// ClientDetailGrid in ClientOverviewPage.
function StaffDetailGrid({ staff }: { staff: StaffRecord }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
      <dt className="text-muted-foreground">Role title</dt>
      <dd>{ROLE_TITLE[staff.role as Staff["role"]]}</dd>

      <dt className="text-muted-foreground">Hire date</dt>
      <dd>{formatDate(staff.hireDate)}</dd>

      <dt className="text-muted-foreground">Certification</dt>
      <dd>{staff.certification}</dd>

      <dt className="text-muted-foreground">Assigned team</dt>
      <dd>{staff.team}</dd>
    </dl>
  )
}

// Expanded supervision visualization — bar + % + plain-English requirements
// line + status chip. Same shape as AuthorizationDetail on ClientOverviewPage;
// they're cousins (both detail-page expansions of a dashboard mini-bar) but
// kept separate because the threshold semantics are inverted (high % = good
// here, high % = bad there) and merging would obscure the difference.
function SupervisionDetail({
  supervision,
  staff,
}: {
  supervision: SupervisionRecord
  staff: StaffRecord
}) {
  const { bar, text } = complianceClasses(supervision.supervisionPct)
  const status = complianceStatus(supervision.supervisionPct)
  const actual = actualSupervisionHours(
    supervision.supervisionPct,
    staff.totalHours
  )
  const required = requiredHours(staff.totalHours)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-3xl font-semibold tabular-nums ${text}`}>
          {supervision.supervisionPct.toFixed(1)}%
        </span>
        <ComplianceBadge status={status} />
      </div>

      {/* Expanded mini-bar — full content width with the 5% threshold marker
          line so the visual language matches the dashboard tile + the
          per-client auth bar. Bar fills to actual %, capped at 100%. */}
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
        <span className="text-muted-foreground"> required supervision hours this period</span>
      </p>
    </div>
  )
}
